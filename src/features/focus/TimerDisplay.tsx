import { formatClock } from "../../lib/date";
import { describe, type TimerSnapshot } from "./timerLogic";
import type { FocusPhase, TimerStatus } from "../../types";

const PHASE_LABEL: Record<FocusPhase, string> = {
  idle: "Ready",
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

export function TimerDisplay({
  phase,
  status,
  remaining,
  progress,
  completedInSet,
  untilLongBreak,
}: {
  phase: FocusPhase;
  status: TimerStatus;
  remaining: number;
  progress: number;
  completedInSet: number;
  untilLongBreak: number;
}) {
  const snapshot: TimerSnapshot = {
    phase,
    status,
    remaining,
    total: remaining,
    completedInSet,
    startedAt: null,
    accumulatedMs: 0,
  };

  return (
    <div className="stack" style={{ alignItems: "center", gap: 8 }}>
      <p className="mono-label" style={{ letterSpacing: "0.2em" }}>
        {PHASE_LABEL[phase]}
      </p>

      <p
        aria-live="off"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 48,
          lineHeight: 1,
          margin: 0,
          color: status === "COMPLETED" ? "var(--success)" : "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatClock(remaining)}
      </p>

      <div
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${PHASE_LABEL[phase]} progress`}
        style={{ width: "100%", maxWidth: 320 }}
      >
        <div
          style={{
            height: 10,
            background: "var(--bg-sunken)",
            border: "2px solid var(--border-strong)",
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              background:
                status === "COMPLETED" ? "var(--success)" : "var(--accent)",
            }}
          />
        </div>
      </div>

      <p className="faint" style={{ margin: 0 }}>
        {describe(snapshot)} · {completedInSet} in this set · {untilLongBreak}{" "}
        until a long break
      </p>
      <p className="visually-hidden" aria-live="polite">
        {`${PHASE_LABEL[phase]}: ${describe(snapshot)}`}
      </p>
    </div>
  );
}
