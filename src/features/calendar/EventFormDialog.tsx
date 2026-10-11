import { useState } from "react";
import { Field, Modal } from "../../components/ui";
import { isDateTimeKey, toDateTimeKey } from "../../lib/date";
import type {
  CalendarEvent,
  NewCalendarEvent,
  RecurrenceRule,
} from "../../types";

const RECURRENCE_CHOICES: readonly {
  value: RecurrenceRule;
  label: string;
}[] = [
  { value: "none", label: "Never" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Every week" },
];

const REMINDER_CHOICES: readonly { value: number; label: string }[] = [
  { value: 0, label: "At start" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

interface EventFormDialogProps {
  open: boolean;
  event: CalendarEvent | null;

  defaultDate: string;
  onClose: () => void;
  onSubmit: (value: NewCalendarEvent) => Promise<boolean>;
  onDelete?: () => void;
}

export function EventFormDialog({
  open,
  event,
  defaultDate,
  onClose,
  onSubmit,
  onDelete,
}: EventFormDialogProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startTime, setStartTime] = useState(
    event?.startTime ?? `${defaultDate}T09:00`,
  );
  const [endTime, setEndTime] = useState(
    event?.endTime ?? addHour(event?.startTime ?? `${defaultDate}T09:00`),
  );
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [reminder, setReminder] = useState<number>(
    event?.reminderMinutes ?? 15,
  );
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    event?.recurrence ?? "none",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalid =
    !isDateTimeKey(startTime) ||
    !isDateTimeKey(endTime) ||
    (endTime.slice(0, 10) === startTime.slice(0, 10) &&
      endTime.slice(11, 16) < startTime.slice(11, 16));

  const endInvalid =
    isDateTimeKey(startTime) &&
    isDateTimeKey(endTime) &&
    endTime.slice(0, 10) === startTime.slice(0, 10) &&
    endTime.slice(11, 16) < startTime.slice(11, 16);

  const submit = async (eventSubmit: React.FormEvent) => {
    eventSubmit.preventDefault();
    if (busy) return;
    if (title.trim() === "") {
      setError("Give the event a title.");
      return;
    }
    if (invalid) {
      setError("Check the start and end times.");
      return;
    }
    setBusy(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      startTime,
      endTime,
      allDay,
      reminderMinutes: reminder,
      recurrence,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      title={event ? "Edit event" : "New event"}
      onClose={onClose}
      footer={
        <>
          {event && onDelete ? (
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={onDelete}
              disabled={busy}
            >
              Delete
            </button>
          ) : null}
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
            form="event-form"
            className="btn btn--primary btn--small"
            disabled={busy || invalid}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="event-form" className="stack" onSubmit={submit}>
        <Field label="Title" htmlFor="event-title">
          <input
            id="event-title"
            className="input"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Standup"
            autoComplete="off"
          />
        </Field>

        <div className="grid grid--2">
          <Field label="Starts" htmlFor="event-start">
            <input
              id="event-start"
              className="input"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field
            label="Ends"
            htmlFor="event-end"
            hint={endInvalid ? "End must be after start." : undefined}
          >
            <input
              id="event-end"
              className="input"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>

        <div className="row">
          <label className="row" style={{ gap: 5 }}>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            <span className="field__label">All day</span>
          </label>
        </div>

        <Field
          label="Reminder"
          htmlFor="event-reminder"
          hint="Notifications follow the Reminder setting."
        >
          <select
            id="event-reminder"
            className="select"
            value={reminder}
            onChange={(e) => setReminder(Number(e.target.value))}
          >
            {REMINDER_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Repeat" htmlFor="event-recurrence">
          <select
            id="event-recurrence"
            className="select"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
          >
            {RECURRENCE_CHOICES.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Notes" htmlFor="event-notes">
          <textarea
            id="event-notes"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
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

function addHour(datetime: string): string {
  const date = new Date(`${datetime}:00`);
  if (Number.isNaN(date.getTime())) return datetime;
  date.setHours(date.getHours() + 1);
  return toDateTimeKey(date);
}
