import { useEffect } from "react";
import { Panel, ErrorNote, Empty, Stat, PageHeader } from "../../components/ui";
import { TimerDisplay } from "./TimerDisplay";
import { selectTimerView, useFocusStore } from "./focusStore";
import { useSettingsStore, useFocusDurations } from "../settings/settingsStore";
import { useWolfStore } from "../wolf/wolfStore";
import { focusSummary } from "./timerLogic";
import { formatDuration } from "../../lib/date";

const TICK_MS = 250;

export function FocusPage() {
  const focus = useFocusStore();
  const view = selectTimerView(focus);
  const running = view.running;
  const settings = useSettingsStore((s) => s.settings);
  const durations = useFocusDurations();

  useEffect(() => {
    useFocusStore.getState().init(settings);
  }, [settings]);

  useEffect(() => {
    void useFocusStore.getState().refresh();
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      void useFocusStore.getState().tick();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (focus.lastCompletedPhase === null) return;
    useWolfStore.getState().pushShared("all-clear");
    useFocusStore.getState().acknowledgeCompletion();
  }, [focus.lastCompletedPhase]);

  return (
    <>
      <PageHeader title="Focus" subtitle="Deep work, one session at a time." />

      <Panel>
        <ErrorNote message={focus.error} onDismiss={focus.clearError} />

        <div style={{ padding: "8px 0" }}>
          <TimerDisplay
            phase={view.phase}
            status={view.status}
            remaining={view.remaining}
            progress={view.progress}
            completedInSet={view.completedInSet}
            untilLongBreak={view.untilLongBreak}
          />
        </div>

        <div
          className="row"
          style={{ justifyContent: "center", marginTop: 10 }}
        >
          {running ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                useFocusStore.getState().pause();
                useWolfStore.getState().pushShared("focus-paused");
              }}
            >
              ‖ Pause
            </button>
          ) : view.status === "COMPLETED" ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                focus.advancePhase();
                useWolfStore
                  .getState()
                  .push(
                    view.phase === "focus" ? "break-active" : "focus-active",
                  );
              }}
            >
              {view.phase === "focus" ? "▶ Start break" : "▶ Start focus"}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                focus.start();
                useWolfStore
                  .getState()
                  .push(
                    view.phase === "idle" || view.phase === "focus"
                      ? "focus-active"
                      : "break-active",
                  );
              }}
            >
              {view.status === "PAUSED" ? "▶ Resume" : "▶ Start"}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={focus.skipPhase}
            disabled={view.status === "IDLE" && view.phase === "idle"}
          >
            ⏭ Skip phase
          </button>
          <button type="button" className="btn" onClick={focus.reset}>
            ↺ Reset
          </button>
        </div>

        <p className="faint" style={{ textAlign: "center", marginTop: 8 }}>
          {durations.focusMinutes}m focus · {durations.shortBreakMinutes}m short
          · {durations.longBreakMinutes}m long · long break after{" "}
          {durations.sessionsBeforeLongBreak} sessions. Change these in
          Settings.
        </p>
      </Panel>

      <div className="grid grid--3">
        <Stat label="Sessions today" value={focus.stats?.completedToday ?? 0} />
        <Stat
          label="Minutes today"
          value={focus.stats?.focusMinutesToday ?? 0}
          tone="ok"
        />
        <Stat
          label="Sessions this week"
          value={focus.stats?.completedWeek ?? 0}
        />
      </div>

      <Panel title="History">
        {focus.sessions.length === 0 ? (
          <Empty>No sessions recorded yet.</Empty>
        ) : (
          <>
            <p className="faint" style={{ marginBottom: 6 }}>
              {focus.stats ? focusSummary(focus.stats) : ""}
            </p>
            <ul className="list">
              {focus.sessions.map((session) => (
                <li key={session.id} className="list__item">
                  <div style={{ flex: 1 }}>
                    <div>
                      {session.kind === "focus"
                        ? "Focus"
                        : session.kind === "long_break"
                          ? "Long break"
                          : "Short break"}
                    </div>
                    <div className="faint">
                      {new Date(session.startedAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="faint">
                    {formatDuration(session.durationSeconds)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}
