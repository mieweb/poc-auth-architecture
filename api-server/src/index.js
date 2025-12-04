import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const fastify = Fastify({ logger: true });

// CORS for SPA and BFF
await fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
});

// JWKS from auth-server
const JWKS = createRemoteJWKSet(new URL('http://localhost:4000/jwks'));
const ISSUER = 'http://localhost:4000';
const AUDIENCE = 'enterprise-api';

// JWT validation middleware
async function validateToken(request, reply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'unauthorized', message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    // Attach user info to request
    request.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    fastify.log.error('Token validation error:', error.message);
    reply.code(401).send({ error: 'unauthorized', message: 'Invalid or expired token' });
    return;
  }
}

// Protected endpoint
fastify.get('/api/data', { preHandler: validateToken }, async (request, reply) => {
  return {
    items: [
      { id: 1, name: 'Test Item' },
      { id: 2, name: 'Another Item' },
      { id: 3, name: 'Third Item' },
    ],
    requestedBy: request.user,
  };
});

// Health check (public)
fastify.get('/health', async () => ({ status: 'ok' }));

// Start server
const PORT = 5001;
try {
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`   Protected endpoint: GET http://localhost:${PORT}/api/data`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
