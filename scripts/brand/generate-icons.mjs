#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const iconDir = join(root, "src-tauri", "icons");
const publicDir = join(root, "public");
const brandDir = join(root, "src", "assets", "brand");

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
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const hex = (h) => {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
};

const TILE = hex("#101619");
const TILE_EDGE = hex("#26333a");
const MARK = hex("#e8eef2");
const S = 4;

function roundedRectCoverage(size, x, y, radius) {
  const r = radius;
  const inX = x >= r && x <= size - r;
  const inY = y >= r && y <= size - r;
  if (inX || inY) {
    if (x >= 0 && x <= size && y >= 0 && y <= size) return true;
  }
  const cx = x < r ? r : size - r;
  const cy = y < r ? r : size - r;
  return Math.hypot(x - cx, y - cy) <= r;
}

function sample(size, px, py, { tile }) {
  let markHits = 0;
  let edgeHits = 0;
  let tileHits = 0;
  for (let sy = 0; sy < S; sy += 1) {
    for (let sx = 0; sx < S; sx += 1) {
      const fx = (px + (sx + 0.5) / S) / size;
      const fy = (py + (sy + 0.5) / S) / size;
      if (tile) {
        const inside = roundedRectCoverage(
          size,
          px + (sx + 0.5) / S,
          py + (sy + 0.5) / S,
          size * 0.22,
        );
        if (inside) tileHits += 1;
        const rx = (px + (sx + 0.5) / S - size * 0.22) / (size * 0.56);
        const ry = (py + (sy + 0.5) / S - size * 0.22) / (size * 0.56);
        if (inMark((rx * VB_W) / 1, (ry * VB_H) / 1)) markHits += 1;
      } else {
        if (inMark(fx * VB_W, fy * VB_H)) markHits += 1;
      }
    }
  }
  const n = S * S;
  if (tile) {
    const t = tileHits / n;
    const m = Math.min(markHits / n, t);
    if (t === 0) return null;
    const out = [0, 0, 0, Math.round(t * 255)];
    for (let i = 0; i < 3; i += 1) {
      out[i] = Math.round(TILE[i] * (1 - m) + MARK[i] * m);
    }
    return out;
  }
  const m = markHits / n;
  if (m === 0) return null;
  return [MARK[0], MARK[1], MARK[2], Math.round(m * 255)];
}

function compose(size, opts) {
  const rgba = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const c = sample(size, x, y, opts);
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
  const rgba = compose(size, { tile });
  const label = dir === iconDir ? "src-tauri/icons" : "public";
  writeFileSync(join(dir, file), encodePng(size, size, rgba));
  console.log(
    `wrote ${label}/${file} (${size}x${size}${tile ? "" : ", monochrome"})`,
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
console.log(`\n${targets.length} images generated from the wolf mark`);
