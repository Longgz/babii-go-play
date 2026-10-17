import { store } from './store.js';
// Avatar = một đối tượng nhỏ các chỉ số lựa chọn, vẽ bằng các lớp SVG chồng nhau (khung 100x130).
// Thêm kiểu mới: thêm nhãn vào OPT rồi thêm một nhánh vẽ tương ứng trong avatarInner.
export const SKIN = ['#f6d5b8', '#efc29a', '#d9a477', '#b9805a', '#8a5a3c'];
export const HAIRC = ['#1b1b1f', '#4a2e1c', '#8a5a2b', '#d8b45a', '#b8402e', '#8d9bb0'];
export const TOPC = ['#c23b32', '#f4b942', '#26407a', '#2f8a6a', '#d46a9a', '#f3ecda', '#6b4aa0', '#3a3a44'];
export const OPT = {
  hair: ['Ngắn', 'Dài', 'Búi', 'Tết', 'Đầu trọc'], top: ['Áo thun', 'Áo dài', 'Áo bà ba', 'Áo hoodie', 'Sơ mi'],
  hat: ['Không', 'Nón lá', 'Khăn rằn', 'Mũ lưỡi trai', 'Khăn đóng'], acc: ['Không', 'Kính', 'Hoa cài tóc', 'Má hồng'], face: ['Cười', 'Cười tươi', 'Bình thường']
};
export const DEFAULT = { skin: 1, hair: 0, hairC: 0, top: 0, topC: 0, hat: 0, acc: 0, face: 0 };
const LEN = { skin: 5, hair: 5, hairC: 6, top: 5, topC: 8, hat: 5, acc: 4, face: 3 };
const norm = raw => { const a = { ...DEFAULT }; for (const k in LEN) { const v = Math.floor(+raw?.[k]); if (v >= 0 && v < LEN[k]) a[k] = v; } return a; };

export function avatarInner(raw) {
  const a = norm(raw), sk = SKIN[a.skin], hc = HAIRC[a.hairC], tc = TOPC[a.topC];
  const back = [a.hair === 1 && `<path d="M26 44Q24 100 34 104L66 104Q76 100 74 44Z" fill="${hc}"/>`,
    a.hair === 3 && `<path d="M30 54Q20 80 30 102M70 54Q80 80 70 102" stroke="${hc}" stroke-width="7" fill="none" stroke-linecap="round"/>`].filter(Boolean).join('');
  const body = [
    `<path d="M18 130Q20 82 50 78Q80 82 82 130Z" fill="${tc}"/><path d="M40 78Q50 90 60 78Z" fill="${sk}"/>`,
    `<rect x="34" y="104" width="32" height="26" fill="#f3ecda"/><path d="M26 118L28 90Q32 80 50 78Q68 80 72 90L74 118L52 124L50 104L48 124Z" fill="${tc}"/><path d="M42 78Q50 88 58 78" stroke="#fff8" fill="none"/>`,
    `<path d="M18 130Q20 82 50 78Q80 82 82 130Z" fill="${tc}"/><path d="M42 78L50 94L58 78Z" fill="${sk}"/><path d="M50 94V130" stroke="#0004"/><circle cx="45" cy="106" r="1.6" fill="#fff"/><circle cx="45" cy="118" r="1.6" fill="#fff"/><rect x="58" y="104" width="12" height="10" fill="#0002"/>`,
    `<path d="M18 130Q20 82 50 78Q80 82 82 130Z" fill="${tc}"/><ellipse cx="50" cy="80" rx="22" ry="8" fill="${tc}" stroke="#0003"/><rect x="36" y="112" width="28" height="12" rx="3" fill="#0002"/>`,
    `<path d="M18 130Q20 82 50 78Q80 82 82 130Z" fill="${tc}"/><path d="M40 78L50 94L43 80ZM60 78L50 94L57 80Z" fill="#fff"/><circle cx="50" cy="104" r="1.6" fill="#fff"/><circle cx="50" cy="116" r="1.6" fill="#fff"/>`][a.top];
  const hair = a.hair === 4 ? '' : `<path d="M27 42Q26 18 50 18Q74 18 73 42Q66 30 50 30Q34 30 27 42Z" fill="${hc}"/>` + (a.hair === 2 ? `<circle cx="50" cy="14" r="8" fill="${hc}"/>` : '');
  const mouth = [`<path d="M43 53Q50 59 57 53" stroke="#7a2e2e" stroke-width="2" fill="none" stroke-linecap="round"/>`, `<path d="M42 52Q50 62 58 52Z" fill="#7a2e2e"/>`, `<path d="M45 54H55" stroke="#7a2e2e" stroke-width="2" stroke-linecap="round"/>`][a.face];
  const acc = [``, `<g fill="none" stroke="#2a2118" stroke-width="1.6"><circle cx="42" cy="44" r="6"/><circle cx="58" cy="44" r="6"/><path d="M48 44H52"/></g>`,
    `<circle cx="66" cy="26" r="5" fill="#f4b942"/><circle cx="66" cy="26" r="2" fill="#c23b32"/>`, `<circle cx="36" cy="51" r="4" fill="#e8665d" opacity=".4"/><circle cx="64" cy="51" r="4" fill="#e8665d" opacity=".4"/>`][a.acc];
  const hat = [``, `<path d="M10 38Q50 -8 90 38Q50 30 10 38Z" fill="#e9d79a" stroke="#b79f55"/><path d="M30 38L34 56M70 38L66 56" stroke="#c23b32" stroke-width="1.5"/>`,
    `<path d="M26 34Q50 14 74 34L74 38Q50 26 26 38Z" fill="#fff"/><path d="M27 34Q50 20 73 34" stroke="#2f6b8a" stroke-width="4" stroke-dasharray="4 4" fill="none"/><path d="M72 36L82 50" stroke="#fff" stroke-width="5"/>`,
    `<path d="M26 34Q50 8 74 34Z" fill="${tc}"/><path d="M58 34H88Q86 39 58 39Z" fill="${tc}"/>`, `<path d="M28 34Q28 12 50 10Q72 12 72 34Q50 28 28 34Z" fill="#26407a"/><path d="M30 28Q50 20 70 28" stroke="#f4b942" stroke-width="2" fill="none"/>`][a.hat];
  return `${back}<rect x="44" y="60" width="12" height="22" fill="${sk}"/>${body}<circle cx="28" cy="44" r="4" fill="${sk}"/><circle cx="72" cy="44" r="4" fill="${sk}"/><circle cx="50" cy="42" r="22" fill="${sk}"/>${hair}<circle cx="42" cy="44" r="2.2" fill="#2a2118"/><circle cx="58" cy="44" r="2.2" fill="#2a2118"/>${mouth}${acc}${hat}`;
}
export const avatarSVG = (a, w = 64) => `<svg class="avatar" width="${w}" height="${Math.round(w * 1.3)}" viewBox="0 0 100 130" role="img" aria-label="Avatar">${avatarInner(a)}</svg>`;
export const getAvatar = () => norm(store.get('avatar', {}));
export const setAvatar = a => store.set('avatar', norm(a));
export const randomAvatar = () => Object.fromEntries(Object.entries(LEN).map(([k, n]) => [k, Math.random() * n | 0]));
export const encode = a => btoa(JSON.stringify(norm(a)));
export function decode(s) { try { return norm(JSON.parse(atob(s.trim()))); } catch { return null; } }
