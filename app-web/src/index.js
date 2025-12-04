import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
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
const CLIENT_ID = 'app-web';
const CLIENT_SECRET = 'web-secret-key-for-poc';
const REDIRECT_URI = 'http://localhost:3002/auth/callback';

// In-memory session store
const sessions = new Map();

// In-memory PKCE store
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
  secret: 'web-cookie-secret-key',
});

await fastify.register(fastifyView, {
  engine: { ejs },
  root: path.join(__dirname, 'views'),
});

// Session helper
function getSession(request) {
  const sessionId = request.cookies.web_session;
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  return null;
}

// Auth middleware for protected routes
async function requireAuth(request, reply) {
  const session = getSession(request);
  if (!session) {
    // Store the original URL to redirect back after login
    const returnTo = request.url;
    reply.setCookie('return_to', returnTo, { path: '/', httpOnly: true });
    return reply.redirect('/auth/login');
  }
  request.session = session;
}

// Public routes
fastify.get('/', async (request, reply) => {
  const session = getSession(request);
  return reply.view('index.ejs', { user: session?.user || null });
});

// Auth routes
fastify.get('/auth/login', async (request, reply) => {
  if (!oidcClient) {
    await initOIDC();
    if (!oidcClient) {
      return reply.code(500).send('OIDC not initialized');
    }
  }

  const state = generators.state();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

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
    return reply.code(500).send('OIDC not initialized');
  }

  try {
    const params = oidcClient.callbackParams(request.raw);
    const codeVerifier = pkceStore.get(params.state);

    if (!codeVerifier) {
      return reply.code(400).view('error.ejs', { error: 'Invalid state parameter' });
    }

    const tokenSet = await oidcClient.callback(REDIRECT_URI, params, {
      state: params.state,
      code_verifier: codeVerifier,
    });

    pkceStore.delete(params.state);

    // Create session
    const sessionId = uuidv4();
    const claims = tokenSet.claims();

    sessions.set(sessionId, {
      accessToken: tokenSet.access_token,
      idToken: tokenSet.id_token,
      user: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
      },
      createdAt: Date.now(),
    });

    reply.setCookie('web_session', sessionId, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: 'lax',
      path: '/',
      maxAge: 3600,
    });

    // Redirect to original URL or docs
    const returnTo = request.cookies.return_to || '/docs';
    reply.clearCookie('return_to');
    return reply.redirect(returnTo);
  } catch (error) {
    fastify.log.error('Callback error:', error);
    return reply.view('error.ejs', { error: error.message });
  }
});

fastify.get('/auth/logout', async (request, reply) => {
  const sessionId = request.cookies.web_session;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  reply.clearCookie('web_session');
  return reply.redirect('/');
});

// Protected docs routes
fastify.get('/docs', { preHandler: requireAuth }, async (request, reply) => {
  return reply.view('docs/index.ejs', { user: request.session.user });
});

fastify.get('/docs/page1', { preHandler: requireAuth }, async (request, reply) => {
  return reply.view('docs/page1.ejs', { user: request.session.user });
});

fastify.get('/docs/page2', { preHandler: requireAuth }, async (request, reply) => {
  return reply.view('docs/page2.ejs', { user: request.session.user });
});

// API data page (demonstrates using access token)
fastify.get('/docs/api-demo', { preHandler: requireAuth }, async (request, reply) => {
  let apiData = null;
  let apiError = null;

  try {
    const response = await fetch(`${API_SERVER}/api/data`, {
      headers: {
        Authorization: `Bearer ${request.session.accessToken}`,
      },
    });

    if (response.ok) {
      apiData = await response.json();
    } else {
      apiError = `API returned ${response.status}`;
    }
  } catch (error) {
    apiError = error.message;
  }

  return reply.view('docs/api-demo.ejs', {
    user: request.session.user,
    apiData,
    apiError,
  });
});

// Start server
const PORT = 3002;
try {
  await initOIDC();
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`📄 Traditional Web App running at http://localhost:${PORT}`);
  console.log('   Pattern: Server-rendered pages with server-side sessions');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
