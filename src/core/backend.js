import { firebaseConfig as cfg } from '../firebase-config.js';
// Giao diện chung: { mode, uid, get(p), set(p,v), update(p,{đường dẫn con: giá trị}), on(p,cb)->hủy }
const ready = () => cfg.apiKey && !cfg.apiKey.startsWith('ĐIỀN');

async function remote() {
  const [{ initializeApp }, { getAuth, signInAnonymously }, db] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/database')]);
  const app = initializeApp(cfg), cred = await signInAnonymously(getAuth(app)), d = db.getDatabase(app), r = p => db.ref(d, p);
  return { mode: 'firebase', uid: cred.user.uid,
    get: async p => (await db.get(r(p))).val(),
    set: (p, v) => db.set(r(p), v), update: (p, o) => db.update(r(p), o),
    transact: async (p, fn) => {
      await db.get(r(p));
      const result = await db.runTransaction(r(p), fn, { applyLocally: false });
      return { committed: result.committed, value: result.snapshot.val() };
    },
    on: (p, cb) => db.onValue(r(p), s => cb(s.val())) };
}

// Chế độ thử: dữ liệu trong localStorage, đồng bộ giữa các tab. Mỗi tab là một người chơi.
function local() {
  const uid = sessionStorage.sduid || (sessionStorage.sduid = 'u' + Math.random().toString(36).slice(2, 8));
  const read = () => { try { return JSON.parse(localStorage.getItem('sdb') || '{}'); } catch { return {}; } };
  const at = (t, p) => p.split('/').reduce((n, k) => n && n[k], t);
  const put = (t, p, v) => { const ks = p.split('/'), l = ks.pop(); let n = t; for (const k of ks) n = n[k] ??= {}; v == null ? delete n[l] : n[l] = v; };
  const subs = new Set(), fire = () => {
    const t = read();
    subs.forEach(s => {
      const value = at(t, s.p) ?? null, encoded = JSON.stringify(value);
      if (encoded !== s.last) { s.last = encoded; s.cb(value); }
    });
  };
  addEventListener('storage', e => e.key === 'sdb' && fire());
  const write = fn => {
    const run = () => {
      const t = read(), result = fn(t);
      localStorage.setItem('sdb', JSON.stringify(t)); fire();
      return result;
    };
    // Serialize read/modify/write across tabs, including ordinary room updates.
    return navigator.locks ? navigator.locks.request('babii-local-db', run) : Promise.resolve().then(run);
  };
  return { mode: 'local', uid,
    get: async p => at(read(), p) ?? null,
    set: async (p, v) => write(t => put(t, p, v)),
    update: async (p, o) => write(t => { for (const k in o) put(t, p + '/' + k, o[k]); }),
    transact: (p, fn) => {
      if (!navigator.locks) return Promise.reject(new Error('Trình duyệt này chưa hỗ trợ đồng bộ an toàn giữa các tab. Hãy dùng trình duyệt mới qua HTTPS hoặc localhost.'));
      return write(t => {
        const current = at(t, p) ?? null, value = fn(current);
        if (value === undefined) return { committed: false, value: current };
        put(t, p, value);
        return { committed: true, value };
      });
    },
    on: (p, cb) => {
      const value = at(read(), p) ?? null, s = { p, cb, last: JSON.stringify(value) };
      subs.add(s); cb(value); return () => subs.delete(s);
    } };
}

let b;
export async function getBackend() {
  if (!b) { try { b = ready() ? await remote() : local(); } catch (e) { console.warn('Firebase lỗi, dùng chế độ thử', e); b = local(); } }
  return b;
}
