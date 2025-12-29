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
// Note: A separate auth.ts file exists for the Better-Auth CLI tool.
// This file contains the actual runtime configuration used by the server.
export const auth = betterAuth({
  database: db,
  
  // Base URL for the auth server
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:4000',
  
  // Email/password authentication
  emailAndPassword: {
    enabled: true,
  },
  
  // Social providers configuration
  // Note: Providers are only enabled when valid credentials are provided
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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

// Log warnings if social providers are not configured
if (!process.env.GITHUB_CLIENT_ID) {
  console.warn('⚠️  GitHub OAuth not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to enable.');
}
if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable.');
}

// Export the auth instance
export const betterAuthInstance = auth;
