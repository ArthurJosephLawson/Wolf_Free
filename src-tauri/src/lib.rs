pub mod commands;
pub mod database;
pub mod error;
pub mod gitlog;
pub mod models;
pub mod notifications;
pub mod state;
pub mod tray;
pub mod windows;

use tauri::{Emitter, Listener, Manager, RunEvent, WindowEvent};

use crate::database::Database;
use crate::state::{AppState, Paths};

pub const TRAY_EVENT: &str = tray::TRAY_EVENT;

pub const COMPANION_ERROR_EVENT: &str = "wolf://companion-error";

struct Boot {
    db: Database,
    settings: models::Settings,
    paths: Paths,
}

fn bootstrap() -> Result<Boot, String> {
    let db_path = database::default_database_path().map_err(|e| e.to_string())?;
    let db = Database::open(&db_path).map_err(|e| e.to_string())?;
    let settings = db.load_settings().unwrap_or_default();

    Ok(Boot {
        paths: Paths { db_path },
        db,
        settings,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let boot = match bootstrap() {
        Ok(boot) => boot,
        Err(reason) => {
            eprintln!("wolf: could not start: {reason}");
            eprintln!("wolf: data lives under $XDG_CONFIG_HOME/wolf (usually ~/.config/wolf)");
            std::process::exit(1);
        }
    };

    let companion_enabled = boot.settings.companion_enabled;
    let start_minimized = boot.settings.start_minimized;

    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            let _ = windows::show_main(app);
        }));
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new(boot.db, boot.settings, boot.paths))
        .invoke_handler(tauri::generate_handler![
            commands::tasks::list_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::set_task_completed,
            commands::tasks::delete_task,
            commands::tasks::task_stats,
            commands::tasks::task_overview,
            commands::xp::xp_summary,
            commands::countdown::list_countdowns,
            commands::countdown::create_countdown,
            commands::countdown::update_countdown,
            commands::countdown::delete_countdown,
            commands::commit::list_commit_logs,
            commands::commit::create_commit_log,
            commands::commit::delete_commit_log,
            commands::commit::sync_commit_logs,
            commands::habits::list_habits,
            commands::habits::create_habit,
            commands::habits::update_habit,
            commands::habits::set_habit_archived,
            commands::habits::delete_habit,
            commands::habits::complete_habit,
            commands::habits::uncomplete_habit,
            commands::habits::list_habit_completions,
            commands::calendar::list_events,
            commands::calendar::upcoming_events,
            commands::calendar::create_event,
            commands::calendar::update_event,
            commands::calendar::delete_event,
            commands::calendar::month_summaries,
            commands::calendar::events_for_day,
            commands::calendar::due_event_reminders,
            commands::calendar::mark_event_notified,
            commands::calendar::calendar_overview,
            commands::focus::list_focus_sessions,
            commands::focus::create_focus_session,
            commands::focus::delete_focus_session,
            commands::focus::focus_stats,
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::desktop::show_main_window,
            commands::desktop::hide_main_window,
            commands::desktop::set_companion_visible,
            commands::desktop::toggle_companion,
            commands::desktop::set_companion_always_on_top,
            commands::desktop::save_companion_position,
            commands::desktop::quit_app,
            commands::desktop::send_notification,
            commands::desktop::notifications_available,
            commands::desktop::environment,
            commands::desktop::diagnostics,
            commands::backup::export_backup,
            commands::backup::import_backup,
        ])
        .setup(move |app| {
            if let Err(err) = tray::build_tray(app.handle()) {
                eprintln!("wolf: tray unavailable ({err}); the app will keep running");
            }

            let handle = app.handle().clone();
            app.listen("wolf://companion-scale", {
                let handle = handle.clone();
                move |event| {
                    let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload())
                    else {
                        return;
                    };
                    let Some(scale) = payload.get("scale").and_then(|v| v.as_f64()) else {
                        return;
                    };
                    if !scale.is_finite() || scale <= 0.0 {
                        return;
                    }
                    let (width, height) = windows::companion_size(scale.round().clamp(2.0, 5.0));
                    if let Ok(window) = windows::companion_window(&handle) {
                        let _ = window.set_size(tauri::LogicalSize::new(width, height));
                    }
                }
            });

            if companion_enabled {
                if let Err(err) = windows::ensure_companion(&handle) {
                    log::warn!("companion window unavailable: {err}");
                    let _ = handle.emit(COMPANION_ERROR_EVENT, err.to_string());
                }
            }
            if !start_minimized {
                if let Err(err) = windows::show_main(&handle) {
                    log::warn!("could not show the main window: {err}");
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            let app = window.app_handle();
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == windows::MAIN_WINDOW
                    && commands::desktop::handle_close_requested(app)
                {
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("wolf: failed to start the desktop application")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                let _ = windows::persist_companion_position(app);
            }
        });
}
