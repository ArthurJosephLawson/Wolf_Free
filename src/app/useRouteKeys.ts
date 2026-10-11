import { useEffect } from "react";
import { NAV } from "./nav";
import { useUiStore } from "./uiStore";

export function useRouteKeys(): void {
  const setRoute = useUiStore((s) => s.setRoute);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (document.querySelector(".modal-backdrop")) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < NAV.length)
        setRoute(NAV[index]!.route);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setRoute]);
}
