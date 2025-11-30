
import { Book, Settings, DEFAULT_SETTINGS } from "../types";
import { DB_NAME, STORE_BOOKS, STORE_SETTINGS } from "../constants";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveBook = async (book: Book): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    tx.objectStore(STORE_BOOKS).put(book);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteBook = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readwrite');
    tx.objectStore(STORE_BOOKS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readonly');
    const req = tx.objectStore(STORE_BOOKS).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const getAllBooks = async (): Promise<Book[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BOOKS, 'readonly');
    const req = tx.objectStore(STORE_BOOKS).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    tx.objectStore(STORE_SETTINGS).put({ id: 'user_settings', ...settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getSettings = async (): Promise<Settings> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const req = tx.objectStore(STORE_SETTINGS).get('user_settings');
    // Merge with DEFAULT_SETTINGS to ensure all fields are present (e.g. if new fields were added)
    req.onsuccess = () => {
      const saved = req.result ? (({ id, ...s }) => s)(req.result) : {};
      resolve({ ...DEFAULT_SETTINGS, ...saved });
    };
    req.onerror = () => reject(req.error);
  });
};
