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
    const user = users.find(u => u.id === id);
    if (!user) return undefined;
    return new Account(user.id, user);
  }
}

export const configuration = {
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
      scope: 'openid profile email',
    },
    {
      client_id: 'app-spa',
      redirect_uris: ['http://localhost:3001/callback'],
      post_logout_redirect_uris: ['http://localhost:3001'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client
      scope: 'openid profile email',
    },
    {
      client_id: 'app-web',
      client_secret: 'web-secret-key-for-poc',
      redirect_uris: ['http://localhost:3002/auth/callback'],
      post_logout_redirect_uris: ['http://localhost:3002'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
      scope: 'openid profile email',
    },
  ],

  // PKCE support
  pkce: {
    methods: ['S256'],
    required: () => false, // Required for public clients, optional for confidential
  },

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
      defaultResource: () => 'enterprise-api',
      getResourceServerInfo: (ctx, resourceIndicator) => ({
        scope: 'openid profile email',
        audience: 'enterprise-api',
        accessTokenFormat: 'jwt',
      }),
    },
  },

  // JWT Access Tokens
  formats: {
    AccessToken: 'jwt',
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

  // Resource server (API) audience
  audiences: () => ['enterprise-api'],

  // Signing keys
  jwks: {
    keys: [jwk],
  },

  // Account finding
  findAccount: Account.findAccount,

  // Interaction configuration
  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    },
  },

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
