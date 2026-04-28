# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the active frontend implementation:
  - `components/` for workspace UI pieces (`WorkspaceCanvas`, `RowView`, `TerminalCell`, `NotesCell`, `HelpOverlay`)
  - `store/` for workspace state and actions (`workspaceStore`)
  - `lib/` for typed Tauri bridge and xterm integration
  - `hooks/` for terminal lifecycle and keyboard shortcuts
- `src-tauri/` contains the active backend implementation:
  - `model.rs` shared state model
  - `persistence.rs` state file load/save and corruption fallback
  - `shell.rs` shell detection
  - `session.rs` ConPTY session lifecycle and event payloads
  - `commands/` Tauri command entrypoints
- Legacy macOS Swift code is archived at `legacy/macos-swift/` and is not part of active development.

## Build, Test, and Development Commands
- `npm run test -- --run` for frontend tests.
- `cargo test --manifest-path src-tauri/Cargo.toml` for Rust tests.
- `npm run build` for TypeScript + Vite production build checks.
- `npm run tauri:dev` to run the app locally on Windows.
- `npm run tauri:build` to compile the Windows executable.

## Coding Style & Naming Conventions
- TypeScript/React:
  - 2-space indentation, strict types, `UpperCamelCase` components, `lowerCamelCase` values/functions.
  - Keep UI components focused; move orchestration and side effects to hooks/store/lib.
- Rust:
  - Standard Rust style with clear error enums via `thiserror`.
  - Keep command handlers thin and business logic in modules.
- Avoid unrelated refactors in feature/bugfix changes.

## Testing Guidelines
- Every behavior change should include either frontend tests (Vitest + Testing Library), Rust unit tests, or both.
- Prefer targeted tests first (`workspaceStore`, `WorkspaceCanvas`, `TerminalCell`, `shell`, `session`, `persistence`), then run full suites.
- Before claiming completion, run at minimum:
  - `npm run test -- --run`
  - `cargo test --manifest-path src-tauri/Cargo.toml`
  - `npm run build`

## Security & Configuration Tips
- Never hardcode secrets or machine-specific credentials.
- Keep persistence path behavior aligned with `%AppData%/InfiniteScroll/state.json`.
- Shell/session changes must degrade safely: missing shell should produce error state for that cell without crashing the app.
