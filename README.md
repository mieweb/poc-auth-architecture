# PoC: Authentication Architecture Patterns

A proof-of-concept monorepo demonstrating multiple authentication patterns using a shared OIDC server.

## 🎓 What is This Project?

This project demonstrates **three different ways** to add authentication (login/logout) to web applications, all sharing the same identity provider (OIDC server). It's designed to help developers understand the trade-offs between different authentication architectures.

### Key Concepts Explained

| Term | What It Means |
|------|---------------|
| **OIDC** | OpenID Connect - a standard protocol for authentication built on top of OAuth 2.0 |
| **JWT** | JSON Web Token - a secure, signed token containing user identity claims |
| **Access Token** | A token that grants access to protected APIs |
| **ID Token** | A token containing user identity information (name, email, etc.) |
| **PKCE** | Proof Key for Code Exchange - extra security for public clients |
| **SSO** | Single Sign-On - log in once, access multiple apps |

### The Three Patterns

#### 1. 🔐 BFF (Backend-for-Frontend) - `app-bff` on port 3000

**Best for:** Maximum security when you can run a backend server

The BFF pattern keeps all tokens on the server side. The browser only gets an HttpOnly session cookie that links to the tokens stored in server memory. Even if an attacker exploits an XSS vulnerability, they cannot steal the access tokens.

**How it works:**
- User clicks "Login" → redirected to auth server
- After login, tokens are stored on the BFF server (never sent to browser)
- Browser receives only a session cookie
- API requests go through the BFF, which adds the Bearer token

#### 2. 📱 SPA with PKCE - `app-spa` on port 3001

**Best for:** Pure frontend apps without a dedicated backend

The SPA (Single Page Application) handles authentication entirely in the browser using PKCE for security. Tokens are stored in memory (React state) and lost on page refresh.

**How it works:**
- App generates a cryptographic code verifier and challenge
- User logs in at auth server with the challenge
- App exchanges the authorization code + verifier for tokens
- Tokens stored in browser memory, used directly for API calls

#### 3. 🌐 Traditional Web App - `app-web` on port 3002

**Best for:** Server-rendered pages, documentation sites, admin panels

Classic server-side rendering where the server handles authentication and renders protected HTML pages. Similar to BFF but renders pages server-side instead of serving a SPA.

**How it works:**
- Protected routes check for valid session
- Unauthenticated users are redirected to login
- Server fetches data from API and renders HTML

### Logout Options

The BFF app demonstrates two types of logout:
- **"Logout"** - Ends the local session only (SSO remains active for quick re-login)
- **"Logout All Apps"** - Ends the OIDC session (requires credentials on next login)

## ✅ Implementation Status

All three authentication patterns are **fully implemented and tested**:

| Pattern | Status | Notes |
|---------|--------|-------|
| **BFF Pattern** (app-bff) | ✅ Complete | Server-side tokens, HttpOnly cookies, proxied API calls |
| **SPA + PKCE** (app-spa) | ✅ Complete | Public client, in-memory tokens, direct API calls, CORS configured |
| **Traditional Web** (app-web) | ✅ Complete | Server-rendered, protected routes, session-based auth |

### Tested Flows
- ✅ Login/logout for all three apps
- ✅ JWT access tokens with proper claims (sub, email, name)
- ✅ ID token claims in SPA (profile/email scopes)
- ✅ Protected API calls from all three clients
- ✅ CORS for SPA direct API access
- ✅ Session management with HttpOnly cookies
- ✅ Better-auth integration for social sign-in and 2FA

## 🌟 Enhanced Features (Better-Auth Integration)

The auth-server now includes **Better Auth** integration, adding enterprise-grade authentication features:

### Social Sign-in (Federated Identity)
- **GitHub OAuth** - Sign in with GitHub accounts
- **Google OAuth** - Sign in with Google accounts
- Framework-agnostic implementation
- Easy to extend with additional providers (Microsoft, Apple, etc.)

### Two-Factor Authentication (2FA)
- **TOTP** (Time-based One-Time Password) support
- Compatible with authenticator apps (Google Authenticator, Authy, etc.)
- Backup codes for account recovery
- Per-user 2FA enrollment

### Demo & Testing
- **Interactive Demo**: Visit [http://localhost:4000/demo](http://localhost:4000/demo)
- Test social sign-in flows
- Explore 2FA setup process

### API Endpoints
Better Auth adds these endpoints under `/better-auth/*`:
- `POST /better-auth/sign-up/email` - Email/password registration
- `POST /better-auth/sign-in/email` - Email/password login
- `GET /better-auth/sign-in/social` - Social provider OAuth flow
- `GET /better-auth/session` - Get current session
- `POST /better-auth/two-factor/enable` - Enable 2FA
- `POST /better-auth/two-factor/verify` - Verify 2FA code

### Configuration
To enable social providers, set environment variables:
```bash
# GitHub OAuth App
export GITHUB_CLIENT_ID="your_github_client_id"
export GITHUB_CLIENT_SECRET="your_github_client_secret"

# Google OAuth App
export GOOGLE_CLIENT_ID="your_google_client_id"
export GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

**Note**: Social sign-in buttons will work but require valid OAuth app credentials from GitHub/Google.

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         OIDC Provider + Better Auth                                  │
│                            http://localhost:4000                                     │
│                                                                                      │
│  OIDC Provider:                        Better Auth:                                 │
│  • Issues JWT Access & ID Tokens       • Social Sign-in (GitHub, Google)            │
│  • Authorization Code + PKCE           • Two-Factor Authentication (2FA)            │
│  • 3 Clients: app-bff, spa, web        • Framework-agnostic                         │
│                                        • Email/password authentication               │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│     app-bff         │ │     app-spa         │ │     app-web         │
│  :3000 (BFF)        │ │  :3001 (SPA)        │ │  :3002 (Trad.)      │
│                     │ │                     │ │                     │
│  React + Node BFF   │ │  Pure React SPA     │ │  Server-Rendered    │
│  Tokens server-side │ │  Tokens in memory   │ │  EJS templates      │
│  HttpOnly cookies   │ │  Direct API calls   │ │  Session-based      │
└─────────┬───────────┘ └─────────┬───────────┘ └─────────┬───────────┘
          │                       │                       │
          │    Proxied via BFF    │   Direct with Bearer  │  Server-side
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │      api-server         │
                    │   http://localhost:5001 │
                    │                         │
                    │   Fastify API           │
                    │   JWT Validation        │
                    │   GET /api/data         │
                    └─────────────────────────┘
```

## 📦 Components

| Component | Port | Description |
|-----------|------|-------------|
| `auth-server` | 4000 | OIDC Provider + Better Auth (social sign-in, 2FA) |
| `api-server` | 5001 | Protected Fastify API with JWT validation |
| `app-bff` | 3000 | React + Node.js BFF (Backend-for-Frontend) |
| `app-spa` | 3001 | Pure React SPA with PKCE |
| `app-web` | 3002 | Traditional server-rendered web app |

## 🔐 Authentication Patterns

### 1. BFF Pattern (app-bff)

```
Browser          BFF Server           Auth Server         API Server
   │                 │                     │                   │
   │──Login Click───▶│                     │                   │
   │                 │──Redirect to Auth──▶│                   │
   │◀────────────────│                     │                   │
   │                 │                     │                   │
   │──Auth Callback─▶│                     │                   │
   │                 │──Exchange Code─────▶│                   │
   │                 │◀──Tokens────────────│                   │
   │                 │  (stored in session)│                   │
   │◀─Session Cookie─│                     │                   │
   │                 │                     │                   │
   │──GET /api/data─▶│                     │                   │
   │                 │──GET + Bearer Token────────────────────▶│
   │                 │◀──JSON Response─────────────────────────│
   │◀──JSON Response─│                     │                   │
```

**Security Benefits:**
- Tokens never reach the browser
- Only HttpOnly session cookie exposed
- XSS cannot steal tokens

### 2. Public SPA + PKCE (app-spa)

```
Browser (SPA)                    Auth Server         API Server
   │                                  │                   │
   │──Generate PKCE (verifier/challenge)                  │
   │──Redirect to Auth───────────────▶│                   │
   │◀─────────────────────────────────│                   │
   │                                  │                   │
   │──Callback with Code──────────────│                   │
   │──Exchange Code + Verifier───────▶│                   │
   │◀──Tokens (stored in memory)──────│                   │
   │                                  │                   │
   │──GET /api/data + Bearer Token──────────────────────▶│
   │◀──JSON Response─────────────────────────────────────│
```

**Security Notes:**
- Public client (no client secret)
- PKCE prevents authorization code interception
- Tokens stored in React state (memory only)
- Tokens lost on page refresh (intentional)

### 3. Traditional Web App (app-web)

```
Browser                  Web Server              Auth Server      API Server
   │                         │                       │                │
   │──GET /docs─────────────▶│                       │                │
   │                         │──Check Session        │                │
   │                         │  (not authenticated)  │                │
   │◀─Redirect to /auth/login│                       │                │
   │──GET /auth/login───────▶│                       │                │
   │                         │──Redirect to Auth────▶│                │
   │◀────────────────────────│                       │                │
   │                         │                       │                │
   │──Auth Callback─────────▶│                       │                │
   │                         │──Exchange Code───────▶│                │
   │                         │◀──Tokens──────────────│                │
   │                         │  (stored in session)  │                │
   │◀─Session Cookie + ──────│                       │                │
   │  Redirect to /docs      │                       │                │
   │                         │                       │                │
   │──GET /docs─────────────▶│                       │                │
   │                         │──Check Session ✓      │                │
   │                         │──GET + Bearer─────────────────────────▶│
   │◀──Rendered HTML─────────│◀─JSON Response────────────────────────│
```

**Use Cases:**
- Documentation sites
- Admin consoles
- Legacy web applications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies
./scripts/install.sh
```

### Running the Services

```bash
# Start all services (Ctrl+C to stop)
./scripts/start.sh
```

### Manual Installation (Alternative)

```bash
cd auth-server && npm install && cd ..
cd api-server && npm install && cd ..
cd app-bff && npm install && cd app-bff/client && npm install && npm run build && cd ../..
cd app-spa && npm install && cd ..
cd app-web && npm install && cd ..
```

### Manual Start (Alternative)

Open 5 terminal windows and run each service:

```bash
# Terminal 1: Auth Server (must start first)
cd auth-server && npm run dev

# Terminal 2: API Server
cd api-server && npm run dev

# Terminal 3: BFF App
cd app-bff && npm run dev

# Terminal 4: SPA App
cd app-spa && npm run dev

# Terminal 5: Traditional Web App
cd app-web && npm run dev
```

### Test Credentials

| Field | Value |
|-------|-------|
| Email | `test@example.com` |
| Password | `password123` |

## 🔗 URLs

| Service | URL |
|---------|-----|
| Auth Server Discovery | http://localhost:4000/.well-known/openid-configuration |
| Auth Server JWKS | http://localhost:4000/jwks |
| **Better Auth Demo** | **http://localhost:4000/demo** |
| Better Auth API | http://localhost:4000/better-auth/* |
| API Server | http://localhost:5001/api/data |
| BFF App | http://localhost:3000 |
| SPA App | http://localhost:3001 |
| Traditional Web App | http://localhost:3002 |

## 📋 Acceptance Criteria Checklist

### Repository Structure
- [x] Monorepo with `auth-server`, `api-server`, `app-bff`, `app-spa`, `app-web`
- [x] Root `README.md` with documentation
- [x] Scripts for easy install/start (`./scripts/install.sh`, `./scripts/start.sh`)
- [x] Docker Compose setup with Dockerfiles for all services

### auth-server (OIDC Provider)
- [x] Issuer: `http://localhost:4000`
- [x] OIDC discovery: `/.well-known/openid-configuration`
- [x] JWKS endpoint for token validation
- [x] Authorization Code + PKCE support
- [x] In-memory user store with test user (`test@example.com` / `password123`)
- [x] JWT access tokens with claims: `iss`, `sub`, `aud`, `exp`, `iat`, `email`, `name`
- [x] JWT ID tokens with profile/email claims
- [x] 3 clients registered: `app-bff`, `app-spa`, `app-web`
- [x] CORS configured for SPA client

### api-server (Fastify API)
- [x] Listens on: `http://localhost:5001`
- [x] `GET /api/data` returns JSON data
- [x] JWT validation via JWKS
- [x] Validates `iss === "http://localhost:4000"`
- [x] Validates signature, `exp`
- [x] Returns 401 on invalid/missing token
- [x] CORS enabled for SPA access

### app-bff (React + Node BFF)
- [x] Runs on: `http://localhost:3000`
- [x] `GET /auth/login` - redirects to OIDC authorize
- [x] `GET /auth/callback` - exchanges code for tokens
- [x] Tokens stored in server-side session (never reach browser)
- [x] HttpOnly session cookie
- [x] `GET /api/data` - proxies to API with Bearer token
- [x] React UI with login button and data display
- [x] User info displayed after login

### app-spa (Pure React SPA)
- [x] Runs on: `http://localhost:3001`
- [x] Authorization Code + PKCE flow implemented in JS
- [x] `code_verifier` + `code_challenge` generation
- [x] Public client (no client secret)
- [x] Tokens stored in memory (React state) only
- [x] Direct API calls with Bearer token
- [x] User email/name from ID token displayed
- [x] Double-render protection for React StrictMode

### app-web (Traditional Web App)
- [x] Runs on: `http://localhost:3002`
- [x] Protected `/docs/*` routes with auth middleware
- [x] `GET /auth/login` - OIDC flow as confidential client
- [x] `GET /auth/callback` - token exchange + session creation
- [x] HttpOnly session cookie
- [x] Server-rendered HTML pages (EJS templates)
- [x] User info displayed on protected pages
- [x] API demo page showing server-side API calls
- [x] Logout endpoint

## 🛡️ Security Considerations

### Production Recommendations

1. **Use HTTPS everywhere** - All communications should be encrypted
2. **Secure cookie settings** - Set `Secure: true`, `SameSite: Strict`
3. **Use proper secrets** - Generate strong random secrets for sessions and client credentials
4. **Token rotation** - Implement refresh token rotation
5. **CORS configuration** - Restrict origins in production
6. **Rate limiting** - Add rate limiting to auth endpoints
7. **Token storage** - Consider secure storage mechanisms for SPAs (like service workers)

### Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|-------------------|
| High-security SPA | BFF Pattern |
| Simple SPA with API | SPA + PKCE |
| Documentation site | Traditional Web App |
| Admin console | Traditional Web App or BFF |
| Mobile app backend | Direct API with PKCE |

## 📁 Project Structure

```
poc-auth-architecture/
├── auth-server/           # OIDC Provider
│   ├── package.json
│   └── src/
│       ├── index.js       # Server entry point
│       └── config.js      # OIDC configuration
│
├── api-server/            # Protected API
│   ├── package.json
│   └── src/
│       └── index.js       # Fastify server with JWT validation
│
├── app-bff/               # React + Node BFF
│   ├── package.json
│   ├── server/
│   │   └── index.js       # BFF server
│   └── client/            # React app
│       ├── package.json
│       └── src/
│
├── app-spa/               # Pure React SPA
│   ├── package.json
│   └── src/
│       ├── auth/          # PKCE implementation
│       └── pages/         # React pages
│
├── app-web/               # Traditional Web App
│   ├── package.json
│   └── src/
│       ├── index.js       # Server with auth middleware
│       └── views/         # EJS templates
│
├── docker-compose.yml     # Container orchestration
├── scripts/
│   ├── install.sh         # Install all dependencies
│   └── start.sh           # Start all services
└── README.md              # This file
```

## 🐳 Docker Setup (Alternative)

You can also run all services using Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop all services
docker-compose down
```

**Note:** When using Docker, the services communicate via Docker networking. The ports remain the same and are exposed to your host machine.

## 🔧 Troubleshooting

### Common Issues

1. **"OIDC not initialized"**
   - Make sure `auth-server` is running first on port 4000

2. **401 Unauthorized from API**
   - Check if the token audience matches `enterprise-api`
   - Verify the auth-server JWKS is accessible

3. **CORS errors in SPA**
   - Ensure `api-server` CORS settings include the SPA origin

4. **Cookies not being set**
   - Check if you're using `localhost` consistently (not `127.0.0.1`)
   - Browser may block cookies in incognito mode

## 📚 Resources

- [OAuth 2.0](https://oauth.net/2/)
- [OpenID Connect](https://openid.net/connect/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [oidc-provider](https://github.com/panva/node-oidc-provider)
