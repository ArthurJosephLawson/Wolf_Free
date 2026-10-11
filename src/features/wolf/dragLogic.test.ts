import { describe, expect, it } from "vitest";
import { frameDurations, stateTtl } from "../../assets/wolf/animation";
import {
  DOUBLE_CLICK_MS,
  DRAG_THRESHOLD_PX,
  LAND_HOLD_MS,
  companionVisualState,
  createDrag,
  dragMove,
  dragPress,
  dragRelease,
  dragTick,
} from "./dragLogic";

describe("drag thresholds", () => {
  it("uses 4px, 300ms and 150ms", () => {
    expect(DRAG_THRESHOLD_PX).toBe(4);
    expect(DOUBLE_CLICK_MS).toBe(300);
    expect(LAND_HOLD_MS).toBe(150);
  });
});

describe("starting a drag", () => {
  it("ignores movement below 4px", () => {
    const pressed = dragPress(createDrag(), { x: 100, y: 100, at: 0 });
    const moved = dragMove(pressed, { x: 103.9, y: 100, at: 16 });
    expect(moved.begin).toBe(false);
    expect(moved.session.phase).toBe("pressing");
  });

  it("starts exactly at 4px and only reports the crossing once", () => {
    let session = dragPress(createDrag(), { x: 100, y: 100, at: 0 });
    const crossing = dragMove(session, { x: 104, y: 100, at: 16 });
    expect(crossing.begin).toBe(true);
    expect(crossing.session.phase).toBe("dragging");
    session = crossing.session;
    const later = dragMove(session, { x: 400, y: 300, at: 32 });
    expect(later.begin).toBe(false);
    expect(later.session.phase).toBe("dragging");
  });
});

describe("taps", () => {
  it("pokes on a single tap", () => {
    const pressed = dragPress(createDrag(), { x: 0, y: 0, at: 1000 });
    const released = dragRelease(pressed, { x: 1, y: 1, at: 1010 });
    expect(released.action).toBe("poke");
    expect(released.session.phase).toBe("idle");
  });

  it("opens the main window on a second tap within 300ms", () => {
    const first = dragRelease(
      dragPress(createDrag(), { x: 0, y: 0, at: 1000 }),
      { x: 1, y: 1, at: 1010 },
    );
    const second = dragRelease(
      dragPress(first.session, { x: 0, y: 0, at: 1200 }),
      { x: 1, y: 1, at: 1310 },
    );
    expect(second.action).toBe("open-main");
  });

  it("taps again once the 300ms window has passed", () => {
    const first = dragRelease(
      dragPress(createDrag(), { x: 0, y: 0, at: 1000 }),
      { x: 1, y: 1, at: 1010 },
    );
    const second = dragRelease(
      dragPress(first.session, { x: 0, y: 0, at: 1311 }),
      { x: 1, y: 1, at: 1312 },
    );
    expect(second.action).toBe("poke");
  });
});

describe("landing after a drag", () => {
  it("enters landing when a dragged pointer is released", () => {
    let session = dragPress(createDrag(), { x: 0, y: 0, at: 0 });
    session = dragMove(session, { x: 10, y: 0, at: 20 }).session;
    const released = dragRelease(session, { x: 10, y: 0, at: 40 });
    expect(released.action).toBeNull();
    expect(released.session.phase).toBe("landing");
  });

  it("settles to idle exactly 150ms after release", () => {
    let session = dragPress(createDrag(), { x: 0, y: 0, at: 0 });
    session = dragMove(session, { x: 10, y: 0, at: 20 }).session;
    const released = dragRelease(session, { x: 10, y: 0, at: 40 });
    const early = dragTick(released.session, 40 + LAND_HOLD_MS - 1);
    expect(early.settled).toBe(false);
    expect(early.session.phase).toBe("landing");
    const done = dragTick(released.session, 40 + LAND_HOLD_MS);
    expect(done.settled).toBe(true);
    expect(done.session.phase).toBe("idle");
  });
});

describe("display states", () => {
  it("shows the carried pose while the window is being dragged", () => {
    expect(companionVisualState("dragging", "sad")).toBe("held");
    expect(companionVisualState("landing", "happy")).toBe("land");
    expect(companionVisualState("pressing", "sad")).toBe("sad");
    expect(companionVisualState("idle", "happy")).toBe("happy");
  });

  it("lands for exactly one hold window", () => {
    const total = frameDurations("land", 2).reduce((sum, ms) => sum + ms, 0);
    expect(total).toBe(LAND_HOLD_MS);
  });

  it("loops the held sway without expiring", () => {
    expect(stateTtl("held")).toBeNull();
    expect(frameDurations("held", 4)).toHaveLength(4);
  });
});

describe("click action setting", () => {
  it("opens straight away when the click action is open", () => {
    const pressed = dragPress(createDrag(), { x: 0, y: 0, at: 1000 });
    const released = dragRelease(pressed, { x: 1, y: 1, at: 1010 }, "open");
    expect(released.action).toBe("open-main");
  });

  it("still pokes when the click action is poke", () => {
    const pressed = dragPress(createDrag(), { x: 0, y: 0, at: 1000 });
    const released = dragRelease(pressed, { x: 1, y: 1, at: 1010 }, "poke");
    expect(released.action).toBe("poke");
  });
});
