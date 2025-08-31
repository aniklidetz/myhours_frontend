#!/usr/bin/env node

/**
 * Migration script for LiquidGlass components refactoring
 * This script helps identify and migrate components using the old pattern
 */

const fs = require('fs');
const path = require('path');

// Patterns to identify old glass component implementations
const OLD_PATTERNS = {
  blurView: /BlurView/g,
  linearGradient: /LinearGradient/g,
  pressAnimation: /useSharedValue\(1\)|withSpring\(0\.9[0-9]/g,
  duplicatedGlassEffect: /BlurView.*[\s\S]*?LinearGradient/g,
};

// Components that need migration
const COMPONENTS_TO_MIGRATE = [
  'components/LiquidGlassInput.js',
  'components/LiquidGlassToast.js',
  'components/GlassModal.js',
  'components/GlassHeader.js',
  'components/GlassModalSelector.js',
];

// Files to check for imports that need updating
const FILES_TO_CHECK_IMPORTS = ['app/*.js', 'components/*.js', 'hooks/*.js'];

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
      filePath,
      hasBlurView: OLD_PATTERNS.blurView.test(content),
      hasLinearGradient: OLD_PATTERNS.linearGradient.test(content),
      hasPressAnimation: OLD_PATTERNS.pressAnimation.test(content),
      hasDuplicatedGlassEffect: OLD_PATTERNS.duplicatedGlassEffect.test(content),
      needsMigration: false,
    };

    analysis.needsMigration =
      analysis.hasBlurView ||
      analysis.hasLinearGradient ||
      analysis.hasPressAnimation ||
      analysis.hasDuplicatedGlassEffect;

    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

function generateMigrationReport() {
  console.log('LiquidGlass Components Migration Analysis');
  console.log('==========================================\n');

  const results = [];

  // Analyze components that need migration
  console.log('Components to migrate:');
  COMPONENTS_TO_MIGRATE.forEach(componentPath => {
    const fullPath = path.join(__dirname, '..', componentPath);
    if (fs.existsSync(fullPath)) {
      const analysis = analyzeFile(fullPath);
      if (analysis) {
        results.push(analysis);
        console.log(`\n${path.basename(componentPath)}:`);
        if (analysis.needsMigration) {
          console.log('  Status: NEEDS MIGRATION');
          if (analysis.hasBlurView) console.log('    - Has BlurView pattern');
          if (analysis.hasLinearGradient) console.log('    - Has LinearGradient pattern');
          if (analysis.hasPressAnimation) console.log('    - Has press animation pattern');
          if (analysis.hasDuplicatedGlassEffect) console.log('    - Has duplicated glass effect');
        } else {
          console.log('  Status: Already migrated or no patterns found');
        }
      }
    } else {
      console.log(`\n${path.basename(componentPath)}: FILE NOT FOUND`);
    }
  });

  // Count lines of duplicated code
  const duplicatedLines = results.reduce((acc, result) => {
    if (result.needsMigration) {
      // Estimate 20-40 lines per pattern
      let lines = 0;
      if (result.hasBlurView) lines += 30;
      if (result.hasPressAnimation) lines += 20;
      return acc + lines;
    }
    return acc;
  }, 0);

  console.log('\n\nSummary:');
  console.log('=========');
  console.log(`Total components analyzed: ${results.length}`);
  console.log(`Components needing migration: ${results.filter(r => r.needsMigration).length}`);
  console.log(`Estimated duplicated lines: ~${duplicatedLines}`);
  console.log(`Potential code reduction: ~${Math.round(duplicatedLines * 0.7)} lines\n`);

  // Generate migration commands
  console.log('Migration steps:');
  console.log('================');
  console.log('1. Ensure shared components are in place:');
  console.log('   - components/shared/GlassContainer.js');
  console.log('   - hooks/shared/useGlassPressable.js\n');

  console.log('2. For each component needing migration:');
  results
    .filter(r => r.needsMigration)
    .forEach(result => {
      const basename = path.basename(result.filePath);
      console.log(`   - Refactor ${basename}`);
      console.log(`     cp ${basename} ${basename}.backup`);
      console.log(`     # Apply refactoring patterns`);
      console.log(`     # Test the component`);
    });

  console.log('\n3. Update imports across the codebase');
  console.log('4. Run tests: npm run test');
  console.log('5. Remove backup files after verification\n');
}

// Check if shared components exist
function checkSharedComponents() {
  const sharedComponents = [
    'components/shared/GlassContainer.js',
    'hooks/shared/useGlassPressable.js',
  ];

  console.log('Checking for shared components:');
  sharedComponents.forEach(component => {
    const fullPath = path.join(__dirname, '..', component);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${component}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
  });
  console.log('');
}

// Main execution
console.log('');
checkSharedComponents();
generateMigrationReport();

console.log('To apply refactoring to a specific component, use:');
console.log('  node scripts/migrate-glass-components.js --refactor <component-name>\n');
