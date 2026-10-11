import { useEffect } from "react";
import { useFocusStore } from "../features/focus/focusStore";
import { desktopService } from "../services/desktop";
import { isDesktop } from "../services/ipc";
import { useUiStore } from "./uiStore";

export function useDesktopEvents(): void {
  const setRoute = useUiStore((s) => s.setRoute);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    if (!isDesktop) return;
    const disposers: (() => void)[] = [];
    let cancelled = false;

    const track = (pending: Promise<() => void>) => {
      void pending.then((dispose) => {
        if (cancelled) dispose();
        else disposers.push(dispose);
      });
    };

    track(
      desktopService.onTray((payload) => {
        if (payload.route) {
          setRoute(payload.route);
          void desktopService.showMain();
        }
        if (payload.focus === "start") useFocusStore.getState().start();
        if (payload.focus === "pause") useFocusStore.getState().pause();
      }),
    );

    track(
      desktopService.onCompanionError((message) => {
        pushToast({
          tone: "error",
          title: "Companion window failed",
          body: message,
        });
      }),
    );

    return () => {
      cancelled = true;
      for (const dispose of disposers) dispose();
      disposers.length = 0;
    };
  }, [setRoute, pushToast]);
}
