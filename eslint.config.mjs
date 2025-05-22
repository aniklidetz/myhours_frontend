// eslint.config.mjs
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactNative from 'eslint-plugin-react-native';
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default defineConfig([
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
    plugins: {
      js,
      react: pluginReact,
      'react-native': pluginReactNative,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      // Disable strict rules that hinder development
      'react-native/no-raw-text': 'off', // Temporarily disabled until we address the issue
      'react-native/no-color-literals': 'warn', // Show a warning instead of an error
      'react-native/no-inline-styles': 'warn', // Show a warning instead of an error
      'react-native/sort-styles': 'warn', // Show a warning instead of an error

      // React rules
      'react/react-in-jsx-scope': 'off', // Not required in newer versions of React
      'react/prop-types': 'warn', // Warn about missing PropTypes
      'react/no-unescaped-entities': 'warn', // Show a warning instead of an error

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error', // Validate the rules of hooks
      'react-hooks/exhaustive-deps': 'warn', // Validate effect dependencies

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-require-imports': 'warn', // Prefer import over require
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },
  // TypeScript configuration
  ...tseslint.configs.recommended,
  // Disable some TypeScript rules for JavaScript files
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Additional rules for tests
  {
    files: ['**/*.test.{js,ts,jsx,tsx}', '**/__tests__/**/*.{js,ts,jsx,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-native/no-raw-text': 'off',
    },
  },
]);