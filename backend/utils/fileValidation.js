/**
 * File Signature (Magic Byte) Validation Utility
 * Validates that uploaded file contents strictly match their declared MIME types and extensions.
 */

const fs = require('fs');
const path = require('path');

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
 * Validates file signature for uploaded documents, certificates, images, and voice notes.
 * Supports PDF, DOCX, XLSX, JPEG, PNG, WebP, GIF, and audio formats (WebM, OGG, WAV, MP3, M4A/MP4).
 *
 * @param {string} filePath - Absolute path to uploaded file on disk
 * @param {string} [declaredMime=''] - Declared MIME type
 * @param {string} [originalName=''] - Original filename for extension cross-checking
 * @returns {{ valid: boolean, detectedType: string, category?: string, canonicalMime?: string, reason?: string }}
 */
function validateFileSignature(filePath, declaredMime = '', originalName = '') {
  try {
    if (!fs.existsSync(filePath)) {
      return { valid: false, detectedType: 'unknown', reason: 'File not found on disk.' };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { valid: false, detectedType: 'empty', reason: 'Uploaded file is empty (0 bytes).' };
    }

    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, headerBuffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      return { valid: false, detectedType: 'corrupt', reason: 'File is too small to contain a valid file signature.' };
    }

    let detected = null;

    // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
    if (matchesBytes(headerBuffer, [0x25, 0x50, 0x44, 0x46])) {
      detected = { valid: true, detectedType: 'pdf', category: 'document', canonicalMime: 'application/pdf' };
    }
    // 2. ZIP-based Office Documents (DOCX, XLSX): PK\x03\x04 (0x50 0x4B 0x03 0x04)
    else if (matchesBytes(headerBuffer, [0x50, 0x4B, 0x03, 0x04])) {
      const ext = path.extname(originalName || filePath).toLowerCase();
      const canonicalMime = ext === '.xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      detected = { valid: true, detectedType: 'zip_office', category: 'document', canonicalMime };
    }
    // 3. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    else if (matchesBytes(headerBuffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
      detected = { valid: true, detectedType: 'png', category: 'image', canonicalMime: 'image/png' };
    }
    // 4. JPEG/JPG: 0xFF 0xD8 0xFF
    else if (matchesBytes(headerBuffer, [0xFF, 0xD8, 0xFF])) {
      detected = { valid: true, detectedType: 'jpeg', category: 'image', canonicalMime: 'image/jpeg' };
    }
    // 5. GIF: GIF87a / GIF89a (0x47 0x49 0x46 0x38)
    else if (matchesBytes(headerBuffer, [0x47, 0x49, 0x46, 0x38])) {
      detected = { valid: true, detectedType: 'gif', category: 'image', canonicalMime: 'image/gif' };
    }
    // 6. WebP: RIFF....WEBP
    else if (
      matchesBytes(headerBuffer, [0x52, 0x49, 0x46, 0x46]) &&
      matchesBytes(headerBuffer, [0x57, 0x45, 0x42, 0x50], 8)
    ) {
      detected = { valid: true, detectedType: 'webp', category: 'image', canonicalMime: 'image/webp' };
    }
    // 7. WAV Audio: RIFF....WAVE
    else if (
      matchesBytes(headerBuffer, [0x52, 0x49, 0x46, 0x46]) &&
      matchesBytes(headerBuffer, [0x57, 0x41, 0x56, 0x45], 8)
    ) {
      detected = { valid: true, detectedType: 'wav', category: 'audio', canonicalMime: 'audio/wav' };
    }
    // 8. OGG Audio: OggS (0x4F 0x67 0x67 0x53)
    else if (matchesBytes(headerBuffer, [0x4F, 0x67, 0x67, 0x53])) {
      detected = { valid: true, detectedType: 'ogg', category: 'audio', canonicalMime: 'audio/ogg' };
    }
    // 9. WebM Audio/Video: 0x1A 0x45 0xDF 0xA3 (EBML Header)
    else if (matchesBytes(headerBuffer, [0x1A, 0x45, 0xDF, 0xA3])) {
      detected = { valid: true, detectedType: 'webm', category: 'audio', canonicalMime: 'audio/webm' };
    }
    // 10. MP3 Audio: ID3 (0x49 0x44 0x33) or MPEG sync frame (0xFF 0xFB / 0xF3 / 0xF2)
    else if (
      matchesBytes(headerBuffer, [0x49, 0x44, 0x33]) ||
      (headerBuffer[0] === 0xFF && (headerBuffer[1] & 0xE0) === 0xE0)
    ) {
      detected = { valid: true, detectedType: 'mp3', category: 'audio', canonicalMime: 'audio/mpeg' };
    }
    // 11. M4A / MP4 Audio Container: ....ftyp (0x66 0x74 0x79 0x70 at offset 4)
    else if (matchesBytes(headerBuffer, [0x66, 0x74, 0x79, 0x70], 4)) {
      detected = { valid: true, detectedType: 'm4a', category: 'audio', canonicalMime: 'audio/mp4' };
    }

    if (!detected) {
      return {
        valid: false,
        detectedType: 'unrecognized',
        reason: 'File contents do not match any permitted document, image, or audio format signature.',
      };
    }

    // Cross-check extension / MIME category when provided so disguised files are rejected
    const cleanMime = String(declaredMime || '').toLowerCase().split(';')[0].trim();
    const ext = path.extname(originalName || '').toLowerCase();

    if (cleanMime && cleanMime !== 'application/octet-stream') {
      if (cleanMime.startsWith('image/') && detected.category !== 'image') {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File signature (${detected.detectedType}) does not match declared image MIME type (${cleanMime}).`,
        };
      }
      if (cleanMime.startsWith('audio/') && detected.category !== 'audio') {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File signature (${detected.detectedType}) does not match declared audio MIME type (${cleanMime}).`,
        };
      }
      if (
        (cleanMime === 'application/pdf' && detected.detectedType !== 'pdf') ||
        ((cleanMime.includes('officedocument') || cleanMime.includes('msword')) && detected.detectedType !== 'zip_office')
      ) {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File signature (${detected.detectedType}) does not match declared document type (${cleanMime}).`,
        };
      }
    }

    if (ext) {
      const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
      const docExts = ['.pdf', '.docx', '.xlsx'];
      const audioExts = ['.webm', '.ogg', '.wav', '.mp3', '.m4a', '.mp4'];
      if (imageExts.includes(ext) && detected.category !== 'image') {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File extension (${ext}) does not match detected content (${detected.detectedType}).`,
        };
      }
      if (docExts.includes(ext) && detected.category !== 'document') {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File extension (${ext}) does not match detected content (${detected.detectedType}).`,
        };
      }
      if (audioExts.includes(ext) && detected.category !== 'audio') {
        return {
          valid: false,
          detectedType: detected.detectedType,
          reason: `File extension (${ext}) does not match detected content (${detected.detectedType}).`,
        };
      }
    }

    return detected;
  } catch (err) {
    return { valid: false, detectedType: 'error', reason: err.message };
  }
}

module.exports = {
  validateFileSignature,
};
