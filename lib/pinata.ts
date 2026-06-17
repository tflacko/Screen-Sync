import { validateFileContent } from './fileValidation';

// Public IPFS gateway for reads; pinning keys live server-side (never expose secrets client-side).
export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

/** Stub: validate + upload a file to IPFS via Pinata and return its CID */
export async function uploadToIPFS(file: File): Promise<string> {
  const check = await validateFileContent(file);
  if (!check.valid) throw new Error(check.error ?? 'Invalid file');
  console.log('[Screen Sync] uploadToIPFS stub → filename:', file.name);
  await new Promise((r) => setTimeout(r, 1500));
  const mockCid = `QmMock${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
  return mockCid;
}

/** Stub: retrieve metadata from IPFS by CID */
export async function getFromIPFS(cid: string): Promise<Record<string, unknown>> {
  console.log('[Screen Sync] getFromIPFS stub → cid:', cid);
  await new Promise((r) => setTimeout(r, 400));
  return { cid, status: 'mock', timestamp: Date.now() };
}

/** Stub: pin an existing CID to Pinata */
export async function pinByCID(cid: string): Promise<boolean> {
  console.log('[Screen Sync] pinByCID stub → cid:', cid);
  await new Promise((r) => setTimeout(r, 600));
  return true;
}
