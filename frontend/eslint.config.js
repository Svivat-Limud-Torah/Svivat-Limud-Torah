// frontend/eslint.config.js
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";


export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  { files: ["**/*.jsx"], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },
  ...fixupConfigRules(pluginReactConfig),
  {
    rules: {
      "react/react-in-jsx-scope": "off", // לא נחוץ עם ה-runtime החדש של ריאקט
      "react/prop-types": "off" // אם אתה לא משתמש ב-PropTypes באופן קבוע
      // הוסף כאן חוקים נוספים או דריסות לפי הצורך
    }
  }
];