#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sprite = JSON.parse(
  readFileSync(join(root, "src", "assets", "wolf", "wolf-pixels.json"), "utf8"),
);

const { width: W, height: H, rows, palette } = sprite;
const problems = [];
const fail = (msg) => problems.push(msg);

if (rows.length !== H) fail(`height is ${rows.length}, declared ${H}`);
if (W < 24 || W > 32) fail(`width ${W} is outside the 24-32 spec range`);
if (H < 24 || H > 32) fail(`height ${H} is outside the 24-32 spec range`);

rows.forEach((row, i) => {
  if (row.length !== W) {
    fail(
      `row ${i} is ${row.length} chars, expected ${W} (off by ${row.length - W})`,
    );
  }
  for (const ch of row) {
    if (!(ch in palette)) fail(`row ${i} uses unknown pixel "${ch}"`);
  }
});

function isSymmetric(row) {
  for (let p = 0; p < row.length; p += 1) {
    if (row[p] !== row[W - 1 - p]) return false;
  }
  return true;
}

rows.forEach((row, i) => {
  if (row.length === W && !isSymmetric(row)) {
    const first = [...row].findIndex((c, p) => c !== row[W - 1 - p]);
    fail(
      `row ${i} is not left/right symmetric (first mismatch at column ${first})`,
    );
  }
});

const EYE_ROWS = [10, 11];
for (const y of EYE_ROWS) {
  if (!rows[y] || !rows[y].includes("K"))
    fail(`eye row ${y} has no dark pixel`);
}

if (!rows[17] || !rows[17].includes("K")) fail("row 17 has no mouth line");

const firstInk = rows.findIndex((row) => /[A-Z]/.test(row));
if (firstInk < 2)
  fail(
    `only ${firstInk} clear row(s) above the artwork; need 2 for animation headroom`,
  );

const used = new Set(rows.join("").split(""));
const unused = Object.keys(palette).filter((k) => k !== "." && !used.has(k));
if (unused.length) {
  console.log(
    `note: palette entries unused in the base sprite: ${unused.join(", ")}`,
  );
}

if (problems.length === 0) {
  console.log(`sprite ok: ${W}x${H}, symmetric, ${firstInk} rows of headroom`);
  process.exit(0);
}

console.error(`${problems.length} problem(s):`);
for (const p of problems) console.error(`  - ${p}`);
process.exit(1);
