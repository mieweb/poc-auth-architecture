import { Routes, Route } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Callback from './pages/Callback.jsx';
import Home from './pages/Home.jsx';

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    background: 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)',
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
  warning: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '20px',
    color: '#856404',
  },
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>⚡ Pure SPA App</h1>
        <span style={styles.badge}>React with Authorization Code + PKCE</span>
      </header>

      {!isAuthenticated && (
        <div style={styles.warning}>
          <strong>⚠️ Public Client Security Notice:</strong>
          <p style={{ marginTop: '5px' }}>
            This SPA stores tokens in memory only. They will be lost on page refresh.
            This is intentional for security - tokens should not persist in browser storage.
          </p>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </div>
  );
}

export default App;
