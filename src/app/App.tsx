import { useEffect, useMemo } from "react";
import { useTaskStore } from "../features/tasks/taskStore";
import { HomePage } from "../features/home/HomePage";
import { TasksPage } from "../features/tasks/TasksPage";
import { HabitsPage } from "../features/habits/HabitsPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { FocusPage } from "../features/focus/FocusPage";
import { ProgressPage } from "../features/progress/ProgressPage";
import { ReviewPage } from "../features/review/ReviewPage";
import { ManualPage } from "../features/manual/ManualPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { useSettingsStore } from "../features/settings/settingsStore";
import { useFocusStore } from "../features/focus/focusStore";
import { useWolfStore } from "../features/wolf/wolfStore";
import { isDesktop } from "../services/ipc";
import { Icon } from "../components/Icon";
import { NAV } from "./nav";
import { StandaloneNotice } from "./StandaloneNotice";
import { ToastHost } from "./ToastHost";
import { useDesktopEvents } from "./useDesktopEvents";
import { useReminderSweep } from "./useReminderSweep";
import { useRouteKeys } from "./useRouteKeys";
import { useAppShortcuts } from "./useAppShortcuts";
import { useUiStore } from "./uiStore";

export function App() {
  const route = useUiStore((s) => s.route);
  const setRoute = useUiStore((s) => s.setRoute);
  const settings = useSettingsStore((s) => s.settings);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    document.documentElement.dataset.window = "main";
    document.body.dataset.window = "main";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.effects = settings.effectsEnabled
      ? "on"
      : "off";
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.text = settings.textSize;
    document.documentElement.dataset.density = settings.density;
  }, [
    settings.effectsEnabled,
    settings.accent,
    settings.textSize,
    settings.density,
  ]);

  useEffect(() => {
    const id = window.setInterval(
      () => useWolfStore.getState().reevaluate(),
      1_000,
    );
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    useFocusStore.getState().init(settings);
  }, [settings]);

  useReminderSweep(settings);
  useDesktopEvents();
  useRouteKeys();
  useAppShortcuts();

  const page = useMemo(() => {
    switch (route) {
      case "tasks":
        return <TasksPage />;
      case "habits":
        return <HabitsPage />;
      case "calendar":
        return <CalendarPage />;
      case "focus":
        return <FocusPage />;
      case "progress":
        return <ProgressPage />;
      case "review":
        return <ReviewPage />;
      case "manual":
        return <ManualPage />;
      case "settings":
        return <SettingsPage />;
      case "home":
      default:
        return <HomePage />;
    }
  }, [route]);

  if (!isDesktop) {
    return <StandaloneNotice />;
  }

  return (
    <div className="app-shell">
      <header className="titlebar" data-tauri-drag-region>
        <span className="titlebar__brand" data-tauri-drag-region>
          Wolf
        </span>
        <span className="titlebar__spacer" data-tauri-drag-region />
        <span className="titlebar__edition" data-tauri-drag-region>
          Free edition
        </span>
      </header>

      <div className="coming-soon" role="note">
        <span className="coming-soon__icon" aria-hidden="true">
          <Icon name="flag" size={14} />
        </span>
        <span>
          Wolf v0.4.0 is coming soon — a bigger version with goals, a vault, a
          journal and more. Download it soon at{" "}
          <a href="https://scriptmonks.com" target="_blank" rel="noreferrer">
            scriptmonks.com
          </a>
          .
        </span>
      </div>

      <nav className="sidebar" aria-label="Sections">
        {NAV.map((item, index) => (
          <button
            key={item.route}
            type="button"
            className="sidebar__link"
            aria-current={route === item.route ? "page" : undefined}
            onClick={() => setRoute(item.route)}
            title={`${item.label} (${index + 1})`}
          >
            <span className="sidebar__icon" aria-hidden="true">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="sidebar__label">{item.label}</span>
          </button>
        ))}
        <span className="spacer" />
        <button
          type="button"
          className="sidebar__link"
          onClick={() => void useTaskStore.getState().load()}
          title="Reload tasks"
        >
          <span className="sidebar__icon" aria-hidden="true">
            <Icon name="reload" size={18} />
          </span>
          <span className="sidebar__label">Reload</span>
        </button>
      </nav>

      <main className="main scroll-y">
        <div className="main__inner">{page}</div>
      </main>

      <footer className="app-footer">ScriptMonks / Monk_Mango</footer>

      <ToastHost />
    </div>
  );
}
