// frontend/src/hooks/useThemeSettings.js
import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'torah-ide-theme-settings';

  // Smart color generation function (same as in DesignSettings)
const generateAllColorsFromMasters = (masterValues) => {
  const main = masterValues['--master-bg-main'] || '#0d1117';
  const secondary = masterValues['--master-bg-secondary'] || '#161b22'; 
  const accent = masterValues['--master-accent'] || '#30363d';
  const text = masterValues['--master-text'] || '#e6edf3';
  const border = masterValues['--master-border'] || '#30363d';

  // Detect if we're in light mode (if background is light)
  const isLightMode = isLightColor(main);

  // Smart color variations - automatically lighter/darker versions
  const lightenColor = (color, amount = 0.2) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  const darkenColor = (color, amount = 0.2) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  // Function to determine if a color is light
  function isLightColor(color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128;
  }

  // Smart text colors based on light/dark mode
  const editorTextColor = isLightMode ? '#000000' : '#ffffff';      // Pure black or white for editor
  const sidebarTextColor = isLightMode ? '#1a1a1a' : '#e6edf3';     // Near-black or light for sidebar
  const secondaryTextColor = isLightMode ? '#4a4a4a' : '#9ca3af';   // Dark gray or light gray for secondary text

  // Return ALL theme variables auto-generated from the 5 masters!
  return {
    // Store master colors
    '--master-bg-main': main,
    '--master-bg-secondary': secondary,
    '--master-accent': accent,
    '--master-text': text,
    '--master-border': border,

    // Auto-generate ALL background colors from masters
    '--theme-bg-primary': main,
    '--theme-bg-secondary': secondary,
    '--theme-page-bg': main,
    '--theme-editor-bg': main,
    '--theme-toolbar-bg': secondary,
    '--theme-tab-bg': secondary,
    '--theme-bg-tertiary': lightenColor(secondary, 0.1),

    // Auto-generate ALL interactive colors - BUTTONS USE ACCENT COLOR!
    '--theme-button-bg': accent,                    /* ALL BUTTONS use accent color */
    '--theme-button-hover-bg': lightenColor(accent, 0.2),
    '--theme-input-bg': darkenColor(secondary, 0.1),
    '--theme-hover-bg': lightenColor(accent, 0.1),
    
    // Force ALL button classes to use accent color
    '--btn-bg': accent,                            /* Force for .btn */
    '--btn-primary-bg': accent,                    /* Force for .btn-primary */
    '--btn-secondary-bg': accent,                  /* Force for .btn-secondary */
    '--btn-info-bg': accent,                       /* Force for .btn-info */
    '--btn-success-bg': accent,                    /* Force for .btn-success */
    '--btn-warning-bg': accent,                    /* Force for .btn-warning */

    // Smart text colors for different contexts
    '--theme-text-primary': text,                   // General UI text
    '--theme-text-secondary': secondaryTextColor,   // Secondary UI text
    '--theme-button-text-color': text,              // Button text
    '--theme-editor-text': editorTextColor,         // Editor content text (pure black/white)
    '--theme-sidebar-text': sidebarTextColor,       // Sidebar file/folder text (high contrast)

    // Auto-generate ALL accent colors
    '--theme-accent-primary': accent,
    '--theme-accent-secondary': lightenColor(accent, 0.3),
    '--theme-accent-color': accent,
    '--theme-accent-hover': lightenColor(accent, 0.2),

    // Auto-generate ALL status and border colors
    '--theme-border-color': border,
    '--theme-error-color': '#f85149',
    '--theme-warning-color': '#d29922', 
    '--theme-success-color': '#3fb950',

    // Auto-generate scrollbar colors
    '--theme-scrollbar-thumb': accent,
    '--theme-scrollbar-track': darkenColor(main, 0.1),
    '--theme-scrollbar-thumb-hover': lightenColor(accent, 0.2)
  };
};

// Default master colors
const defaultMasters = {
  '--master-bg-main': '#0d1117',
  '--master-bg-secondary': '#161b22',
  '--master-accent': '#161B22',
  '--master-text': '#e6edf3',
  '--master-border': '#161B22'
};

// Generate default theme from masters
const defaultTheme = generateAllColorsFromMasters(defaultMasters);

export const useThemeSettings = () => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setCurrentTheme({ ...defaultTheme, ...parsedTheme });
      } catch (error) {
        console.error('Error parsing saved theme:', error);
      }
    }
  }, []);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(currentTheme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [currentTheme]);

  const updateTheme = (newTheme) => {
    const updatedTheme = { ...currentTheme, ...newTheme };
    setCurrentTheme(updatedTheme);
    
    // Save to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updatedTheme));
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
  };

  const resetTheme = () => {
    setCurrentTheme(defaultTheme);
    localStorage.removeItem(THEME_STORAGE_KEY);
  };

  const getThemeProperty = (property) => {
    return currentTheme[property] || defaultTheme[property];
  };

  return {
    currentTheme,
    updateTheme,
    resetTheme,
    getThemeProperty
  };
};
