import { useEffect } from "react";
import { useFocusStore } from "../features/focus/focusStore";
import { desktopService } from "../services/desktop";

export function useAppShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      const combo = event.ctrlKey || event.metaKey;

      if (combo && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        const focus = useFocusStore.getState();
        const status = focus.snapshot.status;
        if (status === "IDLE" || status === "COMPLETED") {
          focus.start();
        } else {
          focus.pause();
        }
        return;
      }

      if (combo && event.shiftKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        void desktopService.toggleCompanion();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (typing) return;
      if (event.key.toLowerCase() === "n") {
        const quickAdd = document.getElementById("quick-add-title");
        if (quickAdd) {
          event.preventDefault();
          quickAdd.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
