# Research: Reference Project (gaojude/infinite-scroll)

- **Query**: Understand the infinite-scroll GitHub project (purpose, tech stack, structure, core implementation)
- **Scope**: internal (local clone)
- **Date**: 2026-05-04

## Findings

### 1. What This Project Does

Infinite Scroll is a **Windows desktop workspace application** that organizes terminal sessions and text notes into an infinitely scrollable row-based workspace. It is designed for developers who need to run multiple command-line tasks in parallel while keeping context notes alongside them.

Key features:
- Infinite vertical workspace: content organized in rows that can be added endlessly
- Terminal + notes mixing: terminals and text notes coexist in the same workspace
- Focus-driven navigation: keyboard shortcuts for moving between cells/rows
- Session persistence: auto-saves workspace state to `%AppData%/InfiniteScroll/state.json`
- Windows-native terminal via ConPTY (`portable-pty` crate)
- Bilingual UI: `zh-CN` and `en-US`

### 2. Tech Stack

**Frontend:**
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 7.0.4 | Build tool / dev server |
| Zustand | 5.0.12 | State management |
| react-window | 1.8.11 | Virtualized list rendering |
| xterm.js (@xterm/xterm) | 6.0.0 | Terminal emulation in browser |
| @xterm/addon-fit | 0.11.0 | Terminal resize addon |
| Zod | 4.3.6 | Schema validation |
| Vitest | 4.1.2 | Testing |

**Backend (Rust / Tauri v2):**
| Technology | Purpose |
|---|---|
| Tauri v2 | Desktop app shell (WebView2-based) |
| portable-pty 0.9.0 | ConPTY terminal session management |
| serde / serde_json | Serialization |
| directories 6.0.0 | App data directory resolution |
| uuid 1.23.0 | ID generation |

### 3. Project Structure

```
src/
  App.tsx                    Root component: hydration, persistence, layout
  main.tsx                   Entry point
  i18n.ts                    Internationalization (zh-CN/en-US)
  components/
    WorkspaceCanvas.tsx      Virtualized list of rows (uses react-window VariableSizeList)
    RowView.tsx              Single row: header + cells (terminals/notes)
    TerminalCell.tsx          Terminal cell wrapper (xterm integration)
    NotesCell.tsx            Text notes cell
    HelpOverlay.tsx          Keyboard shortcut help overlay
  hooks/
    useTerminalSession.ts    Terminal lifecycle hook
    useSessionOrchestrator.ts Manages terminal session creation/destruction
    useShortcuts.ts          Keyboard shortcut bindings
    useElementSize.ts        ResizeObserver hook
  lib/
    tauri.ts                 Tauri IPC bridge (commands + events)
    terminalBridge.ts        xterm.js integration
    inputBatcher.ts          Input batching for terminal writes
  store/
    workspaceStore.ts        Zustand vanilla store (all state + actions)
    useWorkspaceStore.ts     React hook wrapper
  types/
    workspace.ts             Core types (Row, Cell, TerminalCell, NotesCell, AppState)

src-tauri/src/
  main.rs / lib.rs           Tauri app setup
  model.rs                   Shared Rust model types
  session.rs                 ConPTY session manager (create/read/write/resize/close/restart)
  shell.rs                   Shell detection (pwsh vs powershell)
  persistence.rs             State save/load with corruption recovery
  commands/
    mod.rs                   Command registration
    state.rs                 Tauri commands for load/save state
    terminal.rs              Tauri commands for terminal CRUD

legacy/
  macos-swift/               Archived old macOS Swift implementation
```

### 4. How Infinite Scroll Works (Core Implementation)

The "infinite scroll" is implemented via **react-window's `VariableSizeList`** in `WorkspaceCanvas.tsx`.

**Data model** (`src/types/workspace.ts`):
- `AppState` contains an array of `Row[]`, each row has `cells: Cell[]`
- Cells are either `TerminalCell` or `NotesCell`
- Users can infinitely add new rows via `addRowBelowFocused()`

**Virtualization** (`src/components/WorkspaceCanvas.tsx`):
- Uses `VariableSizeList` from react-window to render only visible rows
- Row heights are dynamically estimated via `estimateRowHeight()` based on cell count, viewport size, and responsive column layout (1/2/3 columns based on width breakpoints: <880 = 1 col, 880-1279 = 2 cols, >=1280 = 3 cols)
- Single-row mode gets taller cells (up to 900px)
- `handleItemsRendered` tracks which rows are visible (overscan range) and reports active row IDs to the session orchestrator

**Session orchestration** (`src/hooks/useSessionOrchestrator.ts`):
- Only creates terminal sessions for rows that are visible/in-focus (lazy creation)
- Prioritizes the focused row's terminal session
- Cleans up sessions for rows scrolled out of view
- Serializes session creation (one at a time, 35ms delay between)

**State persistence** (`src/App.tsx`):
- Uses `requestIdleCallback` (with 1200ms timeout) or `setTimeout(900ms)` to batch saves
- Frontend sends state to Tauri backend via `save_state` command
- Backend stores in `%AppData%/InfiniteScroll/state.json`

### 5. API/Backend Dependencies

The app is a self-contained desktop app with **no external API or network dependencies**. All backend communication is via Tauri IPC commands:
- `load_state` / `save_state` -- persistence
- `create_terminal_session` / `write_terminal_input` / `resize_terminal` / `close_terminal_session` / `restart_terminal_session` -- terminal management

Events from backend to frontend:
- `terminal://output` -- terminal output data
- `terminal://status` -- running/exited/error
- `terminal://cwd` -- working directory changes

### 6. Application Type

This is a **native desktop application** (not a web app or component library). It uses Tauri v2 which wraps a WebView2 frontend in a native Windows window. The Rust backend manages real PTY terminal sessions via ConPTY.

### 7. Virtualization/Windowing Approach

The project already uses **react-window** (`VariableSizeList`) for virtualization. Key details:

- **File**: `src/components/WorkspaceCanvas.tsx` (lines 2-3, 222-234)
- **List type**: `VariableSizeList` -- each row can have a different height
- **Height estimation**: `estimateRowHeight()` calculates based on cell count, responsive column count, and viewport dimensions
- **Overscan**: react-window's default overscan is used; `onItemsRendered` callback tracks `overscanStartIndex`/`overscanStopIndex` to determine which terminal sessions should be active
- **Item keying**: Uses `row.id` as stable key via `itemKey` callback
- **Height recalculation**: `listRef.current?.resetAfterIndex(0, true)` called when `rowHeights` change

The "window version" concept would likely involve replacing or augmenting this react-window virtualization with a different windowing strategy -- possibly fixed-size windows/panes (like tmux or VS Code split panes) rather than the current infinite-scroll variable-height row approach.

### Files Found

| File Path | Description |
|---|---|
| `src/App.tsx` | Root component with hydration and persistence logic |
| `src/components/WorkspaceCanvas.tsx` | Core virtualized list (react-window VariableSizeList) |
| `src/components/RowView.tsx` | Row rendering with cells |
| `src/components/TerminalCell.tsx` | Terminal cell component |
| `src/components/NotesCell.tsx` | Notes cell component |
| `src/store/workspaceStore.ts` | Zustand store with all state/actions |
| `src/types/workspace.ts` | Core type definitions and factory functions |
| `src/hooks/useSessionOrchestrator.ts` | Terminal session lifecycle management |
| `src/hooks/useTerminalSession.ts` | Single terminal session hook |
| `src/lib/tauri.ts` | Tauri IPC bridge |
| `src-tauri/src/session.rs` | ConPTY session manager (Rust) |
| `src-tauri/src/persistence.rs` | State persistence (Rust) |
| `src-tauri/src/shell.rs` | Shell detection (Rust) |
| `package.json` | Frontend dependencies and scripts |
| `vite.config.ts` | Vite build configuration |
| `src-tauri/Cargo.toml` | Rust dependencies |

## Caveats / Not Found

- The `legacy/macos-swift/` directory is archived and not part of active development
- The project is Windows-only due to ConPTY dependency (the `portable-pty` crate on Windows uses ConPTY; on other platforms it would use different PTY backends, but the shell detection logic is Windows-specific)
- No CI/CD configuration found in the repository
- The GitHub remote (`gaojude/infinite-scroll`) could not be fetched via `gh` CLI in this environment, but the local clone is the same repository
