const FOLDERS_KEY = 'notes_ai_folders';
const NOTES_KEY = 'notes_ai_notes';
const SETTINGS_KEY = 'notes_ai_settings';

export const storage = {
  // Folders
  getFolders: () => {
    const data = localStorage.getItem(FOLDERS_KEY);
    if (!data) {
      const defaultFolders = [{ id: 'default', name: 'General' }];
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(defaultFolders));
      return defaultFolders;
    }
    return JSON.parse(data);
  },
  
  saveFolder: (name) => {
    const folders = storage.getFolders();
    const newFolder = { id: crypto.randomUUID(), name };
    folders.push(newFolder);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    return newFolder;
  },

  updateFolder: (folderId, newName) => {
    const folders = storage.getFolders();
    const index = folders.findIndex(f => f.id === folderId);
    if (index !== -1) {
      folders[index].name = newName;
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
      return folders[index];
    }
    return null;
  },

  // Notes
  getNotes: () => {
    const data = localStorage.getItem(NOTES_KEY);
    const notes = data ? JSON.parse(data) : [];
    let migrated = false;
    
    notes.forEach(note => {
      if (note.content !== undefined) {
        // Migrate string content to blocks array
        note.blocks = [{
          id: crypto.randomUUID(),
          type: 'transcription',
          text: note.content
        }];
        delete note.content;
        migrated = true;
      }
    });

    if (migrated) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    }
    
    return notes;
  },

  saveNote: (folderId, title, content) => {
    const notes = storage.getNotes();
    const newNote = {
      id: crypto.randomUUID(),
      folderId,
      title,
      blocks: content ? [{ id: crypto.randomUUID(), type: 'transcription', text: content }] : [],
      createdAt: new Date().toISOString()
    };
    notes.push(newNote);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return newNote;
  },

  updateNote: (noteId, updates) => {
    const notes = storage.getNotes();
    const index = notes.findIndex(n => n.id === noteId);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates };
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return notes[index];
    }
    return null;
  },

  deleteNote: (noteId) => {
    const notes = storage.getNotes();
    const filteredNotes = notes.filter(n => n.id !== noteId);
    localStorage.setItem(NOTES_KEY, JSON.stringify(filteredNotes));
  },

  // Settings
  getSettings: () => {
    const data = localStorage.getItem(SETTINGS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    
    // Migration from old `apiKey`
    const legacyKey = parsed.apiKey || '';
    
    return {
      geminiKey: localStorage.getItem('geminiKey') || parsed.geminiKey || legacyKey || '',
      groqKey: localStorage.getItem('groqKey') || parsed.groqKey || '',
      activeProvider: localStorage.getItem('activeProvider') || parsed.activeProvider || 'gemini',
      appTheme: localStorage.getItem('appTheme') || parsed.appTheme || 'light',
      interactiveMode: parsed.interactiveMode || false
    };
  },

  saveSettings: (settings) => {
    localStorage.setItem('geminiKey', settings.geminiKey || '');
    localStorage.setItem('groqKey', settings.groqKey || '');
    localStorage.setItem('activeProvider', settings.activeProvider || 'gemini');
    localStorage.setItem('appTheme', settings.appTheme || 'light');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
};
