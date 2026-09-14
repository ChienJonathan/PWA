const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function createGradientPng(width, height, title, isWide) {
  // RGBA buffer: each scanline starts with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // None filter

    const rProg = y / height;
    for (let x = 0; x < width; x++) {
      const cProg = x / width;
      const pixelOffset = rowOffset + 1 + x * 4;

      // Dark futuristic gradient
      let r = Math.round(15 + 20 * rProg + 10 * cProg);
      let g = Math.round(23 + 40 * rProg + 30 * cProg);
      let b = Math.round(42 + 80 * rProg + 60 * cProg);

      // Card mockup in center
      const cardMarginX = isWide ? width * 0.15 : width * 0.08;
      const cardMarginY = isWide ? height * 0.15 : height * 0.12;

      if (x > cardMarginX && x < width - cardMarginX && y > cardMarginY && y < height - cardMarginY) {
        r = 30;
        g = 41;
        b = 59; // Slate-800

        // Titlebar
        if (y < cardMarginY + (isWide ? 48 : 40)) {
          r = 51;
          g = 65;
          b = 85; // Slate-700
        }

        // Inner highlight
        if (x > cardMarginX + 30 && x < width - cardMarginX - 30 && y > cardMarginY + 70 && y < cardMarginY + (isWide ? 220 : 350)) {
          r = Math.round(59 + 60 * cProg); // Primary blue/indigo
          g = Math.round(130 + 40 * cProg);
          b = Math.round(246 - 20 * cProg);
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = 255;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const pubDir = path.join(__dirname, '..', 'public');
const widePng = createGradientPng(1280, 720, 'Desktop', true);
const narrowPng = createGradientPng(750, 1334, 'Mobile', false);

fs.writeFileSync(path.join(pubDir, 'screenshot-wide.png'), widePng);
fs.writeFileSync(path.join(pubDir, 'screenshot-narrow.png'), narrowPng);

console.log('Successfully generated screenshot-wide.png and screenshot-narrow.png in public/');
