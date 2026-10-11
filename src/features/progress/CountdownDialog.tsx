import { useState } from "react";
import { Field, Modal } from "../../components/ui";
import { isDateKey, todayKey } from "../../lib/date";
import type { Countdown, NewCountdown } from "../../types";

export function CountdownDialog({
  open,
  busy,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  initial: Countdown | null;
  onClose: () => void;
  onSave: (countdown: NewCountdown, id: string | null) => Promise<boolean>;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [targetDate, setTargetDate] = useState(
    initial?.targetDate ?? todayKey(),
  );
  const [currentValue, setCurrentValue] = useState(
    initial && initial.currentValue !== 0 ? String(initial.currentValue) : "",
  );
  const [targetValue, setTargetValue] = useState(
    initial && initial.targetValue !== 0 ? String(initial.targetValue) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const parseCount = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    if (!Number.isInteger(value)) return Number.NaN;
    return value;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (label.trim() === "") {
      setError("Give the countdown a name.");
      return;
    }
    if (!isDateKey(targetDate)) {
      setError("Pick a target date.");
      return;
    }
    const current = parseCount(currentValue);
    const target = parseCount(targetValue);
    if (Number.isNaN(current) || Number.isNaN(target)) {
      setError("Counts must be whole numbers.");
      return;
    }
    await onSave(
      {
        label: label.trim(),
        targetDate,
        currentValue: current,
        targetValue: target,
      },
      initial?.id ?? null,
    );
  };

  return (
    <Modal
      open={open}
      title={initial ? "Edit countdown" : "New countdown"}
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
            form="countdown-form"
            className="btn btn--primary btn--small"
            disabled={busy}
          >
            {busy ? "Saving…" : initial ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <form id="countdown-form" className="stack" onSubmit={submit}>
        <Field label="Name" htmlFor="countdown-label">
          <input
            id="countdown-label"
            className="input"
            value={label}
            maxLength={120}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Ship the beta"
            autoComplete="off"
          />
        </Field>
        <Field label="Target date" htmlFor="countdown-date">
          <input
            id="countdown-date"
            className="input"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </Field>
        <div className="row" style={{ gap: 10 }}>
          <Field label="From" htmlFor="countdown-current">
            <input
              id="countdown-current"
              className="input"
              inputMode="numeric"
              value={currentValue}
              onChange={(event) => setCurrentValue(event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="To" htmlFor="countdown-target">
            <input
              id="countdown-target"
              className="input"
              inputMode="numeric"
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
