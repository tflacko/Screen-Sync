// Booking memo format. Bookings are real SOL payments to the treasury carrying
// this memo, so they're auditable on-chain and indexable later (no DB needed).
const BOOKING_MEMO_PREFIX = 'ss:book:v1:';

export function bookingMemo(args: {
  listingId: string;
  mode: 'slot' | 'filler';
  detail: string; // slot: "<date>:<slotIdxs>"  filler: "<start>_<end>:<tier>"
  total: number;
}): string {
  return `${BOOKING_MEMO_PREFIX}${args.listingId}|${args.mode}|${args.detail}|${args.total.toFixed(4)}`;
}
