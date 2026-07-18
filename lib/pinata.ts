import { validateFileContent } from './fileValidation';
import { IPFS_GATEWAY } from './config';

// Public IPFS gateway for reads. Pinning keys live server-side (in /api/upload),
// never in the client bundle.
export { IPFS_GATEWAY };

/**
 * Validate + upload an ad creative to IPFS and return its CID.
 * Validates client-side for fast feedback, then pins via the server-side
 * /api/upload route (which re-validates and holds the Pinata JWT).
 * Returns a mock CID automatically when Pinata isn't configured.
 */
export async function uploadToIPFS(file: File): Promise<string> {
  const check = await validateFileContent(file);
  if (!check.valid) throw new Error(check.error ?? 'Invalid file');

  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/upload', { method: 'POST', body: form });
  const data = (await res.json().catch(() => ({}))) as { cid?: string; error?: string };
  if (!res.ok || !data.cid) throw new Error(data.error || 'Upload failed');
  return data.cid;
}

/** Retrieve JSON metadata from IPFS by CID (best-effort; returns a stub on failure). */
export async function getFromIPFS(cid: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${IPFS_GATEWAY}/${cid}`);
    if (res.ok) return (await res.json()) as Record<string, unknown>;
  } catch {
    /* fall through to stub */
  }
  return { cid, status: 'unavailable', timestamp: Date.now() };
}

/** Gateway URL for a creative CID (image/video src). */
export const ipfsUrl = (cid: string): string => `${IPFS_GATEWAY}/${cid}`;
