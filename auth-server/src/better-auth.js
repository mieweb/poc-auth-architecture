import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SQLite database for better-auth
const dbPath = path.join(__dirname, '../better-auth.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize better-auth
export const auth = betterAuth({
  database: db,
  
  // Base URL for the auth server
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:4000',
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
  },
  
  // Social providers configuration
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
  
  // Plugins for 2FA
  plugins: [
    twoFactor({
      issuer: 'PoC Auth Architecture',
    }),
  ],
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
});

// Export the auth instance
export const betterAuthInstance = auth;
