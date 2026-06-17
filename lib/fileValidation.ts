// Client-side ad-creative validation — adapted from
// reference/legacy-react-vite/utils/fileValidation.ts (now also enforces the size cap).
import { FILE_SIGNATURES, MAX_FILE_SIZE } from './constants';

export async function validateFileContent(file: File): Promise<{ valid: boolean; error?: string }> {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds the ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB limit` };
  }

  const expected = FILE_SIGNATURES[file.type];
  if (!expected) return { valid: false, error: 'Unsupported file type' };

  try {
    const header = new Uint8Array((await file.arrayBuffer()).slice(0, 4));
    const matches = expected.every((byte, i) => header[i] === byte);
    return matches ? { valid: true } : { valid: false, error: 'File content does not match its type' };
  } catch {
    return { valid: false, error: 'Failed to validate file' };
  }
}
