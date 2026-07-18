'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Listing } from '@/lib/mockData';
import {
  FILLER_TIERS,
  SLOT_PRICE_USDC,
  OUTBID_MIN_INCREMENT_USDC,
  FILLER_PRICE_USDC,
  FILLER_MINUTES_PER_DAY,
} from '@/lib/constants';
import { slotsCostUsdc, fillerCostUsdc, type UsdcCost } from '@/lib/pricing';
import { getDaySlots, getDayStatus, getFillerCapacity } from '@/lib/availability';
import {
  getListingBookings,
  clearBookingsCache,
  slotBookingMemo,
  fillerBookingMemo,
  type OnChainBooking,
} from '@/lib/bookings';
import { sendUsdcTreasuryTx } from '@/lib/transactions';
import { uploadToIPFS } from '@/lib/pinata';
import { PAYMENTS_ENABLED } from '@/lib/config';
import { txUrl } from '@/lib/explorer';
import Button from '@/components/Button';
import AvailabilityCalendar from './AvailabilityCalendar';
import styles from '@/styles/ContractBuilder.module.css';

type Mode = 'slot' | 'filler';

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

const ZERO: UsdcCost = { label: '—', totalUsdc: 0 };

export default function ContractBuilder({ listing }: { listing: Listing }) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [mode, setMode] = useState<Mode>('slot');

  // Real on-chain bookings for this listing (drives availability).
  const [bookings, setBookings] = useState<OnChainBooking[]>([]);
  useEffect(() => {
    let active = true;
    getListingBookings(listing.id)
      .then((b) => { if (active) setBookings(b); })
      .catch(() => {});
    return () => { active = false; };
  }, [listing.id]);

  // Slot mode
  const [date, setDate] = useState<string | null>(null);
  const [slotIdx, setSlotIdx] = useState<number[]>([]);

  // Filler mode
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const tier = FILLER_TIERS[0].id; // single filler product ($20 = 15 min airtime/day)

  // Creative (the ad that actually gets served)
  const [creativeCid, setCreativeCid] = useState('');
  const [creativeName, setCreativeName] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [sig, setSig] = useState('');
  const [error, setError] = useState('');

  const slots = useMemo(
    () => (date ? getDaySlots(listing.id, date, bookings) : []),
    [listing.id, date, bookings]
  );

  const fillerDays = rangeStart ? (rangeEnd ? daysBetween(rangeStart, rangeEnd) + 1 : 1) : 0;

  /** Price of one slot right now: base $20, or current top bid + increment when outbidding. */
  const priceOfSlot = (i: number): number => {
    const s = slots.find((x) => x.index === i);
    return s?.status === 'booked'
      ? (s.topBidUsdc ?? SLOT_PRICE_USDC) + OUTBID_MIN_INCREMENT_USDC
      : SLOT_PRICE_USDC;
  };

  const cost: UsdcCost =
    mode === 'slot'
      ? slotIdx.length ? slotsCostUsdc(slotIdx.map(priceOfSlot)) : ZERO
      : fillerDays ? fillerCostUsdc(fillerDays, tier) : ZERO;

  const outbidCount = mode === 'slot'
    ? slotIdx.filter((i) => slots.find((x) => x.index === i)?.status === 'booked').length
    : 0;

  const canSign = cost.totalUsdc > 0 && !!creativeCid;

  function pick(d: string) {
    setSigned(false);
    if (mode === 'slot') {
      setDate(d);
      setSlotIdx([]);
    } else if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(d);
      setRangeEnd(null);
    } else if (d < rangeStart) {
      setRangeStart(d);
    } else {
      setRangeEnd(d);
    }
  }

  function toggleSlot(i: number) {
    setSigned(false);
    setSlotIdx((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function switchMode(m: Mode) {
    setMode(m);
    setSigned(false);
  }

  async function handleCreative(f: File) {
    setUploading(true);
    setError('');
    try {
      const cid = await uploadToIPFS(f);
      setCreativeCid(cid);
      setCreativeName(f.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creative upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function sign() {
    if (!canSign) return;
    if (!connected || !publicKey) {
      setError('Connect your wallet to sign a contract.');
      return;
    }
    setSigning(true);
    setError('');
    try {
      let memo: string;
      if (mode === 'slot') {
        // Re-price against a FRESH chain scan (bypass the 60s cache) right
        // before money moves: someone may have booked or raised a bid since load.
        clearBookingsCache();
        const fresh = await getListingBookings(listing.id);
        const freshSlots = getDaySlots(listing.id, date!, fresh);
        const required = slotIdx.reduce((sum, i) => {
          const s = freshSlots[i];
          return sum + (s.status === 'booked'
            ? (s.topBidUsdc ?? SLOT_PRICE_USDC) + OUTBID_MIN_INCREMENT_USDC
            : SLOT_PRICE_USDC);
        }, 0);
        if (cost.totalUsdc + 1e-6 < required) {
          setBookings(fresh);
          throw new Error('Bids changed while you were deciding — review the updated total and sign again.');
        }
        memo = slotBookingMemo({
          listingId: listing.id,
          dateISO: date!,
          slots: slotIdx,
          creativeCid,
          usdc: cost.totalUsdc,
        });
      } else {
        memo = fillerBookingMemo({
          listingId: listing.id,
          startISO: rangeStart!,
          endISO: rangeEnd ?? rangeStart!,
          tier,
          creativeCid,
          usdc: cost.totalUsdc,
        });
      }

      let signature = '';
      if (PAYMENTS_ENABLED) {
        signature = await sendUsdcTreasuryTx({
          payer: publicKey,
          amountUsdc: cost.totalUsdc,
          memo,
          sendTransaction,
        });
        clearBookingsCache();
        getListingBookings(listing.id).then(setBookings).catch(() => {});
      }
      setSig(signature);
      setSigned(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setSigning(false);
    }
  }

  const isSelected = (d: string) => (mode === 'slot' ? d === date : d === rangeStart || d === rangeEnd);
  const inRange = (d: string) =>
    mode === 'filler' && rangeStart != null && rangeEnd != null && d > rangeStart && d < rangeEnd;

  return (
    <div className={styles.builder}>
      <div className={styles.kicker}>Contract Builder</div>
      <div className={styles.rate}>
        ${SLOT_PRICE_USDC} USDC<span> / 15-min slot</span>
      </div>

      <div className={styles.modeToggle} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'slot'}
          className={`${styles.modeBtn} ${mode === 'slot' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('slot')}
        >
          Book a slot
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'filler'}
          className={`${styles.modeBtn} ${mode === 'filler' ? styles.modeBtnActive : ''}`}
          onClick={() => switchMode('filler')}
        >
          Filler
        </button>
      </div>

      <p className={styles.modeHint}>
        {mode === 'slot'
          ? 'Reserve exclusive 15-minute windows (UTC). Booked ones can be outbid.'
          : `$${FILLER_PRICE_USDC} buys ${FILLER_MINUTES_PER_DAY} minutes of airtime per day, spread across unbooked windows.`}
      </p>

      <AvailabilityCalendar
        listingId={listing.id}
        isSelected={isSelected}
        inRange={inRange}
        onPick={pick}
        dayStatus={(d) => getDayStatus(listing.id, d, bookings)}
      />

      {mode === 'slot' && date && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>15-min windows (UTC) · {date}</div>
          <div className={`${styles.slotList} ${styles.slotListScroll}`}>
            {slots.map((s) => {
              const selected = slotIdx.includes(s.index);
              const booked = s.status === 'booked';
              const outbidPrice = (s.topBidUsdc ?? SLOT_PRICE_USDC) + OUTBID_MIN_INCREMENT_USDC;
              return (
                <button
                  type="button"
                  key={s.index}
                  onClick={() => toggleSlot(s.index)}
                  className={`${styles.slotRow} ${booked && !selected ? styles.slotBooked : ''} ${selected ? styles.slotSelected : ''}`}
                  title={booked ? `Held at $${(s.topBidUsdc ?? SLOT_PRICE_USDC).toFixed(0)} — outbid for $${outbidPrice.toFixed(0)}` : undefined}
                >
                  <span>{s.label}</span>
                  <span className={styles.slotMeta}>
                    {selected
                      ? booked ? `Outbidding · $${outbidPrice.toFixed(0)}` : 'Selected'
                      : booked ? `Booked · outbid $${outbidPrice.toFixed(0)}` : `$${SLOT_PRICE_USDC}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'filler' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            {rangeStart
              ? rangeEnd
                ? `${rangeStart} → ${rangeEnd} · ${fillerDays} days`
                : `${rangeStart} · pick an end date`
              : 'Pick a start date on the calendar'}
          </div>
          <div className={styles.tierGrid}>
            <div className={`${styles.tier} ${styles.tierActive}`}>
              <span className={styles.tierLabel}>${FILLER_PRICE_USDC} / day</span>
              <span className={styles.tierCadence}>
                {FILLER_MINUTES_PER_DAY} minutes of total airtime, one minute at a
                time, spread across that day&apos;s unbooked windows
              </span>
            </div>
          </div>
          {rangeStart && (
            <p className={styles.fillerNote}>
              ~{getFillerCapacity(listing.id, rangeStart, bookings).toLocaleString()} unbooked filler minutes on {rangeStart}.
            </p>
          )}
        </div>
      )}

      {/* Creative upload — the ad that actually gets served on the screen */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Your ad creative</div>
        <button
          type="button"
          className={styles.creativeBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? 'Uploading to IPFS…'
            : creativeCid
              ? `✓ ${creativeName} · ${creativeCid.slice(0, 14)}…`
              : '+ Upload creative (image, max 5MB)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCreative(f);
          }}
        />
      </div>

      <div className={styles.soon}>
        <span>Coming soon</span> Location targeting · auto-optimized filler
      </div>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span>{cost.totalUsdc > 0 ? cost.label : mode === 'slot' ? 'Select slots' : 'Select dates'}</span>
          <span>{cost.totalUsdc.toFixed(2)} USDC</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total payment</span>
          <span className={styles.totalVal}>${cost.totalUsdc.toFixed(2)} USDC</span>
        </div>
      </div>

      <Button variant="cherry" full onClick={sign} disabled={!canSign || signing}>
        {signed
          ? sig ? '✓ Contract Signed' : '✓ Contract Signed (Mock)'
          : signing ? 'Signing…'
            : !connected ? 'Connect Wallet to Sign'
              : !creativeCid ? 'Upload a creative to sign'
                : `Pay ${cost.totalUsdc.toFixed(2)} USDC & Sign`}
      </Button>

      {error && <p className={styles.payNote} style={{ color: 'var(--cherry-bright)' }}>⚠ {error}</p>}
      {signed && sig && (
        <p className={styles.payNote}>
          <a href={txUrl(sig)} target="_blank" rel="noreferrer"
            style={{ color: 'var(--cherry-bright)', textDecoration: 'underline' }}>
            View transaction on Solana Explorer ↗
          </a>
          {' '}· Your ad goes live in its booked window.
        </p>
      )}
      {outbidCount > 0 && (
        <p className={styles.payNote} style={{ color: 'var(--cherry-bright)' }}>
          You&apos;re outbidding {outbidCount} held slot{outbidCount > 1 ? 's' : ''}. Highest
          verified payment wins at serve time; the previous holder is refunded manually by
          the treasury until on-chain escrow ships. They can bid back.
        </p>
      )}
      <p className={styles.payNote}>
        Paid in USDC to the Screen Sync treasury · booking + creative anchored on-chain ·
        trustless escrow arrives with the program.
      </p>

      <div className={styles.makeOffer}>
        <Button variant="ghost" full disabled={!canSign}>Save Draft</Button>
      </div>

      <div className={styles.ownerRow}>
        <span>Owner</span>
        <span className={styles.ownerAddr}>{listing.owner}</span>
      </div>
    </div>
  );
}
