//! Screen Sync — on-chain advertising marketplace (Phase 2a core).
//!
//! Mirrors the dApp's pricing (`lib/pricing.ts`, `lib/constants.ts`):
//!   * protocol fee = 2.5% (250 bps)
//!   * slot price   = base_rate / blocks_per_day * 1.5  (SLOT_PREMIUM)
//!   * filler price = base_rate * tier_factor * days     (0.25 / 0.5 / 1.0)
//!
//! Funds flow: an advertiser escrows `amount + fee` into a per-booking PDA.
//! On `settle_booking` the publisher receives `amount`, the treasury receives
//! `fee`, and the booking account is closed (rent returns to the advertiser).
//! On `cancel_booking` (before the start date) the full escrow + rent refunds.
//!
//! NOT YET IMPLEMENTED (later Phase 2/3, see docs/SMART-CONTRACTS.md):
//!   * Metaplex Core NFTs for listings/creatives/contracts
//!   * proof-of-display (Bubblegum cNFT) + record_delivery + disputes
//!   * USDC (SPL) escrow path (Config.accepted_mint is reserved for this)
//!   * strict on-chain filler-cap enforcement across a date range
//!
//! Replace the placeholder program id below via `anchor keys sync` after the
//! first `anchor build` (see program/README.md).

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ---- Protocol constants (keep in sync with lib/constants.ts) --------------
const PLATFORM_FEE_BPS: u64 = 250; // 2.5%
const BPS_DENOMINATOR: u64 = 10_000;
const SLOT_PREMIUM_NUM: u64 = 3; // 1.5x expressed as 3/2 for integer math
const SLOT_PREMIUM_DEN: u64 = 2;
const MAX_BLOCKS_PER_DAY: u8 = 8; // slot_bitmap is a u8

const MODE_EXCLUSIVE: u8 = 0;
const MODE_ROTATING: u8 = 1;

const KIND_SLOT: u8 = 0;
const KIND_FILLER: u8 = 1;

const STATUS_ESCROWED: u8 = 0;
const STATUS_SETTLED: u8 = 1;
const STATUS_REFUNDED: u8 = 2;

/// Filler tier factors in bps: Low 25%, Medium 50%, High 100% (lib/constants FILLER_TIERS).
const FILLER_TIER_BPS: [u64; 3] = [2_500, 5_000, 10_000];

// ---- Pricing helpers ------------------------------------------------------
fn platform_fee(base: u64) -> Result<u64> {
    base.checked_mul(PLATFORM_FEE_BPS)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(error!(MarketError::MathOverflow))
}

fn slot_price(base_rate: u64, blocks_per_day: u8) -> Result<u64> {
    // base_rate / blocks_per_day * 1.5  ->  base_rate * 3 / (blocks_per_day * 2)
    let denom = (blocks_per_day as u64)
        .checked_mul(SLOT_PREMIUM_DEN)
        .ok_or(error!(MarketError::MathOverflow))?;
    base_rate
        .checked_mul(SLOT_PREMIUM_NUM)
        .and_then(|v| v.checked_div(denom))
        .ok_or(error!(MarketError::MathOverflow))
}

#[program]
pub mod screen_sync_marketplace {
    use super::*;

    /// One-time protocol setup. Signer becomes admin.
    pub fn initialize_config(ctx: Context<InitializeConfig>, fee_bps: u16, oracle: Pubkey) -> Result<()> {
        require!(fee_bps as u64 <= BPS_DENOMINATOR, MarketError::InvalidFee);
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.treasury = ctx.accounts.treasury.key();
        cfg.oracle = oracle;
        cfg.fee_bps = fee_bps;
        cfg.paused = false;
        cfg.bump = ctx.bumps.config;
        Ok(())
    }

    /// Admin: update treasury / oracle / fee / pause.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        fee_bps: u16,
        oracle: Pubkey,
        treasury: Pubkey,
        paused: bool,
    ) -> Result<()> {
        require!(fee_bps as u64 <= BPS_DENOMINATOR, MarketError::InvalidFee);
        let cfg = &mut ctx.accounts.config;
        cfg.fee_bps = fee_bps;
        cfg.oracle = oracle;
        cfg.treasury = treasury;
        cfg.paused = paused;
        Ok(())
    }

    /// Publisher registers an ad space. `listing_id` is a client-chosen nonce
    /// (e.g. a timestamp) that namespaces the listing PDA under the owner.
    pub fn register_listing(
        ctx: Context<RegisterListing>,
        listing_id: u64,
        base_rate: u64,
        blocks_per_day: u8,
        mode: u8,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, MarketError::Paused);
        require!(base_rate > 0, MarketError::InvalidAmount);
        require!(
            blocks_per_day > 0 && blocks_per_day <= MAX_BLOCKS_PER_DAY,
            MarketError::InvalidBlocks
        );
        require!(mode == MODE_EXCLUSIVE || mode == MODE_ROTATING, MarketError::InvalidMode);

        let listing = &mut ctx.accounts.listing;
        listing.owner = ctx.accounts.owner.key();
        listing.listing_id = listing_id;
        listing.base_rate = base_rate;
        listing.blocks_per_day = blocks_per_day;
        listing.mode = mode;
        listing.active = true;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// Publisher updates rate / mode / active flag.
    pub fn update_listing(ctx: Context<UpdateListing>, base_rate: u64, mode: u8, active: bool) -> Result<()> {
        require!(base_rate > 0, MarketError::InvalidAmount);
        require!(mode == MODE_EXCLUSIVE || mode == MODE_ROTATING, MarketError::InvalidMode);
        let listing = &mut ctx.accounts.listing;
        listing.base_rate = base_rate;
        listing.mode = mode;
        listing.active = active;
        Ok(())
    }

    /// Advertiser books exclusive time block(s) on a single date.
    /// `slot_mask` has one bit per 3h block; conflicting bits are rejected.
    pub fn book_slot(ctx: Context<BookSlot>, nonce: u64, date: u32, slot_mask: u8) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(!ctx.accounts.config.paused, MarketError::Paused);
        require!(listing.active, MarketError::ListingInactive);
        require!(slot_mask != 0, MarketError::InvalidSlots);
        // All requested bits must be within the listing's block count.
        let valid_bits: u16 = (1u16 << listing.blocks_per_day) - 1;
        require!((slot_mask as u16 & !valid_bits) == 0, MarketError::InvalidSlots);

        let ledger = &mut ctx.accounts.day_ledger;
        // Initialise the ledger on first use for this (listing, date).
        if ledger.listing == Pubkey::default() {
            ledger.listing = listing.key();
            ledger.date = date;
            ledger.bump = ctx.bumps.day_ledger;
        }
        require!(ledger.date == date, MarketError::LedgerMismatch);
        // No overlap with already-booked blocks.
        require!((ledger.slot_bitmap & slot_mask) == 0, MarketError::SlotTaken);

        let count = slot_mask.count_ones() as u64;
        let amount = slot_price(listing.base_rate, listing.blocks_per_day)?
            .checked_mul(count)
            .ok_or(error!(MarketError::MathOverflow))?;
        let fee = platform_fee(amount)?;
        let total = amount.checked_add(fee).ok_or(error!(MarketError::MathOverflow))?;

        escrow_in(
            &ctx.accounts.advertiser,
            &ctx.accounts.booking.to_account_info(),
            &ctx.accounts.system_program,
            total,
        )?;

        ledger.slot_bitmap |= slot_mask;

        let booking = &mut ctx.accounts.booking;
        booking.listing = listing.key();
        booking.advertiser = ctx.accounts.advertiser.key();
        booking.kind = KIND_SLOT;
        booking.start_date = date;
        booking.end_date = date;
        booking.slots = slot_mask;
        booking.filler_tier = 0;
        booking.amount = amount;
        booking.fee = fee;
        booking.escrow = total;
        booking.status = STATUS_ESCROWED;
        booking.nonce = nonce;
        booking.bump = ctx.bumps.booking;
        Ok(())
    }

    /// Advertiser books filler over a date range at a tier (Low/Medium/High).
    /// Filler runs in the gaps and does not consume exclusive slots.
    pub fn book_filler(
        ctx: Context<BookFiller>,
        nonce: u64,
        start_date: u32,
        end_date: u32,
        tier: u8,
    ) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(!ctx.accounts.config.paused, MarketError::Paused);
        require!(listing.active, MarketError::ListingInactive);
        require!(end_date >= start_date, MarketError::InvalidDates);
        require!((tier as usize) < FILLER_TIER_BPS.len(), MarketError::InvalidTier);

        let days = (end_date - start_date + 1) as u64;
        let factor_bps = FILLER_TIER_BPS[tier as usize];
        // amount = base_rate * factor * days
        let amount = listing
            .base_rate
            .checked_mul(factor_bps)
            .and_then(|v| v.checked_div(BPS_DENOMINATOR))
            .and_then(|v| v.checked_mul(days))
            .ok_or(error!(MarketError::MathOverflow))?;
        require!(amount > 0, MarketError::InvalidAmount);
        let fee = platform_fee(amount)?;
        let total = amount.checked_add(fee).ok_or(error!(MarketError::MathOverflow))?;

        escrow_in(
            &ctx.accounts.advertiser,
            &ctx.accounts.booking.to_account_info(),
            &ctx.accounts.system_program,
            total,
        )?;

        let booking = &mut ctx.accounts.booking;
        booking.listing = listing.key();
        booking.advertiser = ctx.accounts.advertiser.key();
        booking.kind = KIND_FILLER;
        booking.start_date = start_date;
        booking.end_date = end_date;
        booking.slots = 0;
        booking.filler_tier = tier;
        booking.amount = amount;
        booking.fee = fee;
        booking.escrow = total;
        booking.status = STATUS_ESCROWED;
        booking.nonce = nonce;
        booking.bump = ctx.bumps.booking;
        Ok(())
    }

    /// Oracle/admin settles a booking: publisher gets `amount`, treasury gets
    /// `fee`, booking closes (rent back to advertiser).
    pub fn settle_booking(ctx: Context<SettleBooking>) -> Result<()> {
        let booking = &ctx.accounts.booking;
        require!(booking.status == STATUS_ESCROWED, MarketError::NotEscrowed);
        let amount = booking.amount;
        let fee = booking.fee;

        // Move escrow out of the program-owned booking PDA.
        let booking_ai = ctx.accounts.booking.to_account_info();
        **booking_ai.try_borrow_mut_lamports()? -= amount + fee;
        **ctx.accounts.publisher.try_borrow_mut_lamports()? += amount;
        **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee;

        ctx.accounts.booking.status = STATUS_SETTLED;
        // Anchor `close = advertiser` returns the remaining rent on exit.
        Ok(())
    }

    /// Advertiser cancels before the start date: full escrow + rent refunded,
    /// any reserved slots are freed.
    pub fn cancel_booking(ctx: Context<CancelBooking>) -> Result<()> {
        let booking = &ctx.accounts.booking;
        require!(booking.status == STATUS_ESCROWED, MarketError::NotEscrowed);

        let today = (Clock::get()?.unix_timestamp / 86_400) as u32;
        require!(today < booking.start_date, MarketError::AlreadyStarted);

        // Free reserved slots for slot bookings.
        if booking.kind == KIND_SLOT {
            let ledger = &mut ctx.accounts.day_ledger;
            require!(ledger.date == booking.start_date, MarketError::LedgerMismatch);
            ledger.slot_bitmap &= !booking.slots;
        }

        ctx.accounts.booking.status = STATUS_REFUNDED;
        // Anchor `close = advertiser` returns escrow + rent (all PDA lamports).
        Ok(())
    }
}

/// CPI: move `lamports` from a system-owned signer into the booking PDA.
fn escrow_in<'info>(
    from: &Signer<'info>,
    to: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
    lamports: u64,
) -> Result<()> {
    system_program::transfer(
        CpiContext::new(
            system_program.to_account_info(),
            Transfer { from: from.to_account_info(), to: to.clone() },
        ),
        lamports,
    )
}

// ---- Accounts -------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: treasury is a destination pubkey recorded in config; validated on settle.
    pub treasury: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(constraint = admin.key() == config.admin @ MarketError::Unauthorized)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(listing_id: u64)]
pub struct RegisterListing<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = owner,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", owner.key().as_ref(), &listing_id.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateListing<'info> {
    #[account(constraint = owner.key() == listing.owner @ MarketError::Unauthorized)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        seeds = [b"listing", listing.owner.as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
}

#[derive(Accounts)]
#[instruction(nonce: u64, date: u32)]
pub struct BookSlot<'info> {
    #[account(mut)]
    pub advertiser: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [b"listing", listing.owner.as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init_if_needed,
        payer = advertiser,
        space = 8 + DayLedger::INIT_SPACE,
        seeds = [b"day", listing.key().as_ref(), &date.to_le_bytes()],
        bump
    )]
    pub day_ledger: Account<'info, DayLedger>,
    #[account(
        init,
        payer = advertiser,
        space = 8 + Booking::INIT_SPACE,
        seeds = [b"booking", listing.key().as_ref(), advertiser.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub booking: Account<'info, Booking>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct BookFiller<'info> {
    #[account(mut)]
    pub advertiser: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [b"listing", listing.owner.as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = advertiser,
        space = 8 + Booking::INIT_SPACE,
        seeds = [b"booking", listing.key().as_ref(), advertiser.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub booking: Account<'info, Booking>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleBooking<'info> {
    #[account(
        constraint = (authority.key() == config.oracle || authority.key() == config.admin)
            @ MarketError::Unauthorized
    )]
    pub authority: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        seeds = [b"listing", listing.owner.as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        mut,
        has_one = listing @ MarketError::ListingMismatch,
        has_one = advertiser @ MarketError::Unauthorized,
        close = advertiser,
        seeds = [b"booking", booking.listing.as_ref(), booking.advertiser.as_ref(), &booking.nonce.to_le_bytes()],
        bump = booking.bump
    )]
    pub booking: Account<'info, Booking>,
    /// CHECK: must be the listing owner (publisher); validated by address.
    #[account(mut, address = listing.owner @ MarketError::Unauthorized)]
    pub publisher: UncheckedAccount<'info>,
    /// CHECK: must be the configured treasury; validated by address.
    #[account(mut, address = config.treasury @ MarketError::Unauthorized)]
    pub treasury: UncheckedAccount<'info>,
    /// CHECK: rent recipient on close; must match the booking's advertiser.
    #[account(mut, address = booking.advertiser @ MarketError::Unauthorized)]
    pub advertiser: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBooking<'info> {
    #[account(mut, constraint = advertiser.key() == booking.advertiser @ MarketError::Unauthorized)]
    pub advertiser: Signer<'info>,
    #[account(
        mut,
        has_one = advertiser @ MarketError::Unauthorized,
        close = advertiser,
        seeds = [b"booking", booking.listing.as_ref(), booking.advertiser.as_ref(), &booking.nonce.to_le_bytes()],
        bump = booking.bump
    )]
    pub booking: Account<'info, Booking>,
    /// Slot bookings free their reserved blocks; pass the matching DayLedger.
    #[account(
        mut,
        seeds = [b"day", booking.listing.as_ref(), &booking.start_date.to_le_bytes()],
        bump = day_ledger.bump
    )]
    pub day_ledger: Account<'info, DayLedger>,
    pub system_program: Program<'info, System>,
}

// ---- State ----------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub oracle: Pubkey,
    pub fee_bps: u16,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub owner: Pubkey,
    pub listing_id: u64,
    pub base_rate: u64, // lamports per day
    pub blocks_per_day: u8,
    pub mode: u8,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DayLedger {
    pub listing: Pubkey,
    pub date: u32,       // days since unix epoch
    pub slot_bitmap: u8, // 1 bit per 3h block
    pub filler_used: u16,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Booking {
    pub listing: Pubkey,
    pub advertiser: Pubkey,
    pub kind: u8, // 0 slot, 1 filler
    pub start_date: u32,
    pub end_date: u32,
    pub slots: u8, // reserved block bitmap (slot kind)
    pub filler_tier: u8,
    pub amount: u64, // subtotal (lamports)
    pub fee: u64,
    pub escrow: u64, // amount + fee held by this PDA
    pub status: u8,
    pub nonce: u64,
    pub bump: u8,
}

// ---- Errors ---------------------------------------------------------------

#[error_code]
pub enum MarketError {
    #[msg("Arithmetic overflow")]
    MathOverflow,
    #[msg("Invalid fee (must be <= 10000 bps)")]
    InvalidFee,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid blocks_per_day")]
    InvalidBlocks,
    #[msg("Invalid listing mode")]
    InvalidMode,
    #[msg("Invalid slot mask")]
    InvalidSlots,
    #[msg("Invalid filler tier")]
    InvalidTier,
    #[msg("Invalid date range")]
    InvalidDates,
    #[msg("Protocol is paused")]
    Paused,
    #[msg("Listing is inactive")]
    ListingInactive,
    #[msg("One or more requested slots are already booked")]
    SlotTaken,
    #[msg("Day ledger does not match the requested date")]
    LedgerMismatch,
    #[msg("Booking does not match the provided listing")]
    ListingMismatch,
    #[msg("Booking is not in the escrowed state")]
    NotEscrowed,
    #[msg("Booking has already started; cannot cancel")]
    AlreadyStarted,
    #[msg("Unauthorized")]
    Unauthorized,
}
