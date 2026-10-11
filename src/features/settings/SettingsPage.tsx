import { useEffect, useState } from "react";
import { Panel, ErrorNote, Field, PageHeader } from "../../components/ui";
import { useWolfStore } from "../wolf/wolfStore";
import { DEFAULT_SETTINGS, useSettingsStore } from "./settingsStore";
import { DesktopSettings } from "./DesktopSettings";
import { FocusSettings } from "./FocusSettings";
import { NotificationSettings } from "./NotificationSettings";
import { BackupSettings } from "./BackupSettings";
import { Row, Toggle } from "./SettingsFields";
import { Segmented } from "../tasks/Segmented";
import { desktopService } from "../../services/desktop";
import type {
  AccentColor,
  Density,
  EnvironmentInfo,
  Settings,
  TextSize,
} from "../../types";

export function SettingsPage() {
  const store = useSettingsStore();
  const settings = store.settings;
  const [env, setEnv] = useState<EnvironmentInfo | null>(null);
  const [envError, setEnvError] = useState(false);

  useEffect(() => {
    void desktopService
      .environment()
      .then((info) => {
        setEnv(info);
        setEnvError(false);
      })
      .catch(() => {
        setEnv(null);
        setEnvError(true);
      });
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    void store.update({ [key]: value } as Partial<Settings>);
  };

  const resetAll = () => {
    void store.update(DEFAULT_SETTINGS);
    useWolfStore.getState().pushShared("poked");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Tune Wolf to your taste. Everything stays on this machine."
      />

      <Panel title="Profile">
        <ErrorNote message={store.error} onDismiss={store.clearError} />

        <div className="grid grid--2">
          <Field
            label="Your name"
            htmlFor="settings-name"
            hint="Used in greetings. Never sent anywhere."
          >
            <input
              id="settings-name"
              className="input"
              value={settings.userName}
              maxLength={40}
              onChange={(event) => set("userName", event.target.value)}
            />
          </Field>

          <Field
            label="Repository path"
            htmlFor="settings-repo"
            hint="Folder to read git commits from on the Progress page. Leave empty to turn syncing off."
          >
            <input
              id="settings-repo"
              className="input"
              value={settings.repoPath}
              maxLength={300}
              spellCheck={false}
              autoComplete="off"
              placeholder="/home/you/Workspace/my-project"
              onChange={(event) => set("repoPath", event.target.value)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Focus timer">
        <FocusSettings settings={settings} set={set} />
      </Panel>

      <Panel title="Desktop">
        <DesktopSettings settings={settings} set={set} onReset={resetAll} />
      </Panel>

      <Panel title="Display">
        <Toggle
          label="Motion and effects"
          hint="Subtle transitions, glow and elevation. Honours your reduced-motion setting."
          checked={settings.effectsEnabled}
          onChange={(value) => set("effectsEnabled", value)}
        />
        <div className="field" style={{ marginTop: 8 }}>
          <span className="field__label">Accent</span>
          <Segmented<AccentColor>
            label="Accent"
            value={settings.accent}
            options={[
              { value: "green", label: "Green" },
              { value: "amber", label: "Amber" },
              { value: "rose", label: "Rose" },
            ]}
            onChange={(value) => set("accent", value)}
          />
        </div>
        <div className="field" style={{ marginTop: 6 }}>
          <span className="field__label">Text size</span>
          <Segmented<TextSize>
            label="Text size"
            value={settings.textSize}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Default" },
              { value: "lg", label: "Large" },
            ]}
            onChange={(value) => set("textSize", value)}
          />
        </div>
        <div className="field" style={{ marginTop: 6 }}>
          <span className="field__label">Spacing</span>
          <Segmented<Density>
            label="Spacing"
            value={settings.density}
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "roomy", label: "Roomy" },
            ]}
            onChange={(value) => set("density", value)}
          />
        </div>
      </Panel>

      <Panel title="Notifications">
        <NotificationSettings settings={settings} env={env} set={set} />
      </Panel>

      <BackupSettings />

      <Panel title="About">
        {env ? (
          <ul className="list">
            <Row label="Version" value={env.appVersion} />
            <Row label="Developer" value="Monk_Mango (Arthur Joseph Lawson)" />
            <Row label="Company" value="ScriptMonks" />
            <Row label="Session" value={env.sessionType} />
            <Row label="Desktop" value={env.desktop} />
            <Row label="Data directory" value={env.dataDir} />
            <Row
              label="Notifications"
              value={env.notificationsAvailable ? "available" : "unavailable"}
            />
          </ul>
        ) : envError ? (
          <p className="faint">Could not read the environment.</p>
        ) : (
          <p className="faint">Loading environment…</p>
        )}
        <div style={{ marginTop: 8 }}>
          <p className="faint">
            This is the free edition of Wolf. Wolf v0.4.0 is coming soon — a
            bigger version with goals, a vault, a journal and more. Download it
            soon at{" "}
            <a href="https://scriptmonks.com" target="_blank" rel="noreferrer">
              scriptmonks.com
            </a>
            .
          </p>
        </div>
        <ul className="list" style={{ marginTop: 8 }}>
          <Row label="Instagram" value="@monk_mango" />
          <Row label="GitHub" value="@ArthurJosephLawson" />
          <Row label="GitHub · Company" value="@Script_monks" />
          <Row label="Built on" value="Tauri · React · SQLite" />
        </ul>
        <p className="faint" style={{ marginTop: 4 }}>
          Third-party software and fonts are listed in CREDITS.md.
        </p>
        <p className="faint" style={{ marginTop: 8 }}>
          Wolf stores everything locally in SQLite. No accounts, no telemetry,
          no network calls at all.
        </p>
      </Panel>
    </>
  );
}
