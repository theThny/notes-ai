import React from 'react';
import { FileText, Plus } from 'lucide-react';

export const NoteList = ({ notes, activeNoteId, onSelectNote, folderName, onCreateEmptyNote }) => {
  return (
    <div className="note-list-container">
      <div className="note-list-header">
        <div className="note-list-title">{folderName || 'Notes'}</div>
        <button className="icon-btn" onClick={onCreateEmptyNote} title="New Note">
          <Plus size={20} />
        </button>
      </div>
      
      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
            No notes in this folder. Start recording!
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.id}
              className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
              onClick={() => onSelectNote(note.id)}
            >
              <div className="note-item-title">{note.title}</div>
              <div className="note-item-preview">{new Date(note.createdAt).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
