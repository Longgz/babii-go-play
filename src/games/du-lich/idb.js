// Kho ảnh 360° riêng trên máy này (IndexedDB), không đưa lên repo hay máy chủ.
const open = () => new Promise((res, rej) => { const r = indexedDB.open('sd', 1); r.onupgradeneeded = () => r.result.createObjectStore('pano', { keyPath: 'place' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('pano', mode), r = fn(t.objectStore('pano')); t.oncomplete = () => res(r.result); t.onerror = () => rej(t.error); }); };
export const panoPut = v => tx('readwrite', s => s.put(v));
export const panoDel = p => tx('readwrite', s => s.delete(p));
export const panoAll = () => tx('readonly', s => s.getAll());
