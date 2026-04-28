use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};

use crate::session::{
    CloseTerminalSessionRequest, CreateTerminalSessionRequest, ResizeTerminalRequest,
    RestartTerminalSessionRequest, SessionManager, TerminalCwdPayload, TerminalEventSink,
    TerminalOutputPayload, TerminalStatusPayload, WriteTerminalInputRequest,
};

struct TauriEventSink {
    app: AppHandle,
}

impl TauriEventSink {
    fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl TerminalEventSink for TauriEventSink {
    fn emit_output(&self, payload: TerminalOutputPayload) {
        let _ = self.app.emit("terminal://output", payload);
    }

    fn emit_status(&self, payload: TerminalStatusPayload) {
        let _ = self.app.emit("terminal://status", payload);
    }

    fn emit_cwd(&self, payload: TerminalCwdPayload) {
        let _ = self.app.emit("terminal://cwd", payload);
    }
}

#[tauri::command]
pub fn create_terminal_session(
    app: AppHandle,
    sessions: State<'_, SessionManager>,
    request: CreateTerminalSessionRequest,
) -> Result<(), String> {
    sessions
        .create_session(request, Arc::new(TauriEventSink::new(app)))
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn write_terminal_input(
    sessions: State<'_, SessionManager>,
    request: WriteTerminalInputRequest,
) -> Result<(), String> {
    sessions.write_input(request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn resize_terminal(
    sessions: State<'_, SessionManager>,
    request: ResizeTerminalRequest,
) -> Result<(), String> {
    sessions.resize(request).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn close_terminal_session(
    app: AppHandle,
    sessions: State<'_, SessionManager>,
    request: CloseTerminalSessionRequest,
) -> Result<(), String> {
    sessions
        .close_session(request, Arc::new(TauriEventSink::new(app)))
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn restart_terminal_session(
    app: AppHandle,
    sessions: State<'_, SessionManager>,
    request: RestartTerminalSessionRequest,
) -> Result<(), String> {
    sessions
        .restart_session(request, Arc::new(TauriEventSink::new(app)))
        .map_err(|err| err.to_string())
}
