# Infinite Scroll

Infinite Scroll 是一个面向 Windows 的桌面工作区应用，基于 **Tauri v2 + React + TypeScript + Rust** 构建。

它把终端与笔记组织成可无限向下扩展的行式工作区，适合需要并行处理多个命令行任务、记录上下文和持续切换焦点的开发场景。

## 项目特性

- 无限纵向工作区：按行组织内容，便于持续扩展任务上下文
- 终端与笔记混排：同一工作区内同时管理命令行和文本记录
- 焦点驱动操作：支持键盘快速移动、复制终端、关闭当前单元
- 会话持久化：自动保存工作区状态，重启后恢复上次布局
- Windows 原生终端集成：通过 ConPTY 驱动终端会话
- 中英文界面切换：内置 `zh-CN` 与 `en-US` 文案

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 状态管理：Zustand
- 终端渲染：xterm.js
- 后端：Rust + Tauri v2
- 终端会话：ConPTY（`portable-pty`）
- 数据持久化：`%AppData%/InfiniteScroll/state.json`

## 运行环境

当前项目以 Windows 为主，建议准备以下环境：

- Node.js 20+
- Rust stable toolchain
- Microsoft Visual Studio 2022 Build Tools（包含 C++ workload）
- WebView2 Runtime
- PowerShell 7（优先），缺失时回退到 Windows PowerShell

## 快速开始

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run tauri:dev
```

构建生产版本：

```bash
npm run tauri:build
```

## 常用开发命令

前端测试：

```bash
npm run test -- --run
```

Rust 测试：

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

前端构建校验：

```bash
npm run build
```

## 快捷键

- `Ctrl+Shift+Down`：在当前焦点行下方新建一行
- `Ctrl+D`：复制当前焦点终端单元
- `Ctrl+W`：关闭当前焦点单元
- `Ctrl+Arrow`：在行与单元之间移动焦点
- `Ctrl+/`：显示或关闭快捷键帮助层
- `Ctrl+=` / `Ctrl+-`：调整终端字体大小

## 项目结构

```text
src/
  components/   React 组件，包括工作区画布、行视图、终端/笔记单元、帮助浮层
  hooks/        终端生命周期与快捷键相关 Hook
  lib/          Tauri bridge 与 xterm 集成
  store/        工作区状态与行为
  test/         前端测试辅助文件
  types/        前端类型定义

src-tauri/
  src/
    commands/   Tauri 命令入口
    model.rs    共享状态模型
    persistence.rs
                状态加载、保存与损坏恢复
    session.rs  ConPTY 会话生命周期管理
    shell.rs    Shell 探测逻辑

legacy/
  macos-swift/  旧版 macOS Swift 实现归档
```

## 状态持久化

- 默认状态文件位置：`%AppData%/InfiniteScroll/state.json`
- 前端在空闲时机批量保存，降低频繁写盘带来的干扰
- 后端对损坏状态文件有降级恢复逻辑，会回退默认工作区并保留损坏备份

## 开发说明

- 前端入口位于 `src/App.tsx`
- Tauri 命令在 `src-tauri/src/commands/` 下定义
- 终端相关能力集中在 `src-tauri/src/session.rs` 与前端 `src/lib/`、`src/hooks/`
- 当前仓库中的 `legacy/macos-swift/` 仅作历史归档，不属于活跃开发范围
