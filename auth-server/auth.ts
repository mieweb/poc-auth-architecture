import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'better-auth.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export const auth = betterAuth({
  database: db,
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:4000',
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'demo-client-secret',
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'demo-client-secret',
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  plugins: [
    twoFactor({
      issuer: 'PoC Auth Architecture',
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60,
  },
});
