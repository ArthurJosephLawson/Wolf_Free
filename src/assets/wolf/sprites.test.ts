import { describe, expect, it } from "vitest";
import {
  BASE,
  COLOR,
  PALETTE,
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  WOLF_STATES,
  framesFor,
  loopFor,
  overlay,
  scaleBand,
  shiftRows,
  shiftVertical,
  stamp,
  swap,
  toRuns,
  validateSprite,
} from "./sprites";
import {
  BLINK_MAX_MS,
  BLINK_MIN_MS,
  TIMINGS,
  WOLF_SIGNALS,
  frameDurations,
  frameInterval,
  isWolfSignal,
  nextBlinkDelay,
  resolveState,
  stateTtl,
} from "./animation";

describe("artwork", () => {
  it("is a rectangular grid of the declared size", () => {
    expect(BASE).toHaveLength(SPRITE_HEIGHT);
    for (const row of BASE) expect(row.length).toBe(SPRITE_WIDTH);
  });

  it("only uses characters that have a palette entry", () => {
    for (const row of BASE) {
      for (const pixel of row) {
        expect(Object.prototype.hasOwnProperty.call(PALETTE, pixel)).toBe(true);
      }
    }
  });

  it("keeps two clear rows above the artwork for animation headroom", () => {
    expect(BASE[0]).toBe(".".repeat(SPRITE_WIDTH));
    expect(BASE[1]).toBe(".".repeat(SPRITE_WIDTH));
  });

  it("is mirror-symmetric about the 13.5 column axis", () => {
    for (const [i, row] of BASE.entries()) {
      const mirrored = row.split("").reverse().join("");
      expect(`${i}:${row}`).toBe(`${i}:${mirrored}`);
    }
  });

  it("passes its own validator for every state", () => {
    expect(validateSprite()).toEqual([]);
  });

  it("draws a body under the head, not just a face", () => {
    const belowHead = BASE.slice(15);
    expect(belowHead.some((row) => /[BW]/.test(row))).toBe(true);
    expect(BASE[27]!).not.toBe(".".repeat(SPRITE_WIDTH));
  });

  it("separates the two front legs", () => {
    expect(BASE[23]!.slice(12, 16)).toBe("....");
    expect(BASE[23]!.slice(9, 12)).toBe("BBB");
    expect(BASE[23]!.slice(16, 19)).toBe("BBB");
  });

  it("only needs two clear rows above the eyes, so ears can lift into them", () => {
    for (const frame of framesFor("happy")) {
      expect(frame).toHaveLength(SPRITE_HEIGHT);
    }
  });
});

describe("transforms", () => {
  it("swaps colors without changing the shape", () => {
    const swapped = swap(BASE, COLOR.outline, COLOR.fur);
    expect(swapped).toHaveLength(BASE.length);
    expect(swapped[0]!.length).toBe(BASE[0]!.length);
  });

  it("stamps text in place", () => {
    const stamped = stamp(BASE, 0, 0, "AB");
    expect(stamped[0]!.slice(0, 2)).toBe("AB");
  });

  it("shifts rows sideways without losing pixels", () => {
    const shifted = shiftRows(BASE, 0, 0, 1);
    expect(shifted[0]!.slice(1)).toBe(BASE[0]!.slice(0, -1));
  });

  it("shifts vertically and keeps the canvas size", () => {
    const shifted = shiftVertical(BASE, -1);
    expect(shifted).toHaveLength(BASE.length);
    expect(shifted[0]!.length).toBe(BASE[0]!.length);
  });

  it("scales a band and leaves the rest alone", () => {
    const scaled = scaleBand(BASE, 12, 22, 0.9, 22);
    expect(scaled).toHaveLength(BASE.length);
    expect(scaled[0]).toBe(BASE[0]);
  });

  it("overlays only non-transparent pixels", () => {
    const overlaid = overlay(BASE, ["X"], 0, 0);
    expect(overlaid[0]!.startsWith("X")).toBe(true);
  });
});

describe("frames", () => {
  it("produces at least two frames per state", () => {
    for (const state of WOLF_STATES) {
      expect(framesFor(state).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps every frame the same size as the base sprite", () => {
    for (const state of WOLF_STATES) {
      for (const frame of framesFor(state)) {
        expect(frame).toHaveLength(SPRITE_HEIGHT);
        for (const row of frame) expect(row.length).toBe(SPRITE_WIDTH);
      }
    }
  });

  it("gives each state a loop that matches its frames", () => {
    for (const state of WOLF_STATES) {
      expect(loopFor(state)).toEqual(framesFor(state));
    }
  });

  it("moves the head for the idle breath and returns it", () => {
    const [rest, up] = framesFor("idle");
    expect(rest).toEqual(BASE);
    expect(up).not.toEqual(BASE);
    expect(framesFor("idle").at(-1)).toEqual(BASE);
  });

  it("closes then reopens the eyes while blinking", () => {
    const [line = "", arc, open] = framesFor("blink");

    expect(line[8]!.slice(9, 13)).toBe("KKKK");
    expect(line[8]!.slice(15, 19)).toBe("KKKK");
    expect(line[7]!.slice(9, 13)).toBe("BBBB");
    expect(line[7]![7]).toBe("K");
    expect(line[7]![SPRITE_WIDTH - 1 - 7]).toBe("K");
    expect(arc).not.toEqual(line);
    expect(open).toEqual(BASE);
  });

  it("shows a mouth cavity while speaking and closes it again", () => {
    const speaking = framesFor("speaking");
    const withCavity = speaking.filter((f) =>
      f.some((row) => row.includes("R")),
    );
    expect(withCavity.length).toBeGreaterThanOrEqual(2);
    expect(speaking[0]).toEqual(BASE);
  });

  it("opens the mouth for the happy pose only", () => {
    for (const state of WOLF_STATES) {
      const opens = framesFor(state).some((f) =>
        f.some((r) => r.includes("R")),
      );
      expect(`${state}:${opens}`).toBe(
        `${state}:${state === "happy" || state === "speaking"}`,
      );
    }
  });

  it("shows a tear for the sad pose only", () => {
    for (const state of WOLF_STATES) {
      const weeps = framesFor(state).some((f) =>
        f.some((r) => r.includes("T")),
      );
      expect(`${state}:${weeps}`).toBe(`${state}:${state === "sad"}`);
    }
  });

  it("slides the tear one row per frame", () => {
    const tearRows = framesFor("sad").map((frame) =>
      frame.findIndex((row) => row.includes("T")),
    );
    expect(tearRows).toEqual([9, 10, 11, 12]);
  });

  it("shows a heart for the winking pose only", () => {
    for (const state of WOLF_STATES) {
      const hearts = framesFor(state).some((f) =>
        f.some((r) => r.includes("P.P")),
      );
      expect(`${state}:${hearts}`).toBe(`${state}:${state === "winking"}`);
    }
  });
});

describe("rendering", () => {
  it("merges horizontal runs and covers every pixel exactly once", () => {
    const runs = toRuns(BASE);
    let covered = 0;
    for (const run of runs) covered += run.width * run.height;
    const painted = BASE.join("")
      .split("")
      .filter((p) => p !== ".").length;
    expect(covered).toBe(painted);
  });

  it("keeps runs inside the canvas", () => {
    for (const run of toRuns(BASE)) {
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.y).toBeGreaterThanOrEqual(0);
      expect(run.x + run.width).toBeLessThanOrEqual(SPRITE_WIDTH);
      expect(run.y + run.height).toBeLessThanOrEqual(SPRITE_HEIGHT);
    }
  });
});

describe("timings", () => {
  it("gives every state a frame interval", () => {
    for (const state of WOLF_STATES) {
      expect(frameInterval(state)).toBeGreaterThan(0);
    }
  });

  it("runs the idle cycle at 1200ms with a 200ms hold", () => {
    const total = TIMINGS.idle.durations.reduce((a, b) => a + b, 0);
    expect(total).toBe(1200);
    expect(TIMINGS.idle.durations).toContain(200);
  });

  it("holds each blink frame for 100ms", () => {
    expect(TIMINGS.blink.durations).toEqual([100, 100, 100]);
  });

  it("aligns durations to the frames actually produced", () => {
    for (const state of WOLF_STATES) {
      const count = framesFor(state).length;
      expect(frameDurations(state, count)).toHaveLength(count);
      for (const ms of frameDurations(state, count)) {
        expect(ms).toBeGreaterThan(0);
      }
    }
  });

  it("gives transient states a time to live and resting states none", () => {
    expect(stateTtl("speaking")).not.toBeNull();
    expect(stateTtl("idle")).toBeNull();
    expect(TIMINGS.winking.ttlMs!).toBeLessThan(TIMINGS.speaking.ttlMs!);
  });

  it("blinks somewhere between 3 and 6 seconds while idle", () => {
    expect(BLINK_MIN_MS).toBe(3000);
    expect(BLINK_MAX_MS).toBe(6000);
    expect(nextBlinkDelay(() => 0)).toBe(BLINK_MIN_MS);
    expect(nextBlinkDelay(() => 1)).toBe(BLINK_MAX_MS);
    expect(nextBlinkDelay(() => 0.5)).toBe(4500);
  });
});

describe("signals", () => {
  it("maps application signals to poses", () => {
    expect(resolveState("task-completed")).toBe("happy");
    expect(resolveState("focus-active")).toBe("listening");
    expect(resolveState("focus-paused")).toBe("huffing");
    expect(resolveState("thinking")).toBe("puffing");
    expect(resolveState("speaking")).toBe("speaking");
    expect(resolveState("poked")).toBe("winking");
  });

  it("rests when nothing is happening", () => {
    expect(resolveState("default")).toBe("idle");
    expect(resolveState("sleep")).toBe("idle");
  });

  it("lets a failure show through", () => {
    expect(resolveState("offline")).toBe("sad");
  });

  it("always resolves to a known state", () => {
    for (const state of WOLF_STATES) {
      expect(WOLF_STATES).toContain(state);
    }
  });
});

describe("signal validation", () => {
  it("accepts every declared signal", () => {
    for (const signal of WOLF_SIGNALS) {
      expect(isWolfSignal(signal)).toBe(true);
    }
  });

  it("rejects anything that is not a signal", () => {
    expect(isWolfSignal("happy")).toBe(false);
    expect(isWolfSignal("")).toBe(false);
    expect(isWolfSignal(null)).toBe(false);
    expect(isWolfSignal(undefined)).toBe(false);
    expect(isWolfSignal(7)).toBe(false);
    expect(isWolfSignal({ signal: "poked" })).toBe(false);
  });

  it("keeps the list and the type in step", () => {
    const resolved = new Set(WOLF_SIGNALS.map(resolveState));
    for (const state of WOLF_STATES) {
      if (state === "idle" || state === "listening" || state === "sad") {
        expect(resolved.has(state)).toBe(true);
      }
    }
  });
});

describe("time to live", () => {
  it("expires every transient pose so the wolf settles on its own", () => {
    for (const state of [
      "speaking",
      "happy",
      "winking",
      "huffing",
      "puffing",
      "listening",
    ] as const) {
      expect(stateTtl(state)).toBeTypeOf("number");
    }
  });

  it("keeps the resting poses until something else happens", () => {
    expect(stateTtl("idle")).toBeNull();
    expect(stateTtl("blink")).toBeNull();
  });

  it("agrees with the declared timings", () => {
    for (const state of WOLF_STATES) {
      expect(stateTtl(state)).toBe(TIMINGS[state]?.ttlMs ?? null);
    }
  });
});

describe("drag poses", () => {
  it("lists held and land as first class states", () => {
    expect(WOLF_STATES).toContain("held");
    expect(WOLF_STATES).toContain("land");
  });

  it("lifts the pet off its shadow while held", () => {
    const frames = framesFor("held");
    expect(frames.length).toBeGreaterThanOrEqual(4);
    for (const frame of frames) {
      expect(frame).toHaveLength(SPRITE_HEIGHT);
      expect(frame[SPRITE_HEIGHT - 1]).toBe(".".repeat(SPRITE_WIDTH));
      expect(frame).not.toEqual(BASE);
    }
    expect(frames[0]).not.toEqual(frames[1]);
  });

  it("crouches on landing instead of standing tall", () => {
    const frames = framesFor("land");
    expect(frames).toHaveLength(2);
    const [crouch, settle] = frames;
    expect(crouch).not.toEqual(BASE);
    expect(settle).not.toEqual(crouch);
    expect(crouch![2]).toBe(".".repeat(SPRITE_WIDTH));
  });

  it("passes the validator with the new poses included", () => {
    expect(validateSprite()).toEqual([]);
  });
});
