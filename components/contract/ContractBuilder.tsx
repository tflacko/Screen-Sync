'use client';

import { useMemo, useState } from 'react';
import type { Listing } from '@/lib/mockData';
import { FILLER_TIERS } from '@/lib/constants';
import { slotBookingCost, fillerCost, type CostBreakdown } from '@/lib/pricing';
import { getDaySlots, getFillerCapacity } from '@/lib/availability';
import Button from '@/components/Button';
import AvailabilityCalendar from './AvailabilityCalendar';
import styles from '@/styles/ContractBuilder.module.css';

type Mode = 'slot' | 'filler';

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

const ZERO: CostBreakdown = { subtotal: 0, fee: 0, total: 0 };

export default function ContractBuilder({ listing }: { listing: Listing }) {
  const [mode, setMode] = useState<Mode>('slot');

  // Slot mode
  const [date, setDate] = useState<string | null>(null);
  const [slotIdx, setSlotIdx] = useState<number[]>([]);

  // Filler mode
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [tier, setTier] = useState(FILLER_TIERS[1].id);

  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const slots = useMemo(() => (date ? getDaySlots(listing.id, date) : []), [listing.id, date]);

  const fillerDays = rangeStart ? (rangeEnd ? daysBetween(rangeStart, rangeEnd) + 1 : 1) : 0;
  const tierFactor = FILLER_TIERS.find((t) => t.id === tier)!.factor;

  const cost: CostBreakdown =
    mode === 'slot'
      ? slotIdx.length
        ? slotBookingCost(listing.pricePerDay, slotIdx.length)
        : ZERO
      : fillerDays
        ? fillerCost(listing.pricePerDay, fillerDays, tierFactor)
        : ZERO;

  const canSign = cost.total > 0;

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

  async function sign() {
    setSigning(true);
    await new Promise((r) => setTimeout(r, 1200)); // mock on-chain escrow
    setSigning(false);
    setSigned(true);
  }

  const isSelected = (d: string) => (mode === 'slot' ? d === date : d === rangeStart || d === rangeEnd);
  const inRange = (d: string) =>
    mode === 'filler' && rangeStart != null && rangeEnd != null && d > rangeStart && d < rangeEnd;

  return (
    <div className={styles.builder}>
      <div className={styles.kicker}>Contract Builder</div>
      <div className={styles.rate}>
        {listing.pricePerDay.toFixed(2)} SOL<span> / day base</span>
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
          ? 'Reserve specific time blocks, exclusively yours.'
          : 'Run your ad in the gaps between booked slots, at a chosen frequency.'}
      </p>

      <AvailabilityCalendar listingId={listing.id} isSelected={isSelected} inRange={inRange} onPick={pick} />

      {mode === 'slot' && date && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Time blocks · {date}</div>
          <div className={styles.slotList}>
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
                  <span className={styles.slotMeta}>{booked ? `Booked · ${s.advertiser}` : selected ? 'Selected' : 'Available'}</span>
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
                <span className={styles.tierLabel}>{t.label}</span>
                <span className={styles.tierCadence}>{t.cadence}</span>
              </button>
            ))}
          </div>
          {rangeStart && (
            <p className={styles.fillerNote}>
              ~{getFillerCapacity(listing.id, rangeStart).toLocaleString()} filler plays available on {rangeStart}.
            </p>
          )}
        </div>
      )}

      <div className={styles.soon}>
        <span>Coming soon</span> Location targeting · auto-optimized filler
      </div>

      <div className={styles.breakdown}>
        <div className={styles.row}>
          <span>{mode === 'slot' ? `Slots (${slotIdx.length})` : `Filler · ${FILLER_TIERS.find((t) => t.id === tier)!.label}`}</span>
          <span>{cost.subtotal.toFixed(3)} SOL</span>
        </div>
        <div className={styles.row}>
          <span>Protocol fee (2.5%)</span>
          <span>{cost.fee.toFixed(3)} SOL</span>
        </div>
        <div className={styles.totalRow}>
          <span>Total escrow</span>
          <span className={styles.totalVal}>{cost.total.toFixed(3)} SOL</span>
        </div>
      </div>

      <Button variant="cherry" full onClick={sign} disabled={!canSign || signing}>
        {signed ? '✓ Contract Signed (Mock)' : signing ? 'Signing…' : 'Sign Contract'}
      </Button>
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
