import type { WolfState } from "../../assets/wolf/sprites";

export const DRAG_THRESHOLD_PX = 4;
export const DOUBLE_CLICK_MS = 300;
export const LAND_HOLD_MS = 150;

export type DragPhase = "idle" | "pressing" | "dragging" | "landing";

type DragAction = "poke" | "open-main" | null;

export interface DragPoint {
  x: number;
  y: number;
  at: number;
}

interface DragSession {
  phase: DragPhase;
  startX: number;
  startY: number;
  lastTapAt: number;
  landedAt: number;
}

export function createDrag(): DragSession {
  return {
    phase: "idle",
    startX: 0,
    startY: 0,
    lastTapAt: Number.NEGATIVE_INFINITY,
    landedAt: 0,
  };
}

export function dragPress(
  session: DragSession,
  point: DragPoint,
): DragSession {
  return {
    phase: "pressing",
    startX: point.x,
    startY: point.y,
    lastTapAt: session.lastTapAt,
    landedAt: 0,
  };
}

export function dragMove(
  session: DragSession,
  point: DragPoint,
): { session: DragSession; begin: boolean } {
  if (session.phase !== "pressing") {
    return { session, begin: false };
  }
  const dx = point.x - session.startX;
  const dy = point.y - session.startY;
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
    return { session, begin: false };
  }
  return { session: { ...session, phase: "dragging" }, begin: true };
}

export function dragRelease(
  session: DragSession,
  point: DragPoint,
  clickAction: "poke" | "open" = "poke",
): { session: DragSession; action: DragAction } {
  if (session.phase === "dragging") {
    return {
      session: { ...session, phase: "landing", landedAt: point.at },
      action: null,
    };
  }
  if (session.phase === "pressing") {
    const previous = session.lastTapAt;
    const isDouble =
      previous !== Number.NEGATIVE_INFINITY &&
      point.at - previous <= DOUBLE_CLICK_MS;
    const action: DragAction =
      clickAction === "open" || isDouble ? "open-main" : "poke";
    return {
      session: { ...session, phase: "idle", lastTapAt: point.at },
      action,
    };
  }
  return { session: { ...session, phase: "idle" }, action: null };
}

export function dragTick(
  session: DragSession,
  at: number,
): { session: DragSession; settled: boolean } {
  if (session.phase === "landing" && at - session.landedAt >= LAND_HOLD_MS) {
    return { session: { ...session, phase: "idle" }, settled: true };
  }
  return { session, settled: false };
}

export function companionVisualState(
  phase: DragPhase,
  state: WolfState,
): WolfState {
  if (phase === "dragging") return "held";
  if (phase === "landing") return "land";
  return state;
}
