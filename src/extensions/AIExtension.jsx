import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const AINodeView = (props) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extrai o timestamp dos atributos
  const timestamp = props.node.attrs.timestamp || '';

  return (
    <NodeViewWrapper 
      className="block-ai react-node-view" 
      style={{ 
        margin: '16px 0', 
        borderRadius: '12px', 
        backgroundColor: 'var(--bg-panel)', 
        borderLeft: '4px solid var(--primary-color)',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Header Interativo (Sempre Visível) */}
      <div 
        className="ai-header" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ 
          padding: '12px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'var(--hover-bg)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-color)',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--ai-text)', fontWeight: '600' }}>
          <Sparkles size={16} />
          <span>Conteúdo Expandido por IA</span>
          {timestamp && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '4px', fontWeight: 'normal', fontFamily: 'monospace' }}>
              {timestamp}
            </span>
          )}
        </div>
        
        <button 
          style={{ 
            background: 'var(--bg-color)', 
            border: '1px solid var(--border-color)', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: 'var(--active-bg)', color: 'var(--text-main)' })}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: 'var(--bg-color)', color: 'var(--text-muted)' })}
        >
          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Conteúdo Expansível (Condicionalmente Visível) */}
      <div style={{ 
        display: isCollapsed ? 'none' : 'block', 
        padding: '16px',
        animation: 'fadeIn 0.3s ease'
      }}>
        <NodeViewContent className="ai-content-inner" style={{ outline: 'none' }} />
      </div>
    </NodeViewWrapper>
  );
};

export default Node.create({
  name: 'aiBlock',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      timestamp: {
        default: '',
        parseHTML: element => element.getAttribute('data-timestamp') || ''
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="ai-block"]',
      },
      {
        tag: 'blockquote.block-ai',
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AINodeView);
  },
});
