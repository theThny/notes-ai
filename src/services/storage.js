import { cleanText } from '../utils/sanitize';
import { encryptData, decryptData, getOrGenerateKey } from '../utils/crypto';

const FOLDERS_KEY = 'arandu_notes_folders';
const NOTES_KEY   = 'arandu_notes_notes';
const SETTINGS_KEY = 'arandu_notes_settings';

// ─── Migration Script (Executado 1x na carga) ──────────────────────────────────
try {
  const migrateKey = (oldKey, newKey) => {
    const oldData = localStorage.getItem(oldKey);
    if (oldData && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldData);
    }
  };
  migrateKey('notes_ai_folders', FOLDERS_KEY);
  migrateKey('notes_ai_notes', NOTES_KEY);
  migrateKey('notes_ai_settings', SETTINGS_KEY);
  migrateKey('notes_ai_username', 'arandu_notes_username');
} catch (e) {
  console.warn("Falha na migração dos dados antigos", e);
}

// ─── Low-level helpers ────────────────────────────────────────────────────────

const secureSetItem = async (key, data) => {
  const cryptoKey = await getOrGenerateKey();
  const encrypted = await encryptData(data, cryptoKey);
  localStorage.setItem(key, JSON.stringify(encrypted));
};

const secureGetItem = async (key, defaultData) => {
  const cryptoKey = await getOrGenerateKey();
  const raw = localStorage.getItem(key);
  if (!raw) return defaultData;

  let parsed;
  try { parsed = JSON.parse(raw); } catch { return defaultData; }

  // Missing ciphertext (invalid format) -> reject
  if (!parsed || typeof parsed !== 'object' || !parsed.ciphertext) return defaultData;

  try {
    return await decryptData(parsed, cryptoKey);
  } catch {
    return defaultData;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const storage = {

  // ── Folders ──────────────────────────────────────────────────────────────

  getFolders: async () => {
    const defaultFolders = [{ id: 'default', name: 'General' }];
    const data = await secureGetItem(FOLDERS_KEY, null);
    if (!data) {
      await secureSetItem(FOLDERS_KEY, defaultFolders);
      return defaultFolders;
    }
    return data;
  },

  saveFolder: async (folders, name) => {
    const newFolder = { id: crypto.randomUUID(), name: cleanText(name) };
    const updated = [...folders, newFolder];
    await secureSetItem(FOLDERS_KEY, updated);
    return newFolder;
  },

  updateFolder: async (folders, folderId, newName) => {
    const updated = folders.map(f =>
      f.id === folderId ? { ...f, name: cleanText(newName) } : f
    );
    await secureSetItem(FOLDERS_KEY, updated);
    return updated.find(f => f.id === folderId) || null;
  },

  // ── Notes ─────────────────────────────────────────────────────────────────

  getNotes: async () => {
    return await secureGetItem(NOTES_KEY, []);
  },

  // Creates a brand-new note record and persists it.
  // Receives the CURRENT notes array to avoid an extra read.
  createNote: async (notes, folderId, title) => {
    const newNote = {
      id: crypto.randomUUID(),
      folderId,
      title: cleanText(title),
      content: '',
      createdAt: new Date().toISOString()
    };
    await secureSetItem(NOTES_KEY, [...notes, newNote]);
    return newNote;
  },

  // Persists the entire notes array.
  // The caller is responsible for mutating the array correctly.
  // DOMPurify sanitization is applied here, right before encryption.
  persistNotes: async (notes) => {
    const sanitized = notes.map(note => ({
      ...note,
      title: cleanText(note.title),
      content: cleanText(note.content || ''),
      blocks: []
    }));
    await secureSetItem(NOTES_KEY, sanitized);
  },

  deleteNote: async (notes, noteId) => {
    const updated = notes.filter(n => n.id !== noteId);
    await secureSetItem(NOTES_KEY, updated);
    return updated;
  },

  // ── Settings ──────────────────────────────────────────────────────────────

  getSettings: async () => {
    const data = await secureGetItem(SETTINGS_KEY, {});
    return {
      geminiKey:      data.geminiKey      || '',
      groqKey:        data.groqKey        || '',
      activeProvider: data.activeProvider || 'gemini',
      appTheme:       data.appTheme       || 'light',
      interactiveMode: data.interactiveMode || false
    };
  },

  saveSettings: async (settings) => {
    await secureSetItem(SETTINGS_KEY, settings);
    // Remove legacy unencrypted keys
    ['geminiKey', 'groqKey', 'activeProvider', 'appTheme'].forEach(k =>
      localStorage.removeItem(k)
    );
  }
};
