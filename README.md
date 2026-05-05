# Infinite Scroll

Infinite Scroll 是一个面向 Windows 的桌面工作区应用，基于 **Tauri v2 + React + TypeScript + Rust** 构建。

它把终端与笔记组织成可无限向下扩展的行式工作区，适合需要并行处理多个命令行任务、记录上下文和持续切换焦点的开发场景。

## 下载

前往 [Releases](https://github.com/RicardoZengg/infinite-scroll/releases) 页面下载最新安装包：

| 文件 | 说明 |
|------|------|
| `Infinite Scroll_x.x.x_x64-setup.exe` | NSIS 安装程序（推荐） |
| `Infinite Scroll_x.x.x_x64_en-US.msi` | MSI 安装程序 |

系统要求：Windows 10/11 x64，WebView2 Runtime（通常已预装）。

## 项目特性

### 工作区

- 无限纵向扩展：按行组织内容，行数不设上限
- 终端与笔记混排：同一行内可同时放置终端和笔记单元
- 多工作区管理：创建、切换、删除命名工作区，每个工作区独立持久化
- 行拖拽排序：通过拖拽行头手柄重新排列行顺序
- 行内联重命名：双击行标题即可编辑

### 终端

- ConPTY 原生终端：通过 `portable-pty` 驱动真实 Windows 伪控制台进程
- Shell 自动探测：优先使用 PowerShell 7（pwsh），缺失时回退到 Windows PowerShell
- 终端状态追踪：实时显示运行/退出/错误状态，错误时提供一键重启按钮
- 工作目录显示：单元头实时展示当前终端 CWD
- 输入批处理：12ms 间隔聚合击键，减少 IPC 开销
- 输出缓冲合并：8ms 间隔批量写入 xterm.js，避免掉帧
- 懒加载会话：仅为可见行创建终端会话，离开视口自动关闭

### 系统集成

- 系统托盘图标：右键菜单支持"显示窗口"、"始终置顶"、"退出"
- 最小化到托盘：关闭窗口时隐藏到托盘而非退出
- 窗口始终置顶：通过标题栏按钮或托盘菜单切换

### 搜索与筛选

- 行搜索过滤：`Ctrl+F` 打开搜索面板，按行标题或终端 CWD 实时过滤

### UI / UX

- 虚拟化列表渲染：基于 `react-window` 的 `VariableSizeList`，仅渲染可见行
- 响应式列布局：根据视口宽度自动切换 1/2/3 列
- Dracula 暗色主题：深紫灰底色、紫色强调、绿色/红色状态色
- 焦点高亮：当前活跃单元带紫色光晕边框
- 加载骨架屏：状态恢复期间显示闪光占位动画
- 错误边界：渲染异常时显示恢复 UI，支持重试

### 国际化

- 中英文界面切换：内置 `zh-CN` 与 `en-US` 文案，标题栏地球图标一键切换
- 语言自动检测：首次访问根据浏览器语言自动选择

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+Down` | 在当前焦点行下方新建一行 |
| `Ctrl+D` | 复制当前焦点终端单元 |
| `Ctrl+W` | 关闭当前焦点单元 |
| `Ctrl+Arrow Left/Right` | 在行内单元之间移动焦点 |
| `Ctrl+Arrow Up/Down` | 在行之间移动焦点 |
| `Ctrl+F` | 打开/关闭搜索过滤面板 |
| `Ctrl+/` | 显示/关闭快捷键帮助层 |
| `Ctrl+=` / `Ctrl++` | 增大终端字体 |
| `Ctrl+-` | 缩小终端字体 |

## 技术栈

- 前端：React 19 + TypeScript + Vite
- 状态管理：Zustand
- 终端渲染：xterm.js v6
- 后端：Rust + Tauri v2
- 终端会话：ConPTY（`portable-pty`）
- 虚拟化：react-window

## 运行环境

- Node.js 20+
- Rust stable toolchain
- Microsoft Visual Studio 2022 Build Tools（包含 C++ workload）
- WebView2 Runtime
- PowerShell 7（优先），缺失时回退到 Windows PowerShell

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run tauri:dev

# 构建生产版本（生成 MSI + NSIS 安装包）
npm run tauri:build
```

## 常用开发命令

```bash
# 前端测试
npm run test -- --run

# Rust 测试
cargo test --manifest-path src-tauri/Cargo.toml

# 前端构建校验
npm run build
```

## 项目结构

```text
src/
  components/   React 组件（工作区画布、行视图、终端/笔记单元、帮助浮层等）
  hooks/        终端生命周期、快捷键、会话编排、元素尺寸等 Hook
  lib/          Tauri bridge、xterm 集成、输入批处理、国际化
  store/        工作区 Zustand 状态与行为
  styles.css    全局样式与 Dracula 主题
  i18n.ts       中英文文案定义

src-tauri/
  src/
    commands/   Tauri 命令入口（state、terminal、window、workspace）
    model.rs    共享状态模型
    persistence.rs
                状态加载、保存与损坏恢复
    session.rs  ConPTY 会话生命周期管理
    shell.rs    Shell 探测逻辑

legacy/
  macos-swift/  旧版 macOS Swift 实现归档
```

## 状态持久化

- 每个工作区独立状态文件：`%AppData%/InfiniteScroll/workspaces/<id>.json`
- 工作区清单：`%AppData%/InfiniteScroll/workspaces/manifest.json`
- 前端在空闲时机批量保存（`requestIdleCallback` / `setTimeout`），降低频繁写盘干扰
- 后端原子写入：先写临时文件再重命名，防止崩溃导致数据损坏
- 损坏恢复：无效 JSON 自动备份为 `.corrupted-<uuid>` 文件并回退到默认工作区

## 开发说明

- 前端入口位于 `src/App.tsx`
- Tauri 命令在 `src-tauri/src/commands/` 下定义
- 终端相关能力集中在 `src-tauri/src/session.rs` 与前端 `src/lib/`、`src/hooks/`
- 非 Tauri 环境下（`npm run dev`）前端可独立运行，Tauri bridge 提供降级默认值
- 当前仓库中的 `legacy/macos-swift/` 仅作历史归档，不属于活跃开发范围
