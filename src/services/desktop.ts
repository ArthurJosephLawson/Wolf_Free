import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke, isDesktop } from "./ipc";
import { isWolfSignal, type WolfSignal } from "../assets/wolf/animation";
import type { EnvironmentInfo, TrayPayload } from "../types";

const TRAY_EVENT = "wolf://tray";

const COMPANION_ERROR_EVENT = "wolf://companion-error";

const WOLF_SIGNAL_EVENT = "wolf://signal";

async function getCurrentWindow() {
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}

export const desktopService = {
  isDesktop,

  showMain(): Promise<void> {
    return invoke<void>("show_main_window");
  },

  hideMain(): Promise<void> {
    return invoke<void>("hide_main_window");
  },

  async setCompanionVisible(visible: boolean): Promise<boolean> {
    return invoke<boolean>("set_companion_visible", { visible });
  },

  toggleCompanion(): Promise<boolean> {
    return invoke<boolean>("toggle_companion");
  },

  setCompanionAlwaysOnTop(value: boolean): Promise<void> {
    return invoke<void>("set_companion_always_on_top", { value });
  },

  saveCompanionPosition(): Promise<void> {
    return invoke<void>("save_companion_position");
  },

  quit(): Promise<void> {
    return invoke<void>("quit_app");
  },

  environment(): Promise<EnvironmentInfo> {
    return invoke<EnvironmentInfo>("environment");
  },

  onTray(handler: (payload: TrayPayload) => void): Promise<UnlistenFn> {
    if (!isDesktop) return Promise.resolve(() => undefined);
    return listen<TrayPayload>(TRAY_EVENT, (event) => handler(event.payload));
  },

  onCompanionError(handler: (message: string) => void): Promise<UnlistenFn> {
    if (!isDesktop) return Promise.resolve(() => undefined);
    return listen<string>(COMPANION_ERROR_EVENT, (event) =>
      handler(event.payload),
    );
  },

  async requestCompanionResize(scale: number): Promise<void> {
    if (!isDesktop) return;
    await emit("wolf://companion-scale", { scale });
  },

  async startCompanionDrag(): Promise<void> {
    if (!isDesktop) return;
    const window = await getCurrentWindow();
    await window.startDragging();
  },

  onCompanionScale(handler: (scale: number) => void): Promise<UnlistenFn> {
    if (!isDesktop) return Promise.resolve(() => undefined);
    return listen<{ scale: number }>("wolf://companion-scale", (event) => {
      const scale = event.payload?.scale;
      if (typeof scale === "number" && Number.isFinite(scale)) {
        handler(scale);
      }
    });
  },

  async broadcastWolfSignal(signal: WolfSignal): Promise<void> {
    if (!isDesktop) return;
    try {
      await emit(WOLF_SIGNAL_EVENT, signal);
    } catch {
      return;
    }
  },

  onWolfSignal(handler: (signal: WolfSignal) => void): Promise<UnlistenFn> {
    if (!isDesktop) return Promise.resolve(() => undefined);
    return listen<unknown>(WOLF_SIGNAL_EVENT, (event) => {
      if (!isWolfSignal(event.payload)) return;
      handler(event.payload);
    });
  },
};
