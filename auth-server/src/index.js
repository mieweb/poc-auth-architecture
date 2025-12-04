import express from 'express';
import Provider from 'oidc-provider';
import { configuration } from './config.js';

const PORT = 4000;
const ISSUER = `http://localhost:${PORT}`;

const app = express();

const provider = new Provider(ISSUER, configuration);

// Mount the OIDC provider
app.use(provider.callback());

app.listen(PORT, () => {
  console.log(`🔐 Auth Server (OIDC Provider) running at ${ISSUER}`);
  console.log(`   Discovery: ${ISSUER}/.well-known/openid-configuration`);
  console.log(`   Test user: test@example.com / password123`);
});
