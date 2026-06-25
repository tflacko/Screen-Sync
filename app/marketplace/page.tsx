import { redirect } from 'next/navigation';

// Listings now live at the root (`/`). Keep this path working for old links.
export default function MarketplaceRedirect() {
  redirect('/');
}
