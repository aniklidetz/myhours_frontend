# Frontend CI/CD Setup Guide

**Date:** 2025-11-15
**Status:** Ready for deployment
**Priority:** CRITICAL

---

## Overview

This guide explains the complete GitHub Actions CI/CD pipeline for the MyHours React Native frontend.

**Pipeline Features:**
- Automated linting & type checking
- Unit tests with coverage reporting
- Build validation
- Security audits
- EAS builds for production
- Expo publish for development
- Slack notifications

---

## Files Created

### 1. GitHub Actions Workflow

**Location:** `.github/workflows/frontend-ci.yml`

**Jobs:**
1. **Lint & Type Check** - ESLint + TypeScript validation
2. **Unit Tests** - Jest with coverage reporting
3. **Build Validation** - Expo config validation + bundle size check
4. **Security Audit** - npm audit + secret scanning
5. **EAS Build** - Production builds (main branch only)
6. **Deploy Development** - Expo publish (develop branch only)
7. **Summary** - CI results summary

### 2. Updated package.json

**Added script:**
```json
"type-check": "tsc --noEmit"
```

---

## Deployment Steps

### Step 1: GitHub Repository Setup

Your repository already has the workflow file `.github/workflows/frontend-ci.yml` in place.

#### Add GitHub Secrets

Navigate to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | Required | How to Get |
|-------------|-------------|----------|------------|
| `EXPO_TOKEN` | Expo access token | Yes | See instructions below |
| `SLACK_WEBHOOK_URL` | Slack notifications | Optional | Slack App webhooks |
| `CODECOV_TOKEN` | Code coverage reports | Optional | codecov.io |

**Get Expo Token:**
```bash
# Login to Expo
npx expo login

# Get token from Expo dashboard
# Visit: https://expo.dev/settings/access-tokens
# Create new token: "GitHub Actions CI/CD"
```

---

### Step 2: Configure EAS Build (Optional for Production)

#### 2.1 Install EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

#### 2.2 Initialize EAS Build

```bash
# Configure EAS
eas build:configure

# This creates eas.json
```

#### 2.3 Create eas.json Configuration

**File:** `frontend2/myhours-app/eas.json`

```json
{
"cli": {
"version": ">= 5.0.0"
},
"build": {
"development": {
"developmentClient": true,
"distribution": "internal"
},
"preview": {
"distribution": "internal",
"android": {
"buildType": "apk"
}
},
"production": {
"android": {
"buildType": "apk"
},
"ios": {
"bundleIdentifier": "com.myhours.app"
}
}
},
"submit": {
"production": {}
}
}
```

---

### Step 3: Configure Expo App

#### 3.1 Verify app.json Configuration

Your `app.json` or `app.config.js` should have proper configuration:

```json
{
"expo": {
"name": "MyHours",
"slug": "myhours-app",
"version": "1.0.0",
"orientation": "portrait",
"icon": "./assets/icon.png",
"userInterfaceStyle": "light",
"splash": {
"image": "./assets/splash.png",
"resizeMode": "contain",
"backgroundColor": "#ffffff"
},
"assetBundlePatterns": [
"**/*"
],
"ios": {
"supportsTablet": true,
"bundleIdentifier": "com.myhours.app"
},
"android": {
"adaptiveIcon": {
"foregroundImage": "./assets/adaptive-icon.png",
"backgroundColor": "#ffffff"
},
"package": "com.myhours.app"
},
"web": {
"favicon": "./assets/favicon.png"
},
"extra": {
"apiBaseUrl": process.env.API_BASE_URL || "https://api.myhours.com/api/v1/",
"environment": process.env.ENVIRONMENT || "production"
}
}
}
```

---

### Step 4: Test CI Pipeline Locally

#### 4.1 Run All Checks Locally

```bash
# Make sure you're in the repository root (frontend2/myhours-app)

# 1. Linting
npm run lint

# 2. Type checking
npm run type-check

# 3. Tests
npm run test:ci

# 4. Format check
npm run format:check

# 5. Security audit
npm audit --audit-level=moderate
```

#### 4.2 Fix Any Issues

```bash
# Auto-fix linting
npm run lint:fix

# Auto-format code
npm run format

# Fix security issues
npm audit fix
```

---

### Step 5: Enable GitHub Actions

#### 5.1 Commit and Push

```bash
# Add CI/CD files
git add .github/workflows/frontend-ci.yml
git add FRONTEND_CI_CD_SETUP.md
git add QUICK_START_CI.md
git add package.json
git add eas.json # if created

# Commit
git commit -m "feat: Add frontend CI/CD pipeline

- Added GitHub Actions workflow
- Configured linting, testing, security checks
- Set up EAS build for production
- Added Expo publish for development
- Added comprehensive documentation"

# Push to trigger CI
git push origin main
```

#### 5.2 Monitor First Run

1. Go to: **GitHub → Actions tab**
2. Click on the workflow run
3. Monitor each job's progress
4. Check for any failures

---

## CI/CD Workflow Triggers

### When Does CI Run?

| Trigger | Branches | Jobs Executed |
|---------|----------|---------------|
| **Push to main** | `main` | All jobs + EAS Build |
| **Push to develop** | `develop` | All jobs + Expo Publish |
| **Pull Request** | `main`, `develop` | Lint, Test, Build, Security |
| **Manual Trigger** | Any | All jobs (via GitHub UI) |

### File Path Filters

CI runs when files change in the repository. You can configure path filters in the workflow file if needed.

---

## CI Job Details

### Job 1: Lint & Type Check (~2 minutes)

**What it does:**
- Runs ESLint to check code style
- Runs TypeScript type checking
- Fails if errors found

**How to fix failures:**
```bash
npm run lint:fix
npm run type-check
```

---

### Job 2: Unit Tests (~3 minutes)

**What it does:**
- Runs all Jest tests
- Generates coverage report
- Uploads to Codecov (optional)

**How to fix failures:**
```bash
npm run test:unit
```

---

### Job 3: Build Validation (~4 minutes)

**What it does:**
- Validates Expo configuration
- Checks bundle size
- Warns if bundle > 50MB

**How to fix failures:**
```bash
npx expo config --type prebuild
```

---

### Job 4: Security Audit (~1 minute)

**What it does:**
- Runs `npm audit`
- Scans for hardcoded secrets
- Checks for HTTP URLs

**How to fix failures:**
```bash
# Fix vulnerabilities
npm audit fix

# Remove hardcoded secrets
# Review code for API_KEY, SECRET, PASSWORD patterns
```

---

### Job 5: EAS Build (~15-30 minutes)

**What it does:**
- Builds Android APK
- Builds iOS IPA
- Only runs on `main` branch
- Sends Slack notification

**Requirements:**
- `EXPO_TOKEN` secret configured
- `eas.json` file exists
- Expo account set up

---

### Job 6: Expo Publish (~2 minutes)

**What it does:**
- Publishes to Expo development channel
- Only runs on `develop` branch
- Allows OTA updates

**How to test:**
```bash
npx expo publish --release-channel development
```

---

## Troubleshooting

### Common Issues

#### 1. "EXPO_TOKEN not found"

**Solution:**
- Add `EXPO_TOKEN` to GitHub Secrets
- Get token from: https://expo.dev/settings/access-tokens

#### 2. "Type check failed"

**Solution:**
```bash
# Fix TypeScript errors
npm run type-check

# Generate tsconfig.json if missing
npx tsc --init
```

#### 3. "Tests failed"

**Solution:**
```bash
# Run tests locally
npm run test:unit

# Debug specific test
npm test -- src/components/__tests__/MyComponent.test.js
```

#### 4. "EAS build failed"

**Solution:**
```bash
# Initialize EAS
eas build:configure

# Build locally first
eas build --platform android --profile development --local
```

#### 5. "Hardcoded secrets detected"

**Solution:**
- Move API URLs to `app.config.js` extra field
- Use environment variables
- Remove hardcoded keys

```javascript
// BAD
const API_KEY = "sk_live_1234567890";

// GOOD
import Constants from 'expo-constants';
const API_KEY = Constants.expoConfig?.extra?.apiKey;
```

---

## Monitoring & Maintenance

### Check CI Status Badge

Add to README.md:

```markdown
[![Frontend CI](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Frontend%20CI%2FCD/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions)
```

### Monitor Build Times

Track job durations:
- Lint & Type Check: ~2 min
- Tests: ~3 min
- Build Validation: ~4 min
- Security Audit: ~1 min
- **Total:** ~10 min per run

### Weekly Maintenance

```bash
# Update dependencies
npm outdated
npm update

# Fix security issues
npm audit fix

# Update Expo
npx expo upgrade
```

---

## Success Criteria

CI/CD is working correctly if:

- [x] All checks pass on main branch
- [x] Pull requests trigger CI automatically
- [x] EAS builds complete successfully
- [x] Expo publish updates development app
- [x] Slack notifications received (if configured)
- [x] No false positives in security scan
- [x] Tests have > 50% coverage

---

## Additional Resources

### Documentation

- **GitHub Actions:** https://docs.github.com/en/actions
- **Expo EAS:** https://docs.expo.dev/build/introduction/
- **Jest Testing:** https://jestjs.io/docs/getting-started
- **ESLint:** https://eslint.org/docs/user-guide/getting-started

### Example Workflows

- **React Native:** https://github.com/expo/expo/tree/main/.github/workflows
- **Best Practices:** https://github.com/actions/starter-workflows

---

## Next Steps

After CI/CD is working:

1. **Add E2E Tests**
- Configure Playwright tests
- Run on pull requests

2. **Add Performance Monitoring**
- Integrate Sentry
- Track bundle size over time

3. **Add Automated Releases**
- Semantic versioning
- Automatic changelog generation

4. **Add Deploy Gates**
- Require approvals for production
- Manual promotion workflows

---

## Support

**Issues with CI/CD?**

1. Check GitHub Actions logs
2. Review this documentation
3. Test locally with same commands
4. Contact DevOps team

**Useful Commands:**

```bash
# View GitHub Actions locally
npm install -g act
act -l # List workflows

# Debug specific job
act -j lint-and-typecheck
```

---

**Setup Date:** _______________
**Setup By:** _______________
**Status:** Pending In Progress Complete
