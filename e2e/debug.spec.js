// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Debug - What is on the page', () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto('/', { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    } catch (error) {
      if (
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NS_ERROR_CONNECTION_REFUSED') ||
        error.message.includes('Timeout')
      ) {
        test.skip(true, 'Development server is not ready');
      }
      throw error;
    }
  });

  test('debug - show page content', async ({ page }) => {
    // Wait for React Native Web to load
    await page.waitForTimeout(5000);

    console.log('=== DEBUG INFO ===');

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Check network status
    const networkStatus = await page.evaluate(() => navigator.onLine);
    console.log('Network status (navigator.onLine):', networkStatus);

    // Check for connection error messages
    const connectionErrors = await page
      .locator('*')
      .filter({ hasText: /connection|network|offline|lost/i })
      .all();
    console.log(`Found ${connectionErrors.length} connection error messages:`);
    for (let i = 0; i < connectionErrors.length; i++) {
      const text = await connectionErrors[i].textContent().catch(() => '[no text]');
      const isVisible = await connectionErrors[i].isVisible().catch(() => false);
      console.log(`  - Error ${i}: "${text}" (visible: ${isVisible})`);
    }

    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons:`);
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent().catch(() => '[no text]');
      const isVisible = await buttons[i].isVisible().catch(() => false);
      const isDisabled = await buttons[i].isDisabled().catch(() => false);
      console.log(`  - Button ${i}: "${text}" (visible: ${isVisible}, disabled: ${isDisabled})`);
    }

    // Get all div elements that might be buttons (styled as buttons)
    const divButtons = await page
      .locator('div')
      .filter({ hasText: /^Login$|^Sign|^Submit$|^Enter$/i })
      .all();
    console.log(`Found ${divButtons.length} div elements that look like buttons:`);
    for (let i = 0; i < divButtons.length; i++) {
      const text = await divButtons[i].textContent().catch(() => '[no text]');
      const isVisible = await divButtons[i].isVisible().catch(() => false);
      const hasPointerEvents = await divButtons[i]
        .evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.pointerEvents !== 'none' && style.cursor === 'pointer';
        })
        .catch(() => false);
      console.log(
        `  - Div Button ${i}: "${text}" (visible: ${isVisible}, clickable: ${hasPointerEvents})`
      );
    }

    // Get all input elements
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} inputs:`);
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type').catch(() => 'unknown');
      const placeholder = await inputs[i].getAttribute('placeholder').catch(() => '');
      const isVisible = await inputs[i].isVisible().catch(() => false);
      const isDisabled = await inputs[i].isDisabled().catch(() => false);
      console.log(
        `  - Input ${i}: type="${type}", placeholder="${placeholder}" (visible: ${isVisible}, disabled: ${isDisabled})`
      );
    }

    // Test clicking the login button
    const loginButton = page
      .locator('button:has-text("Login"), div:has-text("Login"), [role="button"]:has-text("Login")')
      .first();

    const loginButtonExists = await loginButton.isVisible().catch(() => false);
    console.log(`Login button exists: ${loginButtonExists}`);

    if (loginButtonExists) {
      console.log('Attempting to click login button...');
      await loginButton.click();
      await page.waitForTimeout(2000);

      // Check what happened after click
      const validationErrors = await page
        .locator(
          '.error, .alert, [role="alert"], .text-red, .validation-error, .error-message, :has-text("required")'
        )
        .all();
      console.log(`Found ${validationErrors.length} validation errors after click`);

      const loadingIndicators = await page
        .locator('.loading, .spinner, :has-text("Loading")')
        .all();
      console.log(`Found ${loadingIndicators.length} loading indicators after click`);
    }

    // Check all text on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Body text (first 500 chars):', bodyText?.substring(0, 500) || '[no text]');

    console.log('=== END DEBUG ===');

    // Just check that page has loaded
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
  });
});
