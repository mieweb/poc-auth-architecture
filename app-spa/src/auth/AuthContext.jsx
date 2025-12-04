import { createContext, useContext, useState, useCallback } from 'react';
import { buildAuthorizationUrl, exchangeCodeForTokens, parseJwt } from './pkce.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Store tokens in memory only (React state) - never in localStorage
  const [tokens, setTokens] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async () => {
    try {
      const authUrl = await buildAuthorizationUrl();
      window.location.href = authUrl;
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const handleCallback = useCallback(async (code, state) => {
    setLoading(true);
    setError(null);

    try {
      const tokenResponse = await exchangeCodeForTokens(code, state);
      
      // Store tokens in memory
      setTokens({
        accessToken: tokenResponse.access_token,
        idToken: tokenResponse.id_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      });

      // Parse user info from ID token
      const idTokenPayload = parseJwt(tokenResponse.id_token);
      setUser({
        sub: idTokenPayload.sub,
        email: idTokenPayload.email,
        name: idTokenPayload.name,
      });

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
  }, []);

  const getAccessToken = useCallback(() => {
    return tokens?.accessToken || null;
  }, [tokens]);

  const value = {
    isAuthenticated: !!tokens,
    user,
    tokens,
    loading,
    error,
    login,
    logout,
    handleCallback,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
