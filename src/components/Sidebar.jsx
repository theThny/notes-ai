import React, { useState } from 'react';
import { Folder, Plus, Settings, Check, Download, Home, Search, Lightbulb, CheckSquare, Trash } from 'lucide-react';

export const Sidebar = ({ 
  isOpen, 
  currentView,
  onClose, 
  folders, 
  notes = [], 
  activeNoteId, 
  activeFolderId,
  onSelectNote,
  onSelectFolder, 
  onGoHome, 
  onGoTrash,
  onAddFolder, 
  onRenameFolder, 
  onOpenSettings, 
  onOpenExport 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    onSelectFolder(folderId); // Manter o comportamento original de seleção
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAdding(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="md-hidden" 
          onClick={onClose} 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1999 }} 
        />
      )}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        
        {/* Header com Search */}
        <div style={{ padding: '24px 20px 0 20px' }}>
          <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Arandu Notes</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="icon-btn" onClick={onOpenExport} title="Exportar Notas">
                <Download size={16} />
              </button>
              <button className="icon-btn" onClick={onOpenSettings} title="Configurações">
                <Settings size={16} />
              </button>
            </div>
          </div>
          
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Buscar..." />
            <div className="search-shortcut">⌘K</div>
          </div>
        </div>
        
        <div className="folder-list">
          
          {/* Menu de Navegação Principal */}
          <div style={{ marginBottom: '32px' }}>
            <div className={`nav-item ${currentView === 'home' ? 'active' : ''}`} onClick={onGoHome}>
              <Home size={18} />
              <span>Início</span>
            </div>
            <div className="nav-item">
              <Lightbulb size={18} />
              <span>Ideias Soltas</span>
            </div>
            <div className="nav-item">
              <CheckSquare size={18} />
              <span>Tarefas</span>
            </div>
            <div className={`nav-item ${currentView === 'trash' ? 'active' : ''}`} onClick={onGoTrash}>
              <Trash size={18} />
              <span>Lixeira</span>
            </div>
          </div>

          <div className="section-title">
            <span>PASTAS</span>
            <Plus size={16} onClick={() => setIsAdding(true)} style={{ cursor: 'pointer', opacity: 0.6 }} />
          </div>

          {isAdding && (
            <form onSubmit={handleAdd} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input 
                autoFocus
                className="input-field"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={(e) => {
                  if (!e.relatedTarget && !newFolderName) setIsAdding(false);
                }}
                placeholder="Nova pasta..."
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="icon-btn" style={{ marginLeft: '4px' }}>
                <Check size={16} />
              </button>
            </form>
          )}

          {/* Acordeão de Pastas */}
          {folders.map(folder => {
            const folderNotes = notes.filter(n => n.folderId === folder.id);
            const isExpanded = expandedFolders[folder.id];

            return (
              <div key={folder.id}>
                <div 
                  className={`folder-item ${activeFolderId === folder.id ? 'active' : ''}`}
                  onClick={() => toggleFolder(folder.id)}
                  onDoubleClick={() => setEditingFolderId(folder.id)}
                  title="Duplo clique para renomear"
                >
                  <Folder size={18} className="folder-icon" />
                  
                  {editingFolderId === folder.id ? (
                    <input
                      autoFocus
                      className="input-field"
                      style={{ padding: '2px 6px', margin: '-3px 0', height: '24px', flex: 1 }}
                      defaultValue={folder.name}
                      onBlur={(e) => {
                        if (e.target.value.trim()) onRenameFolder(folder.id, e.target.value.trim());
                        setEditingFolderId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="folder-name">{folder.name}</span>
                      <span className="folder-badge">{folderNotes.length}</span>
                    </>
                  )}
                </div>

                {isExpanded && folderNotes.length > 0 && (
                  <div className="folder-children">
                    {folderNotes.map(note => (
                      <div 
                        key={note.id}
                        className={`note-child-item ${activeNoteId === note.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote(note.id);
                        }}
                      >
                        {note.title || 'Sem Título'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Profile Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">JS</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="user-name">João Silva</span>
              <span className="user-plan">Plano Pro</span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};
