import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Lightbulb } from 'lucide-react';
import { expandNoteWithAI } from '../services/ai';
import ReactMarkdown from 'react-markdown';

const BlockTextarea = ({ block, onChange, isActive, onClick }) => {
  const [isEditing, setIsEditing] = useState(block.type === 'transcription');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [block.text, isEditing]);

  if (!isEditing && block.type === 'ai') {
    return (
      <div 
        className="editor-block-textarea block-ai"
        onDoubleClick={() => setIsEditing(true)}
        onClick={onClick}
        style={{ 
          cursor: 'text', 
          minHeight: '60px', 
          display: 'flow-root', 
          flexShrink: 0, 
          height: 'auto',
          boxShadow: isActive ? '0 0 0 2px #ec4899' : 'none',
          transition: 'box-shadow 0.2s ease'
        }}
        title="Duplo clique para editar"
      >
        {block.imageUrl && (
          <img 
            src={block.imageUrl} 
            alt="Wiki Illustration" 
            style={{ float: 'right', margin: '0 0 15px 15px', maxWidth: '200px', borderRadius: '8px', objectFit: 'cover' }} 
          />
        )}
        <ReactMarkdown
          components={{
            a: ({node, ...props}) => <a {...props} className="markdown-link" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'underline', cursor: 'pointer' }} />
          }}
        >
          {block.text}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <textarea 
      ref={textareaRef}
      className={`editor-block-textarea ${block.type === 'ai' ? 'block-ai' : 'block-transcription'}`}
      value={block.text}
      onChange={(e) => onChange(block.id, e.target.value)}
      onBlur={() => {
        if (block.type === 'ai') {
          setIsEditing(false);
        }
      }}
      placeholder={block.type === 'ai' ? "AI expansion..." : "Start typing or recording your voice..."}
      onClick={onClick}
      style={{
        overflow: 'hidden',
        minHeight: '60px',
        display: 'flow-root',
        flexShrink: 0,
        height: 'auto',
        boxShadow: isActive ? '0 0 0 2px #ec4899' : 'none',
        transition: 'box-shadow 0.2s ease'
      }}
    />
  );
};

export const Editor = ({ note, onDelete, onUpdateNote }) => {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [isExpanding, setIsExpanding] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState(null);

  // Sync state when active note changes or gets updated externally (e.g., from voice transcription)
  useEffect(() => {
    if (note) {
      setTitle(prev => prev !== note.title ? (note.title || '') : prev);
      setBlocks(prev => {
        const incoming = note.blocks || [];
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(incoming);
        return isDifferent ? incoming : prev;
      });
    } else {
      setTitle('');
      setBlocks([]);
      setActiveBlockId(null);
    }
  }, [note]);

  // Auto-save debounce for blocks
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (note && JSON.stringify(blocks) !== JSON.stringify(note.blocks || [])) {
        onUpdateNote(note.id, { blocks });
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [blocks, note, onUpdateNote]);

  const handleTitleBlur = () => {
    if (note && title !== note.title) {
      onUpdateNote(note.id, { title });
    }
  };

  const handleBlockChange = (id, newText) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, text: newText } : b));
  };

  const handleExpand = async () => {
    if (blocks.length === 0) return;
    
    let currentBlocks = [...blocks];
    
    let targetBlock = null;
    if (activeBlockId) {
      targetBlock = currentBlocks.find(b => b.id === activeBlockId && b.type === 'transcription');
    }
    if (!targetBlock) {
      targetBlock = [...currentBlocks].reverse().find(b => b.type === 'transcription');
    }

    if (!targetBlock || !targetBlock.text.trim()) {
      alert("Nenhuma gravação de voz encontrada para expandir.");
      return;
    }

    const existingAiBlock = currentBlocks.find(b => b.type === 'ai' && b.sourceId === targetBlock.id);

    if (existingAiBlock) {
      const confirmRebuild = window.confirm('Não é possível, pois já foi feita a expansão por IA nesta nota.\n\nDeseja expandir novamente e substituir a antiga?');
      if (!confirmRebuild) return;
      currentBlocks = currentBlocks.filter(b => b.id !== existingAiBlock.id);
      
      setBlocks(currentBlocks);
      onUpdateNote(note.id, { blocks: currentBlocks });
    }

    setIsExpanding(true);
    try {
      const { text: expandedText, imageUrl } = await expandNoteWithAI(targetBlock.text);
      
      const newBlock = {
        id: crypto.randomUUID(),
        type: 'ai',
        text: expandedText,
        imageUrl,
        sourceId: targetBlock.id
      };
      
      const targetIndex = currentBlocks.findIndex(b => b.id === targetBlock.id);
      const newBlocks = [
        ...currentBlocks.slice(0, targetIndex + 1),
        newBlock,
        ...currentBlocks.slice(targetIndex + 1)
      ];
      
      setBlocks(newBlocks);
      onUpdateNote(note.id, { blocks: newBlocks });
    } catch (e) {
      alert(e.message);
    } finally {
      setIsExpanding(false);
    }
  };

  if (!note) {
    return (
      <div className="editor-container">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Select a note to view or start a new voice recording</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <input 
          className="editor-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Note Title..."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="icon-btn" 
            style={{ 
              backgroundColor: 'var(--btn-bg, var(--primary-color))', 
              color: 'var(--btn-text, #ffffff)', 
              border: '1px solid var(--btn-border, transparent)',
              padding: '6px 12px', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              width: 'max-content',
              opacity: (isExpanding || blocks.length === 0) ? 0.7 : 1,
              cursor: (isExpanding || blocks.length === 0) ? 'not-allowed' : 'pointer'
            }} 
            onClick={handleExpand} 
            disabled={isExpanding || blocks.length === 0}
          >
            <Lightbulb size={16} />
            {isExpanding ? 'Expandindo conhecimento...' : 'Expandir com IA'}
          </button>
          <button className="icon-btn" style={{ color: 'var(--danger-color)' }} onClick={() => onDelete(note.id)} title="Delete Note">
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      <div className="editor-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', paddingBottom: '100px' }}>
        {blocks.map((block) => (
          <BlockTextarea 
            key={block.id} 
            block={block} 
            onChange={handleBlockChange} 
            isActive={activeBlockId === block.id}
            onClick={() => setActiveBlockId(block.id)}
          />
        ))}
        {blocks.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>
            Nota vazia. Clique em "Nova Nota" ou comece a gravar.
          </div>
        )}
      </div>
    </div>
  );
};
