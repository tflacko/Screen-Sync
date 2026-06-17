// File validation utilities

import { FILE_SIGNATURES } from '../../constants/fileSignatures';

export const validateFileContent = async (
  file: File
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer.slice(0, 4));

    const expectedSig = FILE_SIGNATURES[file.type as keyof typeof FILE_SIGNATURES];
    if (!expectedSig) {
      return { valid: false, error: 'Unsupported file type' };
    }

    // Check if file header matches expected signature
    const matches = expectedSig.every((byte, index) => header[index] === byte);

    if (!matches) {
      return { valid: false, error: 'File content does not match file type' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to validate file' };
  }
};
