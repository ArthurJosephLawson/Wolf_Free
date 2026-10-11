use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Manager, Runtime};

static AVAILABLE: AtomicBool = AtomicBool::new(true);

#[derive(Debug, Clone)]
pub struct Notification {
    pub summary: String,
    pub body: String,
    pub urgent: bool,
}

impl Notification {
    pub fn new(summary: impl Into<String>, body: impl Into<String>) -> Self {
        Notification {
            summary: summary.into(),
            body: body.into(),
            urgent: false,
        }
    }

    pub fn urgent(mut self) -> Self {
        self.urgent = true;
        self
    }
}

pub fn is_available() -> bool {
    AVAILABLE.load(Ordering::Relaxed)
}

pub fn notify<R: Runtime>(app: &AppHandle<R>, notification: Notification) -> Result<(), String> {
    let state = app
        .try_state::<crate::state::AppState>()
        .ok_or_else(|| "Wolf is still starting up.".to_string())?;

    if !state.settings().notifications_enabled {
        return Err("Notifications are turned off in Wolf settings.".into());
    }

    let handle = notify_rust::Notification::new()
        .summary(&notification.summary)
        .body(&notification.body)
        .appname("Wolf")
        .urgency(if notification.urgent {
            notify_rust::Urgency::Critical
        } else {
            notify_rust::Urgency::Normal
        })
        .timeout(10_000)
        .show();

    match handle {
        Ok(_) => {
            AVAILABLE.store(true, Ordering::Relaxed);
            Ok(())
        }
        Err(err) => {
            let reason = describe_notify_error(&err.to_string());
            AVAILABLE.store(false, Ordering::Relaxed);
            log::debug!("notification failed: {reason}");
            Err(reason)
        }
    }
}

fn describe_notify_error(raw: &str) -> String {
    if raw.contains("ServiceUnknown") || raw.contains("NameHasNoOwner") {
        "No notification service is running on this desktop.".to_string()
    } else if raw.contains("NotSupported") || raw.contains("AccessDenied") {
        "This desktop's notification service refused the request.".to_string()
    } else if raw.contains("connection") || raw.contains("D-Bus") {
        "Could not reach the desktop notification service (is D-Bus running?).".to_string()
    } else {
        "The desktop notification service did not accept this notification.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_service_is_explained() {
        assert_eq!(
            describe_notify_error("org.freedesktop.DBus.Error.ServiceUnknown"),
            "No notification service is running on this desktop."
        );
    }

    #[test]
    fn refused_requests_are_explained() {
        assert_eq!(
            describe_notify_error("AccessDenied"),
            "This desktop's notification service refused the request."
        );
    }

    #[test]
    fn dbus_transport_failures_mention_dbus() {
        assert!(describe_notify_error("could not establish a D-Bus connection").contains("D-Bus"));
    }

    #[test]
    fn unknown_failures_stay_generic() {
        assert_eq!(
            describe_notify_error("something else entirely"),
            "The desktop notification service did not accept this notification."
        );
    }

    #[test]
    fn builder_marks_urgent() {
        let n = Notification::new("Focus done", "Nice work").urgent();
        assert!(n.urgent);
        assert_eq!(n.summary, "Focus done");
    }
}
