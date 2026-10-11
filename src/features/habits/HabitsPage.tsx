import { useEffect, useMemo, useState } from "react";
import {
  Panel,
  ErrorNote,
  Empty,
  Field,
  Modal,
  PageHeader,
} from "../../components/ui";
import { useHabitStore } from "./habitStore";
import {
  FREQUENCY_LABELS,
  type HabitFrequency,
  type HabitWithProgress,
  type NewHabit,
} from "../../types";
import { formatDayShort, relativeDay } from "../../lib/date";

const COLORS = ["green", "cyan", "amber", "violet", "rose"] as const;

export function HabitsPage() {
  const store = useHabitStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingArchive, setPendingArchive] =
    useState<HabitWithProgress | null>(null);

  useEffect(() => {
    void store.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        title="Habits"
        subtitle="Small daily things, tracked over time."
        actions={
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => setDialogOpen(true)}
          >
            New habit
          </button>
        }
      />

      <Panel>
        <ErrorNote message={store.error} onDismiss={store.clearError} />

        {store.loading && store.habits.length === 0 ? (
          <p className="empty">Loading habits…</p>
        ) : store.habits.length === 0 ? (
          <Empty>No habits yet. Start with one small daily thing.</Empty>
        ) : (
          <div className="stack">
            {store.habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onToggle={() => void store.toggleToday(habit.id)}
                onArchive={() => setPendingArchive(habit)}
              />
            ))}
          </div>
        )}
      </Panel>

      {dialogOpen ? (
        <NewHabitDialog
          open
          busy={store.saving}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (habit) => {
            const ok = await store.create(habit);
            if (ok) setDialogOpen(false);
            return ok;
          }}
        />
      ) : null}

      {pendingArchive ? (
        <Modal
          open
          title="Archive habit?"
          onClose={() => setPendingArchive(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setPendingArchive(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={() => {
                  void store.setArchived(pendingArchive.id, true);
                  setPendingArchive(null);
                }}
              >
                Archive
              </button>
            </>
          }
        >
          <p>
            Archive “{pendingArchive.name}”? It stays in your data; restore it
            any time from the archive.
          </p>
        </Modal>
      ) : null}
    </>
  );
}

function HabitRow({
  habit,
  onToggle,
  onArchive,
}: {
  habit: HabitWithProgress;
  onToggle: () => void;
  onArchive: () => void;
}) {
  const doneRatio = useMemo(() => {
    const scheduled = habit.recent.filter((d) => d.scheduled);
    if (scheduled.length === 0) return 0;
    return scheduled.filter((d) => d.completed).length / scheduled.length;
  }, [habit.recent]);

  return (
    <div className="panel" style={{ padding: 8 }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <button
          type="button"
          className="btn btn--small"
          style={{
            minWidth: 34,
            background: habit.completedToday
              ? "var(--success-dim)"
              : "var(--bg-sunken)",
            borderColor: habit.completedToday
              ? "var(--success)"
              : "var(--border-strong)",
            color: habit.completedToday ? "var(--text)" : "var(--text-dim)",
          }}
          onClick={onToggle}
          aria-pressed={habit.completedToday}
          aria-label={
            habit.completedToday
              ? `Mark ${habit.name} as not done today`
              : `Mark ${habit.name} as done today`
          }
        >
          {habit.completedToday ? "✓" : "▢"}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              textDecoration: habit.completedToday ? "line-through" : "none",
            }}
          >
            {habit.name}
          </div>
          <div className="faint">
            {FREQUENCY_LABELS[habit.frequency]} · streak {habit.currentStreak} ·
            best {habit.longestStreak} · {habit.completions30d} in 30d
          </div>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={onArchive}
          title="Archive habit"
          aria-label={`Archive ${habit.name}`}
        >
          ▤
        </button>
      </div>

      <div
        className="row"
        style={{ gap: 2, marginTop: 6 }}
        role="img"
        aria-label={`${habit.name}: ${Math.round(doneRatio * 100)} percent of scheduled days completed over the last four weeks.`}
      >
        {habit.recent.map((day) => {
          const title = `${formatDayShort(day.date)} — ${day.completed ? "done" : day.scheduled ? "missed" : "not scheduled"}`;
          return (
            <span
              key={day.date}
              title={title}
              aria-hidden="true"
              style={{
                flex: 1,
                height: 12,
                background: day.completed
                  ? "var(--success)"
                  : day.scheduled
                    ? "var(--bg-sunken)"
                    : "transparent",
                border: "2px solid",
                borderColor: day.completed
                  ? "var(--success-dim)"
                  : "var(--border)",
                opacity: day.scheduled ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
      <p className="faint" style={{ marginTop: 4 }}>
        Last 28 days · {relativeDay(habit.today)} is today
      </p>
    </div>
  );
}

function NewHabitDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (habit: NewHabit) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") {
      setError("Give the habit a name.");
      return;
    }
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      frequency,
      color,
    });
  };

  return (
    <Modal
      open={open}
      title="New habit"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn--small"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="habit-form"
            className="btn btn--primary btn--small"
            disabled={busy}
          >
            {busy ? "Saving…" : "Create"}
          </button>
        </>
      }
    >
      <form id="habit-form" className="stack" onSubmit={submit}>
        <Field label="Name" htmlFor="habit-name">
          <input
            id="habit-name"
            className="input"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Walk 20 minutes"
            autoComplete="off"
          />
        </Field>
        <Field label="Notes" htmlFor="habit-notes">
          <input
            id="habit-notes"
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional"
          />
        </Field>
        <Field label="Frequency" htmlFor="habit-frequency">
          <select
            id="habit-frequency"
            className="select"
            value={frequency}
            onChange={(event) =>
              setFrequency(event.target.value as HabitFrequency)
            }
          >
            {(["daily", "weekdays", "weekly"] as HabitFrequency[]).map(
              (value) => (
                <option key={value} value={value}>
                  {FREQUENCY_LABELS[value]}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field label="Color" htmlFor="habit-color">
          <select
            id="habit-color"
            className="select"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          >
            {COLORS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        {error ? (
          <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
