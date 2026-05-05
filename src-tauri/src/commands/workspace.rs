use std::{fs, path::PathBuf};

use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

use crate::model::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManifest {
    pub workspaces: Vec<WorkspaceInfo>,
    pub current_workspace_id: String,
}

fn workspaces_dir() -> Result<PathBuf, String> {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        return Ok(PathBuf::from(app_data).join("InfiniteScroll").join("workspaces"));
    }
    ProjectDirs::from("", "", "InfiniteScroll")
        .map(|dirs| dirs.data_dir().join("workspaces"))
        .ok_or("Cannot resolve app data directory".to_string())
}

fn manifest_path() -> Result<PathBuf, String> {
    Ok(workspaces_dir()?.join("manifest.json"))
}

fn workspace_state_path(workspace_id: &str) -> Result<PathBuf, String> {
    Ok(workspaces_dir()?.join(format!("{workspace_id}.json")))
}

fn load_manifest() -> Result<WorkspaceManifest, String> {
    let path = manifest_path()?;
    if !path.exists() {
        let default = WorkspaceManifest {
            workspaces: vec![WorkspaceInfo {
                id: "default".to_string(),
                name: "Default".to_string(),
            }],
            current_workspace_id: "default".to_string(),
        };
        save_manifest(&default)?;
        return Ok(default);
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

fn save_manifest(manifest: &WorkspaceManifest) -> Result<(), String> {
    let dir = workspaces_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = manifest_path()?;
    let payload = serde_json::to_vec_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(&path, payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_workspaces() -> Result<WorkspaceManifest, String> {
    load_manifest()
}

#[tauri::command]
pub fn create_workspace(name: String) -> Result<WorkspaceManifest, String> {
    let mut manifest = load_manifest()?;
    let id = format!("ws-{}", uuid::Uuid::new_v4());
    manifest.workspaces.push(WorkspaceInfo {
        id: id.clone(),
        name,
    });
    manifest.current_workspace_id = id;
    save_manifest(&manifest)?;
    Ok(manifest)
}

#[tauri::command]
pub fn delete_workspace(workspace_id: String) -> Result<WorkspaceManifest, String> {
    let mut manifest = load_manifest()?;
    if workspace_id == "default" {
        return Err("Cannot delete the default workspace".to_string());
    }
    manifest.workspaces.retain(|w| w.id != workspace_id);
    if manifest.current_workspace_id == workspace_id {
        manifest.current_workspace_id = "default".to_string();
    }
    save_manifest(&manifest)?;

    if let Ok(path) = workspace_state_path(&workspace_id) {
        let _ = fs::remove_file(path);
    }

    Ok(manifest)
}

#[tauri::command]
pub fn switch_workspace(workspace_id: String) -> Result<WorkspaceManifest, String> {
    let mut manifest = load_manifest()?;
    if !manifest.workspaces.iter().any(|w| w.id == workspace_id) {
        return Err(format!("Workspace {workspace_id} not found"));
    }
    manifest.current_workspace_id = workspace_id;
    save_manifest(&manifest)?;
    Ok(manifest)
}

#[tauri::command]
pub fn load_workspace_state(workspace_id: String) -> Result<AppState, String> {
    let path = workspace_state_path(&workspace_id)?;
    if !path.exists() {
        return Ok(AppState::default_workspace());
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if contents.trim().is_empty() {
        return Ok(AppState::default_workspace());
    }
    serde_json::from_str::<AppState>(&contents)
        .map(|state| state.normalized())
        .or_else(|_| Ok(AppState::default_workspace()))
}

#[tauri::command]
pub fn save_workspace_state(workspace_id: String, state: AppState) -> Result<(), String> {
    let dir = workspaces_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = workspace_state_path(&workspace_id)?;
    let payload = serde_json::to_vec_pretty(&state.normalized()).map_err(|e| e.to_string())?;
    fs::write(&path, payload).map_err(|e| e.to_string())
}
