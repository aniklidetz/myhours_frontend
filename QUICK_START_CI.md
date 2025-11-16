# Frontend CI/CD - Quick Start (3 minutes)

## Quick GitHub Actions Setup

Your repository is already set up with the workflow file `.github/workflows/frontend-ci.yml`.

### Step 1: Add GitHub Secret (2 min)

1. Open: https://expo.dev/settings/access-tokens
2. Create token: "GitHub Actions CI"
3. Copy token
4. Open your GitHub repository: Settings → Secrets and variables → Actions
5. Click "New repository secret"
6. Name: `EXPO_TOKEN`
7. Value: paste copied token
8. Click "Add secret"

### Step 2: Commit and Push (1 min)

```bash
# You are already in the repository root (frontend2/myhours-app)
# The workflow file is already in place

# Add all CI/CD files
git add .github/workflows/frontend-ci.yml
git add FRONTEND_CI_CD_SETUP.md
git add QUICK_START_CI.md
git add package.json

# Commit
git commit -m "feat: Add frontend CI/CD pipeline"

# Push to trigger CI
git push origin main
```

### Step 3: Check result (1 min)

1. Open: GitHub → Actions tab
2. You should see the workflow running
3. Wait for completion (~10 min)
4. Verify all jobs passed

---

## Done!

Now on every push:
- Automatic code quality checks (lint + typecheck)
- Run tests with coverage
- Security checks
- Build validation

---

## What triggers CI?

- Push to `main` → All checks + EAS production build
- Push to `develop` → All checks + Expo publish
- Pull requests → Lint, tests, build, security checks

---

## Full Documentation

See `FRONTEND_CI_CD_SETUP.md` for detailed instructions.

---

## Problems?

### Error "EXPO_TOKEN not found"
Check that token is added to GitHub Secrets:
- GitHub → Settings → Secrets and variables → Actions
- Make sure the secret name is exactly `EXPO_TOKEN`

### Error "Type check failed"
Run locally and fix errors:
```bash
npm run type-check
```

### Error "Tests failed"
Run locally to debug:
```bash
npm run test:ci
```

### Error "npm audit vulnerabilities"
Fix security issues:
```bash
npm audit fix
```

### Other errors
See `FRONTEND_CI_CD_SETUP.md` → Troubleshooting section
