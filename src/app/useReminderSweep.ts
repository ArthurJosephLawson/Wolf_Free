import { useEffect } from "react";
import { minutesUntil, pendingReminders } from "../lib/reminderLogic";
import { calendarService } from "../services/calendar";
import { isDesktop } from "../services/ipc";
import { MESSAGES, notify } from "../services/notify";
import type { Settings } from "../types";

const REMINDER_INTERVAL_MS = 30_000;

export function useReminderSweep(settings: Settings): void {
  useEffect(() => {
    if (!isDesktop) return;
    if (!settings.eventRemindersEnabled || !settings.notificationsEnabled)
      return;

    let cancelled = false;

    let inFlight = false;

    const sweep = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const due = await calendarService.dueReminders();
        if (cancelled) return;
        for (const event of pendingReminders(due, new Date())) {
          const minutes = minutesUntil(event.startTime, new Date());
          await notify(MESSAGES.eventSoon(event.title, minutes));
          if (cancelled) return;
          await calendarService.markNotified(event.id);
        }
      } catch {
        return;
      } finally {
        inFlight = false;
      }
    };

    void sweep();
    const id = window.setInterval(() => void sweep(), REMINDER_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [settings.eventRemindersEnabled, settings.notificationsEnabled]);
}
