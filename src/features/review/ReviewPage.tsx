import { useEffect, useState } from "react";
import { Empty, ErrorNote, Panel, Stat, PageHeader } from "../../components/ui";
import { toAppError } from "../../lib/errors";
import { focusService } from "../../services/focus";
import { habitService } from "../../services/habits";
import { taskService } from "../../services/tasks";
import { xpService } from "../../services/xp";
import { PRIORITY_LABELS } from "../../types";
import type {
  FocusStats,
  HabitWithProgress,
  Task,
  XpSummary,
} from "../../types";

interface ReviewData {
  summary: XpSummary;
  stats: FocusStats;
  overdue: Task[];
  today: Task[];
  openHabits: HabitWithProgress[];
}

function TaskLine({ task }: { task: Task }) {
  return (
    <li className="list__item">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{task.title}</div>
        {task.dueDate ? <div className="faint">Due {task.dueDate}</div> : null}
      </div>
      {task.priority >= 2 ? (
        <span className="chip">{PRIORITY_LABELS[task.priority]}</span>
      ) : null}
    </li>
  );
}

export function ReviewPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    void Promise.all([
      xpService.summary(7),
      focusService.stats(),
      taskService.overview(),
      habitService.list(),
    ])
      .then(([summary, stats, overview, habits]) => {
        if (disposed) return;
        setData({
          summary,
          stats,
          overdue: overview.overdue,
          today: overview.today.filter((task) => !task.completed),
          openHabits: habits.filter(
            (habit) => !habit.archived && !habit.completedToday,
          ),
        });
        setError(null);
      })
      .catch((cause: unknown) => {
        if (disposed) return;
        setError(
          toAppError(cause, "Wolf could not build your review.").message,
        );
      });
    return () => {
      disposed = true;
    };
  }, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Review" subtitle="Weekly checkpoint." />
        <Panel>
          <ErrorNote message={error} onDismiss={() => setError(null)} />
          <p className="faint">{error ? "" : "Gathering your week…"}</p>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Review" subtitle="Weekly checkpoint." />
      <Panel title="This week">
        <ErrorNote message={error} onDismiss={() => setError(null)} />
        <div className="grid grid--3">
          <Stat
            label="XP this week"
            value={data.summary.total}
            tone={data.summary.total > 0 ? "ok" : undefined}
          />
          <Stat label="Focus minutes" value={data.stats.focusMinutesWeek} />
          <Stat label="Sessions" value={data.stats.completedWeek} />
        </div>
        <p className="faint" style={{ marginTop: 8 }}>
          Level {data.summary.level} · {data.summary.xpForNextLevel} XP to the
          next level.
        </p>
      </Panel>

      <Panel title="Overdue">
        {data.overdue.length === 0 ? (
          <Empty>Nothing overdue. Nice.</Empty>
        ) : (
          <ul className="list">
            {data.overdue.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Due today">
        {data.today.length === 0 ? (
          <Empty>No tasks due today.</Empty>
        ) : (
          <ul className="list">
            {data.today.map((task) => (
              <TaskLine key={task.id} task={task} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Habits left today">
        {data.openHabits.length === 0 ? (
          <Empty>Every habit done. Enjoy the quiet.</Empty>
        ) : (
          <ul className="list">
            {data.openHabits.map((habit) => (
              <li key={habit.id} className="list__item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{habit.name}</div>
                  <div className="faint">
                    Streak {habit.currentStreak} day
                    {habit.currentStreak === 1 ? "" : "s"}
                  </div>
                </div>
                <span className="chip">{habit.frequency}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
