#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Directories to search for JS/JSX files
const searchPaths = [
  'components/**/*.js',
  'components/**/*.jsx',
  'src/components/**/*.js',
  'src/components/**/*.jsx',
  'src/contexts/**/*.js',
  'src/contexts/**/*.jsx',
  'app/**/*.js',
  'app/**/*.jsx',
];

// ESLint disable comment
const ESLINT_DISABLE_COMMENT = '/* eslint-disable react/prop-types */\n';

function addEslintDisableToFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if the disable comment is already present
    if (content.includes('/* eslint-disable react/prop-types */')) {
      console.log(`${filePath} - already has PropTypes disabled`);
      return;
    }

    // Add the disable comment at the beginning
    const newContent = ESLINT_DISABLE_COMMENT + content;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`${filePath} - PropTypes disabled`);
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
  }
}

function main() {
  console.log('Adding PropTypes disable comments to React components...\n');

  let totalFiles = 0;

  searchPaths.forEach(pattern => {
    const files = glob.sync(pattern);
    files.forEach(file => {
      totalFiles++;
      addEslintDisableToFile(file);
    });
  });

  console.log(`\nProcessed ${totalFiles} files total`);
  console.log('Run "npm run lint" to verify all PropTypes warnings are gone!');
}

main();
