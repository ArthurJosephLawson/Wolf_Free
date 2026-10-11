use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Runtime};

use crate::error::WolfResult;
use crate::windows;

pub const TRAY_ID: &str = "wolf-tray";

pub const TRAY_EVENT: &str = "wolf://tray";

#[derive(Debug, Clone, Copy)]
pub enum TrayAction {
    Open,
    ShowCompanion,
    HideCompanion,
    StartFocus,
    PauseFocus,
    TodayTasks,
    Settings,
    Quit,
}

pub fn build_tray<R: Runtime>(app: &AppHandle<R>) -> WolfResult<()> {
    let open = MenuItem::with_id(app, "open", "Open Wolf", true, None::<&str>)?;
    let show_companion =
        MenuItem::with_id(app, "show-companion", "Show Companion", true, None::<&str>)?;
    let hide_companion =
        MenuItem::with_id(app, "hide-companion", "Hide Companion", true, None::<&str>)?;
    let mid_separator = PredefinedMenuItem::separator(app)?;
    let start_focus = MenuItem::with_id(app, "start-focus", "Start Focus", true, None::<&str>)?;
    let pause_focus = MenuItem::with_id(app, "pause-focus", "Pause Focus", true, None::<&str>)?;
    let today_tasks = MenuItem::with_id(app, "today-tasks", "Today's Tasks", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("Ctrl+Q"))?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &separator,
            &show_companion,
            &hide_companion,
            &mid_separator,
            &start_focus,
            &pause_focus,
            &today_tasks,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("Wolf — local productivity companion")
        .show_menu_on_left_click(false)
        .on_menu_event(handle_menu_event)
        .on_tray_icon_event(handle_tray_event);

    if let Some(icon) = tray_icon() {
        builder = builder.icon(icon);
    } else if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app).map_err(|e| {
        crate::error::WolfError::desktop(format!("Could not create the tray icon: {e}"))
    })?;

    Ok(())
}

fn tray_icon() -> Option<tauri::image::Image<'static>> {
    const TRAY_ICON: &[u8] = include_bytes!("../../icons/tray-22.png");
    tauri::image::Image::from_bytes(TRAY_ICON).ok()
}

fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let action = match event.id().as_ref() {
        "open" => TrayAction::Open,
        "show-companion" => TrayAction::ShowCompanion,
        "hide-companion" => TrayAction::HideCompanion,
        "start-focus" => TrayAction::StartFocus,
        "pause-focus" => TrayAction::PauseFocus,
        "today-tasks" => TrayAction::TodayTasks,
        "settings" => TrayAction::Settings,
        "quit" => TrayAction::Quit,
        _ => return,
    };
    dispatch(app, action);
}

fn handle_tray_event<R: Runtime>(tray: &tauri::tray::TrayIcon<R>, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
    } = event
    {
        dispatch(tray.app_handle(), TrayAction::Open);
    }
}

fn dispatch<R: Runtime>(app: &AppHandle<R>, action: TrayAction) {
    match action {
        TrayAction::Quit => {
            windows::quit(app);
        }
        TrayAction::Open | TrayAction::TodayTasks | TrayAction::Settings => {
            if let Err(err) = windows::show_main(app) {
                log::warn!("could not show the main window: {err}");
            }
            let payload = match action {
                TrayAction::TodayTasks => Some(serde_json::json!({ "route": "tasks" })),
                TrayAction::Settings => Some(serde_json::json!({ "route": "settings" })),
                _ => None,
            };
            if let Some(payload) = payload {
                let _ = app.emit(TRAY_EVENT, payload);
            }
        }
        TrayAction::ShowCompanion => {
            if let Err(err) = windows::set_companion_visible(app, true) {
                log::warn!("could not show the companion: {err}");
            }
        }
        TrayAction::HideCompanion => {
            if let Err(err) = windows::set_companion_visible(app, false) {
                log::warn!("could not hide the companion: {err}");
            }
        }
        TrayAction::StartFocus | TrayAction::PauseFocus => {
            let verb = if matches!(action, TrayAction::StartFocus) {
                "start"
            } else {
                "pause"
            };
            let _ = app.emit(TRAY_EVENT, serde_json::json!({ "focus": verb }));
        }
    }
}
