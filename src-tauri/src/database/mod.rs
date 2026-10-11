pub mod calendar;
pub mod commit;
pub mod countdown;
pub mod focus;
pub mod habits;
pub mod migrator;
pub mod settings;
pub mod tasks;
#[cfg(test)]
pub mod test_support;
pub mod xp;

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use rusqlite::Connection;

use crate::error::{WolfError, WolfResult};

#[derive(Clone)]
pub struct Database {
    inner: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn open(path: &Path) -> WolfResult<Self> {
        let conn = migrator::open_database(path)?;
        migrator::migrate(&conn)?;
        Ok(Database {
            inner: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn open_in_memory() -> WolfResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        migrator::migrate(&conn)?;
        Ok(Database {
            inner: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn with_conn<T>(&self, f: impl FnOnce(&Connection) -> WolfResult<T>) -> WolfResult<T> {
        let guard = self.inner.lock().map_err(|_| {
            WolfError::internal("The local database lock was poisoned by an earlier error.")
        })?;
        f(&guard)
    }

    pub fn with_tx<T>(&self, f: impl FnOnce(&Connection) -> WolfResult<T>) -> WolfResult<T> {
        let guard = self.inner.lock().map_err(|_| {
            WolfError::internal("The local database lock was poisoned by an earlier error.")
        })?;
        let tx = guard.unchecked_transaction()?;
        let value = f(&guard)?;
        tx.commit()?;
        Ok(value)
    }
}

pub fn default_database_path() -> WolfResult<PathBuf> {
    let base = config_dir()?;
    Ok(base.join("wolf").join("wolf.db"))
}

pub fn config_dir() -> WolfResult<PathBuf> {
    if let Ok(xdg) = std::env::var("XDG_CONFIG_HOME") {
        if !xdg.trim().is_empty() {
            return Ok(PathBuf::from(xdg));
        }
    }
    match std::env::var("HOME") {
        Ok(home) if !home.trim().is_empty() => Ok(PathBuf::from(home).join(".config")),
        _ => Err(WolfError::internal(
            "Wolf could not determine your home directory. Set HOME or XDG_CONFIG_HOME.",
        )),
    }
}
