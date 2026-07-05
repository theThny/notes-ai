import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { VoiceRecorder } from './components/VoiceRecorder';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { Toast } from './components/Notifications';
import { storage } from './services/storage';
import { Home } from './components/Home';

function App() {
  const [folders, setFolders]           = useState([]);
  const [notes, setNotes]               = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [currentView, setCurrentView]   = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings]         = useState({ apiKey: '', appTheme: 'light' });
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Keep a stable ref to the latest notes for use inside callbacks ─────────
  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // ── Debounced background persist ───────────────────────────────────────────
  // The timer fires 1 second after the last state change, never blocking the UI.
  const persistTimer = useRef(null);
  const schedulePersist = useCallback((latestNotes) => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      storage.persistNotes(latestNotes);
    }, 1000);
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [loadedFolders, loadedNotes, loadedSettings] = await Promise.all([
        storage.getFolders(),
        storage.getNotes(),
        storage.getSettings()
      ]);

      let changed = false;
      const migratedNotes = loadedNotes.map(n => {
        let newTitle = n.title;
        let newContent = n.content;
        let noteChanged = false;

        // Limpa o título (Remove [MM:SS] e capitaliza)
        if (newTitle) {
          const originalTitle = newTitle;
          newTitle = newTitle.replace(/\[\d{2}:\d{2}\]\s*/g, '').trim();
          if (newTitle.length > 0) {
            newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
          }
          if (newTitle !== originalTitle) noteChanged = true;
        }

        // Capitaliza início de frases no conteúdo (após tag HTML de parágrafo, ou ponto final)
        if (newContent) {
          const originalContent = newContent;
          newContent = newContent.replace(/(>|\.\s+)([a-zãõáéíóúâêîôûç])/g, (match, p1, p2) => {
            return p1 + p2.toUpperCase();
          });
          
          // E também o primeiríssimo caractere se não tiver tag
          if (newContent.length > 0 && /^[a-zãõáéíóúâêîôûç]/.test(newContent)) {
             newContent = newContent.charAt(0).toUpperCase() + newContent.slice(1);
          }

          if (newContent !== originalContent) noteChanged = true;
        }

        if (noteChanged) {
          changed = true;
          return { ...n, title: newTitle, content: newContent };
        }
        return n;
      });

      if (changed) {
        await storage.persistNotes(migratedNotes);
      }

      setFolders(loadedFolders);
      setNotes(migratedNotes);
      setSettings(loadedSettings);
      if (loadedFolders.length > 0) setActiveFolderId(loadedFolders[0].id);
    })();
  }, []);

  useEffect(() => {
    document.body.className = settings.appTheme || 'light';
  }, [settings.appTheme]);

  // ── Folders ────────────────────────────────────────────────────────────────

  const handleAddFolder = useCallback(async (name) => {
    const newFolder = await storage.saveFolder(folders, name);
    setFolders(prev => [...prev, newFolder]);
    setActiveFolderId(newFolder.id);
  }, [folders]);

  const handleRenameFolder = useCallback(async (folderId, newName) => {
    const updated = await storage.updateFolder(folders, folderId, newName);
    if (updated) setFolders(prev => prev.map(f => f.id === folderId ? updated : f));
  }, [folders]);

  // ── Settings ───────────────────────────────────────────────────────────────

  const handleSaveSettings = useCallback(async (newSettings) => {
    await storage.saveSettings(newSettings);
    setSettings(newSettings);
    setShowSettings(false);
  }, []);

  // ── Notes: creation ────────────────────────────────────────────────────────

  const handleCreateEmptyNote = useCallback(async () => {
    if (!activeFolderId) { setToastMessage("Selecione ou crie uma pasta primeiro."); return; }
    const newNote = await storage.createNote(notesRef.current, activeFolderId, "Nova Nota");
    setNotes(prev => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    setCurrentView('editor');
  }, [activeFolderId]);

  // ── Voice: recording starts ────────────────────────────────────────────────
  // Returns the target noteId synchronously so VoiceRecorder can store it.
  const handleRecordStart = useCallback(async () => {
    let folderId = activeFolderId;
    const currentFolders = folderId ? folders : [];

    if (!folderId) {
      if (currentFolders.length === 0) {
        const newFolder = await storage.saveFolder(folders, "Geral");
        setFolders(prev => [...prev, newFolder]);
        folderId = newFolder.id;
        setActiveFolderId(folderId);
      } else {
        folderId = currentFolders[0].id;
        setActiveFolderId(folderId);
      }
    }

    // If there's already an active note, reuse it
    if (activeNoteId) return activeNoteId;

    const newNote = await storage.createNote(notesRef.current, folderId, "Nota de Voz");
    setNotes(prev => [...prev, newNote]);
    setActiveNoteId(newNote.id);
    return newNote.id;
  }, [activeFolderId, activeNoteId, folders]);

  // ── Voice: each final transcript chunk ────────────────────────────────────
  // Pure in-memory update — NO storage call here. The debounce handles persistence.
  const handleTranscriptChunk = useCallback((noteId, chunkText) => {
    setNotes(prev => {
      const updated = prev.map(note => {
        if (note.id !== noteId) return note;

        // Auto-title from first spoken word
        let title = note.title;
        if (title === 'Nova Nota' || title === 'Nota de Voz') {
          const stopWords = new Set(['o','a','os','as','um','uma','uns','umas','de','do','da','dos','das','em','no','na','nos','nas','por','para','com','que','qual','vez','e','ou','mas','eu','tu','ele','ela','nos','vos','eles','elas','meu','minha','seu','sua']);
          const words = chunkText.split(/\s+/).filter(w => w.length > 2);
          let best = '';
          for (const w of words) {
            const clean = w.toLowerCase().replace(/[^a-zãõáéíóúâêîôûç]/g, '');
            if (!stopWords.has(clean) && clean.length > best.length) best = clean;
          }
          if (best) title = best.charAt(0).toUpperCase() + best.slice(1);
        }

        // Não inserimos mais o timestamp a cada chunk para evitar repetições no Android
        const newChunkHtml = chunkText;
        // Emit event for TipTap Editor to insert text imperatively se já estiver aberto
        window.dispatchEvent(new CustomEvent('onVoiceTranscript', { 
          detail: { noteId, chunkText: newChunkHtml } 
        }));

        // Salva no estado global para que o TipTap recupere caso ainda esteja montando (evita perda de texto)
        const newContent = (note.content || '') + newChunkHtml;
        return { ...note, title, content: newContent };
      });

      // Schedule background persist with the new state
      schedulePersist(updated);
      return updated;
    });
  }, [schedulePersist]);

  // ── Notes: manual edits (from Editor) ─────────────────────────────────────
  const handleUpdateNote = useCallback((noteId, updates) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, ...updates } : n);
      schedulePersist(updated);
      return updated;
    });
  }, [schedulePersist]);

  // ── Notes: move to folder ──────────────────────────────────────────────────
  const handleMoveNote = useCallback((noteId, newFolderId) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === noteId ? { ...n, folderId: newFolderId } : n);
      schedulePersist(updated);
      return updated;
    });
  }, [schedulePersist]);

  // ── Notes: delete ──────────────────────────────────────────────────────────
  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm("Tem certeza que deseja excluir esta nota?")) return;
    const updated = await storage.deleteNote(notesRef.current, noteId);
    setNotes(updated);
    if (activeNoteId === noteId) {
      setActiveNoteId(null);
      setCurrentView('home');
    }
  }, [activeNoteId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const filteredNotes = notes
    .filter(n => n.folderId === activeFolderId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const activeNote  = notes.find(n => n.id === activeNoteId);
  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div className="app-container w-full max-w-[100vw] overflow-x-hidden min-w-0">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        folders={folders}
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={id => { setActiveNoteId(id); setCurrentView('editor'); setIsSidebarOpen(false); }}
        activeFolderId={activeFolderId}
        onSelectFolder={id => { setActiveFolderId(id); }}
        onGoHome={() => { setActiveNoteId(null); setCurrentView('home'); setIsSidebarOpen(false); }}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onOpenSettings={() => { setShowSettings(true); setIsSidebarOpen(false); }}
        onOpenExport={() => { setShowExportModal(true); setIsSidebarOpen(false); }}
      />


      {currentView === 'home' ? (
        <Home 
          notes={notes} 
          folders={folders} 
          onSelectNote={id => { setActiveNoteId(id); setCurrentView('editor'); setIsSidebarOpen(false); }} 
          onDeleteNote={handleDeleteNote}
          onMoveNote={handleMoveNote}
        />
      ) : (
        <Editor 
          note={activeNote} 
          onDelete={handleDeleteNote} 
          onUpdateNote={handleUpdateNote} 
          settings={settings} 
          onBack={() => { setActiveNoteId(null); setCurrentView('home'); }} 
        />
      )}

      <VoiceRecorder onRecordStart={handleRecordStart} onCreateNote={handleCreateEmptyNote} onTranscriptChunk={handleTranscriptChunk} onToast={setToastMessage} onOpenMenu={() => setIsSidebarOpen(true)} currentView={currentView} />

      {showSettings && (
        <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}
      {showExportModal && (
        <ExportModal folders={folders} notes={notes} onClose={() => setShowExportModal(false)} onToast={setToastMessage} />
      )}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default App;
