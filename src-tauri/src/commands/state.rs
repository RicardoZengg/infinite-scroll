use crate::{model::AppState, persistence::WorkspacePersistence};

#[tauri::command]
pub fn load_state() -> Result<AppState, String> {
    let persistence = WorkspacePersistence::from_default_location().map_err(|err| err.to_string())?;
    persistence.load().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn save_state(state: AppState) -> Result<(), String> {
    let persistence = WorkspacePersistence::from_default_location().map_err(|err| err.to_string())?;
    persistence.save(&state).map_err(|err| err.to_string())
}
