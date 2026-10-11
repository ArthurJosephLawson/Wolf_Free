import { useEffect, useRef, useState } from "react";
import { useWolfFrame } from "./useWolfFrames";
import { useWolfStore } from "./wolfStore";
import { useSettingsStore } from "../settings/settingsStore";
import { desktopService } from "../../services/desktop";
import { WolfSprite } from "./WolfSprite";
import { Icon } from "../../components/Icon";
import {
  LAND_HOLD_MS,
  companionVisualState,
  createDrag,
  dragMove,
  dragPress,
  dragRelease,
  dragTick,
  type DragPhase,
  type DragPoint,
} from "./dragLogic";

function isControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button") !== null;
}

function pointOf(event: React.PointerEvent): DragPoint {
  return { x: event.clientX, y: event.clientY, at: event.timeStamp };
}

export function Companion() {
  const state = useWolfStore((s) => s.state);
  const [phase, setPhase] = useState<DragPhase>("idle");
  const { frame } = useWolfFrame(companionVisualState(phase, state));
  const scale = useSettingsStore((s) => s.settings.companionScale);
  const clickAction = useSettingsStore((s) => s.settings.companionClickAction);
  const idleAnimations = useSettingsStore(
    (s) => s.settings.companionIdleAnimations,
  );
  const alwaysOnTop = useSettingsStore((s) => s.settings.companionAlwaysOnTop);
  const effectsEnabled = useSettingsStore((s) => s.settings.effectsEnabled);
  const accent = useSettingsStore((s) => s.settings.accent);
  const dragRef = useRef(createDrag());

  useEffect(() => {
    document.documentElement.dataset.effects = effectsEnabled ? "on" : "off";
  }, [effectsEnabled]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    if (!idleAnimations) return;
    const id = window.setInterval(
      () => useWolfStore.getState().reevaluate(),
      1_000,
    );
    return () => window.clearInterval(id);
  }, [idleAnimations]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void desktopService
      .onCompanionScale((scale) => {
        useSettingsStore.setState((state) => ({
          settings: { ...state.settings, companionScale: scale },
        }));
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void desktopService
      .onWolfSignal((signal) => {
        useWolfStore.getState().push(signal);
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const openMain = () => {
    void desktopService.showMain();
  };

  const poke = () => {
    useWolfStore.getState().pushShared("poked");
  };

  const hideSelf = () => {
    void desktopService.setCompanionVisible(false);
  };

  const toggleTop = () => {
    void desktopService.setCompanionAlwaysOnTop(!alwaysOnTop);
    void useSettingsStore
      .getState()
      .update({ companionAlwaysOnTop: !alwaysOnTop });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (isControl(event.target)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = dragPress(dragRef.current, pointOf(event));
    setPhase(dragRef.current.phase);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (isControl(event.target)) return;
    const result = dragMove(dragRef.current, pointOf(event));
    dragRef.current = result.session;
    setPhase(result.session.phase);
    if (result.begin) void desktopService.startCompanionDrag();
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (isControl(event.target)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const result = dragRelease(dragRef.current, pointOf(event), clickAction);
    dragRef.current = result.session;
    setPhase(result.session.phase);
    if (result.action === "open-main") openMain();
    else if (result.action === "poke") poke();
    if (result.session.phase === "landing") {
      window.setTimeout(() => {
        const tick = dragTick(dragRef.current, event.timeStamp + LAND_HOLD_MS);
        dragRef.current = tick.session;
        setPhase(tick.session.phase);
      }, LAND_HOLD_MS);
    }
  };

  return (
    <div
      className="companion-root"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = createDrag();
        setPhase("idle");
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Pet Wolf"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            poke();
          }
        }}
      >
        <WolfSprite frame={frame} scale={scale} />
      </div>

      <div className="companion-root__tools">
        <button
          type="button"
          className="companion-tool"
          onClick={openMain}
          aria-label="Open the main Wolf window"
        >
          <Icon name="home" />
        </button>
        <button
          type="button"
          className="companion-tool"
          onClick={toggleTop}
          aria-label="Always on top"
          aria-pressed={alwaysOnTop}
        >
          <Icon name="pin" />
        </button>
        <button
          type="button"
          className="companion-tool"
          onClick={hideSelf}
          aria-label="Hide Wolf"
        >
          <Icon name="hide" />
        </button>
      </div>
    </div>
  );
}
