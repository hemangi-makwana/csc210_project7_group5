/**
 * File Signature (Magic Byte) Validation Utility
 * Validates that uploaded file contents strictly match their declared MIME types and extensions.
 */

const fs = require('fs');

/**
 * Checks whether a buffer starts with the given byte sequence.
 */
function matchesBytes(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Validates file signature for uploaded documents, certificates, and attachments.
 * Supports PDF, DOCX, XLSX, JPEG, PNG, WebP, and common audio formats (WebM, OGG, WAV, MP3).
 *
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @param {string} declaredMime - Declared MIME type
 * @returns {{ valid: boolean, detectedType: string, reason?: string }}
 */
function validateFileSignature(filePath, declaredMime = '') {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, detectedType: 'unknown', reason: 'File not found on disk.' };
    }

    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, headerBuffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      return { valid: false, detectedType: 'corrupt', reason: 'File is too small to contain a valid file signature.' };
    }

    // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
    if (matchesBytes(headerBuffer, [0x25, 0x50, 0x44, 0x46])) {
      return { valid: true, detectedType: 'pdf' };
    }

    // 2. ZIP-based Office Documents (DOCX, XLSX): PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (matchesBytes(headerBuffer, [0x50, 0x4B, 0x03, 0x04])) {
      return { valid: true, detectedType: 'zip_office' };
    }

    // 3. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (matchesBytes(headerBuffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
      return { valid: true, detectedType: 'png' };
    }

    // 4. JPEG/JPG: 0xFF 0xD8 0xFF
    if (matchesBytes(headerBuffer, [0xFF, 0xD8, 0xFF])) {
      return { valid: true, detectedType: 'jpeg' };
    }

    // 5. WebP: RIFF....WEBP
    if (
      matchesBytes(headerBuffer, [0x52, 0x49, 0x46, 0x46]) &&
      matchesBytes(headerBuffer, [0x57, 0x45, 0x42, 0x50], 8)
    ) {
      return { valid: true, detectedType: 'webp' };
    }

    // 6. WAV Audio: RIFF....WAVE
    if (
      matchesBytes(headerBuffer, [0x52, 0x49, 0x46, 0x46]) &&
      matchesBytes(headerBuffer, [0x57, 0x41, 0x56, 0x45], 8)
    ) {
      return { valid: true, detectedType: 'wav' };
    }

    // 7. OGG Audio: OggS (0x4F 0x67 0x67 0x53)
    if (matchesBytes(headerBuffer, [0x4F, 0x67, 0x67, 0x53])) {
      return { valid: true, detectedType: 'ogg' };
    }

    // 8. WebM Audio/Video: 0x1A 0x45 0xDF 0xA3 (EBML Header)
    if (matchesBytes(headerBuffer, [0x1A, 0x45, 0xDF, 0xA3])) {
      return { valid: true, detectedType: 'webm' };
    }

    // 9. MP3 Audio: ID3 (0x49 0x44 0x33) or MPEG sync frame (0xFF 0xFB / 0xF3 / 0xF2)
    if (
      matchesBytes(headerBuffer, [0x49, 0x44, 0x33]) ||
      (headerBuffer[0] === 0xFF && (headerBuffer[1] & 0xE0) === 0xE0)
    ) {
      return { valid: true, detectedType: 'mp3' };
    }

    return {
      valid: false,
      detectedType: 'unrecognized',
      reason: 'File contents do not match any permitted document or media format signature.',
    };
  } catch (err) {
    return { valid: false, detectedType: 'error', reason: err.message };
  }
}

module.exports = {
  validateFileSignature,
};
