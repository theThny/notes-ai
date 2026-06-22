import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

export const SettingsModal = ({ settings, onSave, onClose }) => {
  const [geminiKey, setGeminiKey] = useState(settings.geminiKey || '');
  const [groqKey, setGroqKey] = useState(settings.groqKey || '');
  const [activeProvider, setActiveProvider] = useState(settings.activeProvider || 'gemini');
  const [appTheme, setAppTheme] = useState(settings.appTheme || 'light');
  const [interactiveMode, setInteractiveMode] = useState(settings.interactiveMode || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ geminiKey, groqKey, activeProvider, appTheme, interactiveMode });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Settings</div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                Provedor de IA
              </label>
              <select 
                className="input-field" 
                value={activeProvider} 
                onChange={e => setActiveProvider(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="gemini">Gemini (Padrão)</option>
                <option value="groq">Groq (Llama 3)</option>
              </select>
            </div>

            {activeProvider === 'gemini' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required to use Google Gemini.
                </div>
              </div>
            )}

            {activeProvider === 'groq' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                  Groq API Key
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Required to use Groq (Llama 3).
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
              <input
                type="checkbox"
                id="interactiveMode"
                checked={interactiveMode}
                onChange={e => setInteractiveMode(e.target.checked)}
                disabled={activeProvider !== 'gemini'}
                style={{ marginRight: '8px' }}
              />
              <label 
                htmlFor="interactiveMode" 
                style={{ 
                  fontWeight: 500, 
                  fontSize: '0.9rem', 
                  cursor: activeProvider === 'gemini' ? 'pointer' : 'not-allowed',
                  opacity: activeProvider === 'gemini' ? 1 : 0.6
                }}
              >
                Modo Visual e Interativo (Links e Imagens na IA)
                <span 
                  title="Requer o motor Gemini. Busca automaticamente imagens oficiais e links da Wikipédia." 
                  style={{ marginLeft: '6px', display: 'inline-flex', verticalAlign: 'middle', cursor: 'help' }}
                >
                  <HelpCircle size={14} />
                </span>
              </label>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.9rem' }}>
                Tema Visual da Interface
              </label>
              <select
                className="input-field"
                value={appTheme}
                onChange={(e) => setAppTheme(e.target.value)}
              >
                <option value="light">Claro (Padrão)</option>
                <option value="dark">Escuro (Dark Mode)</option>
                <option value="classic">Clássico (Script)</option>
                <option value="accessible">Alta Acessibilidade</option>
                <option value="accessible-dark">Acessibilidade Escura</option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};
