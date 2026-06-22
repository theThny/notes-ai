import React, { useState } from 'react';
import { Folder, Plus, Settings, Check, Download } from 'lucide-react';

export const Sidebar = ({ folders, activeFolderId, onSelectFolder, onAddFolder, onRenameFolder, onOpenSettings, onOpenExport }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Notes AI</div>
        <div className="menu-bar">
          <button className="icon-btn" onClick={onOpenExport} title="Export Notes">
            <Download size={20} />
          </button>
          <button className="icon-btn" onClick={() => setIsAdding(true)} title="Add Folder">
            <Plus size={20} />
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className="folder-list">
        {isAdding && (
          <form onSubmit={handleAdd} style={{ padding: '10px', display: 'flex', alignItems: 'center' }}>
            <input 
              autoFocus
              className="input-field"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onBlur={(e) => {
                if (!e.relatedTarget && !newFolderName) setIsAdding(false);
              }}
              placeholder="Folder name..."
              style={{ flex: 1 }}
            />
            <button type="submit" className="icon-btn" style={{ marginLeft: '4px' }}>
              <Check size={18} />
            </button>
          </form>
        )}
        {folders.map(folder => (
          <div 
            key={folder.id}
            className={`folder-item ${activeFolderId === folder.id ? 'active' : ''}`}
            onClick={() => onSelectFolder(folder.id)}
            onDoubleClick={() => setEditingFolderId(folder.id)}
            title="Double click to rename"
          >
            <Folder size={18} className="folder-icon" color="#eab308" fill="#fef08a" style={{ flexShrink: 0 }} />
            {editingFolderId === folder.id ? (
              <input
                autoFocus
                className="input-field"
                style={{ padding: '2px 6px', margin: '-3px 0', height: '24px' }}
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
