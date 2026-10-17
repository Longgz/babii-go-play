import { sceneInner, PLACES } from './scenes.js';
import { avatarInner } from '../../core/avatar.js';
import { esc } from '../../core/ui.js';
// Ảnh chụp = "công thức" nhỏ { scene, who:[{n,k}], sticker, frame, caption }, mỗi máy tự vẽ lại thành SVG.
export function photoSVG(r) {
  const w = r.who?.length ? Object.values(r.who) : [], n = w.length || 1, name = (PLACES[r.scene] || PLACES.hanoi).name;
  const av = w.map((p, i) => { const x = 400 + (i - (n - 1) / 2) * 150;
    return `<svg x="${x - 60}" y="339" width="120" height="156" viewBox="0 0 100 130">${avatarInner(p.a)}</svg><text x="${x}" y="518" text-anchor="middle" font-size="18" fill="#fff" stroke="#0007" stroke-width="3" paint-order="stroke" font-family="sans-serif">${esc((p.n || '').slice(0, 10))}</text>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" role="img" aria-label="Ảnh chụp tại ${name}"><rect width="800" height="560" fill="${r.frame || '#c23b32'}"/><svg x="20" y="20" width="760" height="475" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">${sceneInner(r.scene)}</svg>${av}<text x="48" y="92" font-size="60">${r.sticker || '✨'}</text><text x="400" y="537" text-anchor="middle" font-size="26" fill="#fff" font-family="sans-serif">${esc(r.caption || name)}</text></svg>`;
}
export function download(r) {
  const img = new Image();
  img.onload = () => { const c = document.createElement('canvas'); c.width = 1600; c.height = 1120; c.getContext('2d').drawImage(img, 0, 0, 1600, 1120);
    c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `babii-${r.scene}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(photoSVG(r));
}
