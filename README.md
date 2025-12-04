# PoC: Authentication Architecture Patterns

A proof-of-concept monorepo demonstrating multiple authentication patterns using a shared OIDC server.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OIDC Provider                                  │
│                         http://localhost:4000                               │
│                                                                             │
│  • Issues JWT Access & ID Tokens                                            │
│  • Supports Authorization Code + PKCE                                       │
│  • 3 Registered Clients: app-bff, app-spa, app-web                          │
└─────────────────────────────────────────────────────────────────────────────┘
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
| `auth-server` | 4000 | OIDC Provider using `oidc-provider` |
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
| API Server | http://localhost:5001/api/data |
| BFF App | http://localhost:3000 |
| SPA App | http://localhost:3001 |
| Traditional Web App | http://localhost:3002 |

## 📋 Acceptance Criteria Checklist

- [x] Monorepo with `auth-server`, `api-server`, `app-bff`, `app-spa`, `app-web`
- [x] `auth-server`: Issues JWT tokens, 3 clients registered
- [x] `api-server`: Validates JWTs, serves `/api/data`, returns 401 on invalid token
- [x] `app-bff`: BFF pattern with tokens server-side, browser has session cookie only
- [x] `app-spa`: Authorization Code + PKCE, tokens in memory, direct API calls
- [x] `app-web`: Protected `/docs/*` routes, server-side sessions, server-rendered pages
- [x] Root `README.md` with documentation

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
