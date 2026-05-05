# Research: Apple Typography & Spacing

- **Query**: Apple SF Pro font system, macOS typography, font sizes/weights, spacing rhythm, font stack for web
- **Scope**: External (Apple HIG, macOS typography system)
- **Date**: 2026-05-04

## Findings

### SF Pro Font Family

Apple's system font is **SF Pro** (San Francisco), used across macOS, iOS, and iPadOS. It has two variants:

- **SF Pro Text**: For body text (sizes 19pt and below). Tighter letter spacing.
- **SF Pro Display**: For headings and large text (sizes 20pt and above). Wider letter spacing.

#### Key Font Weights Available

| Weight Name | CSS Value | Usage |
|-------------|-----------|-------|
| Ultralight | 100 | Rarely used, display headlines |
| Thin | 200 | Large display text |
| Light | 300 | Body text in some contexts |
| Regular | 400 | Default body text |
| Medium | 500 | Emphasized body, labels |
| Semibold | 600 | Subheadings, button text, navigation |
| Bold | 700 | Headings, strong emphasis |
| Heavy | 800 | Large display headings |

#### macOS Default Text Styles (Dark Mode)

| Text Style | Font | Size | Weight | Line Height | Letter Spacing | Usage |
|------------|------|------|--------|-------------|----------------|-------|
| Title 1 | SF Pro Display | 28pt | Bold (700) | 34pt | 0.36px | Window titles |
| Title 2 | SF Pro Display | 22pt | Bold (700) | 28pt | 0.35px | Section headings |
| Title 3 | SF Pro Display | 20pt | Semibold (600) | 25pt | 0.38px | Subsection headings |
| Headline | SF Pro Text | 17pt | Semibold (600) | 22pt | -0.41px | Group headers |
| Body | SF Pro Text | 17pt | Regular (400) | 22pt | -0.41px | Main body text |
| Callout | SF Pro Text | 16pt | Regular (400) | 21pt | -0.32px | Secondary body text |
| Subhead | SF Pro Text | 15pt | Regular (400) | 20pt | -0.24px | Subheadings |
| Footnote | SF Pro Text | 13pt | Regular (400) | 18pt | -0.08px | Captions, metadata |
| Caption 1 | SF Pro Text | 12pt | Regular (400) | 16pt | 0px | Table cells, labels |
| Caption 2 | SF Pro Text | 11pt | Regular (400) | 13pt | 0.07px | Small labels |

### Font Stack for Web (Targeting Apple Aesthetic on Windows)

Since SF Pro is not installed on Windows by default, a fallback chain is needed:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "SF Pro Display",
  "Segoe UI",
  Roboto,
  "Noto Sans",
  "Noto Sans SC",
  "Microsoft YaHei",
  Helvetica,
  Arial,
  sans-serif,
  "Apple Color Emoji",
  "Segoe UI Emoji";
```

**Rationale for this order:**
1. `-apple-system` / `BlinkMacSystemFont` -- On macOS/iOS, these resolve to SF Pro automatically
2. `"SF Pro Text"` / `"SF Pro Display"` -- If SF Pro is installed manually on Windows (some developers do this)
3. `"Segoe UI"` -- Windows system font; clean, modern, similar x-height to SF Pro. Best Windows match.
4. `Roboto` -- Android/Chrome OS system font; similar proportions
5. `"Noto Sans"` / `"Noto Sans SC"` / `"Microsoft YaHei"` -- CJK fallback (important for this project)
6. `Helvetica`, `Arial` -- Classic fallbacks

**Monospace font stack** (for terminal, code, notes):
```css
font-family:
  "SF Mono",
  ui-monospace,
  "Cascadia Code",
  "JetBrains Mono",
  "Fira Code",
  Consolas,
  "Courier New",
  monospace;
```

**Note on current project:** The current stack is `"Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif`. Updating to the fuller Apple-style stack adds `-apple-system` for Mac users and broader fallback coverage. `"Segoe UI"` is already present and is the correct Windows choice.

### Typography Mapping for This Project

Mapping Apple text styles to the app's UI elements:

| App Element | Apple Text Style | Proposed Size | Weight | CSS |
|-------------|-----------------|---------------|--------|-----|
| Header title (`.headerTitle`) | Title 3 | 20px | Semibold | `600` |
| Eyebrow label | Caption 1 + uppercase | 12px | Medium | `500` |
| Status text | Caption 1 | 12px | Regular | `400` |
| Cell label | Subhead | 15px | Medium | `500` |
| Row title | Headline | 15px | Semibold | `600` |
| Button text | Callout | 14px | Medium | `500` |
| Body/textarea | Body | 15px | Regular | `400` |
| Status label (monospace) | Footnote | 11px | Regular | `400` |
| Error text | Footnote | 13px | Regular | `400` |
| Help panel title | Title 2 | 22px | Bold | `700` |
| Help shortcut desc | Body | 15px | Regular | `400` |
| Help kbd | Caption 1 | 12px | Medium | `500` |

### Apple's Spacing System

Apple does not publicly define a strict pixel grid like Google's Material Design 4dp/8dp system. However, analysis of macOS UI reveals a **4pt base unit** with common multiples:

#### Spacing Rhythm

| Value | Usage | Frequency |
|-------|-------|-----------|
| 2px | Tight internal padding, icon gaps | Special cases |
| 4px | Icon-to-label gap, checkbox padding | Base unit |
| 8px | Button internal padding, list item padding | Very common |
| 12px | Content inset from card edge, group gap | Common |
| 16px | Section spacing, sidebar padding | Standard |
| 20px | Large section gap | Section breaks |
| 24px | Window content margin from edge | Window margins |
| 32px | Major section separation | Rare |

#### macOS Toolbar / Header Spacing

- Toolbar height: approximately **52px** (including 1px bottom border)
- Toolbar horizontal padding: **12-16px** from window edge
- Toolbar item spacing: **8px** between buttons
- Toolbar icon size: **18x18px** standard, **24x24px** large

#### macOS Sidebar Spacing

- Sidebar width: **200-260px** typical
- Sidebar top padding: **12px** (below title bar)
- Sidebar item height: **28px**
- Sidebar item padding: **8px horizontal**, icon-to-label gap **8px**
- Sidebar section gap: **16px**

#### Card / Content Spacing

- Card inner padding: **12-16px**
- Card-to-card gap: **8-12px**
- Group box padding: **12px** (inner) from border
- Table row height: **24-28px** for compact, **32px** for comfortable

### Letter Spacing Patterns

Apple's approach to letter spacing (tracking):

- **Negative tracking** on body-sized text (17pt and below): -0.41px to 0px
- **Slight positive tracking** on uppercase labels and small caps: +0.06em to +0.14em
- **Zero tracking** on monospace / code text
- **Positive tracking** on large display text: +0.35px to +0.40px

For the project:
- Eyebrow (uppercase): `letter-spacing: 0.12em` (current `0.14em` is good, slightly reduce)
- Body text: `letter-spacing: -0.01em` to `0` (subtle negative)
- Labels: `letter-spacing: 0` to `0.02em`
- Monospace status: `letter-spacing: 0` (current `0.02em` is fine)

### Line Height Ratios

Apple's system uses approximately **1.28-1.35x** line height relative to font size for body text, and **1.2-1.25x** for headings:

| Font Size | Apple Line Height | Ratio |
|-----------|------------------|-------|
| 28px | 34px | 1.21 |
| 22px | 28px | 1.27 |
| 17px | 22px | 1.29 |
| 15px | 20px | 1.33 |
| 13px | 18px | 1.38 |
| 12px | 16px | 1.33 |

Recommended `line-height` for CSS:
- Headings: `1.2` to `1.25`
- Body text: `1.4` to `1.5`
- Code/monospace: `1.5` to `1.6`

### Mapping to CSS Custom Properties

Proposed new typography tokens:

```css
/* Font families */
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
             Roboto, "Noto Sans", "Noto Sans SC", "Microsoft YaHei",
             Helvetica, Arial, sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji";
--font-mono: "SF Mono", ui-monospace, "Cascadia Code", "JetBrains Mono",
             "Fira Code", Consolas, "Courier New", monospace;

/* Font sizes (Apple text style scale) */
--text-caption2: 11px;
--text-caption1: 12px;
--text-footnote: 13px;
--text-subhead: 15px;
--text-callout: 14px;
--text-body: 15px;
--text-headline: 17px;
--text-title3: 20px;
--text-title2: 22px;
--text-title1: 28px;

/* Spacing (4px base) */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

## Caveats / Not Found

- SF Pro is Apple's proprietary font. It is not freely redistributable. For a web app targeting Windows, Segoe UI is the best fallback and is already installed.
- If exact Apple fidelity is critical, consider licensing SF Pro or using the open-source **Inter** font (similar metrics, designed by Rasmus Andersson) as a web-safe alternative that closely matches SF Pro's proportions.
- Apple's spacing is not officially documented as a grid system -- the 4pt base is inferred from measuring actual macOS UI and is consistent with Apple's layout guidelines in Xcode storyboards.
- CJK text (Chinese characters) will use the CJK fallback fonts and have different metrics than Latin text. The current `Noto Sans SC` / `Microsoft YaHei` fallbacks are appropriate.
- Apple's text styles use `-apple-system` font feature flags for tabular vs proportional numbers, which cannot be replicated with non-SF fonts.

## Reference Sources

1. **Apple HIG - Typography**: https://developer.apple.com/design/human-interface-guidelines/typography (official text style definitions)
2. **Apple HIG - SF Symbols / Font**: https://developer.apple.com/sf-symbols/ (SF Pro family details)
3. **macOS NSText Style Guide**: System text style constants in AppKit
4. **WWDC19 "Introducing the New Mac Font"**: Session detailing SF Pro implementation in macOS
5. **SF Pro Font Family Specimen**: Available from Apple's developer download page
6. **Inter Font**: https://rsms.me/inter/ -- closest open-source match to SF Pro
