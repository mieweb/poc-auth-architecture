import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const styles = {
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #00b4db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  error: {
    color: '#dc3545',
    marginTop: '15px',
  },
};

function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function processCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(searchParams.get('error_description') || errorParam);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      const success = await handleCallback(code, state);
      if (success) {
        navigate('/', { replace: true });
      }
    }

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div style={styles.card}>
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
      {!error ? (
        <>
          <div style={styles.spinner}></div>
          <h2>Processing login...</h2>
          <p style={{ color: '#666' }}>Exchanging authorization code for tokens</p>
        </>
      ) : (
        <>
          <h2>❌ Authentication Failed</h2>
          <p style={styles.error}>{error}</p>
          <button
            style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            Return Home
          </button>
        </>
      )}
    </div>
  );
}

export default Callback;
