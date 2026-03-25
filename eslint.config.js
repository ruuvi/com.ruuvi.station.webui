import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/**/*.{js,jsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
        },
        settings: {
            react: { version: "detect" },
        },
        rules: {
            // React
            "react/jsx-uses-react": "error",
            "react/jsx-uses-vars": "error",
            "react/no-deprecated": "warn",
            "react/jsx-no-target-blank": "warn",

            // Hooks
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // General quality
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "no-console": "warn",
            "eqeqeq": ["warn", "smart"],
            "no-debugger": "error",
            "no-duplicate-imports": "error",
        },
    },
    {
        ignores: ["build/**", "node_modules/**", "public/**"],
    },
];
