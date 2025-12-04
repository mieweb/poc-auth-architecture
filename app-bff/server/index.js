import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import { Issuer, generators } from 'openid-client';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });

// Configuration (supports Docker via env vars)
// AUTH_SERVER: for server-to-server calls (discovery, token exchange)
// AUTH_SERVER_PUBLIC: for browser redirects (authorization URL)
const AUTH_SERVER = process.env.AUTH_SERVER || 'http://localhost:4000';
const AUTH_SERVER_PUBLIC = process.env.AUTH_SERVER_PUBLIC || 'http://localhost:4000';
const API_SERVER = process.env.API_SERVER || 'http://localhost:5001';
const CLIENT_ID = 'app-bff';
const CLIENT_SECRET = 'bff-secret-key-for-poc';
const REDIRECT_URI = 'http://localhost:3000/auth/callback';

// In-memory session store
const sessions = new Map();

// In-memory PKCE store (code_verifier by state)
const pkceStore = new Map();

// Initialize OIDC client
let oidcClient;

async function initOIDC() {
  try {
    const issuer = await Issuer.discover(AUTH_SERVER);
    oidcClient = new issuer.Client({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uris: [REDIRECT_URI],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
    });
    console.log('✅ OIDC client initialized');
  } catch (error) {
    console.error('Failed to discover OIDC issuer:', error.message);
    console.log('⚠️  Make sure auth-server is running on', AUTH_SERVER);
  }
}

// Register plugins
await fastify.register(fastifyCookie, {
  secret: 'bff-cookie-secret-key',
  parseOptions: {},
});

// Session middleware helper
function getSession(request) {
  const sessionId = request.cookies.bff_session;
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  return null;
}

// Auth routes
fastify.get('/auth/login', async (request, reply) => {
  if (!oidcClient) {
    await initOIDC();
    if (!oidcClient) {
      return reply.code(500).send({ error: 'OIDC not initialized' });
    }
  }

  const state = generators.state();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  // Store code_verifier for later use
  pkceStore.set(state, codeVerifier);

  let authUrl = oidcClient.authorizationUrl({
    scope: 'openid',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  // Replace internal auth server URL with public URL for browser redirect
  if (AUTH_SERVER !== AUTH_SERVER_PUBLIC) {
    authUrl = authUrl.replace(AUTH_SERVER, AUTH_SERVER_PUBLIC);
  }

  return reply.redirect(authUrl);
});

fastify.get('/auth/callback', async (request, reply) => {
  if (!oidcClient) {
    return reply.code(500).send({ error: 'OIDC not initialized' });
  }

  try {
    const params = oidcClient.callbackParams(request.raw);
    const codeVerifier = pkceStore.get(params.state);

    if (!codeVerifier) {
      return reply.code(400).send({ error: 'Invalid state parameter' });
    }

    const tokenSet = await oidcClient.callback(REDIRECT_URI, params, {
      state: params.state,
      code_verifier: codeVerifier,
    });

    // Clean up PKCE store
    pkceStore.delete(params.state);

    // Create session
    const sessionId = uuidv4();
    const claims = tokenSet.claims();

    sessions.set(sessionId, {
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      idToken: tokenSet.id_token,
      user: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
      },
      expiresAt: Date.now() + (tokenSet.expires_in || 3600) * 1000,
    });

    // Set session cookie
    reply.setCookie('bff_session', sessionId, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });

    return reply.redirect('/');
  } catch (error) {
    fastify.log.error('Callback error:', error);
    return reply.code(500).send({ error: 'Authentication failed', message: error.message });
  }
});

fastify.get('/auth/logout', async (request, reply) => {
  const sessionId = request.cookies.bff_session;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  reply.clearCookie('bff_session');
  return reply.redirect('/');
});

// BFF API proxy - proxies requests to the API server
fastify.get('/api/data', async (request, reply) => {
  const session = getSession(request);

  if (!session) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }

  // Check if token is expired
  if (session.expiresAt < Date.now()) {
    return reply.code(401).send({ error: 'Session expired' });
  }

  try {
    const response = await fetch(`${API_SERVER}/api/data`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      return reply.code(response.status).send({ error: 'API request failed' });
    }

    const data = await response.json();
    return data;
  } catch (error) {
    fastify.log.error('API proxy error:', error);
    return reply.code(500).send({ error: 'Failed to fetch data' });
  }
});

// User info endpoint
fastify.get('/api/me', async (request, reply) => {
  const session = getSession(request);

  if (!session) {
    return reply.code(401).send({ error: 'Not authenticated' });
  }

  return { user: session.user };
});

// Auth status endpoint
fastify.get('/api/auth/status', async (request, reply) => {
  const session = getSession(request);
  return {
    authenticated: !!session,
    user: session?.user || null,
  };
});

// Serve static React app
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../client/dist'),
  prefix: '/',
});

// Fallback for SPA routing
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.sendFile('index.html');
});

// Start server
const PORT = 3000;
try {
  await initOIDC();
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🖥️  BFF App running at http://localhost:${PORT}`);
  console.log('   Pattern: Backend-for-Frontend (tokens server-side only)');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
