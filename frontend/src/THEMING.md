# Torah-IDE Theme Architecture

## Overview

The theme system derives **50+ CSS variables** from **5 master colors**.
Every component consumes `var(--theme-*)` tokens — never raw hex literals.

```
5 Master Colors
      │
      ▼
themeEngine.js  (generateAllColorsFromMasters)
      │
      ▼
50+ CSS Variables applied to :root
      │
      ▼
Components read via  var(--theme-*)
```

## File Roles

| File | Role |
|------|------|
| `src/theme/themeEngine.js` | **Single source of truth.** All color generation, utilities, presets, and defaults live here. |
| `src/hooks/useThemeSettings.js` | React hook. Loads masters from `localStorage`, calls `generateAllColorsFromMasters()`, writes CSS variables to `document.documentElement.style`. |
| `src/components/DesignSettings.jsx` | Settings UI. Imports presets and defaults from `themeEngine.js`. Lets users pick master colors and preview results. |
| `src/index.css` | Pre-JS fallback `:root` variables. Shown for the first paint before React hydrates. **Not** the source of truth. |
| `src/ProfessionalBlackTheme.css` | Structural overrides (flat corners, no glass/blur, CodeMirror theme). **Must never define CSS variables.** |

## The 5 Master Colors

| Variable | Default (VS Code Dark+) | Purpose |
|----------|------------------------|---------|
| `--master-bg-main` | `#1e1e1e` | Primary background (sidebar, panels) |
| `--master-bg-secondary` | `#252526` | Secondary surfaces (tabs, cards) |
| `--master-accent` | `#007acc` | Brand / accent color |
| `--master-text` | `#cccccc` | Primary text |
| `--master-border` | `#3c3c3c` | Border color |

## Key Derived Variables

### Backgrounds
- `--theme-bg-primary` / `--theme-bg-secondary` — main surface
- `--theme-page-bg` — page body (`darkenColor(main, 0.02)`)
- `--theme-editor-bg` — editor area (`lightenColor(main, 0.06)`)
- `--theme-toolbar-bg`, `--theme-tab-bg`, `--theme-bg-tertiary`, `--theme-bg-quaternary`

### Interactive Surfaces
- `--theme-button-bg`, `--theme-button-hover-bg`
- `--theme-input-bg`
- `--theme-hover-bg` — accent with 14% alpha

### Text
- `--theme-text-primary` — main text
- `--theme-text-secondary` — muted text
- `--theme-text-tertiary` — dimmed text
- `--theme-editor-text` — adaptive: `#ffffff` (dark) / `#000000` (light)
- `--theme-sidebar-text` — adaptive sidebar text

### Accent
- `--theme-accent-primary` — main accent
- `--theme-accent-secondary` — lighter accent
- `--theme-accent-hover` — hover state

### Borders
- `--theme-border-color` — standard border
- `--theme-border-strong` — stronger border

### Status Colors
- `--theme-error-color`, `--theme-error-bg`, `--theme-error-text`, `--theme-error-border`
- `--theme-warning-color`, `--theme-warning-bg`, `--theme-warning-text`, `--theme-warning-border`
- `--theme-success-color`, `--theme-success-bg`, `--theme-success-text`, `--theme-success-border`

### Semantic
- `--theme-highlight-accent` — highlighted text / links
- `--theme-custom-color` — decorative accent (purple)

### Scrollbar
- `--theme-scrollbar-thumb`, `--theme-scrollbar-track`, `--theme-scrollbar-thumb-hover`

## Light / Dark Adaptation

`themeEngine.js` calls `isLightColor(main)` to detect whether the primary
background is light or dark. Status colors, text colors, and tinted
backgrounds all switch automatically — no `@media (prefers-color-scheme)`
needed.

## Rules

1. **Never hardcode hex colors in components.** Always use `var(--theme-*)`.
2. **Never define CSS variables in `ProfessionalBlackTheme.css`.** That file
   is for structural overrides only.
3. **All color logic lives in `themeEngine.js`.** If you need a new derived
   color, add it to `generateAllColorsFromMasters()`.
4. **Keep `index.css` `:root` in sync** as a fallback, but treat
   `themeEngine.js` as authoritative.
5. **Bump `THEME_VERSION`** whenever the generated variable set changes, so
   stale `localStorage` caches are discarded.

## How To: Add a New CSS Variable

1. Open `src/theme/themeEngine.js`.
2. Add the variable to the return object of `generateAllColorsFromMasters()`.
   Derive it from the 5 masters using the utility functions (`lightenColor`,
   `darkenColor`, `withAlpha`, `isLightColor`).
3. Add the same variable (with a sensible default) to the `:root` block in
   `src/index.css` for pre-JS fallback.
4. Bump `THEME_VERSION`.
5. Use `var(--theme-your-new-var)` in your component.

## How To: Create a New Theme Preset

1. Open `src/theme/themeEngine.js`.
2. Add a new entry to the `themePresets` array:
   ```js
   {
     id: 'my-preset',
     name: 'שם בעברית',
     description: 'תיאור קצר',
     icon: '🎨',
     colors: {
       '--master-bg-main': '#...',
       '--master-bg-secondary': '#...',
       '--master-accent': '#...',
       '--master-text': '#...',
       '--master-border': '#...',
     },
   }
   ```
3. The preset will automatically appear in `DesignSettings.jsx`.

## Variable Naming Convention

```
--theme-{category}-{modifier}
```

- **category**: `bg`, `text`, `accent`, `border`, `button`, `error`, `warning`, `success`, `scrollbar`
- **modifier**: `primary`, `secondary`, `tertiary`, `hover`, `color`, `light`

Examples: `--theme-bg-primary`, `--theme-text-secondary`, `--theme-accent-hover`
