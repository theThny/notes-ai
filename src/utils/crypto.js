const DB_NAME = 'NotesAIVaultDB';
const STORE_NAME = 'VaultKeys';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const getKeyFromDB = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('aes-gcm-key');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveKeyToDB = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(key, 'aes-gcm-key');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Recupera a chave do IndexedDB. Se não existir, gera uma nova e a salva.
 * Usa extractable: false para segurança.
 */
export const getOrGenerateKey = async () => {
  let key = await getKeyFromDB();
  if (!key) {
    key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false, // extractable: false (cannot be exported, only used inside browser memory)
      ["encrypt", "decrypt"]
    );
    await saveKeyToDB(key);
  }
  return key;
};

const base64ToUint8 = (base64) => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

/**
 * Criptografa dados em JSON com AES-GCM.
 */
export const encryptData = async (data, key) => {
  if (!key) throw new Error("Encryption key is missing");
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(data));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );

  const bytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return {
    ciphertext: btoa(binary),
    iv: btoa(String.fromCharCode.apply(null, iv))
  };
};

/**
 * Descriptografa dados com AES-GCM.
 */
export const decryptData = async (encryptedObj, key) => {
  if (!key) throw new Error("Decryption key is missing");
  if (!encryptedObj || !encryptedObj.ciphertext || !encryptedObj.iv) return null;

  const ivBuffer = base64ToUint8(encryptedObj.iv);
  const ciphertextBuffer = base64ToUint8(encryptedObj.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer));
};
