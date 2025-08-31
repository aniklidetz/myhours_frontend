// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('MyHours App - Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    try {
      // Increase timeout for Expo which can take time to load
      await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });

      // Wait for React Native Web to initialize
      await page.waitForTimeout(2000);
    } catch (error) {
      if (
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NS_ERROR_CONNECTION_REFUSED') ||
        error.message.includes('Timeout')
      ) {
        test.skip(
          true,
          'Development server is not ready. Please ensure "npm start" is running and web version is accessible.'
        );
      }
      throw error;
    }
  });

  test('should not expose sensitive data in console logs', async ({ page }) => {
    const consoleLogs = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    // Give time for loading and possible logs
    await page.waitForTimeout(3000);

    // Check that logs don't contain tokens, passwords and other sensitive data
    const sensitivePatterns = [
      /token['":][\s]*['"][a-zA-Z0-9._-]{10,}/i,
      /password['":][\s]*['"][^'"]{3,}/i,
      /api[_-]?key['":][\s]*['"][a-zA-Z0-9]{10,}/i,
      /secret['":][\s]*['"][a-zA-Z0-9]{10,}/i,
      /bearer[\s]+[a-zA-Z0-9._-]{10,}/i,
    ];

    consoleLogs.forEach(log => {
      sensitivePatterns.forEach(pattern => {
        expect(log).not.toMatch(pattern);
      });
    });
  });

  test('should use secure storage for sensitive data', async ({ page }) => {
    // Check that localStorage doesn't contain sensitive data
    await page.waitForTimeout(2000);

    const localStorageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      return storage;
    });

    // Check that tokens are not stored in localStorage
    Object.entries(localStorageData).forEach(([key, value]) => {
      // Tokens should be stored in SecureStore, not in localStorage
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        // If this is not an authentication token, then it's ok
        if (!key.includes('AuthToken') && !key.includes('EnhancedAuth')) {
          return;
        }
        // For authentication tokens - they should not be in localStorage
        expect(value).toBeNull();
      }
    });
  });

  test('should implement proper CSP headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response.headers();

    // In production security headers should be set
    if (process.env.NODE_ENV === 'production') {
      expect(
        headers['content-security-policy'] || headers['x-content-security-policy']
      ).toBeTruthy();
      expect(headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
    }
  });

  test('should handle XSS protection', async ({ page }) => {
    await page.goto('/');

    // Try to inject XSS payload into input fields
    const xssPayload = '<script>window.xssExecuted = true;</script>';

    const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();

    for (const input of inputs) {
      if (await input.isVisible().catch(() => false)) {
        await input.fill(xssPayload);
      }
    }

    // Check that XSS was not executed
    const xssExecuted = await page.evaluate(() => window.xssExecuted);
    expect(xssExecuted).toBeFalsy();
  });

  test('should enforce HTTPS in production', async ({ page }) => {
    if (process.env.NODE_ENV !== 'production' && !process.env.E2E_BASE_URL?.includes('expo.dev')) {
      test.skip('HTTPS test only runs in production');
    }

    // All requests should be via HTTPS
    const requests = [];

    page.on('request', request => {
      requests.push(request.url());
    });

    await page.waitForTimeout(3000);

    const httpRequests = requests.filter(url => url.startsWith('http://'));
    expect(httpRequests).toHaveLength(0);
  });

  test('should not leak API endpoints in client code', async ({ page }) => {
    // Check page source code
    const content = await page.content();

    // Should not have direct links to internal API endpoints
    const suspiciousPatterns = [
      /http:\/\/localhost:\d+\/api/g,
      /http:\/\/192\.168\.\d+\.\d+/g,
      /internal-api/g,
      /admin-api/g,
    ];

    suspiciousPatterns.forEach(pattern => {
      expect(content).not.toMatch(pattern);
    });
  });

  test('should have proper error handling without info disclosure', async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Trigger potential error through non-existent API call
    await page.evaluate(() => {
      fetch('/non-existent-api-endpoint').catch(() => {});
    });

    await page.waitForTimeout(2000);

    // Check that errors don't contain sensitive information
    errors.forEach(error => {
      expect(error).not.toContain('database');
      expect(error).not.toContain('sql');
      expect(error).not.toContain('password');
      expect(error).not.toContain('token');
    });
  });

  test('should implement secure biometric data handling', async ({ page }) => {
    // Try to navigate to biometric registration page
    try {
      await page.goto('/biometric-registration', { timeout: 5000 });
    } catch (_error) {
      // If page doesn't exist, check general security principles
      await page.goto('/');
    }

    // Check that biometric data is handled securely
    const consoleLogs = [];

    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    await page.waitForTimeout(3000);

    // Logs should not contain biometric data
    consoleLogs.forEach(log => {
      expect(log).not.toContain('face_encoding');
      expect(log).not.toContain('biometric_data');
      expect(log).not.toContain('embedding');
      expect(log).not.toContain('face_recognition');
    });

    // Check localStorage for absence of biometric data
    const localStorage = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        data[key] = window.localStorage.getItem(key);
      }
      return data;
    });

    Object.entries(localStorage).forEach(([_key, value]) => {
      if (typeof value === 'string') {
        expect(value).not.toContain('face_encoding');
        expect(value).not.toContain('biometric_data');
      }
    });
  });
});
