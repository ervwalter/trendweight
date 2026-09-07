import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";

export default tseslint.config(
  { ignores: ["dist", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    plugins: {
      vitest,
      "testing-library": testingLibrary,
      "jest-dom": jestDom,
    },
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // Tests must not be able to pass without asserting the behaviour they name
      "vitest/expect-expect": ["error", { assertFunctionNames: ["expect", "expectRedirect"] }],
      "vitest/no-conditional-expect": "error",
      "vitest/no-standalone-expect": "error",
      "vitest/no-identical-title": "error",
      "vitest/no-disabled-tests": "error",
      // Async utilities that are not awaited make a test pass before the behaviour happens
      "testing-library/await-async-utils": "error",
      "testing-library/await-async-queries": "error",
      // Assert on what the user sees, not on DOM structure or class names
      "testing-library/no-node-access": "error",
      "testing-library/no-container": "error",
      "testing-library/prefer-screen-queries": "error",
      "testing-library/no-wait-for-multiple-assertions": "error",
      "jest-dom/prefer-in-document": "error",
      "jest-dom/prefer-to-have-text-content": "error",
      "jest-dom/prefer-checked": "error",
    },
  },
  {
    files: ["src/routes/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
