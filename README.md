# Infinite Scroll (Windows Rewrite)

Infinite Scroll is now a Windows-first desktop app built with **Tauri v2 + React + TypeScript + Rust**.
It provides an infinite vertical workspace made of rows and cells, with terminal and notes workflows.

## Current Stack

- Frontend: React + TypeScript + Vite + xterm.js
- Backend: Rust + Tauri v2 + ConPTY (`portable-pty`)
- Persistence: `%AppData%/InfiniteScroll/state.json`

## Prerequisites (Windows)

- Node.js 20+
- Rust (stable)
- Microsoft Visual Studio 2022 Build Tools (C++ workload)
- WebView2 Runtime
- PowerShell 7 (`pwsh`) preferred, fallback to Windows PowerShell

## Development

Install dependencies:

```bash
npm install
```

Run frontend tests:

```bash
npm run test -- --run
```

Run Rust tests:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Run app in development:

```bash
npm run tauri:dev
```

Build production app:

```bash
npm run tauri:build
```

## Keyboard Shortcuts (Windows)

- `Ctrl+Shift+Down`: add row below focused row
- `Ctrl+D`: duplicate focused terminal cell
- `Ctrl+W`: close focused cell
- `Ctrl+Arrow`: move focus
- `Ctrl+/`: toggle help overlay
- `Ctrl+=` / `Ctrl+-`: adjust terminal font size

## Repository Layout

- `src/`: React UI, workspace state, terminal bridge, shortcuts, tests
- `src-tauri/`: Rust models, persistence, shell/session backend, Tauri commands
- `legacy/macos-swift/`: archived pre-rewrite macOS Swift implementation
