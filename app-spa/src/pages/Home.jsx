import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { OIDC_CONFIG } from '../auth/pkce.js';

const API_SERVER = OIDC_CONFIG.apiServer;

const styles = {
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  button: {
    background: '#00b4db',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    marginRight: '10px',
  },
  logoutButton: {
    background: '#dc3545',
  },
  fetchButton: {
    background: '#28a745',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: '#00b4db',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  dataList: {
    listStyle: 'none',
  },
  dataItem: {
    padding: '15px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  error: {
    color: '#dc3545',
    padding: '10px',
    background: '#f8d7da',
    borderRadius: '6px',
    marginBottom: '15px',
  },
  info: {
    background: '#d4edda',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '15px',
    fontSize: '14px',
    color: '#155724',
  },
  code: {
    background: '#f4f4f4',
    padding: '10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '100px',
    marginTop: '10px',
  },
};

function Home() {
  const { isAuthenticated, user, login, logout, getAccessToken, error: authError } = useAuth();
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchApiData() {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setApiError('No access token available');
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`${API_SERVER}/api/data`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {(authError || apiError) && (
        <div style={styles.error}>{authError || apiError}</div>
      )}

      <div style={styles.card}>
        <h2>Authentication Status</h2>
        {isAuthenticated ? (
          <div>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>{user?.name?.charAt(0) || '?'}</div>
              <div>
                <strong>{user?.name}</strong>
                <br />
                <small>{user?.email}</small>
              </div>
            </div>
            <button style={{ ...styles.button, ...styles.logoutButton }} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '15px' }}>You are not logged in.</p>
            <button style={styles.button} onClick={login}>
              Login with OIDC (PKCE)
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div style={styles.card}>
          <h2>Protected API Data</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Direct API call with Bearer token from browser
          </p>

          <button
            style={{ ...styles.button, ...styles.fetchButton }}
            onClick={fetchApiData}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Fetch /api/data'}
          </button>

          {apiData && (
            <ul style={{ ...styles.dataList, marginTop: '20px' }}>
              {apiData.items?.map((item) => (
                <li key={item.id} style={styles.dataItem}>
                  <span>📦 {item.name}</span>
                  <span style={{ color: '#999' }}>ID: {item.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={styles.card}>
        <h2>How SPA + PKCE Works</h2>
        <div style={styles.info}>
          <p><strong>🔓 Public Client Pattern:</strong></p>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>No client secret (public client)</li>
            <li>PKCE protects against authorization code interception</li>
            <li>Tokens stored in memory (React state) only</li>
            <li>Browser makes direct API calls with Bearer token</li>
            <li>Tokens lost on page refresh (security trade-off)</li>
          </ul>
        </div>

        {isAuthenticated && (
          <div style={styles.code}>
            <strong>Access Token (first 50 chars):</strong>
            <br />
            {getAccessToken()?.substring(0, 50)}...
          </div>
        )}
      </div>
    </>
  );
}

export default Home;
