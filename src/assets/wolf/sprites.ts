import spriteData from "./wolf-pixels.json";

type Pixel = string;

export type Matrix = readonly string[];

type Rows = string[];

interface WolfSpriteData {
  name: string;
  width: number;
  height: number;
  palette: Record<string, string | null>;
  rows: string[];
  authoring: string;
}

const data = spriteData as unknown as WolfSpriteData;

export const SPRITE_WIDTH = data.width;
export const SPRITE_HEIGHT = data.height;
export const PALETTE: Readonly<Record<string, string | null>> = data.palette;
export const BASE: Matrix = data.rows;

type ColorName =
  | "outline"
  | "fur"
  | "furLight"
  | "light"
  | "white"
  | "pink"
  | "cavity"
  | "tear";

function requireColor(key: string): string {
  const value = PALETTE[key];
  if (value == null) {
    throw new Error(
      `wolf-pixels.json is missing an opaque color for "${key}"`,
    );
  }
  return value;
}

export const COLOR: Readonly<Record<ColorName, string>> = {
  outline: requireColor("K"),
  fur: requireColor("B"),
  furLight: requireColor("C"),
  light: requireColor("L"),
  white: requireColor("W"),
  pink: requireColor("P"),
  cavity: requireColor("R"),
  tear: requireColor("T"),
};

function clone(matrix: Matrix): Rows {
  return matrix.slice();
}

function assertSameShape(matrix: Matrix): void {
  const width = matrix[0]?.length ?? 0;
  for (let i = 1; i < matrix.length; i += 1) {
    if (matrix[i]!.length !== width) {
      throw new Error(
        `sprite row ${i} is ${matrix[i]!.length} wide, expected ${width}`,
      );
    }
  }
}

function rowWidth(matrix: Matrix): number {
  return matrix[0]?.length ?? 0;
}

export function swap(matrix: Matrix, from: Pixel, to: Pixel): Matrix {
  return matrix.map((row) => row.split(from).join(to));
}

export function stamp(
  matrix: Matrix,
  row: number,
  col: number,
  text: string,
): Rows {
  const out = clone(matrix);
  const width = rowWidth(out);
  if (row < 0 || row >= out.length) return out;
  for (let i = 0; i < text.length; i += 1) {
    const x = col + i;
    if (x < 0 || x >= width) continue;
    const next = out[row]!.split("");
    next[x] = text[i]!;
    out[row] = next.join("");
  }
  return out;
}

export function shiftRows(
  matrix: Matrix,
  fromRow: number,
  toRow: number,
  dx: number,
): Matrix {
  const out = clone(matrix);
  const width = rowWidth(out);
  for (
    let y = Math.max(0, fromRow);
    y <= Math.min(out.length - 1, toRow);
    y += 1
  ) {
    const src = out[y]!.split("");
    const chars = new Array<string>(width).fill(".");
    for (let x = 0; x < width; x += 1) {
      const target = x + dx;
      if (target >= 0 && target < width) chars[target] = src[x]!;
    }
    out[y] = chars.join("");
  }
  return out;
}

function shiftRowsVertical(
  matrix: Matrix,
  fromRow: number,
  toRow: number,
  dy: number,
): Rows {
  const out = clone(matrix);
  const width = rowWidth(out);
  const block = out.slice(fromRow, toRow + 1);
  for (let y = fromRow; y <= toRow; y += 1) out[y] = ".".repeat(width);
  block.forEach((row, i) => {
    const y = fromRow + i + dy;
    if (y >= 0 && y < out.length) out[y] = row;
  });
  return out;
}

function shiftRegionH(
  matrix: Matrix,
  fromRow: number,
  toRow: number,
  fromCol: number,
  toCol: number,
  dx: number,
): Rows {
  const out = clone(matrix);
  const width = rowWidth(out);
  for (let y = fromRow; y <= toRow; y += 1) {
    if (y < 0 || y >= out.length) continue;
    const src = out[y]!.split("");
    const chars = src.slice();
    for (let x = fromCol; x <= toCol; x += 1) {
      const target = x + dx;
      chars[x] = target >= 0 && target < width ? src[target]! : ".";
    }
    out[y] = chars.join("");
  }
  return out;
}

export function shiftVertical(matrix: Matrix, dy: number): Matrix {
  if (dy === 0) return clone(matrix);
  const out = new Array<string>(matrix.length).fill(
    ".".repeat(rowWidth(matrix)),
  );
  for (let y = 0; y < matrix.length; y += 1) {
    const target = y + dy;
    if (target < 0 || target >= matrix.length) continue;
    out[target] = matrix[y]!;
  }
  return out;
}

export function scaleBand(
  matrix: Matrix,
  topRow: number,
  bottomRow: number,
  factor: number,
  anchorRow: number,
): Matrix {
  const out = clone(matrix);
  const srcTop = Math.max(0, topRow);
  const srcBottom = Math.min(matrix.length - 1, bottomRow);
  const height = srcBottom - srcTop + 1;
  if (height <= 0 || factor <= 0) return out;

  for (let y = srcTop; y <= srcBottom; y += 1) {
    const fromAnchor = y - anchorRow;
    const sourceY = Math.round(anchorRow + fromAnchor * factor);
    const clamped = Math.min(matrix.length - 1, Math.max(0, sourceY));
    out[y] = matrix[clamped]!;
  }
  return out;
}

export function overlay(
  base: Matrix,
  overlayMatrix: Matrix,
  row: number,
  col: number,
): Rows {
  const out = clone(base);
  for (let y = 0; y < overlayMatrix.length; y += 1) {
    const targetRow = row + y;
    if (targetRow < 0 || targetRow >= out.length) continue;
    const chars = out[targetRow]!.split("");
    for (let x = 0; x < overlayMatrix[y]!.length; x += 1) {
      const ch = overlayMatrix[y]![x]!;
      if (ch === ".") continue;
      const targetCol = col + x;
      if (targetCol < 0 || targetCol >= chars.length) continue;
      chars[targetCol] = ch;
    }
    out[targetRow] = chars.join("");
  }
  return out;
}

function mirrorRow(text: string): string {
  return text.split("").reverse().join("");
}

const EAR_TOP = 2;
const EAR_BOTTOM = 4;
const EAR_LEFT_COL = 8;
const EAR_RIGHT_COL = 16;

const HEAD_TOP = 5;
const HEAD_BOTTOM = 14;

const EYE_ROW = 7;
const EYE_LEFT_COL = 9;
const EYE_RIGHT_COL = 15;

const SNOUT_TOP = 10;
const SNOUT_BOTTOM = 14;
const MOUTH_ROW = 13;
const MOUTH_COL = 12;

const CHEST: ReadonlyArray<readonly [number, number, number]> = [
  [18, 10, 17],
  [19, 11, 16],
  [20, 12, 15],
  [21, 13, 14],
];

const JAW = BASE[HEAD_BOTTOM]!;

type EyePatch = readonly string[];

const EYE_HAPPY: EyePatch = [".KK.", "KBBK", "BBBB"];
const EYE_BLINK: EyePatch = ["BBBB", "KKKK", "BBBB"];

const EYE_ARC: EyePatch = ["KBBK", "BKKB"];

const EYE_DOT: EyePatch = ["BKKB", "BKKB", "BBBB"];
const EYE_TIGHT: EyePatch = ["KKKK", "BBBB", "BBBB"];
const EYE_FLAT: EyePatch = ["KKKK", "KKKK", "BBBB"];

function applyEyes(matrix: Matrix, patch: EyePatch): Matrix {
  const mirrored = patch.map(mirrorRow);
  let out = overlay(matrix, patch, EYE_ROW, EYE_LEFT_COL);
  out = overlay(out, mirrored, EYE_ROW, EYE_RIGHT_COL);
  return out;
}

const SPARKLE: Matrix = [".W.", "WWW", ".W."];

const HEART: Matrix = ["P.P", "PPP", ".P."];

const HEART_TAIL: Matrix = ["P"];
const BREATH: Matrix = [".W.", "W..", "..W"];

const SOUND: Matrix = [".L", "LL", "L."];

export type WolfState =
  | "idle"
  | "blink"
  | "speaking"
  | "listening"
  | "happy"
  | "winking"
  | "huffing"
  | "puffing"
  | "sad"
  | "held"
  | "land";

export const WOLF_STATES: readonly WolfState[] = [
  "idle",
  "blink",
  "speaking",
  "listening",
  "happy",
  "winking",
  "huffing",
  "puffing",
  "sad",
  "held",
  "land",
];

function raiseHead(matrix: Matrix, by: number): Matrix {
  if (by === 0) return clone(matrix);
  const out = shiftRowsVertical(matrix, HEAD_TOP - 3, HEAD_BOTTOM, -by);
  for (let i = 0; i < by; i += 1) {
    out[HEAD_BOTTOM - i] = JAW;
  }
  return out;
}

function raiseHeadOnly(matrix: Matrix, by: number): Matrix {
  if (by === 0) return clone(matrix);
  const out = shiftRowsVertical(matrix, HEAD_TOP, HEAD_BOTTOM, -by);
  for (let i = 0; i < by; i += 1) {
    out[HEAD_BOTTOM - i] = JAW;
  }
  return out;
}

function lowerHead(matrix: Matrix, by: number): Matrix {
  if (by === 0) return clone(matrix);
  const out = shiftRowsVertical(matrix, HEAD_TOP - 3, HEAD_BOTTOM, by);
  for (let i = 0; i < by; i += 1) {
    out[HEAD_TOP - 3 + i] = ".".repeat(SPRITE_WIDTH);
  }
  return out;
}

function withoutGround(matrix: Matrix): Rows {
  const out = clone(matrix);
  out[SPRITE_HEIGHT - 1] = ".".repeat(SPRITE_WIDTH);
  return out;
}

function raiseSnout(matrix: Matrix, by: number): Matrix {
  if (by === 0) return clone(matrix);
  const out = shiftRowsVertical(matrix, SNOUT_TOP, SNOUT_BOTTOM, -by);
  for (let i = 0; i < by; i += 1) {
    out[SNOUT_BOTTOM - i] = BASE[SNOUT_BOTTOM]!;
  }
  return out;
}

function drawChest(matrix: Matrix, dy = 0, grow = 0): Matrix {
  const out = clone(matrix);
  for (const [row, start, end] of CHEST) {
    const y = row + dy;
    if (y < 0 || y >= out.length) continue;
    const chars = out[y]!.split("");
    for (let x = start - grow; x <= end + grow; x += 1) {
      if (x < 0 || x >= chars.length) continue;
      chars[x] = "W";
    }
    out[y] = chars.join("");
  }
  return out;
}

function perkEar(
  matrix: Matrix,
  side: "left" | "right",
  amount: number,
): Matrix {
  if (amount === 0) return clone(matrix);

  const dx = side === "left" ? amount : -amount;
  const from = side === "left" ? EAR_LEFT_COL - amount : EAR_RIGHT_COL;
  const to = side === "left" ? EAR_LEFT_COL + 3 : EAR_RIGHT_COL + 3 + amount;
  return shiftRegionH(matrix, EAR_TOP, EAR_BOTTOM, from, to, dx);
}

function moveEar(matrix: Matrix, side: "left" | "right", dy: number): Matrix {
  if (dy === 0) return clone(matrix);
  const col = side === "left" ? EAR_LEFT_COL : EAR_RIGHT_COL;
  const out = clone(matrix);
  const block = out
    .slice(EAR_TOP, EAR_BOTTOM + 1)
    .map((row) => row.slice(col, col + 4));
  for (let y = EAR_TOP; y <= EAR_BOTTOM; y += 1) {
    const chars = out[y]!.split("");
    for (let x = col; x <= col + 3; x += 1) chars[x] = ".";
    out[y] = chars.join("");
  }
  block.forEach((row, i) => {
    const y = EAR_TOP + i + dy;
    if (y < 0 || y >= out.length) return;
    const chars = out[y]!.split("");

    for (let x = col; x <= col + 3; x += 1) chars[x] = ".";
    for (let k = 0; k < 4; k += 1) {
      if (row[k] === ".") continue;
      chars[col + k] = row[k]!;
    }
    out[y] = chars.join("");
  });
  return out;
}

function liftEars(matrix: Matrix, dy: number): Matrix {
  if (dy === 0) return clone(matrix);
  const out = clone(matrix);
  const block = out.slice(EAR_TOP, EAR_BOTTOM + 1);
  for (let y = EAR_TOP; y <= EAR_BOTTOM; y += 1) {
    const chars = out[y]!.split("");
    for (let x = EAR_LEFT_COL; x <= EAR_LEFT_COL + 3; x += 1) chars[x] = ".";
    for (let x = EAR_RIGHT_COL; x <= EAR_RIGHT_COL + 3; x += 1) chars[x] = ".";
    out[y] = chars.join("");
  }
  block.forEach((row, i) => {
    const y = EAR_TOP + i + dy;
    if (y < 0 || y >= out.length) return;
    const chars = out[y]!.split("");

    for (let x = EAR_LEFT_COL; x <= EAR_LEFT_COL + 3; x += 1) chars[x] = ".";
    for (let x = EAR_RIGHT_COL; x <= EAR_RIGHT_COL + 3; x += 1) chars[x] = ".";
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === ".") continue;
      const inLeft = x >= EAR_LEFT_COL && x <= EAR_LEFT_COL + 3;
      const inRight = x >= EAR_RIGHT_COL && x <= EAR_RIGHT_COL + 3;
      if (!inLeft && !inRight) continue;
      chars[x] = row[x]!;
    }
    out[y] = chars.join("");
  });
  return out;
}

function widenMuzzle(matrix: Matrix, by: number): Matrix {
  if (by === 0) return clone(matrix);
  const out = clone(matrix);
  const leftEdge = 8;
  const rightEdge = SPRITE_WIDTH - 1 - leftEdge;
  for (let y = SNOUT_TOP; y <= SNOUT_BOTTOM; y += 1) {
    const chars = out[y]!.split("");
    for (let x = leftEdge - by; x < leftEdge; x += 1) {
      chars[x] = x === leftEdge - by ? "K" : "B";
    }
    for (let x = rightEdge + 1; x <= rightEdge + by; x += 1) {
      chars[x] = x === rightEdge + by ? "K" : "B";
    }
    chars[leftEdge] = "B";
    chars[rightEdge] = "B";
    out[y] = chars.join("");
  }
  return out;
}

const MOUTH_CLOSED = "KKKK";

const _mouthGuard = BASE[MOUTH_ROW]!.slice(MOUTH_COL, MOUTH_COL + 4);
if (_mouthGuard !== MOUTH_CLOSED) {
  throw new Error(
    `wolf-pixels.json mouth moved: expected "${MOUTH_CLOSED}" at row ${MOUTH_ROW} cols ${MOUTH_COL}-${MOUTH_COL + 3}, found "${_mouthGuard}"`,
  );
}

export function framesFor(state: WolfState): Matrix[] {
  switch (state) {
    case "idle": {
      const rest = BASE;
      const up = raiseHead(rest, 1);

      const breath = drawChest(up, 0, 1);
      return [rest, up, breath, rest];
    }

    case "blink": {
      return [
        applyEyes(BASE, EYE_BLINK),
        applyEyes(BASE, EYE_ARC),
        applyEyes(BASE, EYE_HAPPY),
      ];
    }

    case "speaking": {
      const eyes = applyEyes(BASE, EYE_HAPPY);
      const slight = stamp(
        stamp(eyes, MOUTH_ROW, MOUTH_COL, "RRRR"),
        MOUTH_ROW + 1,
        MOUTH_COL,
        "WPPW",
      );
      const wide = stamp(
        stamp(eyes, MOUTH_ROW - 1, MOUTH_COL, "WRRW"),
        MOUTH_ROW,
        MOUTH_COL,
        "KPPK",
      );
      const grin = stamp(eyes, MOUTH_ROW, MOUTH_COL, "KWWK");
      return [eyes, slight, wide, grin];
    }

    case "listening": {
      const dots = applyEyes(BASE, EYE_DOT);
      const cocked = perkEar(dots, "left", 1);
      const twitch = moveEar(cocked, "right", 1);
      const tilt = shiftRegionH(
        dots,
        HEAD_TOP - 3,
        HEAD_BOTTOM,
        0,
        SPRITE_WIDTH - 1,
        -1,
      );
      return [cocked, twitch, overlay(tilt, SOUND, 3, 21)];
    }

    case "happy": {
      const blusher = stamp(
        stamp(BASE, MOUTH_ROW - 3, 9, "PP"),
        MOUTH_ROW - 3,
        17,
        "PP",
      );

      const cavity = stamp(blusher, MOUTH_ROW - 1, MOUTH_COL, "RRRR");
      const tongue = stamp(
        stamp(cavity, MOUTH_ROW, 13, "PP"),
        MOUTH_ROW + 1,
        13,
        "PP",
      );
      const tight = applyEyes(tongue, EYE_TIGHT);

      const perked = raiseHeadOnly(liftEars(tight, -2), 2);
      const sparkled = overlay(
        overlay(perked, SPARKLE, 0, 2),
        SPARKLE,
        1,
        SPRITE_WIDTH - 5,
      );
      return [sparkled, perked, overlay(perked, SPARKLE, 2, 4), tight];
    }

    case "winking": {
      const wink = applyEyes(BASE, EYE_BLINK);
      const squeeze = applyEyes(BASE, EYE_ARC);

      const dip = (m: Matrix) => liftEars(m, 1);
      return [
        overlay(dip(wink), HEART, 5, 21),
        overlay(dip(squeeze), HEART, 3, 21),
        overlay(applyEyes(BASE, EYE_HAPPY), HEART_TAIL, 1, 22),
      ];
    }

    case "huffing": {
      const snout = raiseSnout(BASE, 1);

      const browed = stamp(
        stamp(snout, EYE_ROW - 1, 12, "K"),
        EYE_ROW - 1,
        15,
        "K",
      );
      const flat = perkEar(perkEar(browed, "left", 1), "right", 1);

      const steam = (row: number, left: number) =>
        overlay(
          overlay(flat, BREATH, row, left),
          BREATH,
          row,
          SPRITE_WIDTH - 3 - left,
        );
      return [flat, steam(EYE_ROW, 10), steam(EYE_ROW - 1, 11)];
    }

    case "puffing": {
      const cheeks = widenMuzzle(applyEyes(BASE, EYE_FLAT), 2);
      const sunk = lowerHead(cheeks, 2);
      return [
        overlay(sunk, BREATH, 14, 21),
        overlay(sunk, SPARKLE, 13, 21),
        overlay(sunk, SPARKLE, 12, 21),
      ];
    }

    case "sad": {
      const drooped = liftEars(applyEyes(BASE, EYE_ARC), 2);
      const frown = stamp(
        stamp(drooped, MOUTH_ROW, MOUTH_COL, "KBBK"),
        MOUTH_ROW + 1,
        MOUTH_COL,
        "BKKB",
      );
      const tearAt = (y: number) => stamp(frown, y, 16, "T");
      return [tearAt(9), tearAt(10), tearAt(11), tearAt(12)];
    }

    case "held": {
      const lifted = withoutGround(
        raiseHead(applyEyes(BASE, EYE_DOT), 1),
      );
      const sway = (dx: number) =>
        shiftRegionH(
          lifted,
          EAR_TOP,
          SPRITE_HEIGHT - 2,
          0,
          SPRITE_WIDTH - 1,
          dx,
        );
      return [lifted, sway(1), lifted, sway(-1)];
    }

    case "land": {
      const crouch = lowerHead(applyEyes(BASE, EYE_TIGHT), 1);
      const settle = drawChest(crouch, 0, 1);
      return [crouch, settle];
    }
  }
}

export function loopFor(state: WolfState): Matrix[] {
  return framesFor(state);
}

interface RenderedRun {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export function toRuns(matrix: Matrix): RenderedRun[] {
  assertSameShape(matrix);
  const runs: RenderedRun[] = [];
  matrix.forEach((row, y) => {
    let start = 0;
    while (start < row.length) {
      const ch = row[start]!;
      let end = start + 1;
      while (end < row.length && row[end] === ch) end += 1;
      const fill = PALETTE[ch];
      if (fill) runs.push({ x: start, y, width: end - start, height: 1, fill });
      start = end;
    }
  });
  return runs;
}

export function validateSprite(): string[] {
  const problems: string[] = [];
  if (BASE.length !== SPRITE_HEIGHT) {
    problems.push(`expected ${SPRITE_HEIGHT} rows, found ${BASE.length}`);
  }
  BASE.forEach((row, i) => {
    if (row.length !== SPRITE_WIDTH) {
      problems.push(`row ${i} is ${row.length} wide, expected ${SPRITE_WIDTH}`);
    }
    for (const ch of row) {
      if (!(ch in PALETTE))
        problems.push(`row ${i} uses unknown pixel "${ch}"`);
    }
  });
  for (const state of WOLF_STATES) {
    framesFor(state).forEach((frame, f) => {
      if (frame.length !== SPRITE_HEIGHT) {
        problems.push(`${state} frame ${f} has ${frame.length} rows`);
      }
      frame.forEach((row, i) => {
        if (row.length !== SPRITE_WIDTH) {
          problems.push(`${state} frame ${f} row ${i} is ${row.length} wide`);
        }
        for (const ch of row) {
          if (!(ch in PALETTE))
            problems.push(
              `${state} frame ${f} row ${i} uses unknown pixel "${ch}"`,
            );
        }
      });
    });
  }
  return problems;
}
