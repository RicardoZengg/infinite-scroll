# Infinite Scroll Windows Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current macOS-only Swift app with a Windows desktop app that preserves the Infinite Scroll workspace model using Tauri, React, xterm.js, and a Rust ConPTY backend.

**Architecture:** Keep the UI in a Tauri frontend and move terminal/session/persistence responsibilities into Rust. Persist workspace structure, notes, font size, focus, and each terminal cell's latest `cwd`, then recreate shell sessions on restart instead of keeping them alive across app exits.

**Tech Stack:** Tauri v2, React + TypeScript + Vite, Rust, Windows ConPTY via `portable-pty`, xterm.js, Vitest, Testing Library

---

## File Structure

### New runtime files

- `package.json` - root npm scripts and frontend/runtime dependencies
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html` - frontend toolchain config
- `src/main.tsx` - frontend bootstrap
- `src/App.tsx` - top-level app orchestration
- `src/styles.css` - global layout, theme, and terminal canvas styling
- `src/types/workspace.ts` - shared frontend state types mirroring Rust models
- `src/store/workspaceStore.ts` - row/cell/focus/font/notes state and commands
- `src/lib/tauri.ts` - typed Tauri command wrappers and event listeners
- `src/lib/terminalBridge.ts` - xterm session attach/detach logic
- `src/hooks/useShortcuts.ts` - Windows shortcut mapping
- `src/hooks/useTerminalSession.ts` - terminal lifecycle hook per cell
- `src/components/WorkspaceCanvas.tsx` - infinite vertical workspace container
- `src/components/RowView.tsx` - one row with ordered cells
- `src/components/TerminalCell.tsx` - xterm host, exit/error states, focus ring
- `src/components/NotesCell.tsx` - notes editor cell
- `src/components/HelpOverlay.tsx` - shortcut reference overlay

### New backend files

- `src-tauri/Cargo.toml` - Rust dependencies and crate metadata
- `src-tauri/build.rs` - Tauri build integration
- `src-tauri/tauri.conf.json` - Tauri app config for Windows
- `src-tauri/capabilities/default.json` - command/event allowlist
- `src-tauri/src/main.rs` - app entrypoint
- `src-tauri/src/lib.rs` - Tauri app builder and command registration
- `src-tauri/src/model.rs` - `AppState`, `Row`, `Cell`, status enums
- `src-tauri/src/persistence.rs` - state file location, load/save, corrupt backup
- `src-tauri/src/shell.rs` - `pwsh`/`powershell.exe` detection
- `src-tauri/src/session.rs` - terminal session registry and ConPTY lifecycle
- `src-tauri/src/commands/mod.rs` - command module exports
- `src-tauri/src/commands/state.rs` - load/save/new row/duplicate/close/update commands
- `src-tauri/src/commands/terminal.rs` - create terminal, write input, resize, restart

### Test files

- `src/store/workspaceStore.test.ts`
- `src/components/WorkspaceCanvas.test.tsx`
- `src/components/TerminalCell.test.tsx`
- Rust unit tests embedded near `model.rs`, `persistence.rs`, `shell.rs`, `session.rs`

### Legacy/archive targets

- `legacy/macos-swift/` - final home for the old Swift implementation
- `README.md` - rewritten for Windows/Tauri workflow
- `.gitignore` - add Node, Vite, Tauri, Rust, and Windows build outputs

### Relevant existing files to retire after parity

- `Sources/InfiniteScroll/*`
- `Resources/*`
- `Package.swift`
- `Package.resolved`
- `package.sh`

## Task 1: Bootstrap Windows Toolchain And Tauri Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Modify: `.gitignore`

- [ ] **Step 1: Install and verify Windows prerequisites**

Run:

```powershell
winget install --id Rustlang.Rustup --source winget --accept-package-agreements --accept-source-agreements
winget install --id Microsoft.VisualStudio.2022.BuildTools --source winget
winget install --id Microsoft.EdgeWebView2Runtime --source winget --accept-package-agreements --accept-source-agreements
cargo --version
rustc --version
node --version
npm --version
```

Expected:
- `cargo` and `rustc` resolve in the shell
- Node and npm stay available

- [ ] **Step 2: Create the root frontend package and scripts**

Add a root `package.json` with scripts:

```json
{
  "name": "infinite-scroll",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

- [ ] **Step 3: Install exact frontend/runtime dependencies**

Run:

```powershell
npm install @tauri-apps/api@^2.10.1 @xterm/xterm@^6.0.0 @xterm/addon-fit@^0.11.0 zustand zod
npm install -D @tauri-apps/cli@^2.10.1 @vitejs/plugin-react typescript vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Expected:
- `node_modules` created
- `package-lock.json` updated

- [ ] **Step 4: Add minimal Vite + React + Tauri config**

Set up:
- `vite.config.ts` with React plugin
- `src-tauri/Cargo.toml` with `tauri`, `serde`, `serde_json`, `uuid`, `directories`, `portable-pty`, `thiserror`
- `src-tauri/src/lib.rs` with a minimal `tauri::Builder::default().run(...)`

- [ ] **Step 5: Extend `.gitignore`**

Add:

```gitignore
node_modules/
dist/
src-tauri/target/
*.log
```

- [ ] **Step 6: Run scaffold smoke checks**

Run:

```powershell
npm run build
npm run tauri:build
```

Expected:
- frontend build succeeds
- Tauri compiles a Windows app shell, even if functionality is placeholder-only

- [ ] **Step 7: Commit bootstrap**

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src src-tauri
git commit -m "feat: 初始化 Windows Tauri 工程骨架"
```

## Task 2: Define Shared Workspace Model And Persistence Contract

**Files:**
- Create: `src/types/workspace.ts`
- Create: `src/store/workspaceStore.ts`
- Create: `src/store/workspaceStore.test.ts`
- Create: `src-tauri/src/model.rs`
- Create: `src-tauri/src/persistence.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Write the failing frontend state tests**

Cover:
- default first row/first terminal creation
- add row below focused row
- duplicate terminal copies `cwd`
- closing last cell removes row
- font size clamps

- [ ] **Step 2: Run frontend state tests and confirm failure**

Run:

```powershell
npm run test -- src/store/workspaceStore.test.ts --run
```

Expected:
- FAIL because store and model are not implemented

- [ ] **Step 3: Write the failing Rust persistence tests**

Cover:
- save/load round-trip
- corrupted state file gets backed up and ignored
- empty state returns default workspace

- [ ] **Step 4: Run Rust tests and confirm failure**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml persistence -- --nocapture
```

Expected:
- FAIL because model/persistence modules do not exist yet

- [ ] **Step 5: Implement the shared models**

Implement:
- frontend `Row`, `Cell`, `TerminalCell`, `NotesCell`, `AppState`
- Rust mirrors with `serde` support
- state helpers for IDs, titles, default workspace

- [ ] **Step 6: Implement persistence**

Implement:
- state path under `%AppData%/InfiniteScroll/state.json`
- atomic save
- corrupted-file backup naming
- default fallback workspace

- [ ] **Step 7: Re-run tests**

Run:

```powershell
npm run test -- src/store/workspaceStore.test.ts --run
cargo test --manifest-path src-tauri/Cargo.toml persistence -- --nocapture
```

Expected:
- PASS

- [ ] **Step 8: Commit workspace model**

```bash
git add src/types/workspace.ts src/store/workspaceStore.ts src/store/workspaceStore.test.ts src-tauri/src/model.rs src-tauri/src/persistence.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: 建立工作区状态与持久化模型"
```

## Task 3: Build Shell Detection And Terminal Session Backend

**Files:**
- Create: `src-tauri/src/shell.rs`
- Create: `src-tauri/src/session.rs`
- Create: `src-tauri/src/commands/terminal.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Write failing Rust tests for shell selection**

Cover:
- prefer `pwsh`
- fall back to `powershell.exe`
- return explicit error when neither exists

- [ ] **Step 2: Write failing Rust tests for session registry**

Cover:
- create session for terminal cell ID
- close only target session
- restart exited session with preserved `cwd`

- [ ] **Step 3: Run targeted Rust tests and confirm failure**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml shell
cargo test --manifest-path src-tauri/Cargo.toml session
```

Expected:
- FAIL

- [ ] **Step 4: Implement `shell.rs`**

Implement:
- shell discovery using `pwsh`, then `powershell.exe`
- structured result carrying executable path and shell kind

- [ ] **Step 5: Implement `session.rs`**

Implement:
- ConPTY session creation via `portable-pty`
- per-session reader thread
- write/resize/close/restart methods
- latest `cwd` tracking slot per terminal cell
- `running | exited | error` status

- [ ] **Step 6: Implement terminal Tauri commands**

Expose commands:
- create terminal session
- write input
- resize terminal
- close terminal
- restart terminal

- [ ] **Step 7: Run backend tests and a manual shell smoke**

Run:

```powershell
cargo test --manifest-path src-tauri/Cargo.toml shell
cargo test --manifest-path src-tauri/Cargo.toml session
```

Then manually confirm one spawned shell echoes output and exits cleanly.

- [ ] **Step 8: Commit terminal backend**

```bash
git add src-tauri/src/shell.rs src-tauri/src/session.rs src-tauri/src/commands/terminal.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat: 实现 Windows terminal 会话后端"
```

## Task 4: Bridge Rust Sessions To xterm.js

**Files:**
- Create: `src/lib/tauri.ts`
- Create: `src/lib/terminalBridge.ts`
- Create: `src/hooks/useTerminalSession.ts`
- Create: `src/components/TerminalCell.tsx`
- Create: `src/components/TerminalCell.test.tsx`

- [ ] **Step 1: Write the failing terminal bridge test**

Cover:
- xterm is created once per cell
- backend output is written to the terminal
- resize events call the Tauri resize command
- exit/error state changes render fallback UI

- [ ] **Step 2: Run terminal bridge tests and confirm failure**

Run:

```powershell
npm run test -- src/components/TerminalCell.test.tsx --run
```

Expected:
- FAIL because the bridge components do not exist

- [ ] **Step 3: Implement typed command wrappers**

In `src/lib/tauri.ts`, wrap all `invoke` and `listen` calls so the UI never uses raw command names directly.

- [ ] **Step 4: Implement xterm session bridge**

In `src/lib/terminalBridge.ts` and `useTerminalSession.ts`:
- create `Terminal`
- attach `FitAddon`
- subscribe to backend output events
- send keystrokes to Rust
- push resize changes back to backend

- [ ] **Step 5: Implement `TerminalCell.tsx`**

Render:
- xterm host while running
- inline error panel when shell start fails
- inline exited panel with restart action
- focus ring for current cell

- [ ] **Step 6: Re-run terminal bridge tests**

Run:

```powershell
npm run test -- src/components/TerminalCell.test.tsx --run
```

Expected:
- PASS

- [ ] **Step 7: Commit terminal bridge**

```bash
git add src/lib/tauri.ts src/lib/terminalBridge.ts src/hooks/useTerminalSession.ts src/components/TerminalCell.tsx src/components/TerminalCell.test.tsx
git commit -m "feat: 接通 xterm 与 Rust terminal 会话"
```

## Task 5: Implement Workspace Canvas, Notes, Focus, And Shortcuts

**Files:**
- Create: `src/components/WorkspaceCanvas.tsx`
- Create: `src/components/RowView.tsx`
- Create: `src/components/NotesCell.tsx`
- Create: `src/components/HelpOverlay.tsx`
- Create: `src/hooks/useShortcuts.ts`
- Create: `src/components/WorkspaceCanvas.test.tsx`
- Modify: `src/store/workspaceStore.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing UI tests**

Cover:
- row insertion below current focus
- focus moves with `Ctrl+Arrow`
- `Ctrl+D` duplicates terminal cell
- `Ctrl+W` closes focused cell
- help overlay toggles with `Ctrl+/`

- [ ] **Step 2: Run UI tests and confirm failure**

Run:

```powershell
npm run test -- src/components/WorkspaceCanvas.test.tsx --run
```

Expected:
- FAIL

- [ ] **Step 3: Implement the workspace store commands**

Add actions for:
- add row
- duplicate terminal
- close cell
- focus next/previous row/cell
- update font size
- toggle help
- update notes text

- [ ] **Step 4: Implement UI components**

Build:
- vertically scrollable workspace canvas
- ordered row layout
- notes cell with monospace textarea
- help overlay with Windows shortcuts

- [ ] **Step 5: Implement Windows-native shortcuts**

Map:
- `Ctrl+Shift+ArrowDown`
- `Ctrl+D`
- `Ctrl+W`
- `Ctrl+Arrow`
- `Ctrl+/`
- `Ctrl+=` / `Ctrl+-`

Ensure shortcuts do not fire while editing notes unless the action is intended.

- [ ] **Step 6: Re-run UI tests**

Run:

```powershell
npm run test -- src/components/WorkspaceCanvas.test.tsx --run
```

Expected:
- PASS

- [ ] **Step 7: Commit workspace UI**

```bash
git add src/components/WorkspaceCanvas.tsx src/components/RowView.tsx src/components/NotesCell.tsx src/components/HelpOverlay.tsx src/hooks/useShortcuts.ts src/components/WorkspaceCanvas.test.tsx src/store/workspaceStore.ts src/App.tsx src/styles.css
git commit -m "feat: 实现工作区画布与快捷键交互"
```

## Task 6: Wire State Restore, Autosave, Cwd Inheritance, And Exit Handling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/store/workspaceStore.ts`
- Modify: `src/lib/tauri.ts`
- Modify: `src/hooks/useTerminalSession.ts`
- Modify: `src/components/TerminalCell.tsx`
- Modify: `src/components/NotesCell.tsx`
- Modify: `src-tauri/src/commands/state.rs`
- Modify: `src-tauri/src/commands/terminal.rs`
- Modify: `src-tauri/src/persistence.rs`
- Modify: `src-tauri/src/session.rs`

- [ ] **Step 1: Write failing tests for restore and inheritance**

Cover:
- app boot restores saved rows/cells/notes/font/focus
- duplicated terminal inherits latest `cwd`
- notes edits trigger autosave
- exited terminal can be restarted without losing the cell

- [ ] **Step 2: Run targeted tests and confirm failure**

Run:

```powershell
npm run test -- src/store/workspaceStore.test.ts src/components/TerminalCell.test.tsx --run
cargo test --manifest-path src-tauri/Cargo.toml persistence session
```

Expected:
- FAIL

- [ ] **Step 3: Implement restore flow**

At app startup:
- load saved `AppState`
- create terminal sessions only for terminal cells
- reapply focus and font size

- [ ] **Step 4: Implement autosave and latest `cwd` propagation**

Persist on:
- row/cell topology changes
- notes text changes
- font size changes
- terminal `cwd` updates coming from Rust

- [ ] **Step 5: Implement exited/error terminal recovery**

Add restart handling so a dead terminal cell stays in the layout and can re-open from its saved `cwd`.

- [ ] **Step 6: Re-run restore tests**

Run:

```powershell
npm run test -- src/store/workspaceStore.test.ts src/components/TerminalCell.test.tsx --run
cargo test --manifest-path src-tauri/Cargo.toml persistence session
```

Expected:
- PASS

- [ ] **Step 7: Manual acceptance pass**

Run:

```powershell
npm run tauri:dev
```

Manually verify:
- create rows and cells
- edit notes
- duplicate a terminal after changing directories
- close and reopen app
- confirm layout, notes, font size, focus, and `cwd` restore

- [ ] **Step 8: Commit restore and autosave**

```bash
git add src src-tauri
git commit -m "feat: 打通状态恢复与自动保存链路"
```

## Task 7: Retire Legacy macOS Entry Points, Update Docs, And Finalize Packaging

**Files:**
- Create: `legacy/macos-swift/`
- Move: `Sources/ -> legacy/macos-swift/Sources/`
- Move: `Resources/ -> legacy/macos-swift/Resources/`
- Move: `Package.swift -> legacy/macos-swift/Package.swift`
- Move: `Package.resolved -> legacy/macos-swift/Package.resolved`
- Move: `package.sh -> legacy/macos-swift/package.sh`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `.gitignore`

- [ ] **Step 1: Update contributor and user docs**

Rewrite `README.md` for:
- Windows prerequisites
- `npm install`
- `npm run tauri:dev`
- `npm run tauri:build`

Update `AGENTS.md` so it reflects the new Tauri/Rust/React structure instead of the old Swift package layout.

- [ ] **Step 2: Archive the old macOS implementation**

Move the Swift app into `legacy/macos-swift/` so the repo has one active product path and one clearly marked archive.

- [ ] **Step 3: Run the full verification suite**

Run:

```powershell
npm run test -- --run
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
npm run tauri:build
```

Expected:
- all frontend tests pass
- all Rust tests pass
- production frontend build passes
- Tauri Windows package builds successfully

- [ ] **Step 4: Perform final manual smoke**

Verify:
- shortcut help matches actual bindings
- scroll behavior feels correct between workspace and terminal
- error state is visible if no shell is available
- restarted terminal uses the saved `cwd`

- [ ] **Step 5: Commit the rewrite**

```bash
git add README.md AGENTS.md .gitignore legacy src src-tauri package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html
git commit -m "feat: 完成 Infinite Scroll Windows 重写"
```
