# Testing Guide for MyHours App

## Overview

MyHours App uses several types of testing:
- **Jest Unit Tests** - component and utility tests (including security-focused tests)
- **E2E Tests** - integration tests via Playwright

## Jest Unit Tests

### Available Commands

```bash
# All Jest tests in watch mode
npm run test
npm test

# Security tests with verbose output  
npm run test:security

# Security tests for CI with coverage
npm run test:security-ci
```

### Current Tests

- **`src/utils/__tests__/safeLogging.test.js`** - safe logging utilities testing (40 tests)
  - PII data masking (email, GPS, names)
  - Safe logging functions
  - Detection of potential data leaks

**Note**: The `test:security-ci` command measures coverage only for the `src/utils/safeLogging.js` utility, not the entire codebase.

### Test Structure Example

```javascript
// src/utils/__tests__/newFeature.test.js
describe('NewFeature', () => {
  test('should work correctly', () => {
    // arrange
    const input = 'test';
    
    // act  
    const result = newFunction(input);
    
    // assert
    expect(result).toBe('expected');
  });
});
```

### Adding New Tests

Create test files in `src/utils/__tests__/` directory with `*.test.js` name:

```
src/
  utils/
    __tests__/
      safeLogging.test.js
      yourModule.test.js  // new test
```

## E2E Tests (Playwright)

### E2E Test Preparation

```bash
# 1. Install Playwright browsers (one time)
npm run test:e2e:install

# 2. Start development server (in separate terminal)
npm start
# Wait for startup message on http://localhost:8081
```

### Running E2E Tests

```bash
# All E2E tests
npm run test:e2e

# Authentication tests only
npm run test:e2e:auth

# Security tests only  
npm run test:e2e:security

# Visual mode (with browser opening)
npm run test:e2e:headed
```

### E2E Test Structure

```
e2e/
  auth.spec.js      // authentication tests
  security.spec.js  // security tests  
  debug.spec.js     // debug tests
```

#### Test Coverage
- **Authentication**: Login screen, form validation, biometric auth, HTTPS, offline mode  
- **Security**: Data leak protection, secure storage, CSP headers, XSS protection, API security

### Browser Support & Configuration

**Active Browsers**: Chromium (Desktop), Mobile Chrome (Pixel 5)
**Disabled**: Firefox (React Native Web compatibility), WebKit (macOS Bus Error)

**Configuration** (`playwright.config.js`):
- Manual server mode (run `npm start` first)
- 30-second timeouts for React Native Web
- Video/screenshot capture on errors
- HTML reports in `test-results/`

## Jest Configuration

Jest is configured in `package.json`:

```json
{
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": [
      "/node_modules/",
      "/e2e/"  // exclude E2E tests from Jest
    ],
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/**/*.test.{js,jsx}",
      "!src/**/__tests__/**"
    ]
  }
}
```

## Recommended Workflow

```bash
# Local Development (fast → slow)
npm run test:security    # Security tests first
npm test                 # All Jest tests
npm start               # Start server (separate terminal)
npm run test:e2e        # E2E tests

# Before Commit
npm run test:security-ci # Jest with coverage
npm run test:e2e        # Full E2E suite
```

## Troubleshooting

**Jest/Playwright Conflicts**: E2E tests excluded from Jest via `testPathIgnorePatterns`  
**Connection Refused**: Ensure `npm start` running on http://localhost:8081  
**Browser Issues**: Firefox/WebKit disabled due to React Native Web compatibility  
**Timeouts**: 30-second timeouts set for slow React Native Web initialization

## Test Statistics

**Jest Unit Tests**: 1 file, 40 tests, ~2 seconds  
**E2E Tests**: 3 files, 14 tests, 2 browsers, ~30 seconds

## CI/CD Integration

Tests run automatically on push to `main`/`develop` branches and Pull Requests.