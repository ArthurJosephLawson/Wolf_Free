use super::Database;

pub fn test_db() -> Database {
    Database::open_in_memory().expect("in-memory database")
}
