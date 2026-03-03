// frontend/src/hooks/useThemeSettings.js
import { useState, useEffect } from 'react';
import {
  generateAllColorsFromMasters,
  defaultMasters,
  THEME_VERSION,
} from '../theme/themeEngine';

const THEME_STORAGE_KEY = 'torah-ide-theme-settings';

// Generate default theme from the shared engine
const defaultTheme = generateAllColorsFromMasters(defaultMasters);

export const useThemeSettings = () => {
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        const isWrapped = parsed && typeof parsed === 'object' && parsed.theme;
        const payload = isWrapped ? parsed : { version: null, theme: parsed };
        if (payload.version === THEME_VERSION && payload.theme && typeof payload.theme === 'object') {
          setCurrentTheme({ ...defaultTheme, ...payload.theme });
        }
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
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ version: THEME_VERSION, theme: updatedTheme })
      );
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
