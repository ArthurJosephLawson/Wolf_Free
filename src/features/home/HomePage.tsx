import { useEffect, useMemo, useState } from "react";
import {
  Panel,
  Stat,
  Empty,
  Chip,
  PageHeader,
  Progress,
} from "../../components/ui";
import { QuickAdd } from "./QuickAdd";
import { WolfWidget } from "../wolf/WolfWidget";
import {
  useTaskStore,
  selectTaskCounts,
  selectVisibleTasks,
} from "../tasks/taskStore";
import { useHabitStore } from "../habits/habitStore";
import { useCalendarStore } from "../calendar/calendarStore";
import { useFocusStore, selectTimerView } from "../focus/focusStore";
import { useSettingsStore } from "../settings/settingsStore";
import { useUiStore, greeting } from "../../app/uiStore";
import { useWolfStore } from "../wolf/wolfStore";
import { desktopService } from "../../services/desktop";
import {
  formatDayLong,
  formatTime,
  relativeDay,
  todayKey,
} from "../../lib/date";
import { focusSummary } from "../focus/timerLogic";
import { hudLine } from "./hud";
import { dayPressure } from "../tasks/taskLogic";
import { daysUntil, nearestCountdown } from "../progress/progressLogic";
import { useProgressStore } from "../progress/progressStore";
import { XpBar } from "../progress/XpBar";
import type { CalendarEvent } from "../../types";

export function HomePage() {
  const tasks = useTaskStore();
  const habits = useHabitStore();
  const calendar = useCalendarStore();
  const focus = useFocusStore();
  const progress = useProgressStore();
  const companionEnabled = useSettingsStore((s) => s.settings.companionEnabled);
  const userName = useSettingsStore((s) => s.settings.userName);
  const setRoute = useUiStore((s) => s.setRoute);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    void tasks.load();
    void habits.load();
    void calendar.load();
    void focus.refresh();
    void progress.load();
    void calendar
      .upcoming(5)
      .then(setUpcoming)
      .catch(() => setUpcoming([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => selectTaskCounts(tasks), [tasks]);
  const focusView = selectTimerView(focus);
  const todaysTasks = useMemo(
    () =>
      selectVisibleTasks(tasks)
        .filter((t) => !t.completed)
        .slice(0, 6),
    [tasks],
  );
  const pressure = dayPressure({
    dueToday: counts.today,
    overdue: counts.overdue,
  });

  useEffect(() => {
    if (focusView.running) return;
    useWolfStore
      .getState()
      .push(
        pressure === "busy"
          ? "busy"
          : pressure === "all-clear"
            ? "all-clear"
            : "default",
      );
  }, [pressure, focusView.running]);

  const habitStreak = habits.habits.reduce(
    (best, habit) => Math.max(best, habit.currentStreak),
    0,
  );

  const nearest = nearestCountdown(progress.countdowns, todayKey());
  const nearestDays = nearest
    ? daysUntil(nearest.targetDate, todayKey())
    : null;

  useEffect(() => {
    if (progress.summary === null) return;
    void progress.refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.done, habitStreak, focus.stats?.completedToday]);

  return (
    <>
      <PageHeader
        title={formatDayLong(todayKey())}
        subtitle={greeting(userName)}
        actions={
          <>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setRoute("tasks")}
            >
              All tasks
            </button>
            <button
              type="button"
              className="btn btn--small btn--primary"
              onClick={() => {
                if (focusView.running) focus.pause();
                else focus.start();
              }}
            >
              {focusView.running ? "Pause focus" : "Start focus"}
            </button>
          </>
        }
      />

      <Panel title="Today">
        <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
          {companionEnabled ? (
            <div className="well" style={{ flex: "none", textAlign: "center" }}>
              <WolfWidget
                scale={2}
                onClick={() => useWolfStore.getState().pushShared("poked")}
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                style={{ marginTop: 4 }}
                onClick={() => void desktopService.toggleCompanion()}
              >
                Hide companion
              </button>
            </div>
          ) : null}

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p className="muted" style={{ margin: 0 }}>
              {hudLine(todayKey(), counts.open, counts.overdue)}
            </p>
            <QuickAdd />
            <div>
              <Progress
                value={counts.done}
                max={Math.max(1, counts.total)}
                label="Tasks completed"
                tone="success"
              />
              <p className="faint" style={{ marginTop: 4 }}>
                {counts.done} of {counts.total} tasks done
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid--3">
        <Stat
          label="Due today"
          value={counts.today}
          tone={counts.today > 0 ? "warn" : "ok"}
        />
        <Stat
          label="Overdue"
          value={counts.overdue}
          tone={counts.overdue > 0 ? "danger" : "ok"}
        />
        <Stat label="Open" value={counts.open} />
        <Stat
          label="Focus minutes today"
          value={focus.stats?.focusMinutesToday ?? 0}
          tone="ok"
        />
        <Stat label="Sessions today" value={focus.stats?.completedToday ?? 0} />
        <Stat label="Best habit streak" value={`${habitStreak}d`} />
      </div>

      <div className="grid grid--2">
        <Panel
          title="Level"
          actions={
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setRoute("progress")}
            >
              Progress
            </button>
          }
        >
          {progress.summary ? (
            <>
              <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 48,
                    lineHeight: 1,
                  }}
                >
                  {progress.summary.level}
                </span>
                <div className="faint" style={{ marginBottom: 4 }}>
                  {progress.summary.lifetimeTotal} XP · {progress.summary.total}{" "}
                  in 28d
                </div>
              </div>
              <XpBar
                value={progress.summary.xpIntoLevel}
                max={
                  progress.summary.xpIntoLevel + progress.summary.xpForNextLevel
                }
              />
              <p className="faint" style={{ marginTop: 6 }}>
                {progress.summary.xpIntoLevel} /{" "}
                {progress.summary.xpIntoLevel + progress.summary.xpForNextLevel}{" "}
                to level {progress.summary.level + 1}
              </p>
            </>
          ) : progress.loading ? (
            <p className="empty">Loading…</p>
          ) : (
            <Empty>No XP yet. Finish a task to earn your first 10.</Empty>
          )}
        </Panel>

        <Panel
          title="Nearest countdown"
          actions={
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setRoute("progress")}
            >
              All
            </button>
          }
        >
          {!nearest || nearestDays === null ? (
            <Empty>No countdowns yet.</Empty>
          ) : (
            <>
              <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 48,
                    lineHeight: 1,
                    color: nearestDays <= 0 ? "var(--warning)" : "var(--text)",
                  }}
                >
                  {nearestDays}
                </span>
                <span className="mono-label" style={{ marginBottom: 4 }}>
                  days
                </span>
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                {nearest.label}
              </p>
              <p className="faint">{formatDayLong(nearest.targetDate)}</p>
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="Next up">
          {tasks.loading && tasks.tasks.length === 0 ? (
            <p className="empty">Loading…</p>
          ) : todaysTasks.length === 0 ? (
            <Empty>Nothing open. Enjoy it.</Empty>
          ) : (
            <ul className="list">
              {todaysTasks.map((task) => (
                <li key={task.id} className="list__item">
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() =>
                      void tasks
                        .setCompleted(task.id, true)
                        .then(() =>
                          useWolfStore.getState().pushShared("task-completed"),
                        )
                    }
                    aria-label={`Complete ${task.title}`}
                  >
                    ▢
                  </button>
                  <div className="list__body">
                    <div>{task.title}</div>
                    {task.dueDate ? (
                      <div className="faint">{relativeDay(task.dueDate)}</div>
                    ) : null}
                  </div>
                  {task.priority >= 2 ? (
                    <Chip tone="warn">P{task.priority}</Chip>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Coming up">
          {upcoming.length === 0 ? (
            <Empty>No events scheduled.</Empty>
          ) : (
            <ul className="list">
              {upcoming.map((event) => (
                <li
                  key={`${event.id}:${event.startTime}`}
                  className="list__item"
                >
                  <div style={{ width: 74, flex: "none" }} className="faint">
                    {event.allDay ? "All day" : formatTime(event.startTime)}
                  </div>
                  <div className="list__body">
                    <div>{event.title}</div>
                    <div className="faint">
                      {relativeDay(event.startTime)} ·{" "}
                      {event.startTime.slice(0, 10)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setRoute("calendar")}
          >
            Open calendar
          </button>
        </Panel>
      </div>

      <div className="grid grid--2">
        <Panel title="Focus">
          {focus.stats ? (
            <p className="muted" style={{ marginBottom: 8 }}>
              {focusSummary(focus.stats)}
            </p>
          ) : null}
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="faint">
              {focusView.running
                ? `${focusView.phase === "focus" ? "Focusing" : "On a break"} — ${Math.ceil(focusView.remaining / 60)} min left`
                : "Not running"}
            </span>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setRoute("focus")}
            >
              {focusView.running ? "Open" : "Start"}
            </button>
          </div>
        </Panel>

        <Panel
          title="Habits today"
          actions={
            <button
              type="button"
              className="btn btn--small"
              onClick={() => setRoute("habits")}
            >
              All habits
            </button>
          }
        >
          {habits.habits.length === 0 ? (
            <Empty>No habits yet.</Empty>
          ) : (
            <ul className="list">
              {habits.habits.slice(0, 5).map((habit) => (
                <li key={habit.id} className="list__item">
                  <button
                    type="button"
                    className="btn btn--small"
                    style={{
                      minWidth: 30,
                      background: habit.completedToday
                        ? "var(--success-dim)"
                        : "var(--bg-sunken)",
                      borderColor: habit.completedToday
                        ? "var(--success)"
                        : "var(--border-strong)",
                    }}
                    onClick={() => void habits.toggleToday(habit.id)}
                    aria-pressed={habit.completedToday}
                    aria-label={`Toggle ${habit.name}`}
                  >
                    {habit.completedToday ? "✓" : "▢"}
                  </button>
                  <div className="list__body">{habit.name}</div>
                  <span className="faint">{habit.currentStreak}d</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
