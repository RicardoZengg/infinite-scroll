# Infinite Scroll Windows 重写设计

## 目标

将当前仅支持 macOS 的 Infinite Scroll 重写为可运行在 Windows 的桌面应用，同时尽量保留现有产品形态与核心体验：

- 无限纵向滚动的 row-based 终端画布
- 每行多个 terminal / notes cell
- 键盘优先的焦点导航与操作
- 本地持久化布局、notes、字体大小与 terminal 的最新工作目录

本次重写不追求跨平台兼容层，而是明确交付 Windows 原生取向版本。

## 已确认决策

- 技术栈：`Rust + Tauri + xterm.js`
- 目标平台：Windows
- 默认 shell：优先 `PowerShell 7 (pwsh)`，缺失时回退 `Windows PowerShell`
- 持久化等级：中等一致
  - 保留 rows / cells / notes / font size / focused cell / terminal cwd
  - 应用重启后重建 shell
  - 不要求 shell 进程在应用关闭后继续存活
- 快捷键策略：Windows 原生化
  - 将原 `Cmd` 体系改为 `Ctrl` 体系

## 非目标

- 不保留 `tmux` 作为会话后端
- 不保留 macOS 专属 AppKit / SwiftUI / SwiftTerm 实现
- 不实现“关闭应用后 shell 会话继续存活”的强一致恢复
- 不在本阶段同时维护 macOS 与 Windows 双实现

## 新架构

### 前端

Tauri 前端负责：

- 无限纵向滚动画布
- row / cell 布局渲染
- notes 编辑区
- help overlay
- 焦点管理
- Windows 快捷键分发
- terminal cell 与后端 PTY 会话的数据桥接

建议使用 React 组织界面状态，`xterm.js` 负责 terminal 渲染。

### 后端

Rust 后端负责：

- 检测并选择默认 shell
- 基于 Windows ConPTY 为每个 terminal cell 启动独立 shell 会话
- 管理 terminal session 生命周期
- 跟踪与持久化每个 terminal 的最新 `cwd`
- 提供 row / cell / state 相关命令
- 处理状态文件读写、损坏恢复与默认初始化

### 状态边界

前端不直接管理 shell 进程状态，只消费后端提供的 session 状态和输出流。终端真实状态、cwd、exit 状态归 Rust 后端维护。

## 核心数据模型

使用前后端共享的 JSON 结构：

### AppState

- `rows`
- `nextRowIndex`
- `fontSize`
- `focusedCellId`
- `windowState`（可选，若后续需要保存窗口尺寸）

### Row

- `id`
- `title`
- `cells`

### Cell

`terminal`:

- `id`
- `type`
- `cwd`
- `shellKind`
- `status`（running / exited / error）

`notes`:

- `id`
- `type`
- `text`

不持久化进程 ID、scrollback buffer、历史输出。

## 关键行为设计

### 应用启动

- 读取本地状态文件
- 若文件不存在或为空，创建默认第一行与第一个 terminal cell
- 若状态文件损坏，备份损坏文件后回退到干净初始状态

### Terminal 创建

- 为每个 terminal cell 分配独立 ConPTY 会话
- 启动 shell：
  - 优先 `pwsh`
  - 回退 `powershell.exe`
- 初始目录使用 cell 持有的 `cwd`

### Terminal 复制

- 复制当前 terminal cell 时，新 cell 继承源 cell 的最新 `cwd`
- 启动全新 shell，不继承旧进程和输出历史

### Row / Cell 操作

- 新建 row：在当前 focused row 下方插入
- 关闭 cell：仅销毁当前 cell 对应 session，不影响其他 cell
- 若 row 无剩余 cells，则删除该 row
- notes 始终作为普通 cell 参与焦点和布局，但不启动 terminal session

### 焦点与快捷键

Windows 默认快捷键：

- `Ctrl+Shift+Down`：新建 row
- `Ctrl+D`：复制当前 terminal cell
- `Ctrl+W`：关闭当前 cell
- `Ctrl+Arrow`：在 row / cell 间移动焦点
- `Ctrl+/`：显示帮助
- `Ctrl+=` / `Ctrl+-`：调整字体大小

### 滚动行为

- 维持“外层画布纵向滚动 + 内层 terminal 自身滚动”的双层交互模型
- 前端根据焦点和鼠标命中决定滚轮事件交给画布还是 terminal

### Notes

- notes 采用普通文本编辑器实现
- 保留 monospace 风格与本地持久化
- 不做富文本，不做 markdown 渲染增强

## 错误处理

- 缺少可用 shell：terminal cell 显示错误态和重试入口
- ConPTY 启动失败：仅当前 cell 进入错误态
- 单个 shell 退出：cell 标记为 exited，并允许手动重开
- 状态读写失败：记录日志并向 UI 暴露非致命错误提示

## 验收标准

以下行为必须在 Windows 上可用：

- 启动应用后可创建多行、多 terminal cell 的无限纵向工作区
- terminal 可运行 PowerShell 命令并交互
- notes 可编辑并自动保存
- row / cell 焦点导航符合 Windows 快捷键映射
- 复制 terminal 时继承 `cwd`
- 关闭并重新打开应用后，布局、notes、字体大小、focused cell 与 terminal `cwd` 被恢复

以下行为不属于本阶段验收：

- shell 关闭后继续存活
- `tmux` 级别的历史会话恢复
- macOS/Windows 双平台共用 UI 实现

## 实施分阶段建议

### Phase 1

- 建立 Tauri + 前端骨架
- 跑通单 terminal session
- 跑通基本状态保存 / 恢复

### Phase 2

- 实现 rows / cells / notes / focus / shortcuts
- 完成 terminal 复制、关闭、重建

### Phase 3

- 完成错误态、帮助面板、字体缩放、状态损坏恢复
- 补齐测试与打包
