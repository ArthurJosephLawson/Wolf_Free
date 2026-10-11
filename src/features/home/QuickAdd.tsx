import { useState } from "react";
import { useTaskStore } from "../tasks/taskStore";
import { useWolfStore } from "../wolf/wolfStore";
import { isDateKey, relativeDay, todayKey, toDateKey } from "../../lib/date";
import { PRIORITY_LABELS, type TaskPriority } from "../../types";

export function QuickAdd() {
  const create = useTaskStore((s) => s.create);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(1);
  const [busy, setBusy] = useState(false);

  const invalidDate = due !== "" && !isDateKey(due);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === "" || busy || invalidDate) return;
    setBusy(true);
    const created = await create({
      title: trimmed,
      priority,
      dueDate: due === "" ? null : due,
    });
    setBusy(false);
    if (created) {
      setTitle("");
      setDue("");
      setPriority(1);
      useWolfStore.getState().pushShared("task-created");
    }
  };

  return (
    <form className="row" onSubmit={submit} aria-label="Add a task">
      <label className="visually-hidden" htmlFor="quick-add-title">
        New task title
      </label>
      <input
        id="quick-add-title"
        className="input"
        style={{ flex: 1, minWidth: 140 }}
        placeholder="What needs doing?"
        value={title}
        maxLength={200}
        onChange={(event) => setTitle(event.target.value)}
      />

      <label className="visually-hidden" htmlFor="quick-add-due">
        Due date
      </label>
      <input
        id="quick-add-due"
        className="input"
        style={{ width: 150, flexShrink: 0 }}
        type="date"
        min={toDateKey()}
        value={due}
        onChange={(event) => setDue(event.target.value)}
        title={due ? relativeDay(due) : `Today is ${todayKey()}`}
      />

      <label className="visually-hidden" htmlFor="quick-add-priority">
        Priority
      </label>
      <select
        id="quick-add-priority"
        className="select"
        style={{ width: "auto" }}
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

      <button
        type="submit"
        className="btn btn--primary"
        disabled={busy || title.trim() === "" || invalidDate}
      >
        Add
      </button>
    </form>
  );
}
