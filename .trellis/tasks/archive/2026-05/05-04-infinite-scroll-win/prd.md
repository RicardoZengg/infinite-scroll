# 基于参考项目重构 infinite-scroll Windows 版

## Goal

基于 GitHub 开源项目 [gaojude/infinite-scroll](https://github.com/gaojude/infinite-scroll) 的设计和功能，全面重构本项目的前端 UI 和功能，使其成为参考项目的高质量 Windows 桌面版本，并增加窗口化布局和桌面窗口管理能力。

## Requirements

### P1: 前端 UI 全面重构（CSS Modules）
- [ ] 将 styles.css 拆分为组件级 CSS Modules（.module.css）
- [ ] 重设计 Header 组件：紧凑工具栏风格，按钮图标化
- [ ] 重设计 Row/Cell 视觉：更好的层次、间距、圆角
- [ ] 终端 Cell 美化：状态灯、CWD 路径、工具栏
- [ ] 笔记 Cell 美化：更好的编辑区域样式
- [ ] 添加 CSS 过渡动画（单元格聚焦、行进入/离开）
- [ ] 加载骨架屏 / 错误状态优化
- [ ] 添加 React Error Boundary
- [ ] 帮助面板重设计

### P2: 功能增强
- [ ] 行拖拽排序（drag handle + react-window 兼容）
- [ ] 搜索/过滤：按标题或终端 CWD 搜索
- [ ] 可调整大小的分屏面板（row 内 cell 可拖拽调整宽度）
- [ ] 键盘快捷键增强（新增搜索、拖拽相关）

### P3: 桌面窗口管理（Rust + 前端）
- [ ] 系统托盘：最小化到托盘 + 托盘右键菜单
- [ ] 窗口置顶（always on top toggle）
- [ ] 多工作区：切换/创建/删除工作区
- [ ] 标题栏显示当前工作区名

### P4: 性能优化（核心指标：尽可能多的行/终端无卡顿、零内存泄漏）
- [ ] React 渲染优化：memo / useMemo / useCallback 审计，消除不必要 re-render
- [ ] react-window 虚拟化优化：overscan 最小化、行高度缓存、scrollToItem 平滑
- [ ] 终端输出流优化：xterm.js 写入批次大小调优、离屏终端暂停输出、DOM 节点回收
- [ ] 状态持久化优化：增量 diff 持续化、去抖频率调优
- [ ] 会话编排优化：并发创建限制、离屏会话完整释放（PTY + xterm 实例）
- [ ] 首屏加载优化：代码分割、懒加载非可见组件
- [ ] 内存泄漏防治：xterm Terminal 实例销毁时完整 cleanup、事件监听器卸载、引用断开
- [ ] 压力测试目标：200+ 行 × 3 终端持续运行无卡顿、长时间运行（30min+）内存稳定

### P5: 参考项目功能对齐验证
- [ ] 逐功能对照参考项目，列出功能清单并标注实现状态
- [ ] 验证：无限滚动 + 行管理（添加/删除/重命名）
- [ ] 验证：终端 CRUD（创建/写入/调整大小/关闭/重启）
- [ ] 验证：笔记单元格（添加/编辑/聚焦）
- [ ] 验证：焦点导航（Ctrl+方向键 / 点击聚焦）
- [ ] 验证：快捷键（Ctrl+Shift+N 新行、Ctrl+D 复制、Ctrl+W 关闭、Ctrl+/ 帮助、Ctrl+=/- 字体）
- [ ] 验证：自动持久化 + 水合（%AppData%/InfiniteScroll/state.json）
- [ ] 验证：i18n 双语（zh-CN / en-US）
- [ ] 验证：会话编排（懒创建、可见行优先、滚动销毁）
- [ ] 验证：响应式布局（1/2/3 列断点）
- [ ] 产出对照报告：功能实现状态矩阵表

## Acceptance Criteria

- [ ] UI 视觉品质达到参考项目水平
- [ ] 所有现有功能正常（终端 CRUD、笔记、键盘导航、持久化、会话编排）
- [ ] `npm run build` 无 TypeScript 错误
- [ ] `npm run test` 全部通过
- [ ] `npm run tauri:build` 成功生成 Windows 安装包
- [ ] 行拖拽排序可正常工作且不破坏 react-window 虚拟化
- [ ] 系统托盘集成正常（最小化/恢复/退出）
- [ ] 多工作区切换不影响终端会话存活
- [ ] 参考项目功能对照矩阵 100% 标记为"已实现"
- [ ] 首屏加载时间不劣于当前版本
- [ ] 200+ 行 × 3 终端场景下滚动/切换无卡顿（60fps 目标）
- [ ] 长时间运行（30min+）内存占用稳定，无泄漏
- [ ] 离屏终端会话完全释放（PTY 进程 + xterm 实例 + 事件监听器）

## Definition of Done

- `npm run build` 无错误
- `npm run test` 全部通过
- `npm run tauri:build` 成功生成 Windows 安装包
- UI 视觉审查通过
- 无 console.error 或未处理异常

## Decision (ADR-lite)

**Context**: UI 样式方案选择
**Decision**: CSS Modules（零依赖、组件级样式隔离、渐进迁移）
**Consequences**: 每个组件获得 .module.css 文件；深色科技风设计语言保留

**Context**: MVP 范围
**Decision**: 一次全做（UI 重构 + 功能增强 + 桌面窗口管理）
**Consequences**: 任务较大，需分模块并行实施；测试需同步更新

## Out of Scope

- 跨平台支持（仅 Windows）
- 后端 Rust 重构（除非新增 IPC 命令）
- CI/CD 流水线
- 插件系统
- Markdown 渲染（笔记保持纯文本）

## Technical Notes

### 研究参考
- [`research/reference-project.md`](research/reference-project.md) — 参考项目完整架构分析
- [`research/local-project-state.md`](research/local-project-state.md) — 本地项目现状详细报告

### 关键源文件
| 文件 | 行数 | 职责 |
|------|------|------|
| `src/App.tsx` | 237 | 根组件：水合、持久化、布局 |
| `src/components/WorkspaceCanvas.tsx` | 237 | react-window 虚拟化列表 |
| `src/components/RowView.tsx` | 81 | 行视图：header + cells |
| `src/components/TerminalCell.tsx` | 78 | 终端单元格 |
| `src/components/NotesCell.tsx` | — | 笔记单元格 |
| `src/components/HelpOverlay.tsx` | — | 快捷键帮助面板 |
| `src/styles.css` | 301 | 全局样式（需拆分） |
| `src/store/workspaceStore.ts` | — | Zustand store |
| `src/hooks/useSessionOrchestrator.ts` | — | 会话生命周期管理 |
| `src/hooks/useTerminalSession.ts` | — | 单终端会话 hook |
| `src/hooks/useShortcuts.ts` | — | 键盘快捷键 |
| `src-tauri/src/session.rs` | — | ConPTY 会话管理 |
| `src-tauri/src/persistence.rs` | — | 状态持久化 |

### 新增 Rust 命令（预期）
- `set_always_on_top` — 窗口置顶切换
- `minimize_to_tray` — 最小化到托盘
- `load_workspace` / `save_workspace` — 多工作区切换
- `list_workspaces` — 获取工作区列表

### Implementation Plan（分模块）

**PR1: CSS Modules 迁移 + UI 重设计**
- 将 styles.css 拆分为 App.module.css、WorkspaceCanvas.module.css、RowView.module.css、TerminalCell.module.css、NotesCell.module.css、HelpOverlay.module.css
- 重设计 Header 为紧凑工具栏
- 终端/笔记 Cell 视觉升级
- 动画/过渡效果

**PR2: 功能增强**
- 行拖拽排序（添加 drag handle，实现 DnD）
- 搜索/过滤面板
- Cell 可调整宽度（CSS resize 或自定义拖拽）

**PR3: 桌面窗口管理**
- Rust 侧：系统托盘、窗口置顶、多工作区 IPC
- 前端侧：工作区切换 UI、标题栏增强、托盘交互

**PR4: 性能优化**
- React 渲染性能审计（React DevTools Profiler 目标）
- react-window overscan / 行高缓存调优
- 终端输出流批处理优化
- 持久化增量 diff + 去抖
- 首屏代码分割
- 大量行场景内存泄漏修复

**PR5: 参考项目功能对照验证**
- 产出功能实现状态矩阵表
- 逐项验证并标注完成/缺失/差异
- 修复对照中发现的功能缺失
