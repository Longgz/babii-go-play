import { getBackend } from './backend.js';
import { names } from './players.js';
import { store } from './store.js';
import { notifyCfg, push } from './notify.js';
import { getAvatar } from './avatar.js';

let b, cur = null, members = {}, stop = () => {};
const subs = new Set(), emit = () => subs.forEach(f => f());
export const onChange = f => (subs.add(f), () => subs.delete(f));
export const session = {
  get room() { return cur; },
  get me() { return b && { uid: b.uid, name: names[0] }; },
  get mode() { return b?.mode; }
};
const order = m => Object.entries(m || {}).sort((x, y) => x[1].at - y[1].at).map(([uid, v]) => ({ uid, name: v.name, ntfy: v.ntfy, avatar: v.avatar }));

async function enter(code, create) {
  const base = 'rooms/' + code, mine = await b.get(`${base}/members/${b.uid}`);
  const upd = { [`members/${b.uid}`]: { name: names[0], at: mine?.at ?? Date.now(), ntfy: notifyCfg.on ? notifyCfg.topic : null, avatar: getAvatar() } };
  if (create) upd.host = b.uid;
  await b.update(base, upd);
  members = (await b.get(base + '/members')) || {};
  stop(); stop = b.on(base + '/members', m => { members = m || {}; emit(); });
  // room.watch/set/update dùng đường dẫn tương đối trong phòng, ví dụ 'g/caro'
  cur = { code, watch: (s, cb) => b.on(`${base}/${s}`, cb), set: (s, v) => b.set(`${base}/${s}`, v), update: o => b.update(base, o), players: () => order(members) };
  store.set('room', code); emit();
}
export async function init() {
  b = await getBackend();
  const c = store.get('room', null);
  if (c && await b.get(`rooms/${c}/host`)) await enter(c).catch(() => {});
}
const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const createRoom = () => enter(Array.from({ length: 6 }, () => L[Math.random() * L.length | 0]).join(''), true);
export async function joinRoom(code) {
  code = code.trim().toUpperCase();
  if (!code || !(await b.get(`rooms/${code}/host`))) throw new Error('Không tìm thấy phòng');
  return enter(code);
}
export function leaveRoom() { stop(); cur = null; store.set('room', null); emit(); }
export const rename = () => cur && b.set(`rooms/${cur.code}/members/${b.uid}/name`, names[0]);

// Bật/tắt thông báo: ghi chủ đề của mình vào phòng để người khác gửi tới
export function setNotify(on) { notifyCfg.on = on; if (cur) b.set(`rooms/${cur.code}/members/${b.uid}/ntfy`, on ? notifyCfg.topic : null); }
// Gửi thông báo cho các thành viên khác (uids = null là tất cả), chỉ những ai đã bật
export function ping(uids, text) {
  if (!cur) return;
  push([...new Set(order(members).filter(p => p.uid !== b.uid && p.ntfy && (!uids || uids.includes(p.uid))).map(p => p.ntfy))], text);
}

// Cập nhật avatar của mình trong phòng sau khi chỉnh sửa
export const syncAvatar = () => cur && b.set(`rooms/${cur.code}/members/${b.uid}/avatar`, getAvatar());
