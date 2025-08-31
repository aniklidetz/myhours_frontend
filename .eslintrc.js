module.exports = {
  extends: ['prettier'],
  plugins: ['prettier', 'react', 'react-hooks', 'react-native'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
    'react-native/react-native': true,
  },
  rules: {
    'prettier/prettier': 'error',
    'react-native/sort-styles': ['error', 'asc'],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Disable PropTypes validation - explicit 0 value
    'react/prop-types': 0,
    // Basic React rules
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
