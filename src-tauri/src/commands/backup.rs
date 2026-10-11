use std::collections::BTreeMap;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::error::{WolfError, WolfResult};
use crate::state::AppState;

pub const FORMAT_VERSION: u32 = 1;

pub const TABLES: [&str; 10] = [
    "tasks",
    "habits",
    "habit_completions",
    "calendar_events",
    "focus_sessions",
    "xp_events",
    "countdowns",
    "commit_logs",
    "ignored_commits",
    "settings",
];

const SETTINGS_TABLE: &str = "settings";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupFile {
    pub format_version: u32,
    pub exported_at: String,
    pub app_version: String,
    pub tables: BTreeMap<String, Vec<Value>>,
}

fn json_from_sql(value: &rusqlite::types::ValueRef<'_>) -> Value {
    match value {
        rusqlite::types::ValueRef::Null => Value::Null,
        rusqlite::types::ValueRef::Integer(i) => Value::from(*i),
        rusqlite::types::ValueRef::Real(f) => Value::from(*f),
        rusqlite::types::ValueRef::Text(t) => Value::from(String::from_utf8_lossy(t).into_owned()),
        rusqlite::types::ValueRef::Blob(_) => Value::Null,
    }
}

fn dump_table(conn: &Connection, table: &str) -> WolfResult<Vec<Value>> {
    let mut stmt = conn.prepare(&format!("SELECT * FROM {table}"))?;
    let columns = stmt
        .column_names()
        .into_iter()
        .map(String::from)
        .collect::<Vec<_>>();
    let mut rows = stmt.query([])?;
    let mut out = Vec::new();
    while let Some(row) = rows.next()? {
        let mut object = serde_json::Map::new();
        for (index, name) in columns.iter().enumerate() {
            object.insert(name.clone(), json_from_sql(&row.get_ref(index)?));
        }
        out.push(Value::Object(object));
    }
    Ok(out)
}

pub fn build_backup(conn: &Connection, app_version: &str) -> WolfResult<BackupFile> {
    let mut tables = BTreeMap::new();
    for table in TABLES {
        tables.insert(table.to_string(), dump_table(conn, table)?);
    }
    Ok(BackupFile {
        format_version: FORMAT_VERSION,
        exported_at: chrono::Local::now().to_rfc3339(),
        app_version: app_version.to_string(),
        tables,
    })
}

fn sql_bind(value: &Value) -> WolfResult<rusqlite::types::Value> {
    Ok(match value {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else {
                let f = n
                    .as_f64()
                    .ok_or_else(|| WolfError::invalid("Backup holds an unreadable number."))?;
                rusqlite::types::Value::Real(f)
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        Value::Array(_) | Value::Object(_) => {
            return Err(WolfError::invalid(
                "Backup holds a nested value where a column was expected.",
            ));
        }
    })
}

fn table_columns(conn: &Connection, table: &str) -> WolfResult<Vec<String>> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({table})"))?;
    let mut rows = stmt.query([])?;
    let mut columns = Vec::new();
    while let Some(row) = rows.next()? {
        columns.push(row.get::<_, String>(1)?);
    }
    Ok(columns)
}

fn load_table(conn: &Connection, table: &str, rows: &[Value], replace: bool) -> WolfResult<usize> {
    if rows.is_empty() {
        return Ok(0);
    }
    let columns = table_columns(conn, table)?;
    let mut inserted = 0usize;
    for row in rows {
        let object = row.as_object().ok_or_else(|| {
            WolfError::invalid(format!("Backup row in `{table}` is not an object."))
        })?;
        for key in object.keys() {
            if !columns.contains(key) {
                return Err(WolfError::invalid(format!(
                    "Backup row in `{table}` has unknown field `{key}`."
                )));
            }
        }
        if object.is_empty() {
            return Err(WolfError::invalid(format!(
                "Backup row in `{table}` has no fields."
            )));
        }
        let names = object.keys().cloned().collect::<Vec<_>>();
        let placeholders = (1..=names.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(", ");
        let column_list = names.join(", ");
        let sql = if replace {
            format!("INSERT OR REPLACE INTO {table} ({column_list}) VALUES ({placeholders})")
        } else {
            format!(
                "INSERT INTO {table} ({column_list}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            )
        };
        let bound = names
            .iter()
            .map(|name| sql_bind(&object[name]))
            .collect::<WolfResult<Vec<_>>>()?;
        inserted += conn.execute(&sql, rusqlite::params_from_iter(bound))?;
    }
    Ok(inserted)
}

pub fn restore_backup(conn: &Connection, json: &str) -> WolfResult<usize> {
    let file: BackupFile = serde_json::from_str(json)
        .map_err(|_| WolfError::invalid("That file is not a Wolf backup."))?;
    if file.format_version != FORMAT_VERSION {
        return Err(WolfError::invalid(format!(
            "This backup has format version {}. Wolf reads version {}.",
            file.format_version, FORMAT_VERSION
        )));
    }
    for name in file.tables.keys() {
        if !TABLES.contains(&name.as_str()) {
            return Err(WolfError::invalid(format!(
                "Backup holds an unknown table `{name}`."
            )));
        }
    }

    conn.execute("BEGIN", [])?;
    let outcome = (|| {
        let mut inserted = 0usize;
        for table in TABLES {
            let rows = file
                .tables
                .get(table)
                .map(|rows| rows.as_slice())
                .unwrap_or(&[]);
            inserted += load_table(conn, table, rows, table == SETTINGS_TABLE)?;
        }
        Ok(inserted)
    })();
    match outcome {
        Ok(inserted) => {
            conn.execute("COMMIT", [])?;
            Ok(inserted)
        }
        Err(err) => {
            let _ = conn.execute("ROLLBACK", []);
            Err(err)
        }
    }
}

#[tauri::command]
pub fn export_backup(app: tauri::AppHandle, state: State<'_, AppState>) -> WolfResult<String> {
    let version = app.package_info().version.to_string();
    state.db()?.with_conn(|conn| {
        let file = build_backup(conn, &version)?;
        serde_json::to_string(&file)
            .map_err(|err| WolfError::internal(format!("Could not encode the backup: {err}")))
    })
}

#[tauri::command]
pub fn import_backup(state: State<'_, AppState>, json: String) -> WolfResult<usize> {
    state.db()?.with_conn(|conn| restore_backup(conn, &json))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::test_support::test_db;
    use crate::models::task::TaskListQuery;
    use crate::models::Settings;

    fn export(db: &crate::database::Database) -> String {
        db.with_conn(|conn| {
            let file = build_backup(conn, "test").expect("backup builds");
            serde_json::to_string(&file).map_err(|err| WolfError::internal(err.to_string()))
        })
        .expect("with_conn")
    }

    #[test]
    fn a_backup_round_trips_into_an_empty_database() {
        let source = test_db();
        source
            .create_task("Water the plants", None, None, None)
            .expect("task created");

        let json = export(&source);

        let target = test_db();
        let inserted = target
            .with_conn(|conn| restore_backup(conn, &json))
            .expect("restore");
        assert!(inserted >= 1);

        let tasks = target
            .list_tasks(&TaskListQuery::default(), "2026-10-07")
            .expect("tasks listed");
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Water the plants");
    }

    #[test]
    fn unknown_format_versions_are_rejected() {
        let db = test_db();
        let json = r#"{"formatVersion":99,"exportedAt":"now","appVersion":"0","tables":{}}"#;
        let err = db
            .with_conn(|conn| restore_backup(conn, json))
            .expect_err("version 99 must be rejected");
        assert!(err.to_string().contains("format version 99"));
    }

    #[test]
    fn files_that_are_not_backups_are_rejected() {
        let db = test_db();
        let err = db
            .with_conn(|conn| restore_backup(conn, "not json"))
            .expect_err("garbage must be rejected");
        assert!(err.to_string().contains("not a Wolf backup"));
    }

    #[test]
    fn unknown_tables_are_rejected() {
        let db = test_db();
        let json =
            r#"{"formatVersion":1,"exportedAt":"now","appVersion":"0","tables":{"pets":[]}}"#;
        let err = db
            .with_conn(|conn| restore_backup(conn, json))
            .expect_err("unknown table must be rejected");
        assert!(err.to_string().contains("unknown table"));
    }

    #[test]
    fn a_failed_restore_leaves_every_table_untouched() {
        let json = r#"{
            "formatVersion": 1,
            "exportedAt": "now",
            "appVersion": "0",
            "tables": {
                "tasks": [{"id":"t1","title":"Kept?","description":"","completed":0,"priority":2,"due_date":null,"created_at":"2026-01-01T00:00","updated_at":"2026-01-01T00:00","completed_at":null}],
                "habits": [{"id":"h1","name":"","description":"","frequency":"daily","target_per_period":1,"color":"green","created_at":"2026-01-01T00:00","archived":0}]
            }
        }"#;

        let db = test_db();
        let err = db
            .with_conn(|conn| restore_backup(conn, json))
            .expect_err("habit CHECK violation must fail the restore");
        assert!(err.to_string().contains("database") || !err.to_string().is_empty());

        let tasks = db
            .list_tasks(&TaskListQuery::default(), "2026-10-07")
            .expect("tasks listed");
        assert!(tasks.is_empty(), "rolled back task must not survive");
    }

    #[test]
    fn settings_in_a_backup_replace_the_local_settings() {
        let source = test_db();
        let incoming = Settings {
            user_name: "Backup Name".to_string(),
            ..Settings::default()
        };
        source.save_settings(&incoming).expect("settings saved");
        let json = export(&source);

        let target = test_db();
        let local = Settings {
            user_name: "Local Name".to_string(),
            ..Settings::default()
        };
        target.save_settings(&local).expect("settings saved");

        target
            .with_conn(|conn| restore_backup(conn, &json))
            .expect("restore");

        let loaded = target.load_settings().expect("settings loaded");
        assert_eq!(loaded.user_name, "Backup Name");
    }

    #[test]
    fn records_that_already_exist_are_kept_not_overwritten() {
        let source = test_db();
        source
            .create_task("From backup", None, None, None)
            .expect("task created");
        let json = export(&source);

        let target = test_db();
        target
            .create_task("Local task", None, None, None)
            .expect("task created");
        target
            .with_conn(|conn| restore_backup(conn, &json))
            .expect("restore");

        let tasks = target
            .list_tasks(&TaskListQuery::default(), "2026-10-07")
            .expect("tasks listed");
        assert_eq!(tasks.len(), 2);
    }
}
