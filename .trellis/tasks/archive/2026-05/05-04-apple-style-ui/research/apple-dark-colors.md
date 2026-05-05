# Research: Apple Dark Mode Color Palette

- **Query**: Apple HIG dark mode colors, macOS dark theme colors, Apple.com dark design patterns
- **Scope**: External (Apple HIG, macOS system colors, Apple.com patterns)
- **Date**: 2026-05-04

## Findings

### Apple HIG Dark Mode Color System

Apple's dark mode uses a **layered surface system** with semantic background levels. The key principle: darker backgrounds at the base, progressively lighter surfaces elevated above.

#### Background Layers (macOS Dark Appearance)

| Layer | macOS Semantic Name | Approximate Hex | Usage |
|-------|-------------------|-----------------|-------|
| Base | `windowBackgroundColor` (dark) | `#1E1E1E` | Main window background |
| Content | `controlBackgroundColor` (dark) | `#2B2B2B` | Content views, table backgrounds |
| Elevated | `windowBackgroundColor` + vibrancy | `#323232` | Floating panels, popovers |
| Header/Toolbar | `headerTextColor` bg variant | `#282828` | Title bars, toolbar area |
| Sidebar | `controlBackgroundColor` (dark, vibrancy) | `rgba(30, 30, 30, 0.85)` | Sidebar with vibrancy |

#### Label Colors (Dark Mode)

| Semantic Name | Hex (Dark) | Opacity | Usage |
|---------------|-----------|---------|-------|
| `labelColor` (primary) | `#FFFFFF` | 1.0 | Primary text, headings |
| `secondaryLabelColor` | `#FFFFFF` | 0.55 | Secondary text, subtitles |
| `tertiaryLabelColor` | `#FFFFFF` | 0.25 | Placeholder, disabled text |
| `quaternaryLabelColor` | `#FFFFFF` | 0.10 | Barely visible labels, watermark |

#### Separator Colors (Dark Mode)

| Element | Hex | Opacity | Notes |
|---------|-----|---------|-------|
| `separatorColor` | `#FFFFFF` | 0.10 | Thin 1px dividers |
| Grid lines (table) | `#FFFFFF` | 0.06 | Very subtle |
| Group border | `#FFFFFF` | 0.08 | Group box outlines |

#### System Colors (Dark Mode)

| Color | Light Mode Hex | Dark Mode Hex | Notes |
|-------|---------------|---------------|-------|
| Blue (accent) | `#007AFF` | `#0A84FF` | Slightly brighter in dark mode |
| Green | `#34C759` | `#30D158` | System green, success |
| Red | `#FF3B30` | `#FF453A` | System red, destructive |
| Orange | `#FF9500` | `#FF9F0A` | Warning |
| Yellow | `#FFCC00` | `#FFD60A` | Attention |
| Purple | `#AF52DE` | `#BF5AF2` | Creative, features |
| Pink | `#FF2D55` | `#FF375F` | Accent |
| Teal | `#5AC8FA` | `#64D2FF` | Informational |
| Indigo | `#5856D6` | `#5E5CE6` | Focus ring, selection |

#### Focus Ring / Accent Color

- macOS accent color: configurable by user, default is Blue `#0A84FF`
- Focus ring: 2px outline with 2px offset, color matches accent
- Focus ring appearance: `#0A84FF` with slight outer glow
- In dark mode, focus rings use a subtle white outer halo for visibility

### macOS Sonoma / Sequoia Dark Appearance Refinements

Starting with macOS Sonoma (13+) and continuing in Sequoia (15+):

- **Materials** are the primary background system, not flat colors
- `NSVisualEffectView` with `.underWindowBackground` for sidebar vibrancy
- Window backgrounds use `NSVisualEffectView` with `.behindWindow` blending
- Toolbar area: slightly lighter than content area, subtle material blur
- Card surfaces: semi-transparent white (`rgba(255, 255, 255, 0.05)`) over dark base
- Rounded corners on windows: **10px** (macOS standard window radius)

### Xcode Dark Theme Reference

Xcode's dark theme provides a developer-facing reference:

| Element | Hex | Notes |
|---------|-----|-------|
| Editor background | `#292A30` | Slightly warm dark |
| Sidebar background | `#2D2D2D` with vibrancy | Material-based |
| Header bar | `#333338` | Toolbar area |
| Selection (unfocused) | `rgba(255, 255, 255, 0.08)` | Subtle highlight |
| Selection (focused) | `#0A84FF` at 40% | Blue highlight |
| Line numbers | `#7A7A7C` | Muted text |
| Active line highlight | `rgba(255, 255, 255, 0.04)` | Barely visible |
| Cursor | `#FFFFFF` | Pure white |

### Apple.com Dark Patterns (2024-2026)

Apple.com product pages (e.g., MacBook, iPhone) use:

- Background: `#000000` or near-black `#111111` / `#161617`
- Hero sections: pure black with subtle gradient overlays
- Card backgrounds: `#1D1D1F` (Apple's signature near-black)
- Text: `#F5F5F7` (slightly warm white) for primary, `#86868B` for secondary
- Dividers: `rgba(255, 255, 255, 0.08)` (barely visible)
- Accent links: `#2997FF` (Apple's signature blue)
- Subtle gradient: `linear-gradient(to bottom, #1D1D1F, #000000)`

### Mapping to CSS Custom Properties

Based on current `styles.css` token mapping:

| Current Token | Current Value | Apple Equivalent | Proposed Value |
|---------------|--------------|------------------|----------------|
| `--bg-top` | `#082f49` (deep blue) | Near-black base | `#1D1D1F` |
| `--bg-bottom` | `#020617` (near-black) | Pure black | `#000000` |
| `--panel` | `rgba(15, 23, 42, 0.88)` | Semi-transparent dark | `rgba(30, 30, 30, 0.88)` |
| `--panel-hover` | `rgba(15, 23, 42, 0.94)` | Slightly lighter | `rgba(40, 40, 40, 0.94)` |
| `--panel-border` | `rgba(125, 211, 252, 0.18)` | White separator | `rgba(255, 255, 255, 0.08)` |
| `--panel-border-hover` | `rgba(125, 211, 252, 0.32)` | Brighter separator | `rgba(255, 255, 255, 0.14)` |
| `--focus` | `#facc15` (yellow) | Apple blue focus | `#0A84FF` |
| `--focus-glow` | `rgba(250, 204, 21, 0.35)` | Blue glow | `rgba(10, 132, 255, 0.25)` |
| `--text-main` | `#e2e8f0` | White primary label | `rgba(255, 255, 255, 0.85)` |
| `--text-muted` | `#94a3b8` | White secondary label | `rgba(255, 255, 255, 0.55)` |
| `--text-bright` | `#f1f5f9` | White primary label | `#FFFFFF` |
| `--accent` | `#38bdf8` (sky blue) | Apple system blue | `#0A84FF` |
| `--accent-dim` | `rgba(56, 189, 248, 0.15)` | Blue tint | `rgba(10, 132, 255, 0.12)` |
| `--accent-muted` | `rgba(56, 189, 248, 0.5)` | Blue medium | `rgba(10, 132, 255, 0.40)` |
| `--success` | `#4ade80` | Apple system green | `#30D158` |
| `--danger` | `#f87171` | Apple system red | `#FF453A` |
| `--danger-dim` | `rgba(248, 113, 113, 0.15)` | Red tint | `rgba(255, 69, 58, 0.12)` |
| `--surface` | `rgba(30, 41, 59, 0.6)` | Elevated surface | `rgba(255, 255, 255, 0.06)` |

### New Tokens to Add

```css
/* Apple-style label hierarchy */
--label-primary: rgba(255, 255, 255, 0.85);
--label-secondary: rgba(255, 255, 255, 0.55);
--label-tertiary: rgba(255, 255, 255, 0.25);

/* Apple-style separator */
--separator: rgba(255, 255, 255, 0.08);
--separator-strong: rgba(255, 255, 255, 0.14);

/* Apple system colors (dark mode) */
--system-blue: #0A84FF;
--system-green: #30D158;
--system-red: #FF453A;
--system-orange: #FF9F0A;
--system-yellow: #FFD60A;
--system-purple: #BF5AF2;
--system-teal: #64D2FF;
--system-indigo: #5E5CE6;

/* Material-inspired backgrounds */
--material-thin: rgba(255, 255, 255, 0.03);
--material-regular: rgba(255, 255, 255, 0.06);
--material-thick: rgba(255, 255, 255, 0.10);
```

### Background Approach Change

Current: gradient-based background with colored radials (`--bg-top` to `--bg-bottom` with blue/yellow accents)

Apple approach: flat near-black with subtle material layers on top. The gradient should be replaced with a solid or near-solid dark base, with visual depth achieved through layered semi-transparent surfaces rather than colored gradients.

Proposed body background:
```css
background: linear-gradient(160deg, #1D1D1F 0%, #000000 100%);
/* No colored radial accents -- depth comes from material layers */
```

## Caveats / Not Found

- Exact macOS system color values vary slightly between macOS versions (Ventura vs Sonoma vs Sequoia). Values above are representative of macOS 14-15.
- Apple.com product page colors are not formally documented -- they are extracted from the live site and may change with redesigns.
- The vibrancy/material effect in macOS is achieved through `NSVisualEffectView` with real-time blur compositing. In a web app (even Tauri), `backdrop-filter: blur()` provides a partial approximation but lacks the full material compositing of native macOS.
- User-configurable accent color in macOS System Settings means the "system blue" is a default, not a fixed value.
- Xcode color values are approximate and may differ between Xcode versions.

## Reference Sources

1. **Apple HIG - Dark Mode**: https://developer.apple.com/design/human-interface-guidelines/dark-mode (official color specifications)
2. **Apple HIG - Color**: https://developer.apple.com/design/human-interface-guidelines/color (system color definitions)
3. **macOS NSColor Catalog**: System-defined semantic colors with dark/light appearance variants
4. **Apple.com product pages**: https://www.apple.com/macbook-pro/ (live dark design reference, 2024-2026)
5. **WWDC22 "Implement App Colors"**: Session on semantic color adoption in macOS/iOS
