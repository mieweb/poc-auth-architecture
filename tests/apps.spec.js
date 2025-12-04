import { test, expect } from '@playwright/test';

test.describe('App Authentication Flows', () => {
  
  test('app-bff: login page loads and can initiate auth', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Verify the BFF app loads
    await expect(page.locator('h1')).toContainText('BFF Pattern App');
    
    // Should show login button when not authenticated
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('app-spa: SPA loads with PKCE login option', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Verify the SPA loads
    await expect(page.locator('h1')).toContainText('Pure SPA App');
    
    // Should show PKCE login button
    await expect(page.getByRole('button', { name: /login.*pkce/i })).toBeVisible();
    
    // Should show security notice about in-memory tokens
    await expect(page.locator('text=tokens in memory')).toBeVisible();
  });

  test('app-web: traditional web app loads with login link', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Verify the traditional web app loads
    await expect(page.locator('h1')).toContainText('Traditional Web App');
    
    // Should show login link
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
  });

  test('app-web: protected docs redirect to login', async ({ page }) => {
    // Try to access protected docs without auth
    await page.goto('http://localhost:3002/docs');
    
    // Should redirect to auth server login page
    await expect(page).toHaveURL(/localhost:4000.*interaction/);
    
    // Login form should be visible
    await expect(page.getByRole('button', { name: /sign-in/i })).toBeVisible();
  });

  test('app-bff: full login flow', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Click login
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should redirect to auth server
    await expect(page).toHaveURL(/localhost:4000/);
    
    // Fill in credentials
    await page.getByRole('textbox', { name: /login/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    await page.getByRole('button', { name: /sign-in/i }).click();
    
    // Should redirect back to BFF app
    await expect(page).toHaveURL(/localhost:3000/);
    
    // Should show logout button (authenticated)
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();
    
    // Should show API data
    await expect(page.locator('text=Test Item')).toBeVisible();
  });

  test('app-spa: full PKCE login flow', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Click PKCE login
    await page.getByRole('button', { name: /login.*pkce/i }).click();
    
    // Should redirect to auth server
    await expect(page).toHaveURL(/localhost:4000/);
    
    // Fill in credentials
    await page.getByRole('textbox', { name: /login/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    await page.getByRole('button', { name: /sign-in/i }).click();
    
    // Should redirect back to SPA
    await expect(page).toHaveURL(/localhost:3001/);
    
    // Should show user info
    await expect(page.locator('text=Test User')).toBeVisible();
    
    // Should show access token preview
    await expect(page.locator('text=eyJ')).toBeVisible();
  });

  test('app-web: full traditional login flow', async ({ page }) => {
    await page.goto('http://localhost:3002');
    
    // Click login
    await page.getByRole('link', { name: /login/i }).click();
    
    // Should redirect to auth server
    await expect(page).toHaveURL(/localhost:4000/);
    
    // Fill in credentials
    await page.getByRole('textbox', { name: /login/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    await page.getByRole('button', { name: /sign-in/i }).click();
    
    // Should redirect to docs
    await expect(page).toHaveURL(/localhost:3002\/docs/);
    
    // Should show protected content
    await expect(page.getByRole('heading', { name: /Protected Documentation/i })).toBeVisible();
    
    // Should show logout link
    await expect(page.getByRole('link', { name: /logout/i })).toBeVisible();
  });
});
