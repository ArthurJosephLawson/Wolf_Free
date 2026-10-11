import { invoke } from "./ipc";
import type { Countdown, CountdownUpdate, NewCountdown } from "../types";

export const countdownService = {
  list(): Promise<Countdown[]> {
    return invoke<Countdown[]>("list_countdowns");
  },

  create(countdown: NewCountdown): Promise<Countdown> {
    return invoke<Countdown>("create_countdown", { countdown });
  },

  update(id: string, update: CountdownUpdate): Promise<Countdown> {
    return invoke<Countdown>("update_countdown", { id, update });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_countdown", { id });
  },
};
