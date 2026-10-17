import { store } from './store.js';
// Thông báo qua ntfy.sh: dịch vụ miễn phí, không cần đăng ký. Mỗi người có một "chủ đề" riêng (coi như mật khẩu),
// cài app ntfy rồi đăng ký chủ đề đó. Khi bạn đi xong, máy bạn gửi thông báo tới chủ đề của người kia.
// Tự host được: đổi địa chỉ NTFY bên dưới.
const NTFY = 'https://ntfy.sh';
const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
export const notifyCfg = {
  get on() { return store.get('ntfy:on', false); },
  set on(v) { store.set('ntfy:on', !!v); },
  get topic() { let t = store.get('ntfy:topic', null); if (!t) { t = 'babii-' + rand(); store.set('ntfy:topic', t); } return t; }
};
const last = {};
export function push(topics, text) {
  for (const t of topics) {
    const k = t + text; if (Date.now() - (last[k] || 0) < 8000) continue; last[k] = Date.now();   // chống gửi dồn
    const url = `${NTFY}/${t}?title=${encodeURIComponent('Babii chơii đii')}&click=${encodeURIComponent(location.href)}`;
    fetch(url, { method: 'POST', body: text, mode: 'no-cors' }).catch(() => {});
  }
}
