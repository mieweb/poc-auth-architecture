// PKCE utilities for Authorization Code flow

// Generate a random code verifier (43-128 characters)
export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Generate code challenge from verifier using SHA-256
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

// Base64 URL encode (RFC 4648)
function base64UrlEncode(array) {
  const base64 = btoa(String.fromCharCode(...array));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Generate random state parameter
export function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// OIDC Configuration
export const OIDC_CONFIG = {
  authority: 'http://localhost:4000',
  clientId: 'app-spa',
  redirectUri: 'http://localhost:3001/callback',
  scope: 'openid profile email',
  resource: 'enterprise-api',
};

// Build authorization URL
export async function buildAuthorizationUrl() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store PKCE values in sessionStorage (temporary, only for auth flow)
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('pkce_state', state);

  const params = new URLSearchParams({
    client_id: OIDC_CONFIG.clientId,
    redirect_uri: OIDC_CONFIG.redirectUri,
    response_type: 'code',
    scope: OIDC_CONFIG.scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    resource: OIDC_CONFIG.resource,
  });

  return `${OIDC_CONFIG.authority}/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code, state) {
  // Verify state
  const storedState = sessionStorage.getItem('pkce_state');
  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  // Clean up PKCE storage
  sessionStorage.removeItem('pkce_code_verifier');
  sessionStorage.removeItem('pkce_state');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OIDC_CONFIG.clientId,
    redirect_uri: OIDC_CONFIG.redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${OIDC_CONFIG.authority}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || error.error || 'Token exchange failed');
  }

  return response.json();
}

// Parse JWT payload (without verification - verification done by API)
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
