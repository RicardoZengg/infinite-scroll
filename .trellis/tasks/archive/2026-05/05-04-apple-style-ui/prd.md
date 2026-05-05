# Apple 风格 UI 优化

## Goal

将 Infinite Scroll 工作区的视觉风格从当前的 "Night Sky" 暗色玻璃态升级为更优雅、更现代的 Apple 设计语言风格，提升整体质感和可读性，同时保留现有的布局结构和交互逻辑。

## What I already know

* 项目是一个 React 19 + Tauri v2 桌面应用，使用 CSS Modules + CSS 自定义变量
* 当前是暗色主题：深蓝渐变背景 + 天蓝 accent + 黄色 focus + 玻璃态面板
* 所有样式定义在 `src/styles.css`（全局变量）和各组件的 `.module.css` 文件中
* 已有设计 token 体系：`--radius-sm/md/lg`, `--transition-fast/normal`
* 无外部 UI 库，全部手写 CSS
* 受影响文件：`styles.css` + 7 个 `.module.css` 文件

## Research References

* [`research/apple-dark-colors.md`](research/apple-dark-colors.md) — Apple 深色模式完整配色方案：5 层背景、标签透明度层次、系统色值、从当前 token 到 Apple 等价物的逐项映射
* [`research/apple-typography-spacing.md`](research/apple-typography-spacing.md) — SF Pro 字体栈（含 Windows fallback）、10 级文字样式、4px 基准间距节奏
* [`research/apple-ui-patterns.md`](research/apple-ui-patterns.md) — 圆角(5-12px)、阴影(极简)、中性白边框(6-14%透明度)、hover/active 模式、`backdrop-filter: blur() saturate()` 玻璃态、Apple 签名缓动曲线

## Research Notes

### 关键设计转变（当前 vs Apple 风格）

| 方面 | 当前风格 | Apple 深色风格 |
|------|---------|---------------|
| 背景 | 蓝色渐变 + 彩色径向光晕 | 近黑纯色/渐变，无彩色色调 |
| 边框 | 青色调 | 中性白，极低透明度 |
| Hover | 强调色高亮 | 中性白高亮 |
| 焦点 | 黄色光晕 | 蓝色环 + 微光 |
| 阴影 | 明显发光效果 | 极简，靠表面亮度表现层次 |
| 玻璃态 | 蓝色调模糊 | 中性灰模糊 + saturate() |
| 文字色 | 蓝灰色范围 | 白色 + 透明度层次 |
| 强调色 | 天蓝 #38bdf8 | Apple 系统蓝 #0A84FF |

### Constraints from repo/project

* Tauri WebView2 支持 `backdrop-filter` (Windows 10/11)
* xterm.js 样式由外部 CSS 控制，需覆盖部分变量
* CJK 文字需要 Noto Sans SC / Microsoft YaHei fallback

### Feasible approaches here

**Approach A: Apple 纯正风格** (Recommended)

* How: 完全采用 Apple HIG 深色模式规范 — 中性白边框、Apple 系统蓝强调色、近黑背景（去掉彩色光晕）、白色透明度层次文字、Apple 缓动曲线、更精细的圆角和间距
* Pros: 最接近 macOS/Xcode 原生体验，精致优雅，层次分明
* Cons: 失去当前 "夜空" 彩色身份感，需要用户适应新的蓝色焦点（原来是黄色）

**Approach B: Apple 结构 + 保留色彩身份**

* How: 采用 Apple 的结构模式（圆角、间距、字体栈、缓动曲线、阴影层次）但保留部分色彩身份 — 淡化但保留背景的微妙色彩光晕，保留天蓝 accent（调低饱和度接近 Apple teal），焦点仍用蓝色但略偏天蓝
* Pros: 既有 Apple 的精致感，又保持应用独特性
* Cons: 不够"纯正"，混合风格可能略微不一致

**Approach C: 仅结构优化，保留配色**

* How: 只更新圆角、间距、字体栈、阴影、缓动曲线为 Apple 规范，完全保留现有配色方案（蓝绿边框、黄色焦点、天蓝 accent）
* Pros: 改动最小，视觉风险低
* Cons: 无法实现 Apple 风格的"柔和低饱和度"感，配色仍是非 Apple 的

## Decision (ADR-lite)

**Context**: 需要从当前 "Night Sky" 暗色玻璃态升级为 Apple 设计语言风格。有三种方案：纯正 Apple / 混合 / 仅结构。

**Decision**: 选择方案 A — Apple 纯正风格。完全采用 Apple HIG 深色模式规范。

**Consequences**:
* 获得最接近 macOS/Xcode 的原生体验
* 焦点色从黄色变为 Apple 蓝（身份转变，但更符合 Apple 语言）
* 背景失去彩色光晕，改为近黑纯色 + 材质层叠
* 边框从青色调变为中性白低透明度

## Requirements (evolving)

* 参考 Apple HIG / macOS / Apple.com 的设计语言优化配色、圆角、间距、字体
* 保持暗色主题，提升精致度
* 不改变布局结构和交互逻辑

## Acceptance Criteria

* [ ] `styles.css` 变量更新为 Apple 色值（背景、面板、边框、文字、强调色、系统色）
* [ ] 背景改为近黑渐变 `#1D1D1F → #000`，去掉彩色径向光晕
* [ ] 字体栈更新：sans 链 `-apple-system → Segoe UI → Noto Sans SC`，mono 链 `SF Mono → Cascadia Code → Consolas`
* [ ] 圆角调整：sm:5px, md:10px, lg:12px
* [ ] 边框统一为中性白 `rgba(255,255,255,0.08/0.14)`
* [ ] 焦点色从黄色改为 Apple 蓝 `#0A84FF`
* [ ] 强调色从天蓝改为 Apple 系统蓝 `#0A84FF`
* [ ] hover 状态改为中性白高亮（非强调色）
* [ ] 玻璃态增强：`backdrop-filter: blur(20-30px) saturate(150-180%)`
* [ ] 缓动曲线更新为 `cubic-bezier(0.22, 1, 0.36, 1)`
* [ ] 所有组件 `.module.css` 适配新变量，无硬编码旧色值
* [ ] 帮助覆盖层视觉与整体统一
* [ ] 现有功能（终端、笔记、快捷键）不受影响
* [ ] 现有测试通过

## Definition of Done

* 所有 CSS 变量在 `styles.css` 中更新
* 所有组件 `.module.css` 适配新变量
* 视觉一致性：所有组件风格统一
* 现有测试通过
* 在 Tauri 桌面窗口中验证视觉效果

## Out of Scope (explicit)

* 布局结构变更（grid 列数、行高计算等）
* 交互逻辑变更
* 引入外部 UI 框架
* 亮色模式/主题切换功能
* 组件重构（纯 CSS 变更）

## Technical Notes

* 受影响 CSS 文件共 8 个：
  - `src/styles.css` — 全局变量和重置
  - `src/components/App.module.css` — shell/header/buttons
  - `src/components/WorkspaceCanvas.module.css` — canvas 容器
  - `src/components/RowView.module.css` — 行卡片
  - `src/components/TerminalCell.module.css` — 终端单元格
  - `src/components/NotesCell.module.css` — 笔记单元格
  - `src/components/HelpOverlay.module.css` — 帮助覆盖层
* xterm.js 的样式由 `@xterm/xterm/css/xterm.css` 控制，可能需要覆盖部分变量
* Apple 签名缓动：`cubic-bezier(0.22, 1, 0.36, 1)` (spring-out)
* 玻璃态增强：`backdrop-filter: blur(20-30px) saturate(150-180%)`
