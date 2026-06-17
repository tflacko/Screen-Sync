// Slot duration options for campaigns

export interface SlotDurationOption {
  value: number;
  label: string;
  multiplier: number;
}

export const SLOT_DURATION_OPTIONS: SlotDurationOption[] = [
  { value: 3600, label: '1 Hour', multiplier: 1 },
  { value: 21600, label: '6 Hours', multiplier: 5.5 },
  { value: 86400, label: '24 Hours', multiplier: 20 },
  { value: 604800, label: '7 Days', multiplier: 120 }
];
