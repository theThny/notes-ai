import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Palette } from 'lucide-react';

const MoodboardNodeView = ({ node }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  let htmlContent = '';
  try {
    htmlContent = decodeURIComponent(node.attrs.htmlPayload || '');
  } catch(e) {
    htmlContent = '<div style="background: red; color: white; padding: 10px;">Erro na Decodificação</div>';
  }

  const handleImageClick = (e) => {
    if (e.target.tagName === 'IMG' && e.target.classList.contains('mb-image')) {
      const imgSrc = e.target.src;
      
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(10px);cursor:zoom-out;';
      
      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.cssText = 'max-width:90%;max-height:75vh;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5);object-fit:contain;cursor:default;';
      img.onclick = (event) => event.stopPropagation();

      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;gap:16px;margin-top:24px;';

      const btnDownload = document.createElement('button');
      btnDownload.innerHTML = '⬇️ Download';
      btnDownload.style.cssText = 'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:white;padding:10px 20px;border-radius:30px;cursor:pointer;font-family:inherit;font-weight:600;transition:all 0.2s;';
      btnDownload.onclick = (event) => {
        event.stopPropagation();
        fetch(imgSrc).then(res => res.blob()).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'moodboard_reference.jpg';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }).catch(() => window.open(imgSrc, '_blank'));
      };

      const btnShare = document.createElement('button');
      btnShare.innerHTML = '🔗 Copiar Link';
      btnShare.style.cssText = 'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:white;padding:10px 20px;border-radius:30px;cursor:pointer;font-family:inherit;font-weight:600;transition:all 0.2s;';
      btnShare.onclick = (event) => {
        event.stopPropagation();
        navigator.clipboard.writeText(imgSrc);
        btnShare.innerHTML = '✅ Copiado!';
        setTimeout(() => btnShare.innerHTML = '🔗 Copiar Link', 2000);
      };

      toolbar.appendChild(btnDownload);
      toolbar.appendChild(btnShare);
      overlay.appendChild(img);
      overlay.appendChild(toolbar);
      
      overlay.onclick = () => document.body.removeChild(overlay);
      document.body.appendChild(overlay);
    }
  };

  return (
    <NodeViewWrapper 
      className="moodboard-react-view"
      style={{
        margin: '24px 0', 
        borderRadius: '12px', 
        backgroundColor: 'rgba(128, 128, 128, 0.05)', 
        border: '1px solid rgba(128, 128, 128, 0.2)',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div 
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
          <Palette size={16} />
          <span>Curadoria Visual</span>
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

      <div 
        onClick={handleImageClick}
        style={{ 
          display: isCollapsed ? 'none' : 'block',
          animation: 'fadeIn 0.3s ease',
          padding: '16px'
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </NodeViewWrapper>
  );
};

export default Node.create({
  name: 'moodboard',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      htmlPayload: {
        default: '',
        parseHTML: element => element.getAttribute('data-payload') || ''
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="moodboard"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-type': 'moodboard', 'data-payload': HTMLAttributes.htmlPayload }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MoodboardNodeView);
  }
});
