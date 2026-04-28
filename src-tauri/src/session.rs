use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex, MutexGuard},
    thread,
};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    model::{ShellKind, TerminalStatus},
    shell::{detect_shell, ShellError},
};

const DEFAULT_COLS: u16 = 120;
const DEFAULT_ROWS: u16 = 30;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTerminalSessionRequest {
    pub cell_id: String,
    #[serde(default)]
    pub cwd: String,
    #[serde(default = "default_cols")]
    pub cols: u16,
    #[serde(default = "default_rows")]
    pub rows: u16,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteTerminalInputRequest {
    pub cell_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeTerminalRequest {
    pub cell_id: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseTerminalSessionRequest {
    pub cell_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestartTerminalSessionRequest {
    pub cell_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalOutputPayload {
    pub cell_id: String,
    pub data: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalStatusPayload {
    pub cell_id: String,
    pub status: TerminalStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCwdPayload {
    pub cell_id: String,
    pub cwd: String,
}

pub trait TerminalEventSink: Send + Sync {
    fn emit_output(&self, payload: TerminalOutputPayload);
    fn emit_status(&self, payload: TerminalStatusPayload);
    fn emit_cwd(&self, payload: TerminalCwdPayload);
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("terminal cell id is required")]
    MissingCellId,
    #[error("terminal session not found for cell {0}")]
    SessionNotFound(String),
    #[error("failed to detect shell: {0}")]
    DetectShell(#[from] ShellError),
    #[error("failed to open ConPTY: {0}")]
    OpenPty(String),
    #[error("failed to spawn shell process: {0}")]
    SpawnShell(String),
    #[error("failed to clone terminal reader: {0}")]
    CloneReader(String),
    #[error("failed to open terminal writer: {0}")]
    TakeWriter(String),
    #[error("failed to write terminal input: {0}")]
    WriteInput(String),
    #[error("failed to resize terminal: {0}")]
    Resize(String),
    #[error("failed to lock session registry")]
    RegistryLock,
}

struct ManagedSession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send>,
    cwd: String,
    cols: u16,
    rows: u16,
    #[allow(dead_code)]
    shell_kind: ShellKind,
}

#[derive(Default)]
pub struct SessionManager {
    sessions: Mutex<HashMap<String, ManagedSession>>,
}

impl SessionManager {
    pub fn create_session(
        &self,
        request: CreateTerminalSessionRequest,
        sink: Arc<dyn TerminalEventSink>,
    ) -> Result<(), SessionError> {
        if request.cell_id.trim().is_empty() {
            return Err(SessionError::MissingCellId);
        }

        if let Some(existing) = self.remove_session(&request.cell_id)? {
            close_session_process(existing);
        }

        let shell = detect_shell()?;
        let pty_system = native_pty_system();
        let size = to_pty_size(request.cols, request.rows);
        let pair = pty_system
            .openpty(size)
            .map_err(|error| SessionError::OpenPty(error.to_string()))?;

        let mut command = CommandBuilder::new(shell.executable.to_string_lossy().as_ref());
        if !request.cwd.trim().is_empty() {
            command.cwd(request.cwd.clone());
        }

        let child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| SessionError::SpawnShell(error.to_string()))?;
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| SessionError::CloneReader(error.to_string()))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| SessionError::TakeWriter(error.to_string()))?;

        let cell_id = request.cell_id.clone();
        let output_sink = sink.clone();
        thread::spawn(move || {
            let mut buffer = [0_u8; 4096];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        output_sink.emit_status(TerminalStatusPayload {
                            cell_id: cell_id.clone(),
                            status: TerminalStatus::Exited,
                            error: None,
                        });
                        break;
                    }
                    Ok(count) => {
                        let data = String::from_utf8_lossy(&buffer[..count]).into_owned();
                        output_sink.emit_output(TerminalOutputPayload {
                            cell_id: cell_id.clone(),
                            data,
                        });
                    }
                    Err(error) => {
                        output_sink.emit_status(TerminalStatusPayload {
                            cell_id: cell_id.clone(),
                            status: TerminalStatus::Error,
                            error: Some(error.to_string()),
                        });
                        break;
                    }
                }
            }
        });

        sink.emit_status(TerminalStatusPayload {
            cell_id: request.cell_id.clone(),
            status: TerminalStatus::Running,
            error: None,
        });
        sink.emit_cwd(TerminalCwdPayload {
            cell_id: request.cell_id.clone(),
            cwd: request.cwd.clone(),
        });

        self.lock_sessions()?.insert(
            request.cell_id,
            ManagedSession {
                master: pair.master,
                writer,
                child,
                cwd: request.cwd,
                cols: request.cols,
                rows: request.rows,
                shell_kind: shell.kind,
            },
        );

        Ok(())
    }

    pub fn write_input(&self, request: WriteTerminalInputRequest) -> Result<(), SessionError> {
        if request.cell_id.trim().is_empty() {
            return Err(SessionError::MissingCellId);
        }

        let mut sessions = self.lock_sessions()?;
        let session = sessions
            .get_mut(&request.cell_id)
            .ok_or_else(|| SessionError::SessionNotFound(request.cell_id.clone()))?;

        session
            .writer
            .write_all(request.data.as_bytes())
            .and_then(|_| session.writer.flush())
            .map_err(|error| SessionError::WriteInput(error.to_string()))
    }

    pub fn resize(&self, request: ResizeTerminalRequest) -> Result<(), SessionError> {
        if request.cell_id.trim().is_empty() {
            return Err(SessionError::MissingCellId);
        }

        let mut sessions = self.lock_sessions()?;
        let session = sessions
            .get_mut(&request.cell_id)
            .ok_or_else(|| SessionError::SessionNotFound(request.cell_id.clone()))?;

        session
            .master
            .resize(to_pty_size(request.cols, request.rows))
            .map_err(|error| SessionError::Resize(error.to_string()))?;
        session.cols = request.cols;
        session.rows = request.rows;

        Ok(())
    }

    pub fn close_session(
        &self,
        request: CloseTerminalSessionRequest,
        sink: Arc<dyn TerminalEventSink>,
    ) -> Result<(), SessionError> {
        if request.cell_id.trim().is_empty() {
            return Err(SessionError::MissingCellId);
        }

        let session = self
            .remove_session(&request.cell_id)?
            .ok_or_else(|| SessionError::SessionNotFound(request.cell_id.clone()))?;

        close_session_process(session);
        sink.emit_status(TerminalStatusPayload {
            cell_id: request.cell_id,
            status: TerminalStatus::Exited,
            error: None,
        });

        Ok(())
    }

    pub fn restart_session(
        &self,
        request: RestartTerminalSessionRequest,
        sink: Arc<dyn TerminalEventSink>,
    ) -> Result<(), SessionError> {
        if request.cell_id.trim().is_empty() {
            return Err(SessionError::MissingCellId);
        }

        let (cwd, cols, rows) = {
            let sessions = self.lock_sessions()?;
            let existing = sessions
                .get(&request.cell_id)
                .ok_or_else(|| SessionError::SessionNotFound(request.cell_id.clone()))?;
            (existing.cwd.clone(), existing.cols, existing.rows)
        };

        self.close_session(
            CloseTerminalSessionRequest {
                cell_id: request.cell_id.clone(),
            },
            sink.clone(),
        )?;

        self.create_session(
            CreateTerminalSessionRequest {
                cell_id: request.cell_id,
                cwd,
                cols,
                rows,
            },
            sink,
        )
    }

    fn remove_session(&self, cell_id: &str) -> Result<Option<ManagedSession>, SessionError> {
        Ok(self.lock_sessions()?.remove(cell_id))
    }

    fn lock_sessions(&self) -> Result<MutexGuard<'_, HashMap<String, ManagedSession>>, SessionError> {
        self.sessions.lock().map_err(|_| SessionError::RegistryLock)
    }

    #[cfg(test)]
    fn has_session(&self, cell_id: &str) -> bool {
        self.sessions
            .lock()
            .map(|sessions| sessions.contains_key(cell_id))
            .unwrap_or(false)
    }

    #[cfg(test)]
    fn session_cwd(&self, cell_id: &str) -> Option<String> {
        self.sessions
            .lock()
            .ok()
            .and_then(|sessions| sessions.get(cell_id).map(|session| session.cwd.clone()))
    }
}

fn close_session_process(mut session: ManagedSession) {
    let _ = session.child.kill();
    let _ = session.child.wait();
}

fn to_pty_size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        rows: rows.max(1),
        cols: cols.max(1),
        pixel_width: 0,
        pixel_height: 0,
    }
}

fn default_cols() -> u16 {
    DEFAULT_COLS
}

fn default_rows() -> u16 {
    DEFAULT_ROWS
}

#[cfg(test)]
mod tests {
    use std::{env, sync::Arc};

    use super::{
        CloseTerminalSessionRequest, CreateTerminalSessionRequest, RestartTerminalSessionRequest,
        SessionManager, TerminalCwdPayload, TerminalEventSink, TerminalOutputPayload,
        TerminalStatusPayload,
    };

    #[derive(Default)]
    struct NoopSink;

    impl TerminalEventSink for NoopSink {
        fn emit_output(&self, _payload: TerminalOutputPayload) {}

        fn emit_status(&self, _payload: TerminalStatusPayload) {}

        fn emit_cwd(&self, _payload: TerminalCwdPayload) {}
    }

    #[test]
    fn creates_session_for_terminal_cell_id() {
        let manager = SessionManager::default();
        let cwd = env::current_dir().expect("cwd").to_string_lossy().into_owned();
        let sink = Arc::new(NoopSink);

        manager
            .create_session(
                CreateTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                    cwd,
                    cols: 80,
                    rows: 24,
                },
                sink.clone(),
            )
            .expect("session should be created");

        assert!(manager.has_session("cell-a"));

        manager
            .close_session(
                CloseTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                },
                sink,
            )
            .expect("cleanup session");
    }

    #[test]
    fn close_only_removes_target_session() {
        let manager = SessionManager::default();
        let cwd = env::current_dir().expect("cwd").to_string_lossy().into_owned();
        let sink = Arc::new(NoopSink);

        manager
            .create_session(
                CreateTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                    cwd: cwd.clone(),
                    cols: 80,
                    rows: 24,
                },
                sink.clone(),
            )
            .expect("create session a");
        manager
            .create_session(
                CreateTerminalSessionRequest {
                    cell_id: String::from("cell-b"),
                    cwd,
                    cols: 80,
                    rows: 24,
                },
                sink.clone(),
            )
            .expect("create session b");

        manager
            .close_session(
                CloseTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                },
                sink.clone(),
            )
            .expect("close session a");

        assert!(!manager.has_session("cell-a"));
        assert!(manager.has_session("cell-b"));

        manager
            .close_session(
                CloseTerminalSessionRequest {
                    cell_id: String::from("cell-b"),
                },
                sink,
            )
            .expect("cleanup session b");
    }

    #[test]
    fn restart_session_preserves_latest_cwd() {
        let manager = SessionManager::default();
        let cwd = env::current_dir().expect("cwd").to_string_lossy().into_owned();
        let sink = Arc::new(NoopSink);

        manager
            .create_session(
                CreateTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                    cwd: cwd.clone(),
                    cols: 100,
                    rows: 30,
                },
                sink.clone(),
            )
            .expect("create session");

        manager
            .restart_session(
                RestartTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                },
                sink.clone(),
            )
            .expect("restart session");

        assert!(manager.has_session("cell-a"));
        assert_eq!(manager.session_cwd("cell-a").as_deref(), Some(cwd.as_str()));

        manager
            .close_session(
                CloseTerminalSessionRequest {
                    cell_id: String::from("cell-a"),
                },
                sink,
            )
            .expect("cleanup session");
    }
}
