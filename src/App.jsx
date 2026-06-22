import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { VoiceRecorder } from './components/VoiceRecorder';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { storage } from './services/storage';

function App() {
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  
  const [settings, setSettings] = useState({ apiKey: '', appTheme: 'light' });
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    // Initial Load
    const loadedFolders = storage.getFolders();
    const loadedNotes = storage.getNotes();
    const loadedSettings = storage.getSettings();
    
    setFolders(loadedFolders);
    setNotes(loadedNotes);
    setSettings(loadedSettings);
    
    if (loadedFolders.length > 0) {
      setActiveFolderId(loadedFolders[0].id);
    }
  }, []);

  useEffect(() => {
    document.body.className = settings.appTheme || 'light';
  }, [settings.appTheme]);

  const handleAddFolder = (name) => {
    const newFolder = storage.saveFolder(name);
    setFolders([...folders, newFolder]);
    setActiveFolderId(newFolder.id);
  };

  const handleSaveSettings = (newSettings) => {
    storage.saveSettings(newSettings);
    setSettings(newSettings);
    setShowSettings(false);
  };

  const handleRecordStart = () => {
    let targetFolderId = activeFolderId;
    let targetNoteId = activeNoteId;
    let currentFolders = [...folders];

    if (!targetNoteId) {
      if (!targetFolderId) {
        if (currentFolders.length === 0) {
          const newFolder = storage.saveFolder("Geral");
          currentFolders.push(newFolder);
          setFolders(currentFolders);
          targetFolderId = newFolder.id;
          setActiveFolderId(newFolder.id);
        } else {
          targetFolderId = currentFolders[0].id;
          setActiveFolderId(targetFolderId);
        }
      }
      
      const newNote = storage.saveNote(targetFolderId, "Nota de Voz Automática", "");
      setNotes(prev => [...prev, newNote]);
      setActiveNoteId(newNote.id);
      targetNoteId = newNote.id;
    }
    return targetNoteId;
  };

  const handleTranscriptChunk = (noteId, chunkText) => {
    setNotes(prevNotes => {
      const currentNote = prevNotes.find(n => n.id === noteId);
      if (currentNote) {
        let newTitle = currentNote.title;
        if (newTitle === 'Nova Nota' || newTitle === 'Nota de Voz Automática') {
          const stopWords = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'que', 'qual', 'vez', 'e', 'ou', 'mas', 'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'meu', 'minha', 'seu', 'sua']);
          const words = chunkText.split(/\s+/).filter(w => w.length > 2);
          let bestWord = '';
          for (let w of words) {
            const cleanWord = w.toLowerCase().replace(/[^a-zãõáéíóúâêîôûç]/g, '');
            if (!stopWords.has(cleanWord)) {
              if (cleanWord.length > bestWord.length) bestWord = cleanWord;
            }
          }
          if (bestWord) {
            newTitle = bestWord.charAt(0).toUpperCase() + bestWord.slice(1);
          }
        }

        const newBlocks = [...(currentNote.blocks || [])];
        const lastBlock = newBlocks[newBlocks.length - 1];
        
        if (lastBlock && lastBlock.type === 'transcription') {
          // Append to existing transcription block
          lastBlock.text = lastBlock.text ? lastBlock.text + ' ' + chunkText : chunkText;
        } else {
          // Create new transcription block
          newBlocks.push({
            id: crypto.randomUUID(),
            type: 'transcription',
            text: chunkText
          });
        }
        
        const updatedNote = storage.updateNote(noteId, { blocks: newBlocks, title: newTitle });
        return prevNotes.map(n => n.id === noteId ? updatedNote : n);
      }
      return prevNotes;
    });
  };

  const handleCreateEmptyNote = () => {
    if (!activeFolderId) {
      alert("Please select or create a folder first.");
      return;
    }
    const newNote = storage.saveNote(activeFolderId, "Nova Nota", "");
    setNotes([...notes, newNote]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (noteId, updates) => {
    const updated = storage.updateNote(noteId, updates);
    if (updated) {
      setNotes(notes.map(n => n.id === noteId ? updated : n));
    }
  };

  const handleRenameFolder = (folderId, newName) => {
    const updated = storage.updateFolder(folderId, newName);
    if (updated) {
      setFolders(folders.map(f => f.id === folderId ? updated : f));
    }
  };

  const handleDeleteNote = (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      storage.deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }
    }
  };

  const filteredNotes = notes.filter(n => n.folderId === activeFolderId)
                             .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const activeNote = notes.find(n => n.id === activeNoteId);
  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div className="app-container">
      <Sidebar 
        folders={folders} 
        activeFolderId={activeFolderId} 
        onSelectFolder={id => { setActiveFolderId(id); setActiveNoteId(null); }}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => setShowExportModal(true)}
      />
      
      <NoteList 
        folderName={activeFolder?.name}
        notes={filteredNotes}
        activeNoteId={activeNoteId}
        onSelectNote={setActiveNoteId}
        onCreateEmptyNote={handleCreateEmptyNote}
      />
      
      <Editor note={activeNote} onDelete={handleDeleteNote} onUpdateNote={handleUpdateNote} />
      
      <VoiceRecorder onRecordStart={handleRecordStart} onTranscriptChunk={handleTranscriptChunk} />

      {showSettings && (
        <SettingsModal 
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showExportModal && (
        <ExportModal 
          folders={folders}
          notes={notes}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

export default App;
