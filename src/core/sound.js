import { store } from './store.js';
// Âm thanh tổng hợp bằng WebAudio, chưa cần file (sau này thay bằng bộ CC0 của Kenney)
let on = store.get('sound', true), ac;
export const soundOn = () => on;
export const toggleSound = () => { on = !on; store.set('sound', on); return on; };
export function tone(f, d, v = .12, type = 'sine', when = 0) {
  if (!on) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .6, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
  } catch {}
}
export const clack = () => tone(520, .09, .15, 'triangle');
export const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .28, .12, 'sine', i * .12));

// Hiệu ứng từ file public/sfx/<tên>.ogg nếu có (xem public/sfx/README.txt), không có thì chạy hàm fallback tổng hợp
const files = {};
export function sfx(name, fallback) {
  if (!on) return;
  let a = files[name];
  if (a === undefined) { a = files[name] = new Audio(import.meta.env.BASE_URL + 'sfx/' + name + '.ogg'); a.onerror = () => { files[name] = false; }; }
  if (!a) return fallback?.();
  try { a.currentTime = 0; a.play().catch(() => fallback?.()); } catch { fallback?.(); }
}
