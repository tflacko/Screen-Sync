export type ListingType =
  | 'video-game'
  | 'billboard'
  | 'stream-tv'
  | 'website'
  | 'mobile'
  | 'storefront';

export type PublisherType = 'commercial' | 'private';

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  location: string;
  pricePerDay: number; // SOL
  tags: string[];
  impressionsPerDay: number;
  audience: string;
  owner: string;
  publisherType: PublisherType;
  ipfsCid: string;
  verified: boolean;
  description: string;
  /** Gateway URL for the creative, set for on-chain listings (IPFS-hosted media). */
  imageUrl?: string;
}

export const LISTINGS: Listing[] = [
  {
    id: 'lst_001',
    type: 'video-game',
    title: 'In-Game Billboard — Open World RPG',
    location: 'Eternal Realm Online · 2.4M players',
    pricePerDay: 0.85,
    tags: ['gaming', 'RPG', 'in-game', '18-34'],
    impressionsPerDay: 180_000,
    audience: 'Gamers, 18–34, high disposable income',
    owner: '7xK3...9mNp',
    publisherType: 'commercial',
    ipfsCid: 'QmX7k3dR9mNpT2wY5uI8oP1aS4dF6gH',
    verified: true,
    description:
      'Premium billboard inside the main hub city of Eternal Realm Online. Visible from multiple angles to players entering the market district. 15-second animated slots.',
  },
  {
    id: 'lst_002',
    type: 'billboard',
    title: 'Uptown Tokyo Digital Billboard',
    location: 'Tokyo, Japan · Shinjuku',
    pricePerDay: 4.2,
    tags: ['outdoor', 'billboard', 'urban', 'Tokyo'],
    impressionsPerDay: 520_000,
    audience: 'Commuters, tourists & shoppers, 18–45',
    owner: '3mR9...4nKx',
    publisherType: 'commercial',
    ipfsCid: 'QmY2p1aB3cD4eF5gH6iJ7kL8mN9oP0',
    verified: true,
    description:
      'Premium large-format digital billboard above a busy intersection in uptown Tokyo (Shinjuku). Surrounded by neon signage and dense pedestrian traffic. 15-second slots, multiple plays per hour, real-time analytics dashboard included.',
  },
  {
    id: 'lst_003',
    type: 'stream-tv',
    title: 'Twitch Stream Overlay — 50K+ Viewers',
    location: 'Twitch · @NightOwlGaming',
    pricePerDay: 1.6,
    tags: ['streaming', 'Twitch', 'gaming', 'overlay'],
    impressionsPerDay: 52_000,
    audience: 'Gaming enthusiasts, 18–28, crypto-native',
    owner: '9sL4...7vBm',
    publisherType: 'private',
    ipfsCid: 'QmZ3a5bC6dE7fG8hI9jK0lM1nO2pQ3',
    verified: false,
    description:
      "Stream overlay panel ad on NightOwlGaming's Twitch channel. Average 52K concurrent viewers during peak evening streams. Banner placement bottom-right, non-intrusive.",
  },
  {
    id: 'lst_004',
    type: 'website',
    title: 'Tech Blog Banner — 200K Monthly',
    location: 'DevPulse.io · Above-the-fold',
    pricePerDay: 0.95,
    tags: ['web', 'tech', 'developer', 'banner'],
    impressionsPerDay: 6_700,
    audience: 'Software developers, tech-savvy, 22–45',
    owner: '2kP7...1dRy',
    publisherType: 'commercial',
    ipfsCid: 'QmA4b8cD9eF0gH1iJ2kL3mN4oP5qR6',
    verified: true,
    description:
      'Above-the-fold leaderboard banner on DevPulse.io, a popular tech news aggregator. 728×90 format. Strong developer demographic with high crypto adoption.',
  },
  {
    id: 'lst_005',
    type: 'storefront',
    title: 'Casino Machine Banners',
    location: 'Las Vegas, NV · MGM Grand Floor',
    pricePerDay: 2.4,
    tags: ['casino', 'slots', 'on-floor', 'high-value'],
    impressionsPerDay: 140_000,
    audience: 'Casino floor visitors, 21+, high spenders',
    owner: '5nQ2...8wJk',
    publisherType: 'commercial',
    ipfsCid: 'QmB9c2dE3fF4gG5hH6iI7jJ8kK9lL0',
    verified: true,
    description:
      'Topper banner placements across a block of slot machines on the main casino floor. Rotating creative, high dwell time as players are seated. Premium high-spend foot traffic.',
  },
  {
    id: 'lst_006',
    type: 'mobile',
    title: 'Aerial Blimp Ad — Miami Beach',
    location: 'Miami Beach, FL · Ocean Drive',
    pricePerDay: 9.5,
    tags: ['outdoor', 'aerial', 'Miami', 'beach'],
    impressionsPerDay: 75_000,
    audience: 'Beachgoers, tourists, affluent 25–50',
    owner: '8wE5...3cHp',
    publisherType: 'commercial',
    ipfsCid: 'QmC1d4eE5fF6gG7hH8iI9jJ0kK1lL2',
    verified: false,
    description:
      'Aerial blimp advertisement above Miami Beach during peak season. Flies 10am–6pm daily. 300sqft full-color banner. GPS-tracked flight path available on request.',
  },
  {
    id: 'lst_007',
    type: 'storefront',
    title: 'NYC Boutique Window Display',
    location: 'New York, NY · SoHo District',
    pricePerDay: 3.1,
    tags: ['retail', 'storefront', 'NYC', 'luxury'],
    impressionsPerDay: 28_000,
    audience: 'Urban shoppers, fashion-conscious, 20–45',
    owner: '4tM6...6fNr',
    publisherType: 'private',
    ipfsCid: 'QmD7e6fF7gG8hH9iI0jJ1kK2lL3mM4',
    verified: true,
    description:
      'Premium window display space in a high-end SoHo boutique. Full window takeover available. Located on Prince Street with heavy foot traffic adjacent to multiple luxury brands.',
  },
  {
    id: 'lst_008',
    type: 'mobile',
    title: 'Banner Plane — SoCal Coastline',
    location: 'San Diego, CA · Pacific Beach',
    pricePerDay: 5.5,
    tags: ['outdoor', 'aerial', 'beach', 'banner-plane'],
    impressionsPerDay: 60_000,
    audience: 'Beachgoers, event crowds, 18–45',
    owner: 'Bk7p...2xQa',
    publisherType: 'private',
    ipfsCid: 'QmE8f7gH9iJ0kL1mN2oP3qR4sT5uV6w',
    verified: true,
    description:
      'Banner-towing plane along the Southern California coastline. Flexible routes covering Pacific Beach, Mission Beach and major coastal events. Full-color towed banner, daytime flights.',
  },
];

export const TYPE_ICONS: Record<ListingType, string> = {
  'video-game': '🎮',
  billboard:    '📺',
  'stream-tv':  '📡',
  website:      '🌐',
  mobile:       '🛸',
  storefront:   '🏪',
};

export const TYPE_LABELS: Record<ListingType, string> = {
  'video-game': 'Video Game',
  billboard: 'Billboard',
  'stream-tv': 'Stream/TV',
  website: 'Website',
  mobile: 'Mobile',
  storefront: 'Storefront',
};

export const PUBLISHER_LABELS: Record<PublisherType, string> = {
  commercial: 'Commercial',
  private: 'Private',
};

/** Preview image for a listing: IPFS gateway URL for on-chain listings, else the
 *  generated local asset (seed catalog lives in /public/listings). */
export const listingImage = (l: Pick<Listing, 'id' | 'imageUrl'>): string =>
  l.imageUrl || `/listings/${l.id}.jpg`;
