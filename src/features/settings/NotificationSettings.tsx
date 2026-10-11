import { Toggle } from "./SettingsFields";
import type { EnvironmentInfo, Settings } from "../../types";

export function NotificationSettings({
  settings,
  env,
  set,
}: {
  settings: Settings;
  env: EnvironmentInfo | null;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}) {
  const unavailable = env?.notificationsAvailable === false;

  return (
    <div className="stack">
      <Toggle
        label="Notifications"
        hint={
          unavailable
            ? "No notification service detected on this desktop."
            : undefined
        }
        checked={settings.notificationsEnabled}
        disabled={unavailable}
        onChange={(value) => set("notificationsEnabled", value)}
      />
      <Toggle
        label="Event reminders"
        checked={settings.eventRemindersEnabled}
        onChange={(value) => set("eventRemindersEnabled", value)}
      />
    </div>
  );
}
