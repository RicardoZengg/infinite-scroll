use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window.set_always_on_top(enabled).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window.hide().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("main window not found")?;
    window.set_title(&title).map_err(|e| e.to_string())
}
