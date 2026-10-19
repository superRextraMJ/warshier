/*
 * Penyimpanan lokal: IndexedDB.
 * Satu object store untuk data aplikasi, satu untuk file gambar (Blob).
 */
(function () {
  'use strict';

  const DB_NAME = 'kasir-warung';
  const DB_VERSION = 1;
  const STATE_KEY = 'state';
  const STATE_STORE = 'app';
  const IMAGE_STORE = 'images';

  let dbPromise = null;

  function openDatabase() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB tidak tersedia.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE);
        }
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          db.createObjectStore(IMAGE_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = function () {
        const db = request.result;
        db.onversionchange = function () {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = function () {
        reject(request.error || new Error('Gagal membuka IndexedDB.'));
      };

      request.onblocked = function () {
        reject(new Error('Penyimpanan sedang digunakan oleh tab lain.'));
      };
    });

    return dbPromise;
  }

  async function getState() {
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STATE_STORE, 'readonly');
      const req = tx.objectStore(STATE_STORE).get(STATE_KEY);
      req.onsuccess = function () {
        resolve(req.result || null);
      };
      req.onerror = function () {
        reject(req.error || new Error('Gagal membaca data.'));
      };
    });
  }

  async function setState(state) {
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STATE_STORE, 'readwrite');
      tx.objectStore(STATE_STORE).put(state, STATE_KEY);
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error || new Error('Gagal menyimpan data.'));
      };
      tx.onabort = function () {
        reject(tx.error || new Error('Penyimpanan dibatalkan.'));
      };
    });
  }

  async function getAllImages() {
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const req = tx.objectStore(IMAGE_STORE).getAll();
      req.onsuccess = function () {
        resolve(req.result || []);
      };
      req.onerror = function () {
        reject(req.error || new Error('Gagal membaca gambar.'));
      };
    });
  }

  async function getImage(id) {
    if (!id) return null;
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const req = tx.objectStore(IMAGE_STORE).get(id);
      req.onsuccess = function () {
        resolve(req.result || null);
      };
      req.onerror = function () {
        reject(req.error || new Error('Gagal membaca gambar.'));
      };
    });
  }

  async function putImage(record) {
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      tx.objectStore(IMAGE_STORE).put(record);
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error || new Error('Gagal menyimpan gambar.'));
      };
      tx.onabort = function () {
        reject(tx.error || new Error('Penyimpanan gambar dibatalkan.'));
      };
    });
  }

  async function deleteImage(id) {
    if (!id) return;
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      tx.objectStore(IMAGE_STORE).delete(id);
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error || new Error('Gagal menghapus gambar.'));
      };
    });
  }

  /*
   * Dipakai saat impor cadangan. Data dan gambar diganti dalam satu transaksi
   * supaya tidak ada keadaan setengah jadi.
   */
  async function replaceAll(state, imageRecords) {
    const db = await openDatabase();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction([STATE_STORE, IMAGE_STORE], 'readwrite');
      const imageStore = tx.objectStore(IMAGE_STORE);
      imageStore.clear();
      (imageRecords || []).forEach(function (record) {
        imageStore.put(record);
      });
      tx.objectStore(STATE_STORE).put(state, STATE_KEY);
      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = function () {
        reject(tx.error || new Error('Gagal memulihkan cadangan.'));
      };
      tx.onabort = function () {
        reject(tx.error || new Error('Pemulihan cadangan dibatalkan.'));
      };
    });
  }

  window.AppDB = {
    getState: getState,
    setState: setState,
    getAllImages: getAllImages,
    getImage: getImage,
    putImage: putImage,
    deleteImage: deleteImage,
    replaceAll: replaceAll
  };
})();
