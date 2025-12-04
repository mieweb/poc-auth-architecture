PoC.md
: Monorepo with OIDC Server, Fastify API, SPA, React+BFF App, and Traditional Web App

---

## Summary

Build a proof-of-concept monorepo demonstrating multiple auth patterns using a shared OIDC server:

* A custom **OIDC server**.
* A **Fastify API** that validates access tokens.
* A **pure SPA React app** (public client) that talks directly to the API.
* A **React app with a Node BFF** (tokens only on server).
* A **traditional server-rendered web app** (e.g., Docusaurus-like) where every page requires an authenticated user.

This PoC should highlight:

1. **Public SPA + PKCE** (tokens in browser memory).
2. **BFF pattern** (tokens only on backend).
3. **Traditional web app pattern** (server-side sessions guarding pages).

---

## Repository Layout (Suggested)

```text
poc-auth-architecture/
  auth-server/       # OIDC provider (Node)
  api-server/        # Fastify API, validates JWT access tokens

  app-bff/           # React frontend + Node BFF backend
  app-spa/           # Pure React SPA, static, direct OIDC client
  app-web/           # Traditional server-rendered web app (Docusaurus-style)

  docker-compose.yml # (optional)
  README.md
```

---

## 1. `auth-server` (OIDC Provider)

**Goal:** Minimal OIDC provider for local dev.

**Tech:**

* Node.js
* `oidc-provider` (or similar) with in-memory configuration

**Requirements:**

* Issuer: `http://localhost:4000`
* OIDC discovery + JWKS:

  * `/.well-known/openid-configuration`
  * JWKS endpoint
* Support Authorization Code + PKCE.
* In-memory user store with at least one test user:

  * `test@example.com` / `password123`
* JWT access + ID tokens with claims:

  * `iss`, `sub`, `aud`, `exp`, `iat`
  * `email`, `name`

Register **three** clients:

1. **`app-bff`** (confidential client)

   * `client_id`: `app-bff`
   * `redirect_uris`: `http://localhost:3000/auth/callback`
   * `token_endpoint_auth_method`: `client_secret_basic` (or `post`)

2. **`app-spa`** (public client)

   * `client_id`: `app-spa`
   * `redirect_uris`: `http://localhost:3001/callback`
   * `token_endpoint_auth_method`: `none`
   * Requires PKCE

3. **`app-web`** (traditional server-rendered app, confidential client)

   * `client_id`: `app-web`
   * `redirect_uris`: `http://localhost:3002/auth/callback`
   * `token_endpoint_auth_method`: `client_secret_basic` (or `post`)

---

## 2. `api-server` (Fastify API)

**Goal:** Protected JSON API used by **all three** frontend styles.

**Tech:**

* Node.js + Fastify
* JWT validation via `auth-server` JWKS (`jose` or similar lib)

**Requirements:**

* Listen on: `http://localhost:5000`

* Endpoint:

  * `GET /api/data` → returns static JSON, e.g.:

    ```json
    { "items": [ { "id": 1, "name": "Test Item" } ] }
    ```

* Require `Authorization: Bearer <access_token>`:

  * Validate `iss === "http://localhost:4000"`
  * Validate `aud` matches API audience (e.g., `"enterprise-api"`).
  * Validate signature, `exp`, `nbf`.

* On invalid/missing token:

  * Return `401` with `{ "error": "unauthorized" }`.

---

## 3. `app-bff` (React + Node BFF)

**Goal:** Demonstrate BFF pattern where browser never handles tokens.

**Tech:**

* BFF: Node.js + Fastify or Express (same port as frontend)
* UI: React (CRA or Vite) served by BFF or via static files on same origin

**Backend Requirements:**

* Runs on: `http://localhost:3000`
* Endpoints:

  * `GET /auth/login`

    * Redirects to `auth-server/authorize` with:

      * `client_id=app-bff`
      * `redirect_uri=http://localhost:3000/auth/callback`
      * response_type, scopes, PKCE params
  * `GET /auth/callback`

    * Handles `code` from `auth-server`.
    * Exchanges `code` + `code_verifier` for tokens at `auth-server/token`.
    * Stores access (and optionally refresh) token in server-side session (in-memory for PoC).
    * Sets a `HttpOnly` session cookie (e.g. `bff_session`).
    * Redirects to `/`.
  * `GET /api/data`

    * Checks session cookie.
    * Uses stored access token to call `http://localhost:5000/api/data`.
    * Proxies JSON to frontend.

**Frontend Requirements:**

* Simple React UI:

  * “Login” button → navigates to `/auth/login`.
  * After login, fetch `/api/data` and display the list.
  * Optionally show the user’s email via a small `/me` endpoint on BFF that reads ID token claims from the session.

---

## 4. `app-spa` (Pure React SPA, No Backend)

**Goal:** Public SPA using Authorization Code + PKCE directly.

**Tech:**

* React (CRA or Vite)
* Static host on `http://localhost:3001`

**Requirements:**

* Implement Authorization Code + PKCE directly in the SPA:

  * Generate `code_verifier` + `code_challenge` in JS.
  * Redirect to `auth-server/authorize` with:

    * `client_id=app-spa`
    * `redirect_uri=http://localhost:3001/callback`
    * `code_challenge`, `code_challenge_method=S256`
* In `/callback` route:

  * Parse `code` from URL.
  * Exchange `code` + `code_verifier` with `auth-server/token`.
  * Store `access_token` **in memory** (React state/context).
* After authentication:

  * Call `http://localhost:5000/api/data` with `Authorization: Bearer <access_token>`.
  * Render the resulting JSON.

Notes:

* Don’t store tokens in localStorage/IndexedDB in the PoC; model in-memory only.
* The SPA can keep a simple “Authenticated / Not Authenticated” banner and show the user’s email from the ID token.

---

## 5. `app-web` (Traditional Server-Rendered Web App)

**Goal:** Example of a “classic” web app where pages are server-rendered and require user authentication (like a protected Docusaurus docs site).

**Tech Options:**

* Minimal: Node.js + Fastify/Express + server-side templates (EJS/Handlebars/Pug) **or**
* “Docusaurus-style”: simple Node server that:

  * Serves static built docs.
  * Wraps auth around the routes.

For the PoC, we’ll treat it as:

* A Node app at `http://localhost:3002` with server-rendered HTML pages.
* All “docs” pages behind an auth middleware.

**Requirements:**

* Runs on: `http://localhost:3002`
* Middleware:

  * For any route under `/docs/*`:

    * If user not authenticated → redirect to `/auth/login`.
* Endpoints:

  * `GET /auth/login`

    * Initiates OIDC Authorization Code flow as a **confidential client**:

      * Redirects to `auth-server/authorize` with:

        * `client_id=app-web`
        * `redirect_uri=http://localhost:3002/auth/callback`
        * scopes: `openid profile email`
        * (PKCE optional here; good to include if you want consistency).
  * `GET /auth/callback`

    * Handles OIDC callback from `auth-server`.
    * Exchanges `code` (and `code_verifier` if using PKCE) at `auth-server/token`.
    * Stores ID/access token (or just user info) in a server-side session.
    * Sets a `HttpOnly` cookie with session ID (e.g. `web_session`).
    * Redirects to `/docs`.
  * `GET /docs`

    * Checks authenticated session.
    * Renders a simple HTML page (or docs index) showing:

      * “Hello, <user email>”
      * Links to `/docs/page1`, `/docs/page2`.
  * `GET /docs/page1`, `/docs/page2`, etc.

    * Same auth check.
    * Server-render static-ish pages (can mimic Docusaurus docs pages).

**Nice-to-have:**

* A “Logout” endpoint that clears the session cookie and redirects to `/`.

**Conceptual Difference vs `app-bff`:**

* `app-bff` is an API/BFF for a **JS-heavy React app**.
* `app-web` is a classic “HTML from server” app:

  * All auth checks happen on the server.
  * No React needed for pages unless you want it.
  * Think: docs site, admin console, etc.

---

## Acceptance Criteria

* [ ] Monorepo has `auth-server`, `api-server`, `app-bff`, `app-spa`, `app-web`, and root `README.md`.
* [ ] `auth-server`:

  * Issues JWT access & ID tokens.
  * Has 3 clients: `app-bff`, `app-spa`, `app-web`.
* [ ] `api-server`:

  * Validates JWTs from `auth-server`.
  * Serves `/api/data` when authorized; returns `401` otherwise.
* [ ] `app-bff`:

  * Implements BFF pattern: tokens stored server-side, browser has only a session cookie.
  * After login, frontend can load and display `/api/data`.
* [ ] `app-spa`:

  * Implements Authorization Code + PKCE as a **public client**.
  * Stores access token in memory and calls `/api/data` directly.
* [ ] `app-web`:

  * Protects `/docs/*` routes with authentication.
  * Uses server-side sessions; no tokens exposed to browser.
  * Displays logged-in user info on docs pages.
* [ ] Root `README.md`:

  * Describes each component and its port.
  * Details the three auth patterns (BFF, SPA, traditional web).
  * Provides dev setup + test credentials.
  * Includes simple flow diagrams or sequence descriptions.

