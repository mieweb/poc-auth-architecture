# Auth Server with Better-Auth Integration

This auth server provides both OIDC and Better-Auth capabilities for comprehensive authentication.

## Features

### OIDC Provider
- Standard OpenID Connect implementation
- Authorization Code + PKCE flows
- JWT access tokens and ID tokens
- Three registered clients: app-bff, app-spa, app-web

### Better-Auth Integration
- **Social Sign-in**: GitHub, Google (extensible to more providers)
- **Two-Factor Authentication (2FA)**: TOTP-based
- **Framework-agnostic**: Works with any frontend/backend
- **Email/Password**: Standard username/password authentication

## Quick Start

```bash
# Install dependencies
npm install

# Generate database schema (first time only)
npx @better-auth/cli migrate

# Start the server
npm run dev
```

The server will start on http://localhost:4000

## Available Endpoints

### OIDC Endpoints
- `/.well-known/openid-configuration` - Discovery endpoint
- `/auth` - Authorization endpoint
- `/token` - Token endpoint
- `/jwks` - JSON Web Key Set
- `/userinfo` - User info endpoint

### Better-Auth Endpoints
All under `/better-auth/*`:
- `/better-auth/sign-up/email` - Register with email/password
- `/better-auth/sign-in/email` - Login with email/password
- `/better-auth/sign-in/social` - Social provider OAuth
- `/better-auth/session` - Get current session
- `/better-auth/two-factor/enable` - Enable 2FA
- `/better-auth/two-factor/verify` - Verify 2FA code

### Demo Page
Visit http://localhost:4000/demo for an interactive demonstration of Better-Auth features.

## Configuration

### Social Providers

To enable social sign-in, set these environment variables:

```bash
# GitHub OAuth App
export GITHUB_CLIENT_ID="your_github_client_id"
export GITHUB_CLIENT_SECRET="your_github_client_secret"

# Google OAuth App  
export GOOGLE_CLIENT_ID="your_google_client_id"
export GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

#### Creating OAuth Apps

**GitHub:**
1. Go to Settings → Developer settings → OAuth Apps
2. Create new OAuth App
3. Set callback URL to: `http://localhost:4000/better-auth/callback/github`

**Google:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Set authorized redirect URI to: `http://localhost:4000/better-auth/callback/google`

## Database

Better-Auth uses SQLite for storing:
- User accounts
- Sessions
- Social provider accounts
- 2FA secrets
- Verification tokens

Database file: `better-auth.db` (auto-created on first run)

## Test Credentials

OIDC Provider test user:
- Email: `test@example.com`
- Password: `password123`

## Files

- `src/index.js` - Main server setup
- `src/config.js` - OIDC provider configuration
- `src/better-auth.js` - Better-Auth configuration
- `auth.ts` - TypeScript config for Better-Auth CLI
- `src/demo.html` - Interactive demo page
- `better-auth.db` - SQLite database (generated)

## Development

The server uses `node --watch` for auto-reload during development:

```bash
npm run dev
```

Any changes to source files will automatically restart the server.
