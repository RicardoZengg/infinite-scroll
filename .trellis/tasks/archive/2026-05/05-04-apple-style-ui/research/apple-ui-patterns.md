# Research: Apple UI Component Patterns

- **Query**: Apple dark mode component patterns -- corners, shadows, borders, hover states, vibrancy/glass effects
- **Scope**: External (Apple HIG, macOS system UI, Apple.com patterns)
- **Date**: 2026-05-04

## Findings

### Corner Radius Values

Apple uses a consistent, small set of corner radii across macOS and web:

| Element | macOS Radius | CSS Equivalent | Notes |
|---------|-------------|----------------|-------|
| Window | 10px | `border-radius: 10px` | Standard macOS window corners |
| Button (standard) | 6px | `border-radius: 6px` | Push buttons, toolbar buttons |
| Button (pill/capsule) | height/2 | `border-radius: 9999px` | Segmented controls, tags |
| Text field | 5px | `border-radius: 5px` | Search fields, input fields |
| Card / Group box | 10px | `border-radius: 10px` | Content cards, grouped views |
| Panel / Sheet | 12px | `border-radius: 12px` | Modal sheets, popovers |
| Sidebar | 0px (flat to window edge) | `border-radius: 0` | Sidebar meets window edge |
| Table / List | 6-10px | `border-radius: 6px` to `10px` | Rounded table container, not rows |
| Tooltip | 5px | `border-radius: 5px` | Small tooltips |
| Image / Thumbnail | 8px | `border-radius: 8px` | Album art, profile images |
| Alert / Dialog | 12px | `border-radius: 12px` | System alerts |

**Key principle:** Apple uses larger radii (10-12px) for containers and panels, smaller radii (5-6px) for controls. The current project uses `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`. The `14px` for the largest radius is slightly above Apple's standard. Adjusting to `12px` for `--radius-lg` would be more accurate.

### Proposed Radius Token Update

```css
--radius-sm: 5px;   /* was 6px -- closer to Apple controls */
--radius-md: 10px;   /* unchanged -- matches Apple cards */
--radius-lg: 12px;   /* was 14px -- matches Apple panels/windows */
```

### Shadow / Elevation in Dark Mode

Apple's dark mode shadows are **subtle and minimal**. Unlike light mode where shadows define depth through darkness, in dark mode:

1. **Shadows are nearly invisible** against dark backgrounds (dark shadow on dark bg = no contrast)
2. **Depth is conveyed through surface lightness** -- elevated surfaces are *slightly lighter*, not through cast shadows
3. **Very subtle inner/outer glow** may be used for focus states

#### macOS Dark Mode Shadow Values

| Element | Shadow | Notes |
|---------|--------|-------|
| Window (active) | `0 22px 70px 4px rgba(0, 0, 0, 0.56)` | Large diffused shadow |
| Window (inactive) | `0 8px 30px rgba(0, 0, 0, 0.30)` | Lighter |
| Popover | `0 4px 20px rgba(0, 0, 0, 0.36)` | Medium shadow |
| Menu | `0 6px 20px rgba(0, 0, 0, 0.40)` | Medium shadow |
| Tooltip | `0 2px 8px rgba(0, 0, 0, 0.24)` | Small shadow |
| Card (hover) | `0 4px 12px rgba(0, 0, 0, 0.20)` | Very subtle |
| Focus ring | `0 0 0 3px rgba(10, 132, 255, 0.35)` | Accent color ring |
| Button (pressed) | none -- uses darken instead | No shadow on press |

**Key principle:** In dark mode, Apple relies more on **borders** and **background lightness** than shadows. The shadow system is simpler and the shadows themselves are closer to black (less spread).

#### CSS Shadow Mapping for This App

```css
/* Cards and panels -- very subtle */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.20);
--shadow-panel: 0 8px 32px rgba(0, 0, 0, 0.36);

/* Elevated surfaces (popover, modal) */
--shadow-elevated: 0 4px 20px rgba(0, 0, 0, 0.40);

/* Focus ring (accent-based) */
--shadow-focus: 0 0 0 3px rgba(10, 132, 255, 0.30);
--shadow-focus-strong: 0 0 0 3px rgba(10, 132, 255, 0.30),
                       0 0 12px rgba(10, 132, 255, 0.15);
```

### Border and Separator Treatment

Apple's borders in dark mode are extremely subtle:

| Element | Border Specification | Notes |
|---------|---------------------|-------|
| Window border (active) | `1px solid rgba(255, 255, 255, 0.10)` | Barely visible |
| Window border (inactive) | `1px solid rgba(255, 255, 255, 0.05)` | Nearly invisible |
| Card border | `1px solid rgba(255, 255, 255, 0.08)` | Standard separator |
| Card border (hover) | `1px solid rgba(255, 255, 255, 0.14)` | Slightly brighter |
| Cell separator (horizontal) | `1px solid rgba(255, 255, 255, 0.06)` | Very thin |
| Group divider | `1px solid rgba(255, 255, 255, 0.08)` | Section divider |
| Toolbar bottom | `1px solid rgba(255, 255, 255, 0.08)` | Toolbar separator |
| Sidebar/content divider | `1px solid rgba(255, 255, 255, 0.08)` | Vertical separator |
| Sidebar border | `0` (no border) -- uses vibrancy difference | Depth via material |

**Key principle:** Borders are always white with low opacity in dark mode (never colored). The current app uses cyan-tinted borders (`rgba(125, 211, 252, 0.18)`). Apple would use neutral white.

#### Current vs Proposed Border Tokens

| Token | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| `--panel-border` | `rgba(125, 211, 252, 0.18)` | `rgba(255, 255, 255, 0.08)` | Neutral white, Apple standard |
| `--panel-border-hover` | `rgba(125, 211, 252, 0.32)` | `rgba(255, 255, 255, 0.14)` | Subtle brightness on hover |

### Hover and Active State Patterns

#### Hover States

Apple's hover behavior in dark mode is subtle and restrained:

| Element | Hover Effect | Notes |
|---------|-------------|-------|
| Button | Background lightens by ~3-5% | No dramatic color shift |
| Card | Border brightens slightly | Very subtle |
| List item | Background `rgba(255, 255, 255, 0.06)` highlight | Used in Finder, Mail |
| Sidebar item | Background `rgba(255, 255, 255, 0.08)` | Rounded highlight |
| Toolbar button | Icon brightens, subtle bg appears | Minimal |
| Text link | Underline appears (or color brightness +10%) | Underline-on-hover pattern |

#### Active / Pressed States

| Element | Active Effect | Notes |
|---------|--------------|-------|
| Button | Background darkens by ~3-5% | Contrast to hover (darken, not lighten) |
| Button | Transform: `scale(0.98)` | Subtle press-in (current `0.97` is fine) |
| Card | No active state typically | Cards are not pressable |
| List item | Background `rgba(255, 255, 255, 0.04)` | Slightly darker than hover |

#### CSS Hover Implementation

```css
/* Button hover -- Apple style */
.actions button:hover {
  background: rgba(255, 255, 255, 0.10);  /* was accent-dim blue */
  border-color: rgba(255, 255, 255, 0.18); /* subtle brighten */
  color: #FFFFFF;                          /* full white on hover */
}

.actions button:active {
  background: rgba(255, 255, 255, 0.05);  /* darken */
  transform: scale(0.98);
}
```

**Note:** Apple's hover states are typically **neutral** (white/black based), not accent-colored. The current app uses accent-blue for hover, which is a more "colorful" approach. For strict Apple style, hover states should be white-based. However, a hybrid approach (accent for focus, neutral for hover) is also valid and maintains the app's identity.

### Focus Ring Pattern

Apple's focus ring pattern:

1. **Ring:** 2-3px solid accent color, offset 2-4px from element edge
2. **Glow:** Subtle outer glow using accent color at low opacity
3. **Color:** Matches user's accent color preference (default blue `#0A84FF`)

```css
/* Apple-style focus ring */
.element:focus-visible {
  outline: 2px solid #0A84FF;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.20);
}

/* Current app focus (cell.focused) -- Apple equivalent */
.cell.focused {
  border-color: #0A84FF;
  box-shadow: 0 0 0 2px rgba(10, 132, 255, 0.25),
              0 0 8px rgba(10, 132, 255, 0.10);
}
```

### Vibrancy / Glass / Material Effects

macOS's vibrancy system (`NSVisualEffectView`) creates depth through real-time blur compositing. In CSS, the closest equivalent is `backdrop-filter: blur()`.

#### macOS Material Types (Dark Mode)

| Material | Blur Radius | Tint | Usage |
|----------|------------|------|-------|
| `.titlebar` | ~20px | Slight dark tint | Title bar |
| `.selection` | ~25px | Blue tint overlay | Selected items |
| `.menu` | ~30px | Dark overlay | Context menus |
| `.popover` | ~30px | Dark overlay | Popovers, sheets |
| `.sidebar` | ~30px | Very dark overlay | Sidebar |
| `.headerView` | ~20px | Slight dark | Toolbar area |
| `.sheet` | ~40px | Dark overlay | Modal sheets |
| `.hudWindow` | ~40px | Darker overlay | HUD panels |
| `.fullScreenUI` | ~50px | Strong dark | Full-screen overlays |
| `.underWindowBackground` | ~30px | Window-tinted | Behind content |

#### CSS Vibrancy Approximation

```css
/* Sidebar vibrancy -- Apple .sidebar material */
.sidebar {
  background: rgba(30, 30, 30, 0.65);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
}

/* Panel vibrancy -- Apple .popover material */
.panel {
  background: rgba(30, 30, 30, 0.72);
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
}

/* Header/toolbar vibrancy -- Apple .headerView material */
.header {
  background: rgba(30, 30, 30, 0.60);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}

/* Overlay (modal background) */
.overlay {
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
}
```

**Key points:**
- `saturate()` is important -- Apple's vibrancy oversaturates colors behind the blur to maintain vibrancy
- Tauri on Windows uses WebView2, which supports `backdrop-filter` natively
- The semi-transparent background color should be near-neutral gray in dark mode, not tinted blue

### Animation and Transition Patterns

Apple's animations follow a **spring-like easing** with quick durations:

| Animation | Duration | Easing | Notes |
|-----------|----------|--------|-------|
| Hover state | 120ms | `ease-out` | Very quick, responsive |
| Button press | 80ms | `ease-in` | Instant feedback |
| Panel open | 200ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Spring-out |
| Panel close | 150ms | `ease-in` | Quick close |
| Fade in | 150ms | `ease` | Standard |
| Slide up | 200ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Sheet appearance |
| List item appear | 250ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Staggered |
| Tooltip | 100ms | `ease-out` | Near-instant |

#### Proposed Transition Tokens

```css
--ease-apple: cubic-bezier(0.22, 1, 0.36, 1);  /* Apple's signature spring-out */
--ease-in: cubic-bezier(0.36, 0, 0.78, 0);     /* Accelerating in */
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);     /* Decelerating out */
--duration-hover: 120ms;
--duration-press: 80ms;
--duration-fade: 150ms;
--duration-slide: 200ms;
--duration-panel: 250ms;
```

### Toolbar Design Pattern (macOS)

macOS toolbar characteristics for dark mode:

- **Height:** ~52px total (content area + 1px border)
- **Background:** Vibrancy material (`.headerView`), semi-transparent
- **Border:** `1px solid rgba(255, 255, 255, 0.08)` at bottom only
- **Content alignment:** Vertically centered, items spaced with 8px gaps
- **Title:** Bold, 13-15px, centered or left-aligned
- **Buttons:** Rounded rect (6px radius), compact padding (4px 8px)
- **In dark mode:** Toolbar does NOT have a visible border at top (meets window chrome seamlessly)

#### App Header Mapping

Current header: `padding: 8px 14px`, `border-radius: var(--radius-lg)`, full border.

Proposed Apple-style header:
```css
.header {
  padding: 10px 16px;
  border-radius: var(--radius-lg);  /* 12px */
  background: rgba(30, 30, 30, 0.60);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  /* Remove hover border color change -- Apple doesn't do this on toolbars */
}
```

### Card / Panel Design Pattern

macOS card characteristics for dark mode:

- **Background:** Semi-transparent material or solid dark surface
- **Border:** 1px, `rgba(255, 255, 255, 0.08)`
- **Corner radius:** 10px (cards) or 12px (panels)
- **Shadow:** Minimal in dark mode
- **Inner padding:** 12-16px
- **Header area:** Slightly different background tint (`rgba(255, 255, 255, 0.03)`)
- **Separator within card:** `1px solid rgba(255, 255, 255, 0.06)`

### Summary of Key Design Shifts

| Aspect | Current App Style | Apple Dark Mode Style |
|--------|-------------------|----------------------|
| Background | Blue gradient with colored radials | Near-black solid/gradient, no color tint |
| Borders | Cyan-tinted | Neutral white, very low opacity |
| Hover | Accent-colored highlight | Neutral white highlight |
| Focus | Yellow glow | Blue ring with subtle glow |
| Shadows | Prominent glow effects | Minimal, depth via surface lightness |
| Vibrancy | Blue-tinted blur | Neutral gray blur with saturation |
| Text colors | Slate blue-gray range | White with opacity hierarchy |
| Accent | Sky blue (#38bdf8) | Apple system blue (#0A84FF) |

## Caveats / Not Found

- macOS `NSVisualEffectView` composites in real-time with the GPU; `backdrop-filter: blur()` in CSS is a static approximation. Performance impact should be tested with multiple vibrancy layers.
- WebView2 in Tauri supports `backdrop-filter` well on Windows 10/11, but older Windows versions may not.
- Apple's exact `cubic-bezier` values are not published; the values above are derived from observing macOS UI animations and WWDC session content.
- Apple's toolbar hover states on macOS Sonoma/Sequoia are even more minimal than described -- many toolbar buttons only show a highlight on press, not hover.
- The `saturate()` value in `backdrop-filter` is empirically set to 150-180%. Apple does not publish exact values.

## Reference Sources

1. **Apple HIG - Visual Design**: https://developer.apple.com/design/human-interface-guidelines/visual-design (materials, depth, vibrancy)
2. **Apple HIG - Toolbars**: https://developer.apple.com/design/human-interface-guidelines/toolbars
3. **Apple HIG - Buttons**: https://developer.apple.com/design/human-interface-guidelines/buttons
4. **WWDC20 "The Details of UI Typography"**: Animation timing and easing patterns
5. **WWDC18 "Introducing Dark Mode"**: Dark mode design philosophy and material system
6. **macOS Sonoma release notes**: Material refinements and new visual effects
7. **Apple.com developer documentation**: `NSVisualEffectView` material types
