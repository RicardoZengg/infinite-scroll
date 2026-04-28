use std::{
    ffi::OsString,
    fs,
    io,
    path::{Path, PathBuf},
};

use directories::ProjectDirs;
use thiserror::Error;
use uuid::Uuid;

use crate::model::AppState;

#[derive(Debug, Error)]
pub enum PersistenceError {
    #[error("failed to resolve %AppData%/InfiniteScroll/state.json")]
    AppDataUnavailable,
    #[error("failed to create state directory {path}: {source}")]
    CreateDirectory {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("failed to read state file {path}: {source}")]
    ReadState {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("failed to serialize workspace state: {source}")]
    SerializeState {
        #[source]
        source: serde_json::Error,
    },
    #[error("failed to write temporary state file {path}: {source}")]
    WriteTempState {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("failed to replace state file {path}: {source}")]
    ReplaceState {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("failed to remove stale state file {path}: {source}")]
    RemoveState {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("failed to back up corrupted state file {from} -> {to}: {source}")]
    BackupCorruptedState {
        from: PathBuf,
        to: PathBuf,
        #[source]
        source: io::Error,
    },
}

#[derive(Debug, Clone)]
pub struct WorkspacePersistence {
    state_path: PathBuf,
}

impl WorkspacePersistence {
    pub fn new(state_path: impl Into<PathBuf>) -> Self {
        Self {
            state_path: state_path.into(),
        }
    }

    pub fn from_default_location() -> Result<Self, PersistenceError> {
        Ok(Self::new(default_state_path()?))
    }

    pub fn state_path(&self) -> &Path {
        &self.state_path
    }

    pub fn load(&self) -> Result<AppState, PersistenceError> {
        match fs::read_to_string(&self.state_path) {
            Ok(contents) if contents.trim().is_empty() => Ok(AppState::default_workspace()),
            Ok(contents) => match serde_json::from_str::<AppState>(&contents) {
                Ok(state) => Ok(state.normalized()),
                Err(_) => {
                    self.backup_corrupted_state_file()?;
                    Ok(AppState::default_workspace())
                }
            },
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(AppState::default_workspace()),
            Err(source) => Err(PersistenceError::ReadState {
                path: self.state_path.clone(),
                source,
            }),
        }
    }

    pub fn save(&self, state: &AppState) -> Result<(), PersistenceError> {
        let directory = self
            .state_path
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| PersistenceError::CreateDirectory {
                path: self.state_path.clone(),
                source: io::Error::new(io::ErrorKind::InvalidInput, "missing parent directory"),
            })?;
        fs::create_dir_all(&directory).map_err(|source| PersistenceError::CreateDirectory {
            path: directory.clone(),
            source,
        })?;

        let temp_path = temporary_state_path(&self.state_path);
        let payload =
            serde_json::to_vec_pretty(&state.clone().normalized()).map_err(|source| {
                PersistenceError::SerializeState { source }
            })?;

        fs::write(&temp_path, payload).map_err(|source| PersistenceError::WriteTempState {
            path: temp_path.clone(),
            source,
        })?;

        if self.state_path.exists() {
            fs::remove_file(&self.state_path).map_err(|source| PersistenceError::RemoveState {
                path: self.state_path.clone(),
                source,
            })?;
        }

        fs::rename(&temp_path, &self.state_path).map_err(|source| PersistenceError::ReplaceState {
            path: self.state_path.clone(),
            source,
        })?;

        Ok(())
    }

    fn backup_corrupted_state_file(&self) -> Result<(), PersistenceError> {
        if !self.state_path.exists() {
            return Ok(());
        }

        let backup_path = corrupted_backup_path(&self.state_path);
        fs::rename(&self.state_path, &backup_path).map_err(|source| {
            PersistenceError::BackupCorruptedState {
                from: self.state_path.clone(),
                to: backup_path,
                source,
            }
        })?;

        Ok(())
    }
}

pub fn default_state_path() -> Result<PathBuf, PersistenceError> {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        return Ok(PathBuf::from(app_data)
            .join("InfiniteScroll")
            .join("state.json"));
    }

    ProjectDirs::from("", "", "InfiniteScroll")
        .map(|dirs| dirs.data_dir().join("state.json"))
        .ok_or(PersistenceError::AppDataUnavailable)
}

fn temporary_state_path(state_path: &Path) -> PathBuf {
    let extension = format!("{}.tmp", Uuid::new_v4());
    state_path.with_extension(extension)
}

fn corrupted_backup_path(state_path: &Path) -> PathBuf {
    let file_name = state_path
        .file_name()
        .map(OsString::from)
        .unwrap_or_else(|| OsString::from("state.json"));

    let backup_name = format!("{}.corrupted-{}", file_name.to_string_lossy(), Uuid::new_v4());
    state_path.with_file_name(backup_name)
}
