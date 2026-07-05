import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export const CustomAISelector = ({ selectedAI, setSelectedAI, hasGemini, hasGroq, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasAnyKey = hasGemini || hasGroq;

  const options = [];
  if (hasGemini) options.push({ id: 'gemini', title: 'Google Gemini (3.5)', subtitle: 'Respostas rápidas e gerais' });
  if (hasGroq) options.push({ id: 'groq', title: 'Groq (Llama 3)', subtitle: 'Raciocínio rápido' });

  const currentOption = options.find(o => o.id === selectedAI) || { title: 'Sem IA Configurada' };

  return (
    <div className="custom-ai-selector" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => !disabled && hasAnyKey && setIsOpen(!isOpen)}
        disabled={disabled || !hasAnyKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          color: 'var(--text-main, #fff)',
          border: '1px solid var(--border-color, #333)',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '0.9rem',
          cursor: (disabled || !hasAnyKey) ? 'not-allowed' : 'pointer',
          opacity: (disabled || !hasAnyKey) ? 0.6 : 1
        }}
      >
        <span>{disabled && hasAnyKey ? 'Carregando...' : currentOption.title}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && hasAnyKey && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100,
          minWidth: '220px',
          display: 'flex',
          flexDirection: 'column',
          padding: '4px'
        }}>
          {options.map(option => (
            <div
              key={option.id}
              onClick={() => {
                setSelectedAI(option.id);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', color: '#fff' }}>{option.title}</span>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>{option.subtitle}</span>
              </div>
              {selectedAI === option.id && <Check size={16} color="#8ab4f8" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
