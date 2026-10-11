import { Chip, Empty } from "../../components/ui";
import { prioritySymbol, toView } from "./taskLogic";
import type { Task, TaskPriority } from "../../types";

interface TaskListProps {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  emptyMessage: string;
}

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  emptyMessage,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <Empty>{emptyMessage}</Empty>;
  }

  return (
    <ul className="list">
      {tasks.map((task) => {
        const view = toView(task);
        return (
          <li
            key={task.id}
            className="list__item"
            data-completed={task.completed}
          >
            <button
              type="button"
              className="btn btn--small"
              style={{
                padding: "2px 5px",
                minWidth: 26,
                background: task.completed
                  ? "var(--success-dim)"
                  : "var(--bg-sunken)",
                borderColor: task.completed
                  ? "var(--success)"
                  : "var(--border-strong)",
                color: task.completed ? "var(--text)" : "var(--text-dim)",
              }}
              onClick={() => onToggle(task)}
              aria-pressed={task.completed}
              aria-label={
                task.completed
                  ? `Reopen ${task.title}`
                  : `Complete ${task.title}`
              }
            >
              {task.completed ? "✓" : "▢"}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  textDecoration: task.completed ? "line-through" : "none",
                  color: task.completed ? "var(--text-faint)" : "var(--text)",
                  wordBreak: "break-word",
                }}
              >
                {task.title}
              </div>
              {task.description ? (
                <div className="faint" style={{ whiteSpace: "pre-wrap" }}>
                  {task.description}
                </div>
              ) : null}
              <div className="row" style={{ gap: 4, marginTop: 3 }}>
                <Chip
                  tone={
                    view.overdue
                      ? "danger"
                      : task.priority >= 3
                        ? "warn"
                        : task.priority === 0
                          ? "default"
                          : "accent"
                  }
                  title={`Priority: ${view.priorityLabel}`}
                >
                  <span aria-hidden="true">
                    {prioritySymbol(task.priority as TaskPriority)}
                  </span>
                  {view.priorityLabel}
                </Chip>
                {task.dueDate ? (
                  <Chip
                    tone={
                      view.overdue
                        ? "danger"
                        : view.dueToday
                          ? "warn"
                          : "default"
                    }
                  >
                    {view.dueLabel}
                  </Chip>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => onEdit(task)}
              aria-label={`Edit ${task.title}`}
              title="Edit"
            >
              ✎
            </button>
          </li>
        );
      })}
    </ul>
  );
}
