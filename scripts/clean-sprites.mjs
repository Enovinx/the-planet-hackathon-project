import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { resolve } from 'node:path';

const argIds = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const FILES = argIds.length > 0 ? argIds : [44, 45, 48, 49];
const NEAR_WHITE_DIFF = 12;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function decodePng(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let palette = null;
  let trns = null;
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'PLTE') {
      palette = Buffer.from(data);
    } else if (type === 'tRNS') {
      trns = Buffer.from(data);
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2 && colorType !== 3) || interlace !== 0) {
    throw new Error(`unsupported png: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }

  const raw = inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);

  // un-filter (reverse PNG filters 0-4)
  const lines = [];
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const lineStart = y * (stride + 1) + 1;
    const cur = Buffer.from(raw.subarray(lineStart, lineStart + stride));
    const prev = y > 0 ? lines[y - 1] : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = cur[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      cur[x] = v;
    }
    lines[y] = cur;
  }

  // expand to RGBA
  for (let y = 0; y < height; y++) {
    const line = lines[y];
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 6) {
        line.copy(out, o, x * 4, x * 4 + 4);
      } else if (colorType === 2) {
        out[o] = line[x * 3];
        out[o + 1] = line[x * 3 + 1];
        out[o + 2] = line[x * 3 + 2];
        out[o + 3] = 255;
      } else {
        const idx = line[x];
        out[o] = palette[idx * 3];
        out[o + 1] = palette[idx * 3 + 1];
        out[o + 2] = palette[idx * 3 + 2];
        out[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      }
    }
  }
  return { width, height, rgba: out };
}

function isNearWhite(o, rgba) {
  if (rgba[o + 3] === 0) return true;
  return (
    rgba[o] >= 255 - NEAR_WHITE_DIFF &&
    rgba[o + 1] >= 255 - NEAR_WHITE_DIFF &&
    rgba[o + 2] >= 255 - NEAR_WHITE_DIFF
  );
}

const VERIFY = process.argv.includes('--verify');
for (const id of FILES) {
  const path = resolve('public/assets', `spritepaint ${id}.png`);
  if (VERIFY) {
    const v = decodePng(path);
    const px = (x, y) => {
      const o = (y * v.width + x) * 4;
      return [v.rgba[o], v.rgba[o + 1], v.rgba[o + 2], v.rgba[o + 3]];
    };
    let opaque = 0;
    let whiteOpaque = 0;
    let minX = v.width, minY = v.height, maxX = -1, maxY = -1;
    for (let y = 0; y < v.height; y++) {
      for (let x = 0; x < v.width; x++) {
        const [r, g, b, a] = px(x, y);
        if (a !== 0) {
          opaque++;
          if (r >= 243 && g >= 243 && b >= 243) whiteOpaque++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    const corners = [px(0, 0), px(v.width - 1, 0), px(0, v.height - 1), px(v.width - 1, v.height - 1)];
    const cornersClear = corners.every((c) => c[3] === 0);
    const tight = minX === 0 && minY === 0 && maxX === v.width - 1 && maxY === v.height - 1;
    console.log(
      `verify ${id}: ${v.width}x${v.height} opaque=${opaque} whiteOpaque=${whiteOpaque} cornersClear=${cornersClear} cropTight=${tight}`,
    );
    continue;
  }
  const { width, height, rgba } = decodePng(path);
  console.log(`spritepaint ${id}: ${width}x${height} loaded`);

  // flood fill from every border pixel through near-white pixels
  const visited = new Uint8Array(width * height);
  const queue = [];
  const visit = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isNearWhite(o, rgba)) return;
    visited[i] = 1;
    queue.push(i);
    rgba[o] = 0;
    rgba[o + 1] = 0;
    rgba[o + 2] = 0;
    rgba[o + 3] = 0;
  };
  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y);
    visit(width - 1, y);
  }
  while (queue.length) {
    const i = queue.pop();
    const x = i % width;
    const y = (i / width) | 0;
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }

  // bounding box of remaining visible pixels
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (rgba[o + 3] !== 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('image fully erased');

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = Buffer.alloc(cropW * cropH * 4);
  for (let y = 0; y < cropH; y++) {
    const srcRow = ((minY + y) * width + minX) * 4;
    rgba.copy(cropped, y * cropW * 4, srcRow, srcRow + cropW * 4);
  }

  writeFileSync(path, encodePng(cropW, cropH, cropped));
  console.log(`  -> cleaned in place: ${cropW}x${cropH} (was ${width}x${height})`);
}
