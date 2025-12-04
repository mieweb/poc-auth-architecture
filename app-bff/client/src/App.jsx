import { useState, useEffect } from 'react';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '28px',
    marginBottom: '10px',
  },
  badge: {
    background: 'rgba(255,255,255,0.2)',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '14px',
    display: 'inline-block',
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  button: {
    background: '#667eea',
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
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: '#667eea',
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
  loading: {
    color: '#666',
    fontStyle: 'italic',
  },
  error: {
    color: '#dc3545',
    padding: '10px',
    background: '#f8d7da',
    borderRadius: '6px',
  },
  info: {
    background: '#e7f3ff',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '15px',
    fontSize: '14px',
    color: '#0066cc',
  },
};

function App() {
  const [authStatus, setAuthStatus] = useState({ authenticated: false, user: null });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/status');
      const status = await res.json();
      setAuthStatus(status);
      setLoading(false);

      if (status.authenticated) {
        fetchData();
      }
    } catch (err) {
      setError('Failed to check authentication status');
      setLoading(false);
    }
  }

  async function fetchData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogin() {
    window.location.href = '/auth/login';
  }

  function handleLogout() {
    window.location.href = '/auth/logout';
  }

  function handleFullLogout() {
    window.location.href = '/auth/logout/full';
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🔐 BFF Pattern App</h1>
        <span style={styles.badge}>React + Node.js Backend-for-Frontend</span>
      </header>

      <div style={styles.card}>
        <h2>Authentication Status</h2>
        {authStatus.authenticated ? (
          <div>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>
                {authStatus.user?.name?.charAt(0) || '?'}
              </div>
              <div>
                <strong>{authStatus.user?.name}</strong>
                <br />
                <small>{authStatus.user?.email}</small>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <button
                style={{ ...styles.button, ...styles.logoutButton }}
                onClick={handleLogout}
                title="Logout from this app only (SSO session remains)"
              >
                Logout
              </button>
              <button
                style={{ ...styles.button, ...styles.logoutButton, marginLeft: '10px' }}
                onClick={handleFullLogout}
                title="Logout from all apps (ends SSO session)"
              >
                Logout All Apps
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>You are not logged in.</p>
            <button style={styles.button} onClick={handleLogin}>
              Login with OIDC
            </button>
          </div>
        )}
      </div>

      {authStatus.authenticated && (
        <div style={styles.card}>
          <h2>Protected API Data</h2>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            Data fetched through BFF proxy → API Server
          </p>
          {error && <p style={styles.error}>{error}</p>}
          {data ? (
            <ul style={styles.dataList}>
              {data.items?.map((item) => (
                <li key={item.id} style={styles.dataItem}>
                  <span>📦 {item.name}</span>
                  <span style={{ color: '#999' }}>ID: {item.id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={styles.loading}>Loading data...</p>
          )}
        </div>
      )}

      <div style={styles.card}>
        <h2>How BFF Pattern Works</h2>
        <div style={styles.info}>
          <p><strong>🔒 Key Security Feature:</strong> Tokens never reach the browser!</p>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Browser only has an HttpOnly session cookie</li>
            <li>Access tokens are stored server-side in the BFF</li>
            <li>API calls go through BFF which adds the Bearer token</li>
            <li>Even if XSS occurs, attacker cannot steal tokens</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
