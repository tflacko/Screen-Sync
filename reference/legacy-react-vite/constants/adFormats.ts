// Available ad dimensions/formats

export interface AdDimension {
  value: string;
  label: string;
}

export const AVAILABLE_DIMENSIONS: AdDimension[] = [
  { value: '728x90', label: 'Leaderboard (728x90)' },
  { value: '300x250', label: 'Medium Rectangle (300x250)' },
  { value: '336x280', label: 'Large Rectangle (336x280)' },
  { value: '160x600', label: 'Wide Skyscraper (160x600)' },
  { value: '320x50', label: 'Mobile Banner (320x50)' },
  { value: '970x250', label: 'Billboard (970x250)' }
];
