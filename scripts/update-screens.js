/* Script to update multiple screens with ScreenLayout component
   This script provides guidelines for manual updates */

// List of screens that need to be updated
const SCREENS_TO_UPDATE = [
  'biometric-check.js',
  'biometric-registration.js',
  'biometric-verification.js',
  'edit-employee.js',
  'employees.js',
  'worktime.js',
  'payroll.js',
  'team-management.js',
  'advanced-office-settings.js',
  'admin.js',
];

// Common replacements for all screens
const COMMON_REPLACEMENTS = {
  // Replace imports
  LiquidGlassLayout: 'ScreenLayout',
  'import LiquidGlassLayout': 'import ScreenLayout',

  // Replace SafeAreaView usage patterns
  'SafeAreaView style={[': 'View style={[',
  'SafeAreaView style={{': 'View style={{',
  ", { paddingBottom: Platform.OS === 'ios' ? ":
    ', { // Removed padding - handled by ScreenLayout:',

  // Common padding patterns to remove/update
  "paddingBottom: Platform.OS === 'ios' ? 100 : 80": '// Removed - handled by ScreenLayout',
  "paddingBottom: Platform.OS === 'ios' ? 120 : 100": '// Removed - handled by ScreenLayout',
  'paddingBottom: 80': '// Removed - handled by ScreenLayout',
  'paddingBottom: 100': '// Removed - handled by ScreenLayout',
};

// Screen-specific patterns
const SCREEN_PATTERNS = {
  // For form screens (add-employee, edit-employee, etc.)
  FORM_SCREEN: {
    wrapWithHeader: `
    const header = (
      <View>
        <HeaderBackButton destination="/employees" />
        <View style={styles.header}>
          <Text style={styles.title}>Your Title</Text>
          <Text style={styles.subtitle}>Your subtitle</Text>
        </View>
      </View>
    );
    `,

    wrapWithFooter: `
    const footer = (
      <View style={styles.buttonContainer}>
        <LiquidGlassButton
          title="Save"
          onPress={handleSave}
          variant="primary"
        />
      </View>
    );
    `,

    returnStatement: `
    return (
      <ScreenLayout 
        header={header}
        footer={footer}
        keyboardAware={true}
      >
        {/* Your content here */}
      </ScreenLayout>
    );
    `,
  },

  // For list screens (employees, worktime, etc.)
  LIST_SCREEN: {
    returnStatement: `
    return (
      <ScreenLayout>
        {/* Your content here */}
      </ScreenLayout>
    );
    `,
  },

  // For camera/full-screen screens
  FULLSCREEN_SCREEN: {
    returnStatement: `
    return (
      <ScreenLayout 
        scrollable={false}
        noPadding={true}
      >
        {/* Your content here */}
      </ScreenLayout>
    );
    `,
  },
};

// Manual update instructions
console.log(`
=== SCREEN LAYOUT UPDATE INSTRUCTIONS ===

For each screen in: ${SCREENS_TO_UPDATE.join(', ')}

1. UPDATE IMPORTS:
   - Replace: import LiquidGlassLayout from '../components/LiquidGlassLayout';
   - With: import ScreenLayout from '../components/ScreenLayout';
   - Add: import { commonStyles } from '../constants/CommonStyles';

2. REMOVE MANUAL PADDING:
   - Remove all paddingBottom that handles tab bar spacing
   - Remove SafeAreaView with bottom edge handling
   - Remove Platform-specific bottom padding calculations

3. UPDATE COMPONENT STRUCTURE:
   
   For FORM screens (add-employee, edit-employee):
   ${SCREEN_PATTERNS.FORM_SCREEN.wrapWithHeader}
   ${SCREEN_PATTERNS.FORM_SCREEN.wrapWithFooter}
   ${SCREEN_PATTERNS.FORM_SCREEN.returnStatement}

   For LIST screens (employees, worktime, payroll):
   ${SCREEN_PATTERNS.LIST_SCREEN.returnStatement}

   For FULLSCREEN screens (biometric-check, biometric-registration):
   ${SCREEN_PATTERNS.FULLSCREEN_SCREEN.returnStatement}

4. COMMON STYLE UPDATES:
   - Use commonStyles.header(theme) for consistent headers
   - Use commonStyles.sectionCard(theme) for consistent cards
   - Use commonStyles.formButtonContainer(theme) for button containers

5. BENEFITS:
   - Consistent bottom padding across all screens
   - No more buttons hidden behind tab bar
   - Consistent keyboard handling
   - Unified safe area management
   - Better accessibility

=== END INSTRUCTIONS ===
`);

module.exports = {
  SCREENS_TO_UPDATE,
  COMMON_REPLACEMENTS,
  SCREEN_PATTERNS,
};
