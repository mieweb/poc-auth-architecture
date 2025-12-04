import { generateKeyPair, exportJWK } from 'jose';

// Generate RSA key pair for signing tokens
const { privateKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(privateKey);
jwk.kid = 'auth-server-key-1';
jwk.use = 'sig';
jwk.alg = 'RS256';

// In-memory user store
const users = [
  {
    id: 'user-1',
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    password: 'password123',
  },
];

// Simple account adapter
class Account {
  constructor(id, profile) {
    this.accountId = id;
    this.profile = profile;
  }

  async claims(use, scope) {
    const claims = {
      sub: this.accountId,
    };

    if (scope.includes('email')) {
      claims.email = this.profile.email;
      claims.email_verified = this.profile.email_verified;
    }

    if (scope.includes('profile')) {
      claims.name = this.profile.name;
    }

    return claims;
  }

  static async findByLogin(login, password) {
    const user = users.find(u => u.email === login && u.password === password);
    if (!user) return undefined;
    return new Account(user.id, user);
  }

  static async findAccount(ctx, id) {
    // First try to find by id
    let user = users.find(u => u.id === id);
    if (user) {
      return new Account(user.id, user);
    }
    // Also try by email (for devInteractions which uses login as accountId)
    user = users.find(u => u.email === id);
    if (user) {
      // Use the email as accountId to match what devInteractions stored
      return new Account(id, user);
    }
    return undefined;
  }
}

export const configuration = {
  // Account lookup - required for oidc-provider to find user accounts
  findAccount: Account.findAccount,
  
  // Clients configuration
  clients: [
    {
      client_id: 'app-bff',
      client_secret: 'bff-secret-key-for-poc',
      redirect_uris: ['http://localhost:3000/auth/callback'],
      post_logout_redirect_uris: ['http://localhost:3000'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
    },
    {
      client_id: 'app-spa',
      redirect_uris: ['http://localhost:3001/callback'],
      post_logout_redirect_uris: ['http://localhost:3001'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'openid profile email',
      token_endpoint_auth_method: 'none', // Public client
    },
    {
      client_id: 'app-web',
      client_secret: 'web-secret-key-for-poc',
      redirect_uris: ['http://localhost:3002/auth/callback'],
      post_logout_redirect_uris: ['http://localhost:3002'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
    },
  ],

  // PKCE support
  pkce: {
    methods: ['S256'],
    required: () => false, // Required for public clients, optional for confidential
  },

  // Scopes supported by the provider (NOT claims - use default claims mapping)
  scopes: ['openid', 'profile', 'email', 'offline_access'],

  // Claims configuration - map scopes to claims and include them in ID token
  claims: {
    openid: ['sub'],
    profile: ['name'],
    email: ['email', 'email_verified'],
  },

  // Ensure profile/email claims are included in ID token
  conformIdTokenClaims: false,

  // Token configuration
  ttl: {
    AccessToken: 3600, // 1 hour
    AuthorizationCode: 600, // 10 minutes
    IdToken: 3600, // 1 hour
    RefreshToken: 86400, // 1 day
  },

  // Features
  features: {
    devInteractions: { enabled: true }, // Built-in login UI for dev
    resourceIndicators: {
      enabled: true,
      defaultResource: (ctx, client, oneOf) => {
        // Default resource for all clients is our API server
        if (oneOf) return oneOf;
        return 'http://localhost:5001';
      },
      useGrantedResource: (ctx, model) => {
        // For authorization code/refresh token exchanges, use the granted resource
        return true;
      },
      getResourceServerInfo: (ctx, resourceIndicator, client) => {
        // Configure our API server as a resource server with JWT tokens
        if (resourceIndicator === 'http://localhost:5001') {
          return {
            scope: 'openid profile email api:read api:write',
            audience: 'http://localhost:5001',
            accessTokenTTL: 3600, // 1 hour
            accessTokenFormat: 'jwt',
            jwt: {
              sign: { alg: 'RS256' },
            },
          };
        }
        // Unknown resource indicator
        throw new Error('Invalid resource indicator');
      },
    },
  },

  // Auto-approve consent for first-party clients
  // This MUST return a grant - if undefined, consent checks fail
  async loadExistingGrant(ctx) {
    // Try to find existing grant first
    const grantId = ctx.oidc.result?.consent?.grantId
      || ctx.oidc.session?.grantIdFor(ctx.oidc.client.clientId);

    if (grantId) {
      const existingGrant = await ctx.oidc.provider.Grant.find(grantId);
      if (existingGrant) {
        return existingGrant;
      }
    }

    // No existing grant - create a new one if user is logged in
    // This auto-approves all requested scopes for first-party clients
    if (ctx.oidc.session?.accountId) {
      const grant = new ctx.oidc.provider.Grant({
        clientId: ctx.oidc.client.clientId,
        accountId: ctx.oidc.session.accountId,
      });

      // Grant all requested OIDC scopes
      const requestedScopes = ctx.oidc.params?.scope?.split(' ') || ['openid'];
      grant.addOIDCScope(requestedScopes.join(' '));
      
      // Also grant scopes for resource indicators (our API server)
      // This auto-approves API access for first-party clients
      const resource = 'http://localhost:5001';
      grant.addResourceScope(resource, 'openid profile email api:read api:write');
      
      await grant.save();
      return grant;
    }

    // Not logged in yet - return undefined to trigger login prompt
    console.log('No session accountId, returning undefined');
    return undefined;
  },

  // Custom claims in access token
  extraTokenClaims: async (ctx, token) => {
    if (token.kind === 'AccessToken') {
      const account = await Account.findAccount(ctx, token.accountId);
      if (account) {
        const claims = await account.claims('access_token', 'openid profile email');
        return {
          email: claims.email,
          name: claims.name,
        };
      }
    }
    return {};
  },

  // CORS configuration - allow SPA client to access token endpoint
  clientBasedCORS: (ctx, origin, client) => {
    // Allow CORS for the SPA client from localhost:3001
    if (origin === 'http://localhost:3001') {
      return true;
    }
    return false;
  },

  // Signing keys
  jwks: {
    keys: [jwk],
  },

  // Account finding
  findAccount: Account.findAccount,

  // Cookie configuration
  cookies: {
    keys: ['poc-auth-secret-key-1', 'poc-auth-secret-key-2'],
  },

  // Allow localhost without HTTPS in dev
  renderError: async (ctx, out, error) => {
    console.error('OIDC Error:', error);
    ctx.type = 'html';
    ctx.body = `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>OIDC Error</h1>
  <pre>${JSON.stringify(out, null, 2)}</pre>
  <p>${error.message || error}</p>
</body>
</html>`;
  },
};
