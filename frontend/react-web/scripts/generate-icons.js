/**
 * Generate placeholder PNG icon files for the PWA manifest.
 *
 * These are minimal valid PNGs (solid blue-purple gradient approximation).
 * Replace with properly designed icons before production deployment.
 *
 * Usage: node scripts/generate-icons.js
 *
 * For proper icons, use the SVG templates in public/icons/ and convert
 * them to PNG using sharp, Inkscape, or any image editor.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

/**
 * Creates a minimal valid PNG file with a solid color fill.
 * Uses raw PNG format with DEFLATE compression.
 */
function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - image data
  // Each row: filter byte (0 = None) + RGB pixels
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter: None

    // Create gradient effect (blue top-left to purple bottom-right)
    const gradientFactor = (y / height);
    const pixelR = Math.round(r + (124 - r) * gradientFactor); // 0x25 -> 0x7C
    const pixelG = Math.round(g + (58 - g) * gradientFactor);  // 0x63 -> 0x3A
    const pixelB = Math.round(b + (237 - b) * gradientFactor); // 0xEB -> 0xED

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      const xFactor = x / width;
      rawData[pixelOffset] = Math.round(pixelR + (124 - pixelR) * xFactor);
      rawData[pixelOffset + 1] = Math.round(pixelG + (58 - pixelG) * xFactor);
      rawData[pixelOffset + 2] = Math.round(pixelB + (237 - pixelB) * xFactor);
    }
  }

  const compressed = deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons with blue-to-purple gradient (brand colors)
const sizes = [192, 512];
const variants = ['', '-maskable'];

for (const size of sizes) {
  for (const variant of variants) {
    const filename = `icon-${size}x${size}${variant}.png`;
    const png = createPng(size, size, 37, 99, 235); // #2563EB base
    writeFileSync(join(iconsDir, filename), png);
    console.log(`Created: ${filename} (${size}×${size})`);
  }
}

console.log('\nPlaceholder icons generated successfully.');
console.log('Replace with properly designed icons from the SVG templates before production.');
