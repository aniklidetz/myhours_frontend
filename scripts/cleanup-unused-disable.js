#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Files with unused eslint-disable directives (from the lint output)
const filesToCleanup = [
  'app/_layout.js',
  'app/add-employee.js',
  'app/advanced-office-settings.js',
  'app/biometric-check.js',
  'app/biometric-registration.js',
  'app/biometric-verification.js',
  'app/check-in-out.js',
  'app/edit-employee.js',
  'app/employees.js',
  'app/index.js',
  'app/modal-demo.js',
  'app/payroll.js',
  'app/team-management.js',
  'app/test-employees.js',
  'app/toast-demo.js',
  'app/worktime.js',
  'components/CustomCamera.js',
  'src/components/ProtectedRoute.js',
];

function removeUnusedEslintDisable(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Remove the eslint-disable comment if it's the first line
    if (content.startsWith('/* eslint-disable react/prop-types */\n')) {
      const cleanContent = content.replace('/* eslint-disable react/prop-types */\n', '');
      fs.writeFileSync(filePath, cleanContent, 'utf8');
      console.log(`${filePath} - removed unused eslint-disable`);
    } else {
      console.log(`${filePath} - no eslint-disable comment found at start`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
  }
}

function main() {
  console.log('Removing unused eslint-disable comments...\n');

  filesToCleanup.forEach(file => {
    removeUnusedEslintDisable(file);
  });

  console.log(`\nProcessed ${filesToCleanup.length} files`);
  console.log('Run "npm run lint" to verify cleanup worked!');
}

main();
