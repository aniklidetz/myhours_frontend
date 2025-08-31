// eslint.config.mjs - JavaScript Only Configuration
import js from '@eslint/js';
import globals from 'globals';
import pluginReact from 'eslint-plugin-react';
import pluginReactNative from 'eslint-plugin-react-native';
import pluginReactHooks from 'eslint-plugin-react-hooks';

export default [
  // Apply to all JavaScript and JSX files
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.es2021,
        // React Native globals
        __DEV__: 'readonly',
        // React Native doesn't need to import Alert, it's global
        Alert: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
      },
    },
    plugins: {
      react: pluginReact,
      'react-native': pluginReactNative,
      'react-hooks': pluginReactHooks,
    },
    rules: {
      // Base JavaScript rules
      ...js.configs.recommended.rules,
      
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX Transform
      'react/prop-types': 'warn', // Warn about missing prop-types
      'react/no-unescaped-entities': 'warn',
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // React Hooks rules - KEEP CRITICAL
      'react-hooks/rules-of-hooks': 'error', // Critical - must be error
      'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies

      // React Native rules - Relaxed for development
      'react-native/no-raw-text': 'warn',
      'react-native/no-color-literals': 'off',
      'react-native/no-inline-styles': 'off',
      'react-native/sort-styles': 'off',

      // General JavaScript rules
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Allow console.log for React Native
      'no-debugger': 'warn',
      'no-undef': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  
  // Special rules for test files
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'off',
      'react-native/no-raw-text': 'off',
    },
  },
  
  // Special rules for configuration files
  {
    files: ['*.config.{js,mjs}', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];