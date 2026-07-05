import React from 'react';
import { ExternalLink, X, AlertTriangle } from 'lucide-react';

const KEY_LINKS = {
  gemini: { label: 'Google AI Studio', url: 'https://aistudio.google.com/app/apikey' },
  groq:   { label: 'Groq Console',     url: 'https://console.groq.com/keys' }
};

/**
 * Full-screen overlay modal for critical errors (missing API key, etc.)
 * Pass `provider` to show the relevant "get key" link.
 */
export const ErrorModal = ({ message, provider, onClose }) => {
  const isAuthError = message && (
    message.includes('401') || 
    message.toLowerCase().includes('ausente') || 
    message.toLowerCase().includes('missing') ||
    message.includes('403')
  );
  
  const link = (provider && isAuthError) ? KEY_LINKS[provider] : null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '420px', textAlign: 'center' }}
      >
        {/* Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)',
          marginBottom: '16px'
        }}>
          <AlertTriangle size={26} color="var(--danger-color, #ef4444)" />
        </div>

        {/* Title */}
        <div className="modal-title" style={{ marginBottom: '10px' }}>
          Erro de Configuração
        </div>

        {/* Message */}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: link ? '20px' : '24px' }}>
          {message}
        </p>

        {/* API key link */}
        {link && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.875rem',
              color: 'var(--primary-color)',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '8px 16px',
              border: '1px solid var(--primary-color)',
              borderRadius: '8px',
              marginBottom: '20px',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb, 99,102,241),0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Obter chave no {link.label}
            <ExternalLink size={13} />
          </a>
        )}

        <div className="modal-actions" style={{ justifyContent: 'center', paddingTop: '4px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>

        {/* Close icon */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', lineHeight: 1
          }}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

/**
 * Lightweight toast for non-critical info messages (bottom-right corner).
 */
export const Toast = ({ message, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '80px', right: '24px', zIndex: 9998,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderLeft: '4px solid var(--danger-color, #ef4444)',
    borderRadius: '8px',
    padding: '12px 40px 12px 16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    maxWidth: '320px',
    fontSize: '0.875rem',
    color: 'var(--text-main)',
    animation: 'slideInRight 0.2s ease'
  }}>
    {message}
    <button
      onClick={onClose}
      style={{
        position: 'absolute', top: '8px', right: '10px',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', lineHeight: 1
      }}
    >
      <X size={14} />
    </button>
  </div>
);
