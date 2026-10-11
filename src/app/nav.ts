import type { IconName } from "../components/Icon";
import type { Route } from "../types";

export const NAV: readonly { route: Route; label: string; icon: IconName }[] = [
  { route: "home", label: "Today", icon: "home" },
  { route: "tasks", label: "Tasks", icon: "tasks" },
  { route: "habits", label: "Habits", icon: "habits" },
  { route: "calendar", label: "Calendar", icon: "calendar" },
  { route: "focus", label: "Focus", icon: "focus" },
  { route: "progress", label: "Progress", icon: "progress" },
  { route: "review", label: "Review", icon: "review" },
  { route: "manual", label: "Manual", icon: "book" },
  { route: "settings", label: "Settings", icon: "settings" },
];
