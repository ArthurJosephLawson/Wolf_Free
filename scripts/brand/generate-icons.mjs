#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const iconDir = join(root, "src-tauri", "icons");
const publicDir = join(root, "public");
const brandDir = join(root, "src", "assets", "brand");
const spritePath = join(root, "src", "assets", "wolf", "wolf-pixels.json");

const SVG = readFileSync(join(brandDir, "wolf-mark.svg"), "utf8");
const viewBox = SVG.match(/viewBox="([^"]+)"/)[1]
  .split(/\s+/)
  .map(Number);
const VB_W = viewBox[2];
const VB_H = viewBox[3];
const paths = [...SVG.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]);

function parseSubpaths(d) {
  return d
    .split(/[Mm]/)
    .filter((s) => s.trim())
    .map((chunk) =>
      chunk
        .split(/[LlZz]/)
        .filter((s) => s.trim())
        .map((pair) =>
          pair
            .trim()
            .split(/[\s,]+/)
            .map(Number),
        )
        .filter((p) => p.length === 2 && p.every((n) => Number.isFinite(n))),
    )
    .filter((poly) => poly.length >= 3);
}

const subpaths = paths.flatMap(parseSubpaths);
const outline = subpaths[0];
const holes = subpaths.slice(1);

function pip(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const hit =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function inMark(x, y) {
  if (!pip(outline, x, y)) return false;
  return !holes.some((h) => pip(h, x, y));
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hex(value) {
  const s = value.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

const TILE = hex("#101619");
const TILE_EDGE = hex("#26333a");
const MARK = hex("#e8eef2");
const SS = 4;

const sprite = JSON.parse(readFileSync(spritePath, "utf8"));
const spriteRows = sprite.rows;
const spriteRgb = Object.fromEntries(
  Object.entries(sprite.palette).map(([key, value]) => [
    key,
    value ? hex(value) : null,
  ]),
);

const FACE_TOP = 2;
const FACE_BOTTOM = 15;
let faceLeft = Infinity;
let faceRight = -Infinity;
for (let y = FACE_TOP; y <= FACE_BOTTOM; y += 1) {
  const row = spriteRows[y];
  for (let x = 0; x < row.length; x += 1) {
    if (row[x] !== ".") {
      if (x < faceLeft) faceLeft = x;
      if (x > faceRight) faceRight = x;
    }
  }
}
const CROP_W = faceRight - faceLeft + 1;
const CROP_H = FACE_BOTTOM - FACE_TOP + 1;

const RADIUS = 0.22;
const BORDER = 0.012;
const FACE_FILL = 0.8;
const TILE_SAMPLES = SS * SS;

function sdRoundRect(px, py, hw, hh, radius) {
  const qx = Math.abs(px) - hw + radius;
  const qy = Math.abs(py) - hh + radius;
  return (
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  );
}

function tilePixel(size, x, y) {
  const half = size / 2;
  const radius = size * RADIUS;
  const border = Math.max(size * BORDER, 1);
  let r = 0;
  let g = 0;
  let b = 0;
  let hits = 0;
  for (let sy = 0; sy < SS; sy += 1) {
    for (let sx = 0; sx < SS; sx += 1) {
      const px = x + (sx + 0.5) / SS - half;
      const py = y + (sy + 0.5) / SS - half;
      const outer = sdRoundRect(px, py, half, half, radius);
      if (outer > 0) continue;
      const inner = sdRoundRect(
        px,
        py,
        Math.max(half - border, 0),
        Math.max(half - border, 0),
        Math.max(radius - border, 0),
      );
      const c = inner > 0 ? TILE_EDGE : TILE;
      r += c[0];
      g += c[1];
      b += c[2];
      hits += 1;
    }
  }
  if (hits === 0) return [0, 0, 0, 0];
  return [
    Math.round(r / hits),
    Math.round(g / hits),
    Math.round(b / hits),
    Math.round((255 * hits) / TILE_SAMPLES),
  ];
}

function composeFace(size) {
  const rgba = Buffer.alloc(size * size * 4, 0);
  const inner = size * FACE_FILL;
  const scale = Math.min(inner / CROP_W, inner / CROP_H);
  const drawW = scale * CROP_W;
  const drawH = scale * CROP_H;
  const originX = (size - drawW) / 2;
  const originY = (size - drawH) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fx = x + 0.5 - originX;
      const fy = y + 0.5 - originY;
      let color = tilePixel(size, x, y);
      if (fx >= 0 && fy >= 0 && fx < drawW && fy < drawH) {
        const srcX = Math.min(CROP_W - 1, Math.floor((fx / drawW) * CROP_W));
        const srcY = Math.min(CROP_H - 1, Math.floor((fy / drawH) * CROP_H));
        const fur = spriteRgb[spriteRows[FACE_TOP + srcY][faceLeft + srcX]];
        if (fur) color = [fur[0], fur[1], fur[2], 255];
      }
      const o = (y * size + x) * 4;
      rgba[o] = color[0];
      rgba[o + 1] = color[1];
      rgba[o + 2] = color[2];
      rgba[o + 3] = color[3];
    }
  }
  return rgba;
}

function sampleMark(size, px, py) {
  let markHits = 0;
  for (let sy = 0; sy < SS; sy += 1) {
    for (let sx = 0; sx < SS; sx += 1) {
      const fx = (px + (sx + 0.5) / SS) / size;
      const fy = (py + (sy + 0.5) / SS) / size;
      if (inMark(fx * VB_W, fy * VB_H)) markHits += 1;
    }
  }
  const m = markHits / TILE_SAMPLES;
  if (m === 0) return null;
  return [MARK[0], MARK[1], MARK[2], Math.round(m * 255)];
}

function composeMark(size) {
  const rgba = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const c = sampleMark(size, x, y);
      if (!c) continue;
      const o = (y * size + x) * 4;
      rgba[o] = c[0];
      rgba[o + 1] = c[1];
      rgba[o + 2] = c[2];
      rgba[o + 3] = c[3];
    }
  }
  return rgba;
}

mkdirSync(iconDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });

const targets = [
  { file: "32x32.png", dir: iconDir, size: 32, tile: true },
  { file: "44x44.png", dir: iconDir, size: 44, tile: true },
  { file: "128x128.png", dir: iconDir, size: 128, tile: true },
  { file: "128x128@2x.png", dir: iconDir, size: 256, tile: true },
  { file: "icon.png", dir: iconDir, size: 512, tile: true },
  { file: "Square150x150Logo.png", dir: iconDir, size: 150, tile: true },
  { file: "Square44x44Logo.png", dir: iconDir, size: 44, tile: true },
  { file: "StoreLogo.png", dir: iconDir, size: 50, tile: true },
  { file: "tray.png", dir: iconDir, size: 32, tile: false },
  { file: "tray-22.png", dir: iconDir, size: 22, tile: false },
  { file: "tray-16.png", dir: iconDir, size: 16, tile: false },
  { file: "favicon-16.png", dir: publicDir, size: 16, tile: true },
  { file: "favicon-32.png", dir: publicDir, size: 32, tile: true },
  { file: "favicon-64.png", dir: publicDir, size: 64, tile: true },
];

for (const { file, dir, size, tile } of targets) {
  const rgba = tile ? composeFace(size) : composeMark(size);
  const label = dir === iconDir ? "src-tauri/icons" : "public";
  writeFileSync(join(dir, file), encodePng(size, size, rgba));
  console.log(
    `wrote ${label}/${file} (${size}x${size}${tile ? ", wolf face" : ", monochrome mark"})`,
  );
}

const tsPath = paths.join(" ");
const ts = `export const WOLF_VIEWBOX = ${VB_W};\nexport const WOLF_MARK_PATHS = [${paths
  .map((p) => JSON.stringify(p))
  .join(", ")}] as const;\n`;
writeFileSync(join(brandDir, "wolf-mark.ts"), ts);
console.log(
  `wrote src/assets/brand/wolf-mark.ts (${tsPath.length} chars of path data)`,
);
console.log(`\n${targets.length} images generated from the wolf face sprite`);
