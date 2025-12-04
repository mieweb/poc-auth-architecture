import { test, expect } from '@playwright/test';

test.describe('Service Initialization', () => {
  test('app-bff initialized OIDC client successfully', async ({ request }) => {
    // The BFF server logs "✅ OIDC client initialized" on startup
    // We verify by checking the auth status endpoint responds
    const response = await request.get('http://localhost:3000/api/auth/status');
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('authenticated');
  });

  test('app-web initialized OIDC client successfully', async ({ request }) => {
    // The web server logs "✅ OIDC client initialized" on startup
    // We verify by checking the home page loads (which requires OIDC to be ready)
    const response = await request.get('http://localhost:3002/');
    expect(response.ok()).toBe(true);
    
    const html = await response.text();
    expect(html).toContain('Traditional Web App');
  });

  test('app-spa started (Vite dev server)', async ({ request }) => {
    // Verify Vite dev server is running and serving the SPA
    const response = await request.get('http://localhost:3001/');
    expect(response.ok()).toBe(true);
    
    const html = await response.text();
    expect(html).toContain('SPA App');
  });

  test('auth-server OIDC discovery endpoint available', async ({ request }) => {
    const response = await request.get('http://localhost:4000/.well-known/openid-configuration');
    expect(response.ok()).toBe(true);
    
    const config = await response.json();
    expect(config.issuer).toBe('http://localhost:4000');
    expect(config.authorization_endpoint).toBeDefined();
    expect(config.token_endpoint).toBeDefined();
    expect(config.jwks_uri).toBeDefined();
  });

  test('api-server responds to health check', async ({ request }) => {
    // Unauthenticated request should return 401
    const response = await request.get('http://localhost:5001/api/data');
    expect(response.status()).toBe(401);
  });
});
