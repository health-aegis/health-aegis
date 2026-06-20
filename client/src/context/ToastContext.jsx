import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px', 
        display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999
      }}>
        {toasts.map(t => (
          <div key={t.id} className="animate-toast-in" style={{
            background: 'rgba(10, 17, 40, 0.95)',
            border: `1px solid ${t.type === 'success' ? 'var(--accent-emerald)' : t.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)'}`,
            borderLeft: `4px solid ${t.type === 'success' ? 'var(--accent-emerald)' : t.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-cyan)'}`,
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '250px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: '500' }}>{t.message}</span>
            <button 
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
