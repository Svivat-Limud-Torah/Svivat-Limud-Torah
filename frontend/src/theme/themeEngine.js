/**
 * Torah-IDE Theme Engine — Single Source of Truth
 *
 * All theme color generation lives here. Both the runtime hook (useThemeSettings)
 * and the settings UI (DesignSettings) import from this module.
 *
 * Architecture:
 *   5 master colors  →  themeEngine.generateAllColorsFromMasters()  →  40+ CSS variables
 *   CSS variables     →  consumed by every component via var(--theme-*)
 *
 * See THEMING.md for full documentation.
 */

// ---------------------------------------------------------------------------
// Version — bump this string whenever the generated variable set changes
// so that stale localStorage caches are discarded.
// ---------------------------------------------------------------------------
export const THEME_VERSION = 'vscode-dark-2026-03-02-v2';

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

export function lightenColor(color, amount = 0.2) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * amount * 100);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

export function darkenColor(color, amount = 0.2) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * amount * 100);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

export function withAlpha(color, alpha = 1) {
  const raw = color.replace('#', '');
  const normalized =
    raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isLightColor(color) {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// ---------------------------------------------------------------------------
// Default master colors (VS Code Dark+)
// ---------------------------------------------------------------------------
export const defaultMasters = {
  '--master-bg-main': '#1e1e1e',
  '--master-bg-secondary': '#252526',
  '--master-accent': '#007acc',
  '--master-text': '#cccccc',
  '--master-border': '#3c3c3c',
};

// ---------------------------------------------------------------------------
// generateAllColorsFromMasters
//
// Takes the 5 master color values and derives the full set of 50+ CSS
// variables that the UI consumes.  Every component should reference
// var(--theme-*) — never a raw hex literal.
// ---------------------------------------------------------------------------
export function generateAllColorsFromMasters(masterValues) {
  const main = masterValues['--master-bg-main'] || defaultMasters['--master-bg-main'];
  const secondary = masterValues['--master-bg-secondary'] || defaultMasters['--master-bg-secondary'];
  const accent = masterValues['--master-accent'] || defaultMasters['--master-accent'];
  const text = masterValues['--master-text'] || defaultMasters['--master-text'];
  const border = masterValues['--master-border'] || defaultMasters['--master-border'];

  const lightMode = isLightColor(main);

  // Adaptive text colors
  const editorTextColor = lightMode ? '#000000' : '#ffffff';
  const sidebarTextColor = lightMode ? '#1a1a1a' : '#d6d6d6';
  const secondaryTextColor = lightMode ? '#4a4a4a' : '#b0b0b0';

  return {
    // ── Master colors (stored so the settings UI can read them back) ──
    '--master-bg-main': main,
    '--master-bg-secondary': secondary,
    '--master-accent': accent,
    '--master-text': text,
    '--master-border': border,

    // ── Backgrounds ──
    '--theme-bg-primary': main,
    '--theme-bg-secondary': main,
    '--theme-page-bg': darkenColor(main, 0.02),
    '--theme-editor-bg': lightenColor(main, 0.06),
    '--theme-toolbar-bg': main,
    '--theme-tab-bg': secondary,
    '--theme-bg-tertiary': secondary,
    '--theme-bg-quaternary': lightenColor(secondary, 0.04),

    // ── Interactive surfaces ──
    '--theme-button-bg': lightenColor(secondary, 0.02),
    '--theme-button-hover-bg': lightenColor(secondary, 0.08),
    '--theme-input-bg': darkenColor(secondary, 0.02),
    '--theme-hover-bg': withAlpha(accent, 0.14),

    // Button class aliases
    '--btn-bg': lightenColor(secondary, 0.02),
    '--btn-primary-bg': lightenColor(secondary, 0.02),
    '--btn-secondary-bg': lightenColor(secondary, 0.02),
    '--btn-info-bg': lightenColor(secondary, 0.02),
    '--btn-success-bg': lightenColor(secondary, 0.02),
    '--btn-warning-bg': lightenColor(secondary, 0.02),

    // ── Text ──
    '--theme-text-primary': text,
    '--theme-text-secondary': secondaryTextColor,
    '--theme-button-text-color': text,
    '--theme-editor-text': editorTextColor,
    '--theme-sidebar-text': sidebarTextColor,
    '--theme-text-tertiary': lightMode ? '#626262' : '#8d8d8d',

    // ── Accent / brand ──
    '--theme-accent-primary': accent,
    '--theme-accent-secondary': lightenColor(accent, 0.2),
    '--theme-accent-color': accent,
    '--theme-accent-hover': lightenColor(accent, 0.14),
    '--theme-accent-primary-transparent': withAlpha(accent, 0.2),
    '--theme-primary': accent,
    '--theme-primary-hover': lightenColor(accent, 0.1),

    // ── Borders ──
    '--theme-border-color': border,
    '--theme-border-strong': lightenColor(border, 0.08),

    // ── Status colors ──
    '--theme-error-color': lightMode ? '#d32f2f' : '#f85149',
    '--theme-warning-color': lightMode ? '#e6a700' : '#d29922',
    '--theme-success-color': lightMode ? '#2e7d32' : '#3fb950',

    // Status — light-tinted backgrounds (for inline messages)
    '--theme-error-bg': lightMode ? '#fef2f2' : withAlpha('#f85149', 0.12),
    '--theme-error-text': lightMode ? '#c53030' : '#fca5a5',
    '--theme-error-border': lightMode ? '#feb2b2' : withAlpha('#f85149', 0.35),
    '--theme-warning-bg': lightMode ? '#fffbeb' : withAlpha('#d29922', 0.12),
    '--theme-warning-text': lightMode ? '#92400e' : '#fbbf24',
    '--theme-warning-border': lightMode ? '#fcd34d' : withAlpha('#d29922', 0.35),
    '--theme-success-bg': lightMode ? '#f0fff4' : withAlpha('#3fb950', 0.12),
    '--theme-success-text': lightMode ? '#22543d' : '#68d391',
    '--theme-success-border': lightMode ? '#9ae6b4' : withAlpha('#3fb950', 0.35),

    // Status — dark-mode solid backgrounds (for prominent banners)
    '--theme-success-color-hover': lightMode ? '#276749' : darkenColor('#3fb950', 0.08),
    '--theme-success-color-light': lightMode ? '#68d391' : lightenColor('#3fb950', 0.15),

    // ── Semantic highlight ──
    '--theme-highlight-accent': lightMode ? '#0284c7' : '#7dd3fc',
    '--theme-custom-color': lightMode ? '#7c3aed' : '#8b5cf6',

    // ── Scrollbar ──
    '--theme-scrollbar-thumb': lightenColor(border, 0.06),
    '--theme-scrollbar-track': main,
    '--theme-scrollbar-thumb-hover': lightenColor(border, 0.16),
  };
}

// ---------------------------------------------------------------------------
// Theme presets
// ---------------------------------------------------------------------------
export const themePresets = [
  {
    id: 'light',
    name: 'מצב בהיר',
    description: 'עיצוב מקצועי בהיר כמו Wix',
    icon: '',
    colors: {
      '--master-bg-main': '#ffffff',
      '--master-bg-secondary': '#f8f9fa',
      '--master-accent': '#CCFBFB',
      '--master-text': '#2d3748',
      '--master-border': '#e2e8f0',
    },
  },
  {
    id: 'dark-default',
    name: 'מצב כהה קלאסי',
    description: 'עיצוב כהה בסגנון GitHub',
    icon: '',
    colors: {
      '--master-bg-main': '#171717',
      '--master-bg-secondary': '#242424',
      '--master-accent': '#cfcfcf',
      '--master-text': '#e8e8e8',
      '--master-border': '#4a4a4a',
    },
  },
  {
    id: 'dark-blue',
    name: 'מצב כהה כחול',
    description: 'עיצוב כהה עם גוונים כחולים מקצועיים',
    icon: '',
    colors: {
      '--master-bg-main': '#041028',
      '--master-bg-secondary': '#132747',
      '--master-accent': '#7faedf',
      '--master-text': '#ecf4ff',
      '--master-border': '#5f7ca7',
    },
  },
  {
    id: 'dark-warm',
    name: 'מצב כהה חם',
    description: 'עיצוב כהה עם גוונים חמים',
    icon: '',
    colors: {
      '--master-bg-main': '#1c1917',
      '--master-bg-secondary': '#292524',
      '--master-accent': '#44403c',
      '--master-text': '#f5f5f4',
      '--master-border': '#57534e',
    },
  },
  {
    id: 'dark-forest',
    name: 'מצב כהה יער',
    description: 'עיצוב כהה עם גוונים ירוקים טבעיים',
    icon: '',
    colors: {
      '--master-bg-main': '#0f1419',
      '--master-bg-secondary': '#1a2332',
      '--master-accent': '#2d4a3e',
      '--master-text': '#e6f7ff',
      '--master-border': '#3d5a50',
    },
  },
  {
    id: 'dark-charcoal',
    name: 'מצב כהה פחם',
    description: 'עיצוב כהה מינימליסטי עם אפור עמוק',
    icon: '',
    colors: {
      '--master-bg-main': '#1e1e1e',
      '--master-bg-secondary': '#2d2d2d',
      '--master-accent': '#404040',
      '--master-text': '#ffffff',
      '--master-border': '#555555',
    },
  },
];
