import express from 'express';
import Provider from 'oidc-provider';
import { toNodeHandler } from 'better-auth/node';
import { configuration } from './config.js';
import { betterAuthInstance } from './better-auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 4000;
const ISSUER = `http://localhost:${PORT}`;

const app = express();

// Serve the better-auth demo page
app.get('/demo', (req, res) => {
  res.sendFile(join(__dirname, 'demo.html'));
});

// Mount better-auth routes BEFORE body parsing middleware
// Better-auth handles its own request parsing and validation
app.all('/better-auth/*', toNodeHandler(betterAuthInstance));

// Parse JSON bodies for other routes with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const provider = new Provider(ISSUER, configuration);

// Mount the OIDC provider (default routes)
app.use(provider.callback());

app.listen(PORT, () => {
  console.log(`🔐 Auth Server (OIDC Provider + Better Auth) running at ${ISSUER}`);
  console.log(`   OIDC Discovery: ${ISSUER}/.well-known/openid-configuration`);
  console.log(`   Better Auth API: ${ISSUER}/better-auth/*`);
  console.log(`   Better Auth Demo: ${ISSUER}/demo`);
  console.log(`   Test user: test@example.com / password123`);
  console.log(`   Features: Social Sign-in (GitHub, Google), 2FA`);
});
