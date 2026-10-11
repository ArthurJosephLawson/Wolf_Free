import { invoke } from "./ipc";
import { toAppError } from "../lib/errors";
interface LocalNotification {
  summary: string;
  body: string;
  urgent?: boolean;
}

class NotificationsUnavailableError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "NotificationsUnavailableError";
    this.reason = reason;
  }
}

export async function notify({
  summary,
  body,
  urgent,
}: LocalNotification): Promise<void> {
  try {
    await invoke<void>("send_notification", {
      summary,
      body,
      urgent: urgent ?? false,
    });
  } catch (error) {
    const appError = toAppError(error, "Wolf could not show a notification.");
    throw new NotificationsUnavailableError(appError.message);
  }
}

export async function notifyQuiet(
  notification: LocalNotification,
): Promise<boolean> {
  try {
    await notify(notification);
    return true;
  } catch {
    return false;
  }
}

export async function notificationsAvailable(): Promise<boolean> {
  try {
    return await invoke<boolean>("notifications_available");
  } catch {
    return false;
  }
}

export const MESSAGES = {
  focusComplete(minutes: number): LocalNotification {
    return {
      summary: "Focus session complete",
      body: `${minutes} minutes done. Take a short break — Wolf is celebrating.`,
    };
  },
  breakComplete(): LocalNotification {
    return {
      summary: "Break over",
      body: "Back to it. Wolf is ready when you are.",
    };
  },
  eventSoon(title: string, minutes: number): LocalNotification {
    return {
      summary: minutes > 0 ? `Starts in ${minutes} min` : "Starting now",
      body: title,
      urgent: minutes <= 5,
    };
  },
};
