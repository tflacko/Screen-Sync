// Server-side IPFS upload route. Keeps the Pinata JWT off the client and
// re-validates the file (size / MIME / magic bytes) before pinning.
// Falls back to a mock CID when PINATA_JWT is not configured.
import { NextRequest, NextResponse } from 'next/server';
import { FILE_SIGNATURES, MAX_FILE_SIZE } from '@/lib/constants';

export const runtime = 'nodejs';

const PINATA_JWT = process.env.PINATA_JWT || '';
const PINATA_PIN_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

/** Server-side mirror of lib/fileValidation — never trust the client. */
function validate(type: string, header: Uint8Array, size: number): string | null {
  if (size > MAX_FILE_SIZE) {
    return `File exceeds the ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB limit`;
  }
  const expected = FILE_SIGNATURES[type];
  if (!expected) return 'Unsupported file type';
  const ok = expected.every((byte, i) => header[i] === byte);
  return ok ? null : 'File content does not match its type';
}

export async function POST(req: NextRequest) {
  // Reject oversized bodies before reading them into memory (DoS guard).
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_FILE_SIZE + 4096) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  // Check size before reading the body; read only the first bytes for the magic check.
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const err = validate(file.type, header, file.size);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // Mock fallback — lets the create-listing flow work before Pinata is set up.
  if (!PINATA_JWT) {
    const mockCid = `QmMock${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    return NextResponse.json({ cid: mockCid, mock: true });
  }

  try {
    const pinForm = new FormData();
    pinForm.append('file', file, file.name);
    pinForm.append('pinataMetadata', JSON.stringify({ name: file.name }));

    const res = await fetch(PINATA_PIN_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: pinForm,
    });

    if (!res.ok) {
      console.error('[Pinata] pin failed', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
    }
    const data = (await res.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
    return NextResponse.json({ cid: data.IpfsHash });
  } catch (e) {
    console.error('[Pinata] error', e);
    return NextResponse.json({ error: 'Pinning failed' }, { status: 502 });
  }
}
