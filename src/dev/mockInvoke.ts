import type {
  CalendarEvent,
  CalendarOverview,
  CommitLog,
  Countdown,
  DaySummary,
  EnvironmentInfo,
  FocusSession,
  FocusStats,
  HabitWithProgress,
  Settings,
  Task,
  TaskOverview,
  TaskStats,
  XpSummary,
} from "../types";

const TODAY = "2026-10-10";
const NOW = "2026-10-10T09:00";

const tasks: Task[] = [
  {
    id: "t1",
    title: "Draft the v0.4 announcement",
    description: "One paragraph on the identity rewrite.",
    completed: false,
    priority: 2,
    dueDate: TODAY,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  },
  {
    id: "t2",
    title: "Review the icon set",
    description: "",
    completed: false,
    priority: 1,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  },
  {
    id: "t3",
    title: "Tag the release",
    description: "",
    completed: true,
    priority: 0,
    dueDate: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
  },
];

const taskStats: TaskStats = {
  total: 3,
  completed: 1,
  open: 2,
  dueToday: 1,
  overdue: 0,
};

const taskOverview: TaskOverview = {
  stats: taskStats,
  today: tasks.filter((task) => task.dueDate === TODAY),
  overdue: [],
};

const habits: HabitWithProgress[] = [
  {
    id: "h1",
    name: "Read for 20 minutes",
    description: "",
    frequency: "daily",
    targetPerPeriod: 1,
    color: "cyan",
    createdAt: NOW,
    archived: false,
    today: TODAY,
    completedToday: true,
    currentStreak: 6,
    longestStreak: 12,
    completions30d: 21,
    recent: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      completed: index % 2 === 0,
      scheduled: true,
    })),
  },
  {
    id: "h2",
    name: "Stretch",
    description: "",
    frequency: "weekdays",
    targetPerPeriod: 1,
    color: "amber",
    createdAt: NOW,
    archived: false,
    today: TODAY,
    completedToday: false,
    currentStreak: 2,
    longestStreak: 9,
    completions30d: 14,
    recent: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 1).padStart(2, "0")}`,
      completed: index % 3 === 0,
      scheduled: index % 5 !== 0,
    })),
  },
];

const events: CalendarEvent[] = [
  {
    id: "e1",
    title: "Standup",
    description: "",
    startTime: `${TODAY}T09:30`,
    endTime: `${TODAY}T09:45`,
    allDay: false,
    reminderMinutes: 10,
    notifiedAt: null,
    recurrence: "weekdays",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "e2",
    title: "Release window",
    description: "Cut 0.4.0 if checks are green.",
    startTime: `${TODAY}T16:00`,
    endTime: `${TODAY}T17:00`,
    allDay: false,
    reminderMinutes: 30,
    notifiedAt: null,
    recurrence: "none",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const daySummary: DaySummary[] = [
  { date: TODAY, events, taskCount: 3, completedTaskCount: 1 },
];

const calendarOverview: CalendarOverview = {
  todayEvents: events,
  upcoming: events,
};

const focusSessions: FocusSession[] = [
  {
    id: "f1",
    startedAt: `${TODAY}T08:00`,
    endedAt: `${TODAY}T08:25`,
    durationSeconds: 1500,
    completed: true,
    kind: "focus",
  },
];

const focusStats: FocusStats = {
  completedToday: 1,
  completedWeek: 5,
  totalCompleted: 42,
  focusMinutesToday: 25,
  focusMinutesWeek: 125,
  dailyMinutes: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-10-0${index + 4}`,
    minutes: 25 * ((index % 3) + 1),
  })),
};

const countdowns: Countdown[] = [
  {
    id: "c1",
    label: "Concert",
    targetDate: "2026-11-01",
    currentValue: 0,
    targetValue: 100,
    completedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const commits: CommitLog[] = [
  {
    id: "g1",
    committedOn: TODAY,
    message: "feat(theme): v0.3 design tokens",
    filesChanged: 8,
    linesAdded: 420,
    linesRemoved: 335,
    createdAt: NOW,
  },
  {
    id: "g2",
    committedOn: "2026-10-09",
    message: "feat(brand): vector wolf mark",
    filesChanged: 24,
    linesAdded: 427,
    linesRemoved: 335,
    createdAt: NOW,
  },
];

const settings: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  notificationsEnabled: true,
  eventRemindersEnabled: true,
  soundEnabled: true,
  companionEnabled: true,
  companionAlwaysOnTop: false,
  companionScale: 3,
  companionX: null,
  companionY: null,
  companionClickAction: "open",
  companionIdleAnimations: true,
  startMinimized: false,
  closeToTray: true,
  effectsEnabled: true,
  accent: "green",
  textSize: "md",
  density: "normal",
  developerMode: false,
  userName: "Monk",
  repoPath: "",
};

const environment: EnvironmentInfo = {
  sessionType: "wayland",
  desktop: "GNOME",
  appVersion: "0.3.1",
  dataDir: "/home/monk/.local/share/wolf",
  notificationsAvailable: true,
};

const xp: XpSummary = {
  total: 120,
  lifetimeTotal: 1_450,
  level: 6,
  xpIntoLevel: 20,
  xpForNextLevel: 80,
};

type Handler = (args: Record<string, unknown>) => unknown;

export const MOCK_COMMANDS: Record<string, Handler> = {
  environment: () => environment,
  notifications_available: () => true,
  send_notification: () => null,
  get_settings: () => settings,
  save_settings: () => settings,

  list_tasks: () => tasks,
  task_stats: () => taskStats,
  task_overview: () => taskOverview,
  create_task: () => tasks[0],
  update_task: () => tasks[0],
  set_task_completed: () => tasks[0],
  delete_task: () => null,

  list_habits: () => habits,
  list_habit_completions: () => [TODAY],
  create_habit: () => habits[0],
  update_habit: () => habits[0],
  set_habit_archived: () => habits[0],
  complete_habit: () => ({ id: "hc1", habitId: "h1", completedAt: NOW }),
  uncomplete_habit: () => null,
  delete_habit: () => null,

  list_events: () => events,
  upcoming_events: () => events,
  calendar_overview: () => calendarOverview,
  month_summaries: () => daySummary,
  events_for_day: () => events,
  due_event_reminders: () => [],
  create_event: () => events[0],
  update_event: () => events[0],
  delete_event: () => null,
  mark_event_notified: () => null,

  list_focus_sessions: () => focusSessions,
  focus_stats: () => focusStats,
  create_focus_session: () => focusSessions[0],
  delete_focus_session: () => null,

  xp_summary: () => xp,

  list_countdowns: () => countdowns,
  create_countdown: () => countdowns[0],
  update_countdown: () => countdowns[0],
  delete_countdown: () => null,

  list_commit_logs: () => commits,
  sync_commit_logs: () => commits,
  create_commit_log: () => commits[0],
  delete_commit_log: () => null,

  export_backup: () => '{"appVersion":"0.3.1","tables":{}}',
  import_backup: () => 3,

  show_main_window: () => null,
  hide_main_window: () => null,
  set_companion_visible: () => true,
  toggle_companion: () => true,
  set_companion_always_on_top: () => null,
  save_companion_position: () => null,
  quit_app: () => null,

  "plugin:event|listen": () => 0,
  "plugin:event|unlisten": () => null,
  "plugin:event|emit": () => null,
};

let callbackId = 0;
const callbacks = new Map<number, unknown>();

export function installMockInvoke(): void {
  if (typeof window === "undefined") return;
  const target = window as unknown as {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => unknown;
      transformCallback: (callback: unknown) => number;
      unregisterListener: () => void;
    };
  };
  if (target.__TAURI_INTERNALS__) return;

  target.__TAURI_INTERNALS__ = {
    invoke: (cmd, args) => {
      if (cmd === "plugin:event|listen") {
        callbackId += 1;
        callbacks.set(callbackId, args?.handler);
        return Promise.resolve(callbackId);
      }
      if (cmd === "plugin:event|unlisten") return Promise.resolve(null);
      const handler = MOCK_COMMANDS[cmd];
      if (!handler) {
        return Promise.reject(new Error(`no mock for ${cmd}`));
      }
      try {
        return Promise.resolve(handler(args ?? {}));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    transformCallback: (callback) => {
      callbackId += 1;
      callbacks.set(callbackId, callback);
      return callbackId;
    },
    unregisterListener: () => undefined,
  };
}
