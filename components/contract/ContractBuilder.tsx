'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Listing } from '@/lib/mockData';
import { FILLER_TIERS, SLOT_PRICE_USDC } from '@/lib/constants';
import { slotCostUsdc, fillerCostUsdc, type UsdcCost } from '@/lib/pricing';
import { getDaySlots, getDayStatus, getFillerCapacity } from '@/lib/availability';
import {
  getListingBookings,
  clearBookingsCache,
  bookedSlotSet,
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
  const [tier, setTier] = useState(FILLER_TIERS[1].id);

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

  const cost: UsdcCost =
    mode === 'slot'
      ? slotIdx.length ? slotCostUsdc(slotIdx.length) : ZERO
      : fillerDays ? fillerCostUsdc(fillerDays, tier) : ZERO;

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
        // Re-check for conflicts against the freshest data before paying.
        const fresh = await getListingBookings(listing.id);
        const taken = bookedSlotSet(fresh, date!);
        const clash = slotIdx.filter((i) => taken.has(i));
        if (clash.length > 0) {
          setBookings(fresh);
          setSlotIdx((prev) => prev.filter((i) => !taken.has(i)));
          throw new Error('One or more selected slots were just booked — please reselect.');
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
          ? 'Reserve exclusive 15-minute windows (UTC), yours alone on the screen.'
          : `Run your ad in the gaps between booked slots — from $${FILLER_TIERS[0].usdcPerDay} USDC/day.`}
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
              return (
                <button
                  type="button"
                  key={s.index}
                  disabled={booked}
                  onClick={() => toggleSlot(s.index)}
                  className={`${styles.slotRow} ${booked ? styles.slotBooked : ''} ${selected ? styles.slotSelected : ''}`}
                >
                  <span>{s.label}</span>
                  <span className={styles.slotMeta}>{booked ? `Booked · ${s.advertiser}` : selected ? 'Selected' : `$${SLOT_PRICE_USDC}`}</span>
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
            {FILLER_TIERS.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => { setTier(t.id); setSigned(false); }}
                className={`${styles.tier} ${tier === t.id ? styles.tierActive : ''}`}
              >
                <span className={styles.tierLabel}>{t.label} · ${t.usdcPerDay}/d</span>
                <span className={styles.tierCadence}>{t.cadence}</span>
              </button>
            ))}
          </div>
          {rangeStart && (
            <p className={styles.fillerNote}>
              ~{getFillerCapacity(listing.id, rangeStart, bookings).toLocaleString()} filler plays available on {rangeStart}.
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
