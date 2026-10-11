import { useEffect, useMemo, useState } from "react";
import { Panel, ErrorNote, Empty, Chip, PageHeader } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { EventFormDialog } from "./EventFormDialog";
import { eventsOn, useCalendarStore } from "./calendarStore";
import { useWolfStore } from "../wolf/wolfStore";
import {
  WEEKDAY_LABELS,
  formatDayLong,
  formatTime,
  isSameDay,
  monthGrid,
  todayKey,
  toDateKey,
} from "../../lib/date";
import type { CalendarEvent, NewCalendarEvent } from "../../types";

export function CalendarPage() {
  const store = useCalendarStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    void store.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => monthGrid(store.viewMonth), [store.viewMonth]);
  const monthLabel = store.viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const selectedSummary = eventsOn(store.summaries, store.selectedDate);

  const shiftMonth = (delta: number) => {
    const next = new Date(
      store.viewMonth.getFullYear(),
      store.viewMonth.getMonth() + delta,
      1,
    );
    void store.goToMonth(next);
  };

  const handleSubmit = async (value: NewCalendarEvent): Promise<boolean> => {
    const ok = editing
      ? await store.update(editing.id, value)
      : Boolean(await store.create(value));
    if (ok) useWolfStore.getState().pushShared("default");
    return ok;
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Your month at a glance."
        actions={
          <>
            <button
              type="button"
              className="btn btn--small"
              onClick={() => void store.goToToday()}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              New event
            </button>
          </>
        }
      />

      <Panel>
        <ErrorNote message={store.error} onDismiss={store.clearError} />

        <div className="row" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <strong style={{ minWidth: 150, textAlign: "center" }}>
            {monthLabel}
          </strong>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <div
          role="grid"
          aria-label={monthLabel}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 2,
          }}
        >
          <div role="row" style={{ display: "contents" }}>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="mono-label"
                style={{ textAlign: "center" }}
                aria-hidden="true"
              >
                {label.slice(0, 1)}
              </div>
            ))}
          </div>

          {Array.from({ length: 6 }, (_, week) => (
            <div key={week} role="row" style={{ display: "contents" }}>
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const key = toDateKey(day);
                const summary = eventsOn(store.summaries, key);
                const inMonth = day.getMonth() === store.viewMonth.getMonth();
                const isToday = isSameDay(day, new Date());
                const selected = key === store.selectedDate;
                const count = summary?.events.length ?? 0;
                const openTasks = summary
                  ? summary.taskCount - summary.completedTaskCount
                  : 0;

                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-selected={selected}
                    aria-label={`${formatDayLong(key)}, ${count} events, ${openTasks} open tasks`}
                    onClick={() => void store.selectDate(key)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 2,
                      minHeight: 46,
                      padding: 3,
                      cursor: "pointer",
                      background: selected
                        ? "var(--primary-dim)"
                        : "var(--bg-sunken)",
                      border: "2px solid",
                      borderColor: isToday
                        ? "var(--accent)"
                        : selected
                          ? "var(--primary)"
                          : "var(--border)",
                      color: inMonth ? "var(--text)" : "var(--text-faint)",
                      fontSize: 11,
                    }}
                  >
                    <span
                      style={{
                        textAlign: "left",
                        fontWeight: isToday ? 700 : 400,
                      }}
                    >
                      {day.getDate()}
                    </span>
                    <span className="row" style={{ gap: 1, flexWrap: "wrap" }}>
                      {count > 0 ? (
                        <span
                          aria-hidden="true"
                          title={`${count} event${count === 1 ? "" : "s"}`}
                          style={{
                            width: 5,
                            height: 5,
                            background: "var(--accent)",
                          }}
                        />
                      ) : null}
                      {openTasks > 0 ? (
                        <span
                          aria-hidden="true"
                          title={`${openTasks} open task${openTasks === 1 ? "" : "s"}`}
                          style={{
                            width: 5,
                            height: 5,
                            background: "var(--warning)",
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 6 }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              background: "var(--accent)",
              marginRight: 4,
            }}
          />
          event
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              background: "var(--warning)",
              margin: "0 4px 0 10px",
            }}
          />
          open task
        </p>
      </Panel>

      <Panel title={formatDayLong(store.selectedDate)}>
        {store.events.length === 0 ? (
          <Empty>Nothing scheduled. Enjoy the quiet.</Empty>
        ) : (
          <ul className="list">
            {store.events.map((event) => (
              <li key={`${event.id}:${event.startTime}`} className="list__item">
                <div style={{ width: 74, flex: "none" }} className="faint">
                  {event.allDay ? "All day" : formatTime(event.startTime)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{event.title}</div>
                  {event.description ? (
                    <div className="faint">{event.description}</div>
                  ) : null}
                  <div className="row" style={{ gap: 4, marginTop: 2 }}>
                    {!event.allDay ? (
                      <Chip>
                        {formatTime(event.startTime)}–
                        {formatTime(event.endTime)}
                      </Chip>
                    ) : null}
                    {event.reminderMinutes !== null ? (
                      <Chip tone="accent" title="Wolf will notify you">
                        {event.reminderMinutes === 0
                          ? "At start"
                          : `${event.reminderMinutes}m before`}
                      </Chip>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  aria-label={`Edit ${event.title}`}
                  onClick={() => {
                    setEditing(event);
                    setDialogOpen(true);
                  }}
                >
                  ✎
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedSummary ? (
          <p className="faint" style={{ marginTop: 8 }}>
            {selectedSummary.completedTaskCount}/{selectedSummary.taskCount}{" "}
            tasks done this day
          </p>
        ) : null}
      </Panel>

      {dialogOpen ? (
        <EventFormDialog
          open
          event={editing}
          defaultDate={store.selectedDate || todayKey()}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          onDelete={editing ? () => void store.remove(editing.id) : undefined}
        />
      ) : null}
    </>
  );
}
