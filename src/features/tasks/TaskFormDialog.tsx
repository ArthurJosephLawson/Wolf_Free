import { useState } from "react";
import { Field, Modal } from "../../components/ui";
import {
  PRIORITY_LABELS,
  type NewTask,
  type Task,
  type TaskPriority,
} from "../../types";
import { isDateKey, todayKey } from "../../lib/date";

interface TaskFormDialogProps {
  open: boolean;

  task: Task | null;
  onClose: () => void;
  onSubmit: (value: NewTask) => Promise<boolean>;
  onDelete?: () => void;
}

export function TaskFormDialog({
  open,
  task,
  onClose,
  onSubmit,
  onDelete,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    (task?.priority ?? 1) as TaskPriority,
  );
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalidDate = dueDate !== "" && !isDateKey(dueDate);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (title.trim() === "") {
      setError("Give the task a title.");
      return;
    }
    if (invalidDate) {
      setError("That due date is not valid.");
      return;
    }
    setBusy(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate === "" ? null : dueDate,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      footer={
        <>
          {task && onDelete ? (
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
            form="task-form"
            className="btn btn--primary btn--small"
            disabled={busy || invalidDate}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="stack">
        <Field label="Title" htmlFor="task-title">
          <input
            id="task-title"
            className="input"
            value={title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ship the release notes"
            autoComplete="off"
          />
        </Field>

        <Field label="Notes" htmlFor="task-description">
          <textarea
            id="task-description"
            className="textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional detail"
          />
        </Field>

        <div className="grid grid--3">
          <Field label="Priority" htmlFor="task-priority">
            <select
              id="task-priority"
              className="select"
              value={priority}
              onChange={(event) =>
                setPriority(Number(event.target.value) as TaskPriority)
              }
            >
              {([0, 1, 2, 3] as TaskPriority[]).map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Due date"
            htmlFor="task-due"
            hint={invalidDate ? "Use YYYY-MM-DD." : `Today is ${todayKey()}.`}
          >
            <input
              id="task-due"
              className="input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
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
