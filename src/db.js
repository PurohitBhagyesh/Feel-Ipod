// --- FeelPod Music & Media Local Database (IndexedDB) ---
const DB_NAME = 'FeelPodMusicDB';
const DB_VERSION = 2;
const STORE_NAME = 'tracks';
const SETTINGS_STORE = 'settings';

let dbPromise = null;

export function openMusicDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'uniqueKey' });
        store.createIndex('dateAdded', 'dateAdded', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Checks if a track with uniqueKey already exists in the local database
 */
export async function isTrackStored(uniqueKey) {
  try {
    const db = await openMusicDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(uniqueKey);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Track existence check failed:', err);
    return false;
  }
}

/**
 * Stores a single track record in IndexedDB
 */
export async function saveTrack(trackRecord) {
  try {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(trackRecord);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.error('Failed to store track:', e.target.error);
        reject(e.target.error);
      };
    });
  } catch (err) {
    console.error('saveTrack error:', err);
    return false;
  }
}

/**
 * Loads all stored tracks from IndexedDB, ordered by dateAdded
 */
export async function getAllStoredTracks() {
  try {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('dateAdded');
      const req = index.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('getAllStoredTracks error:', err);
    return [];
  }
}

/**
 * Deletes a stored track by uniqueKey
 */
export async function deleteTrack(uniqueKey) {
  try {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(uniqueKey);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('deleteTrack error:', err);
    return false;
  }
}

/**
 * Helper to generate a collision-free deterministic unique key for audio files
 */
export function getFileUniqueKey(file) {
  return `${file.name.trim().toLowerCase()}_${file.size}_${file.lastModified || 0}`;
}

/**
 * Stores custom background wallpaper (image Blob or video Blob) in IndexedDB
 */
export async function saveCustomBackground(blob, type = 'image') {
  try {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.put({ key: 'custom_bg', blob, type, timestamp: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('saveCustomBackground error:', err);
    return false;
  }
}

/**
 * Retrieves the stored custom background from IndexedDB
 */
export async function getCustomBackground() {
  try {
    const db = await openMusicDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.get('custom_bg');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('getCustomBackground error:', err);
    return null;
  }
}

/**
 * Removes custom background from IndexedDB
 */
export async function clearCustomBackground() {
  try {
    const db = await openMusicDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.delete('custom_bg');
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('clearCustomBackground error:', err);
    return false;
  }
}
