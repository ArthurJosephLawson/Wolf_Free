use std::path::PathBuf;
use std::sync::RwLock;

use tauri::{AppHandle, Manager, Runtime, State};

use crate::database::Database;
use crate::error::{WolfError, WolfResult};
use crate::models::Settings;

pub struct Paths {
    pub db_path: PathBuf,
}

pub struct AppState {
    db: RwLock<Database>,
    settings: RwLock<Settings>,
    pub paths: Paths,
}

impl AppState {
    pub fn new(db: Database, settings: Settings, paths: Paths) -> Self {
        AppState {
            db: RwLock::new(db),
            settings: RwLock::new(settings),
            paths,
        }
    }

    pub fn db(&self) -> WolfResult<Database> {
        Ok(self
            .db
            .read()
            .map_err(|_| WolfError::internal("Database lock was poisoned."))?
            .clone())
    }

    pub fn settings(&self) -> Settings {
        self.settings
            .read()
            .map(|s| s.clone())
            .unwrap_or_else(|_| Settings::default())
    }

    pub fn replace_settings(&self, incoming: Settings) -> WolfResult<Settings> {
        let incoming = incoming.sanitized();
        let saved = self.db()?.save_settings(&incoming)?;
        let mut guard = self
            .settings
            .write()
            .map_err(|_| WolfError::internal("Settings lock was poisoned."))?;
        *guard = saved.clone();
        Ok(saved)
    }

    pub fn patch_settings(&self, patch: crate::models::SettingsPatch) -> WolfResult<Settings> {
        let mut current = self.settings();
        current.apply_patch(patch);
        self.replace_settings(current)
    }
}

pub fn state<'a, R: Runtime>(app: &'a AppHandle<R>) -> WolfResult<State<'a, AppState>> {
    app.try_state::<AppState>()
        .ok_or_else(|| WolfError::internal("Wolf is still starting up."))
}
