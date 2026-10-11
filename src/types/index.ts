export type TaskPriority = 0 | 1 | 2 | 3;

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  0: "Low",
  1: "Normal",
  2: "High",
  3: "Urgent",
};

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface NewTask {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export type TaskFilter = "all" | "active" | "completed" | "today" | "overdue";
export type TaskSort =
  "default" | "dueDate" | "priority" | "alphabetical" | "created";

export interface TaskListQuery {
  filter: TaskFilter;
  sort: TaskSort;
  search?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  open: number;
  dueToday: number;
  overdue: number;
}

export interface TaskOverview {
  stats: TaskStats;
  today: Task[];
  overdue: Task[];
}

export type HabitFrequency = "daily" | "weekdays" | "weekly";

export const FREQUENCY_LABELS: Record<HabitFrequency, string> = {
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Weekly",
};

export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  targetPerPeriod: number;
  color: string;
  createdAt: string;
  archived: boolean;
}

export interface NewHabit {
  name: string;
  description?: string;
  frequency?: HabitFrequency;
  targetPerPeriod?: number;
  color?: string;
}

export interface HabitUpdate {
  name?: string;
  description?: string;
  frequency?: HabitFrequency;
  targetPerPeriod?: number;
  color?: string;
  archived?: boolean;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: string;
}

interface HabitDay {
  date: string;
  completed: boolean;
  scheduled: boolean;
}

export interface HabitWithProgress {
  id: string;
  name: string;
  description: string;
  frequency: HabitFrequency;
  targetPerPeriod: number;
  color: string;
  createdAt: string;
  archived: boolean;
  today: string;
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  recent: HabitDay[];
  completions30d: number;
}

export type RecurrenceRule = "none" | "daily" | "weekdays" | "weekly";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;

  startTime: string;
  endTime: string;
  allDay: boolean;
  reminderMinutes: number | null;
  notifiedAt: string | null;
  recurrence: RecurrenceRule;
  createdAt: string;
  updatedAt: string;
}

export interface NewCalendarEvent {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  reminderMinutes?: number | null;
  recurrence?: RecurrenceRule;
}

export interface CalendarEventUpdate {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  reminderMinutes?: number | null;
  recurrence?: RecurrenceRule;
}

export interface DaySummary {
  date: string;
  events: CalendarEvent[];
  taskCount: number;
  completedTaskCount: number;
}

export interface CalendarOverview {
  todayEvents: CalendarEvent[];
  upcoming: CalendarEvent[];
}

type FocusSessionKind = "focus" | "short_break" | "long_break";

export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  completed: boolean;
  kind: FocusSessionKind;
}

export interface NewFocusSession {
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
  completed?: boolean;
  kind?: FocusSessionKind;
}

interface DailyFocus {
  date: string;
  minutes: number;
}

export interface FocusStats {
  completedToday: number;
  completedWeek: number;
  totalCompleted: number;
  focusMinutesToday: number;
  focusMinutesWeek: number;
  dailyMinutes: DailyFocus[];
}

export type FocusPhase = "idle" | "focus" | "short_break" | "long_break";

export type TimerStatus =
  "IDLE" | "FOCUSING" | "BREAK" | "PAUSED" | "COMPLETED";

export type AccentColor = "green" | "amber" | "rose";
export type TextSize = "sm" | "md" | "lg";
export type Density = "compact" | "normal" | "roomy";
type CompanionClickAction = "poke" | "open";

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  notificationsEnabled: boolean;
  eventRemindersEnabled: boolean;
  soundEnabled: boolean;
  companionEnabled: boolean;
  companionAlwaysOnTop: boolean;
  companionScale: number;
  companionX: number | null;
  companionY: number | null;
  companionClickAction: CompanionClickAction;
  companionIdleAnimations: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  effectsEnabled: boolean;
  accent: AccentColor;
  textSize: TextSize;
  density: Density;
  developerMode: boolean;
  userName: string;
  repoPath: string;
}

export interface EnvironmentInfo {
  sessionType: string;
  desktop: string;
  appVersion: string;
  dataDir: string;
  notificationsAvailable: boolean;
}

export interface TrayPayload {
  route?: "tasks" | "settings";
  focus?: "start" | "pause";
}

export type XpSource = "task" | "habit" | "focus" | "countdown";

export interface XpSummary {
  total: number;
  lifetimeTotal: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export interface Countdown {
  id: string;
  label: string;
  targetDate: string;
  currentValue: number;
  targetValue: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewCountdown {
  label: string;
  targetDate: string;
  targetValue?: number | null;
  currentValue?: number | null;
}

export interface CountdownUpdate {
  label?: string | null;
  targetDate?: string | null;
  targetValue?: number | null;
  currentValue?: number | null;
}

export interface CommitLog {
  id: string;
  committedOn: string;
  message: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  createdAt: string;
}

export interface NewCommitLog {
  committedOn: string;
  message: string;
  filesChanged?: number | null;
  linesAdded?: number | null;
  linesRemoved?: number | null;
}

export type Route =
  | "home"
  | "tasks"
  | "calendar"
  | "habits"
  | "focus"
  | "progress"
  | "review"
  | "manual"
  | "settings";

export interface WolfErrorShape {
  kind: string;
  message: string;
}
