use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum WolfError {
    #[error("Local database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("{entity} not found.")]
    NotFound { entity: &'static str },

    #[error("{0}")]
    Invalid(String),

    #[error("Desktop integration unavailable: {0}")]
    Desktop(String),

    #[error("Desktop integration failed: {0}")]
    Tauri(#[from] tauri::Error),

    #[error("{0}")]
    Internal(String),
}

impl WolfError {
    pub fn invalid(message: impl Into<String>) -> Self {
        WolfError::Invalid(message.into())
    }

    pub fn not_found(entity: &'static str) -> Self {
        WolfError::NotFound { entity }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        WolfError::Internal(message.into())
    }

    pub fn desktop(message: impl Into<String>) -> Self {
        WolfError::Desktop(message.into())
    }

    pub fn kind(&self) -> &'static str {
        match self {
            WolfError::Database(_) => "database",
            WolfError::NotFound { .. } => "not_found",
            WolfError::Invalid(_) => "invalid",
            WolfError::Desktop(_) => "desktop",
            WolfError::Tauri(_) => "desktop",
            WolfError::Internal(_) => "internal",
        }
    }
}

impl Serialize for WolfError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("WolfError", 2)?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

pub type WolfResult<T> = Result<T, WolfError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serialises_kind_and_human_message() {
        let err = WolfError::invalid("That value is not allowed.");
        let json = serde_json::to_value(&err).expect("serialisable");
        assert_eq!(json["kind"], "invalid");
        assert_eq!(json["message"], "That value is not allowed.");
    }

    #[test]
    fn not_found_message_is_readable() {
        assert_eq!(WolfError::not_found("Task").to_string(), "Task not found.");
    }
}
