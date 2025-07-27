// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
    // הפלאגין של Monaco הוסר מכיוון שאנו משתמשים ב-CodeMirror 6
  ],
  base: './', // Use relative paths for Electron compatibility
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure assets use relative paths
    rollupOptions: {
      output: {
        // This ensures that all assets use relative paths
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  }
  // אופציונלי: אם נתקלים בבעיות עם Worker, ייתכן שנצטרך להוסיף הגדרות אופטימיזציה
  // optimizeDeps: {
  //   exclude: ['@codemirror/*'] // דוגמה, ייתכן שלא נחוץ
  // }
});