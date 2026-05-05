# Research: Local Project State

- **Query**: Thoroughly inspect the local project at C:\MyData\Code\WorkSpace\infinite-scroll to understand current features, codebase state, and completeness
- **Scope**: internal
- **Date**: 2026-05-04

## Findings

### 1. Project Overview

Infinite Scroll is a **Windows desktop workspace application** built with **Tauri v2 (Rust backend) + React 19 + TypeScript + Vite**. It organizes terminal sessions and text notes into an infinitely scrollable, row-based workspace.

### 2. Complete File Inventory

#### Frontend (`src/`)

| File Path | Description |
|---|---|
| `src/App.tsx` | Root component: hydration from backend, idle-batched persistence, language toggle, header actions |
| `src/main.tsx` | React entry point |
| `src/styles.css` | Full CSS: dark theme with sky-blue/yellow accents, responsive grid layout |
| `src/i18n.ts` | Internationalization with zh-CN and en-US; persisted to localStorage |
| `src/types/workspace.ts` | Core types (TerminalCell, NotesCell, Cell, Row, AppState), factory functions, normalization |
| `src/components/WorkspaceCanvas.tsx` | Virtualized row list using react-window VariableSizeList; responsive column layout (1/2/3 cols based on width); keyboard shortcuts integration |
| `src/components/RowView.tsx` | Single row: header + grid of cells (terminals or notes) |
| `src/components/TerminalCell.tsx` | Terminal cell: status display, xterm host, error/exited fallback with restart button |
| `src/components/NotesCell.tsx` | Notes cell: simple textarea with monospace font |
| `src/components/HelpOverlay.tsx` | Keyboard shortcuts help modal |
| `src/hooks/useTerminalSession.ts` | Terminal lifecycle: xterm bridge creation, event subscriptions (output/status/cwd), input batching |
| `src/hooks/useSessionOrchestrator.ts` | Lazy session manager: only creates ConPTY sessions for visible/focused rows; serializes creation with 35ms delays |
| `src/hooks/useShortcuts.ts` | Global keyboard shortcut handler (Ctrl+Shift+Down, Ctrl+D, Ctrl+W, Ctrl+Arrow, Ctrl+/, Ctrl+=/-) |
| `src/hooks/useElementSize.ts` | ResizeObserver hook for container dimensions |
| `src/lib/tauri.ts` | Tauri IPC bridge: command wrappers and per-cell event subscription hub |
| `src/lib/terminalBridge.ts` | xterm.js Terminal + FitAddon integration; debounced resize notification; wheel event isolation |
| `src/lib/inputBatcher.ts` | Batches terminal keystrokes (12ms interval, 1024 max batch) before sending to backend |
| `src/store/workspaceStore.ts` | Zustand vanilla store: all state + 16 actions (add row, duplicate, close, focus navigation, font size, notes, terminal status, help overlay) |
| `src/store/useWorkspaceStore.ts` | React hook wrapper for the vanilla Zustand store |

#### Backend (`src-tauri/src/`)

| File Path | Description |
|---|---|
| `src-tauri/src/main.rs` | Minimal entry: calls `infinite_scroll_lib::run()` |
| `src-tauri/src/lib.rs` | Tauri builder: registers SessionManager state + 6 commands; also contains persistence round-trip and corruption recovery tests |
| `src-tauri/src/model.rs` | Rust-side data model (AppState, Row, Cell, TerminalCell, NotesCell, ShellKind, TerminalStatus) with serde serialization; UUID-based ID generation |
| `src-tauri/src/session.rs` | ConPTY session manager: create/write/resize/close/restart sessions via portable-pty; reader thread emits output and status events; 3 unit tests |
| `src-tauri/src/shell.rs` | Shell detection: prefers pwsh, falls back to powershell.exe, uses `where` command; 3 unit tests |
| `src-tauri/src/persistence.rs` | State persistence: save to temp file then rename (atomic write), load with corrupted-file backup, default workspace fallback |
| `src-tauri/src/commands/mod.rs` | Module declarations |
| `src-tauri/src/commands/state.rs` | `load_state` and `save_state` Tauri commands |
| `src-tauri/src/commands/terminal.rs` | 5 terminal Tauri commands: create, write, resize, close, restart; uses TauriEventSink for backend->frontend events |

#### Test Files

| File Path | Description |
|---|---|
| `src/App.test.tsx` | 4 tests: render, autosave, session orchestration, language toggle |
| `src/components/TerminalCell.test.tsx` | 3 tests: running state, error fallback+restart, exited fallback |
| `src/components/WorkspaceCanvas.test.tsx` | 4 tests: keyboard shortcuts (Ctrl+Shift+Down, Ctrl+Arrow, Ctrl+D, Ctrl+W, Ctrl+/) |
| `src/store/workspaceStore.test.ts` | 6 tests: default state, add row, duplicate, close+row removal, font clamp, focus navigation, notes update, help toggle, reference stability |
| `src/lib/inputBatcher.test.ts` | 3 tests: batch merging, max size flush, manual flush |
| `src/test/setup.ts` | Imports jest-dom matchers for vitest |

#### Configuration

| File Path | Description |
|---|---|
| `package.json` | Dependencies, scripts (dev, build, test, tauri:dev, tauri:build) |
| `vite.config.ts` | React plugin, jsdom test environment, port 1420 |
| `tsconfig.json` / `tsconfig.node.json` | TypeScript configuration |
| `src-tauri/Cargo.toml` | Rust deps: tauri 2, portable-pty 0.9, serde, directories, uuid, thiserror |
| `src-tauri/build.rs` | Standard tauri_build |
| `src-tauri/capabilities/default.json` | Minimal core:default permission |

#### Legacy / Archive

| Path | Description |
|---|---|
| `legacy/macos-swift/` | Archived old macOS Swift implementation (Package.swift, Sources, Resources) |
| `legacy/superpowers/` | Empty directory |

### 3. Feature Set -- What Exists

**Fully implemented features:**

1. **Infinite vertical workspace** -- Rows can be added endlessly via Ctrl+Shift+Down or "New Row" button. Virtualized with react-window VariableSizeList so only visible rows are rendered.

2. **Terminal cells** -- Full ConPTY-backed terminal sessions on Windows via portable-pty. xterm.js renders output in the browser. Supports create, write input, resize, close, restart.

3. **Notes cells** -- Plain-text textarea cells that can be added to any row. Content is persisted.

4. **Mixed terminal + notes** -- Both cell types can coexist within a row; grid layout auto-adjusts columns (1-3 based on viewport width).

5. **Focus-driven navigation** -- Ctrl+Arrow keys move focus between cells and rows. Focused cell is visually highlighted with yellow border.

6. **Duplicate terminal** -- Ctrl+D duplicates the focused terminal cell (copies cwd and shell kind).

7. **Close cell** -- Ctrl+W closes focused cell. If last cell in row, the row is removed.

8. **Session persistence** -- State auto-saves to `%AppData%/InfiniteScroll/state.json` via idle-callback batching (900ms fallback). Backend uses atomic temp-file-then-rename writes. Corrupted state files are backed up and replaced with defaults.

9. **Lazy session orchestration** -- Terminal ConPTY sessions are only created for visible/focused rows; sessions for scrolled-out rows are cleaned up. Creation is serialized (one at a time with 35ms delay).

10. **Bilingual UI** -- Toggle between zh-CN and en-US. Language preference persisted to localStorage.

11. **Keyboard shortcuts help** -- Ctrl+/ toggles an overlay listing all shortcuts.

12. **Font size adjustment** -- Ctrl+= / Ctrl+- adjusts terminal font size (clamped 10-24px).

13. **Shell detection** -- Backend prefers pwsh, falls back to powershell.exe.

14. **Input batching** -- Terminal keystrokes are batched (12ms interval, 1024 byte threshold) before being sent to the backend to reduce IPC overhead.

15. **Responsive layout** -- CSS grid adapts: <880px = 1 column, 880-1279px = 2 columns, >=1280px = 3 columns.

16. **Error recovery** -- Terminal cells show error/exited state with a restart button. Backend handles corrupted state files gracefully.

### 4. Codebase Quality Assessment

**State: Complete and well-structured (production-ready scaffold)**

- **Frontend**: Fully wired up. All components, hooks, stores, and lib modules are implemented and interconnected. No TODO/FIXME/stub code found.
- **Backend**: All Tauri commands are implemented. Session management is complete with proper cleanup. Persistence uses safe atomic writes.
- **Tests**: 20 tests total across 5 test files (frontend). 7 Rust tests (session manager 3, shell detection 3, persistence round-trip and corruption 3 in lib.rs plus the persistence_tests module). Good coverage of core logic.
- **Type safety**: Strong TypeScript types on frontend; Rust model uses serde with tagged enums. Frontend and backend types are structurally aligned via camelCase JSON serialization.
- **No placeholder code**: Every file contains real implementation, not scaffolding.

### 5. What Is Missing (Compared to a Full-Featured Workspace App)

Based on analyzing the code, the following features are notably absent:

1. **No row reordering / drag-and-drop** -- Rows cannot be moved or rearranged.
2. **No row renaming** -- Row titles are auto-generated ("Row N") with no UI to rename.
3. **No search/filter** -- No way to search across terminal output or notes content.
4. **No split-pane within a row** -- Cells in a row use CSS grid auto-fit, not resizable split panes.
5. **No tab/multiple workspace support** -- Only one workspace exists at a time.
6. **No export/share** -- Cannot export notes or terminal history.
7. **No themes** -- Single dark theme only (hardcoded CSS variables).
8. **No CI/CD** -- No GitHub Actions or similar pipeline.
9. **No undo/redo** -- State changes are immediate with no history.
10. **No file browser or project picker** -- CWD must be typed or inherited from shell.
11. **macOS/Linux support** -- Shell detection is Windows-only (`where` command); ConPTY is Windows-specific (though portable-pty abstracts this).
12. **No Zod validation in practice** -- Zod is a dependency but not imported in any source file (schema validation is not used on the frontend).
13. **No window title bar customization** -- Standard Tauri window chrome.
14. **No system tray integration** -- No tray icon or background mode.

### 6. Spec Files Present

The `.trellis/spec/` directory contains frontend guidelines:

| Spec File | Content |
|---|---|
| `spec/frontend/index.md` | Frontend spec index |
| `spec/frontend/directory-structure.md` | Directory conventions |
| `spec/frontend/component-guidelines.md` | Component standards |
| `spec/frontend/hook-guidelines.md` | Hook conventions |
| `spec/frontend/state-management.md` | Zustand store patterns |
| `spec/frontend/type-safety.md` | TypeScript standards |
| `spec/frontend/quality-guidelines.md` | Quality gates |
| `spec/guides/index.md` | Guide index |
| `spec/guides/code-reuse-thinking-guide.md` | Code reuse patterns |
| `spec/guides/cross-layer-thinking-guide.md` | Cross-layer architecture thinking |

## Caveats / Not Found

- The `dist/` directory exists (built output is present).
- The `docs/` directory exists but was empty at time of inspection.
- Zod is listed as a dependency but is not used anywhere in the source code -- it may be planned for future validation or is a leftover.
- The `legacy/superpowers/` directory is empty.
- No `.env` files or secrets found.
- The project has been built for release (both `src-tauri/target/debug` and `src-tauri/target/release` build artifacts exist).
