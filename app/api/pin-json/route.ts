// Pins listing metadata JSON to IPFS via Pinata (server-side; keeps JWT off the
// client). Falls back to a mock CID when PINATA_JWT is not configured.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const MAX_METADATA_BYTES = 50_000;

export async function POST(req: NextRequest) {
  // Reject oversized bodies before parsing them into memory (DoS guard).
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_METADATA_BYTES + 4096) {
    return NextResponse.json({ error: 'Metadata too large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Expected a JSON object' }, { status: 400 });
  }
  if (JSON.stringify(body).length > MAX_METADATA_BYTES) {
    return NextResponse.json({ error: 'Metadata too large' }, { status: 400 });
  }

  // Mock fallback — lets the create flow run before Pinata is configured.
  if (!PINATA_JWT) {
    const mockCid = `QmMock${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    return NextResponse.json({ cid: mockCid, mock: true });
  }

  try {
    const res = await fetch(PINATA_JSON_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pinataContent: body }),
    });
    if (!res.ok) {
      console.error('[Pinata] pinJSON failed', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
    }
    const data = (await res.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
    return NextResponse.json({ cid: data.IpfsHash });
  } catch (e) {
    console.error('[Pinata] pinJSON error', e);
    return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
  }
}
