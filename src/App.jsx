import React, { useState, useEffect, Component } from 'react';
import { DataProvider } from './context/DataContext';
import LandingPage from './pages/LandingPage';
import AdminPage from './pages/AdminPage';
import CsPage from './pages/CsPage';

// Simple, graceful React Error Boundary to prevent any blank screen
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Captured by GlobalErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('amanda_auth_session');
      localStorage.removeItem('amanda_read_tickets');
    } catch {}
    window.location.hash = '#admin';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fdfbf7',
          padding: '24px',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 16px 36px rgba(0,0,0,0.08)',
            border: '1px solid rgba(79, 91, 42, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 18px auto'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937', marginBottom: '8px' }}>
              Terjadi Kendala Memuat Panel Admin
            </h2>
            <p style={{ fontSize: '13.5px', color: '#6b7280', lineHeight: 1.5, marginBottom: '20px' }}>
              Sistem mendeteksi kesalahan sementara pada sesi atau data browser:
            </p>
            <div style={{
              background: '#f9fafb',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#b91c1c',
              textAlign: 'left',
              marginBottom: '24px',
              overflowX: 'auto',
              maxHeight: '120px'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#4F5B2A',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Muat Ulang Halaman
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reset Sesi & Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const getInitialView = () => {
    if (typeof window === 'undefined') return 'landing';
    const hash = (window.location.hash || '').toLowerCase();
    const path = (window.location.pathname || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();

    if (hash === '#admin' || path === '/admin' || path.startsWith('/admin') || search.includes('view=admin')) {
      return 'admin';
    }
    if (hash === '#cs' || path === '/cs' || path.startsWith('/cs') || search.includes('view=cs')) {
      return 'cs';
    }
    return 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  useEffect(() => {
    const handleNavigation = () => {
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();

      if (hash === '#admin' || path === '/admin' || path.startsWith('/admin') || search.includes('view=admin')) {
        setCurrentView('admin');
      } else if (hash === '#cs' || path === '/cs' || path.startsWith('/cs') || search.includes('view=cs')) {
        setCurrentView('cs');
      } else {
        setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  // Dynamic Document Title and SEO Meta Robots based on active view
  useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }

    if (currentView === 'admin') {
      document.title = 'CMS Panel Manajemen | Amanda Brownies Balikpapan';
      robotsMeta.setAttribute('content', 'noindex, nofollow');
    } else if (currentView === 'cs') {
      document.title = 'Pusat Layanan & Pengaduan Pelanggan | Amanda Brownies Balikpapan';
      robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large');
    } else {
      document.title = 'Amanda Brownies Kalimantan | Cek Menu, Promo & Stok Outlet Resmi';
      robotsMeta.setAttribute('content', 'index, follow, max-image-preview:large');
    }
  }, [currentView]);

  const handleOpenAdmin = () => {
    window.location.hash = '#admin';
    setCurrentView('admin');
  };

  const handleOpenCs = () => {
    window.location.hash = '#cs';
    setCurrentView('cs');
  };

  const handleBackToLanding = () => {
    window.location.hash = '';
    if (window.location.pathname !== '/' && window.history?.pushState) {
      window.history.pushState(null, '', '/');
    }
    setCurrentView('landing');
  };

  return (
    <GlobalErrorBoundary>
      <DataProvider>
        {currentView === 'admin' ? (
          <AdminPage onBackToLanding={handleBackToLanding} />
        ) : currentView === 'cs' ? (
          <CsPage onBackToLanding={handleBackToLanding} onOpenAdmin={handleOpenAdmin} />
        ) : (
          <LandingPage onOpenAdmin={handleOpenAdmin} onOpenCsPage={handleOpenCs} />
        )}
      </DataProvider>
    </GlobalErrorBoundary>
  );
}
