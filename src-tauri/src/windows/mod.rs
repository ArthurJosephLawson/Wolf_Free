use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::error::{WolfError, WolfResult};

pub const MAIN_WINDOW: &str = "main";
pub const COMPANION_WINDOW: &str = "companion";

pub const COMPANION_SPRITE: f64 = 28.0;
const COMPANION_PAD_X: f64 = 10.0;
const COMPANION_PAD_TOP: f64 = 8.0;
const COMPANION_PAD_BOTTOM: f64 = 30.0;

pub fn companion_size(scale: f64) -> (f64, f64) {
    let sprite = COMPANION_SPRITE * scale;
    (
        (sprite + COMPANION_PAD_X * 2.0).round(),
        (sprite + COMPANION_PAD_TOP + COMPANION_PAD_BOTTOM).round(),
    )
}

pub fn main_window<R: Runtime>(app: &AppHandle<R>) -> WolfResult<tauri::WebviewWindow<R>> {
    app.get_webview_window(MAIN_WINDOW)
        .ok_or_else(|| WolfError::desktop("The main Wolf window is not available."))
}

pub fn companion_window<R: Runtime>(app: &AppHandle<R>) -> WolfResult<tauri::WebviewWindow<R>> {
    app.get_webview_window(COMPANION_WINDOW)
        .ok_or_else(|| WolfError::desktop("The Wolf companion window is not available."))
}

pub fn show_main<R: Runtime>(app: &AppHandle<R>) -> WolfResult<()> {
    let window = main_window(app)?;
    window.unminimize().ok();
    window
        .show()
        .map_err(|e| WolfError::desktop(e.to_string()))?;
    window
        .set_focus()
        .map_err(|e| WolfError::desktop(e.to_string()))?;
    Ok(())
}

pub fn hide_main<R: Runtime>(app: &AppHandle<R>) -> WolfResult<()> {
    let window = main_window(app)?;
    window.hide().map_err(|e| WolfError::desktop(e.to_string()))
}

pub fn close_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.hide();
    }
}

pub fn ensure_companion<R: Runtime>(app: &AppHandle<R>) -> WolfResult<tauri::WebviewWindow<R>> {
    if let Some(existing) = app.get_webview_window(COMPANION_WINDOW) {
        if existing.is_visible().unwrap_or(false) {
            return Ok(existing);
        }
        existing
            .show()
            .map_err(|e| WolfError::desktop(e.to_string()))?;
        return Ok(existing);
    }

    let settings = crate::state::state(app)?.settings();
    let (width, height) = companion_size(settings.companion_scale);

    let mut builder = WebviewWindowBuilder::new(
        app,
        COMPANION_WINDOW,
        WebviewUrl::App("companion.html".into()),
    )
    .title("Wolf Companion")
    .inner_size(width, height)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(settings.companion_always_on_top)
    .skip_taskbar(true)
    .resizable(false)
    .visible(false);

    if let (Some(x), Some(y)) = (settings.companion_x, settings.companion_y) {
        builder = builder.position(x, y);
    } else if let Some(monitor) = app.primary_monitor().ok().flatten() {
        let area = monitor.work_area();
        let factor = monitor.scale_factor().max(0.1);
        let right = (area.position.x as f64 + area.size.width as f64) / factor;
        let bottom = (area.position.y as f64 + area.size.height as f64) / factor;
        let left = area.position.x as f64 / factor;
        let top = area.position.y as f64 / factor;
        let x = (right - width - 24.0).max(left);
        let y = (bottom - height - 48.0).max(top);
        builder = builder.position(x, y);
    }

    builder
        .build()
        .map_err(|e| WolfError::desktop(format!("Wolf could not open the companion window: {e}")))
}

pub fn set_companion_visible<R: Runtime>(app: &AppHandle<R>, visible: bool) -> WolfResult<()> {
    if visible {
        let window = ensure_companion(app)?;
        window
            .show()
            .map_err(|e| WolfError::desktop(e.to_string()))?;
    } else if let Some(window) = app.get_webview_window(COMPANION_WINDOW) {
        window
            .hide()
            .map_err(|e| WolfError::desktop(e.to_string()))?;
    }
    Ok(())
}

pub fn toggle_companion<R: Runtime>(app: &AppHandle<R>) -> WolfResult<bool> {
    let visible = app
        .get_webview_window(COMPANION_WINDOW)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false);
    set_companion_visible(app, !visible)?;
    Ok(!visible)
}

pub fn set_companion_always_on_top<R: Runtime>(app: &AppHandle<R>, value: bool) -> WolfResult<()> {
    if let Some(window) = app.get_webview_window(COMPANION_WINDOW) {
        window
            .set_always_on_top(value)
            .map_err(|e| WolfError::desktop(e.to_string()))?;
    }
    Ok(())
}

pub fn persist_companion_position<R: Runtime>(app: &AppHandle<R>) -> WolfResult<()> {
    let Some(window) = app.get_webview_window(COMPANION_WINDOW) else {
        return Ok(());
    };
    let (Ok(position), Ok(scale)) = (window.outer_position(), window.scale_factor()) else {
        return Ok(());
    };
    let scale = if scale > 0.0 { scale } else { 1.0 };

    crate::state::state(app)?.patch_settings(crate::models::SettingsPatch {
        companion_x: Some(position.x as f64 / scale),
        companion_y: Some(position.y as f64 / scale),
        ..crate::models::SettingsPatch::default()
    })?;
    Ok(())
}

pub fn quit<R: Runtime>(app: &AppHandle<R>) {
    if app.tray_by_id(crate::tray::TRAY_ID).is_some() {
        app.remove_tray_by_id(crate::tray::TRAY_ID);
    }
    if let Some(window) = app.get_webview_window(COMPANION_WINDOW) {
        let _ = window.destroy();
    }
    app.exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn companion_size_snaps_to_whole_pixels_and_grows_with_scale() {
        let (w2, h2) = companion_size(2.0);
        let (w3, h3) = companion_size(3.0);
        let (w5, h5) = companion_size(5.0);

        for (w, h) in [(w2, h2), (w3, h3), (w5, h5)] {
            assert_eq!(w.fract(), 0.0);
            assert_eq!(h.fract(), 0.0);
            assert!(w >= COMPANION_SPRITE * 2.0);
            assert!(h > w);
        }

        assert_eq!(w3 - w2, COMPANION_SPRITE);
        assert_eq!(w5 - w3, COMPANION_SPRITE * 2.0);
        assert!(h5 > h3);
        assert!(h3 > h2);
    }

    #[test]
    fn companion_size_fits_every_allowed_scale() {
        for scale in 2..=5 {
            let (w, h) = companion_size(f64::from(scale));
            assert!(w >= f64::from(scale) * COMPANION_SPRITE);
            assert!(h > f64::from(scale) * COMPANION_SPRITE);
        }
    }
}
