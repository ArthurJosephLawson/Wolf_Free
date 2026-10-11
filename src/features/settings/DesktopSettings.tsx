import { useState } from "react";
import { Field, Modal } from "../../components/ui";
import { desktopService } from "../../services/desktop";
import { useUiStore } from "../../app/uiStore";
import { Toggle } from "./SettingsFields";
import type { Settings } from "../../types";

export function DesktopSettings({
  settings,
  set,
  onReset,
}: {
  settings: Settings;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onReset: () => void;
}) {
  const toast = useUiStore((s) => s.pushToast);
  const [confirm, setConfirm] = useState(false);

  const toggleCompanion = async (enabled: boolean) => {
    set("companionEnabled", enabled);
    try {
      await desktopService.setCompanionVisible(enabled);
      useUiStore.getState().setCompanionVisible(enabled);
    } catch {
      toast({
        tone: "warning",
        title: "Could not change the companion window",
      });
    }
  };

  return (
    <div className="stack">
      <Toggle
        label="Show the companion wolf"
        hint="A small always-on-top wolf you can drag around."
        checked={settings.companionEnabled}
        onChange={(value) => void toggleCompanion(value)}
      />
      <Toggle
        label="Companion stays on top"
        checked={settings.companionAlwaysOnTop}
        onChange={(value) => {
          set("companionAlwaysOnTop", value);
          void desktopService.setCompanionAlwaysOnTop(value);
        }}
      />
      <Field label="Companion size" htmlFor="settings-companion-scale">
        <input
          id="settings-companion-scale"
          type="range"
          min={2}
          max={5}
          step={1}
          value={settings.companionScale}
          onChange={(event) => {
            const scale = Number(event.target.value);
            set("companionScale", scale);
            void desktopService.requestCompanionResize(scale);
          }}
        />
        <span className="faint">{settings.companionScale}×</span>
      </Field>
      <Field
        label="Wolf responds to a click with"
        htmlFor="settings-companion-click"
      >
        <select
          id="settings-companion-click"
          className="select"
          value={settings.companionClickAction}
          onChange={(event) =>
            set(
              "companionClickAction",
              event.target.value === "open" ? "open" : "poke",
            )
          }
        >
          <option value="poke">A poke (double-click opens Wolf)</option>
          <option value="open">Opening Wolf straight away</option>
        </select>
      </Field>
      <Toggle
        label="Companion idle animations"
        hint="Turn off to keep the wolf still until something happens."
        checked={settings.companionIdleAnimations}
        onChange={(value) => set("companionIdleAnimations", value)}
      />
      <Toggle
        label="Close to tray"
        hint="Closing the window keeps Wolf running in the tray."
        checked={settings.closeToTray}
        onChange={(value) => set("closeToTray", value)}
      />
      <Toggle
        label="Start minimized"
        checked={settings.startMinimized}
        onChange={(value) => set("startMinimized", value)}
      />
      <div className="row">
        <button
          type="button"
          className="btn btn--small"
          onClick={() => void desktopService.saveCompanionPosition()}
        >
          Remember companion position
        </button>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => void desktopService.showMain()}
        >
          Show main window
        </button>
        <button
          type="button"
          className="btn btn--small btn--danger"
          onClick={() => setConfirm(true)}
        >
          Reset all settings
        </button>
      </div>

      {confirm ? (
        <Modal
          open
          title="Reset every setting?"
          onClose={() => setConfirm(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={() => {
                  setConfirm(false);
                  onReset();
                  toast({
                    tone: "success",
                    title: "Settings reset",
                    body: "Back to Wolf's defaults.",
                  });
                }}
              >
                Reset
              </button>
            </>
          }
        >
          <p>
            Every setting goes back to Wolf's defaults. Your tasks and habits
            stay.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
