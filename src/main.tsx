import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Fitfood Fatal Runtime Catch]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#050506',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 92, 0, 0.15)',
            border: '1px solid rgba(255, 92, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '20px'
          }}>
            🔥
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#ffffff' }}>
            Fitfood - Récupération de session
          </h1>
          <p style={{ maxWidth: '420px', color: '#a1a1aa', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
            Une interruption est survenue pendant le chargement. Vous pouvez actualiser la page en toute sécurité sans perdre vos données.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#FF5C00',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '12px 28px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(255, 92, 0, 0.4)'
            }}
          >
            Recharger Fitfood
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
