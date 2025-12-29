import express from 'express';
import Provider from 'oidc-provider';
import { toNodeHandler } from 'better-auth/node';
import { configuration } from './config.js';
import { betterAuthInstance } from './better-auth.js';

const PORT = 4000;
const ISSUER = `http://localhost:${PORT}`;

const app = express();

// Mount better-auth routes BEFORE body parsing middleware
// This adds social login, 2FA, and additional auth features
app.all('/better-auth/*', toNodeHandler(betterAuthInstance));

// Parse JSON bodies for other routes
app.use(express.json());

const provider = new Provider(ISSUER, configuration);

// Mount the OIDC provider (default routes)
app.use(provider.callback());

app.listen(PORT, () => {
  console.log(`🔐 Auth Server (OIDC Provider + Better Auth) running at ${ISSUER}`);
  console.log(`   OIDC Discovery: ${ISSUER}/.well-known/openid-configuration`);
  console.log(`   Better Auth API: ${ISSUER}/better-auth/*`);
  console.log(`   Test user: test@example.com / password123`);
  console.log(`   Features: Social Sign-in (GitHub, Google), 2FA`);
});
