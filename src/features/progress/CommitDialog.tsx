import { useState } from "react";
import { Field, Modal } from "../../components/ui";
import { isDateKey, todayKey } from "../../lib/date";
import type { NewCommitLog } from "../../types";

export function CommitDialog({
  open,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (commit: NewCommitLog) => Promise<void>;
}) {
  const [committedOn, setCommittedOn] = useState(todayKey());
  const [message, setMessage] = useState("");
  const [filesChanged, setFilesChanged] = useState("");
  const [linesAdded, setLinesAdded] = useState("");
  const [linesRemoved, setLinesRemoved] = useState("");
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
    if (message.trim() === "") {
      setError("Describe what shipped.");
      return;
    }
    if (!isDateKey(committedOn)) {
      setError("Pick the commit date.");
      return;
    }
    const files = parseCount(filesChanged);
    const added = parseCount(linesAdded);
    const removed = parseCount(linesRemoved);
    if (Number.isNaN(files) || Number.isNaN(added) || Number.isNaN(removed)) {
      setError("Counts must be whole numbers.");
      return;
    }
    await onSave({
      committedOn,
      message: message.trim(),
      filesChanged: files,
      linesAdded: added,
      linesRemoved: removed,
    });
    setMessage("");
    setFilesChanged("");
    setLinesAdded("");
    setLinesRemoved("");
  };

  return (
    <Modal
      open={open}
      title="Log a commit"
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
            form="commit-form"
            className="btn btn--primary btn--small"
            disabled={busy}
          >
            {busy ? "Saving…" : "Log"}
          </button>
        </>
      }
    >
      <form id="commit-form" className="stack" onSubmit={submit}>
        <Field label="Date" htmlFor="commit-date">
          <input
            id="commit-date"
            className="input"
            type="date"
            value={committedOn}
            onChange={(event) => setCommittedOn(event.target.value)}
          />
        </Field>
        <Field label="Message" htmlFor="commit-message">
          <input
            id="commit-message"
            className="input"
            value={message}
            maxLength={200}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ship the countdown panel"
            autoComplete="off"
          />
        </Field>
        <div className="row" style={{ gap: 10 }}>
          <Field label="Files" htmlFor="commit-files">
            <input
              id="commit-files"
              className="input"
              inputMode="numeric"
              value={filesChanged}
              onChange={(event) => setFilesChanged(event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Added" htmlFor="commit-added">
            <input
              id="commit-added"
              className="input"
              inputMode="numeric"
              value={linesAdded}
              onChange={(event) => setLinesAdded(event.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Removed" htmlFor="commit-removed">
            <input
              id="commit-removed"
              className="input"
              inputMode="numeric"
              value={linesRemoved}
              onChange={(event) => setLinesRemoved(event.target.value)}
              placeholder="0"
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
