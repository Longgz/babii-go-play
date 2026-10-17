import { PLACES, EDGES } from './scenes.js';
// Dải đất hình chữ S vẽ theo kiểu minh họa, không phải bản đồ địa lý chính xác.
const OUT = 'M30 8L45 5L62 12L70 20L68 30L62 40L58 50L62 60L70 70L78 80L84 92L86 104L88 118L84 132L76 144L66 152L56 160L46 166L36 172L28 170L30 160L36 152L34 146L30 140L40 130L44 116L42 100L36 88L38 76L34 64L26 54L22 42L24 32L16 26L20 16Z';
export const COLORS = ['#e8665d', '#5d7fc7', '#6bbf8a', '#e0b04a', '#a07be0'];
// marks: [{place,k}] vị trí từng người; reach: {điểm: số bước} các điểm đi tới được; here: điểm của mình
export function mapSVG({ marks = [], reach = {}, mini = false, here } = {}) {
  const lines = EDGES.map(([a, b, c]) => { const A = PLACES[a].pos, B = PLACES[b].pos;
    return `<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#f4b942" stroke-width=".8" stroke-dasharray="2 2" opacity=".7"/>${mini ? '' : `<text x="${(A[0] + B[0]) / 2}" y="${(A[1] + B[1]) / 2}" font-size="4" fill="#fff" text-anchor="middle">${c}</text>`}`; }).join('');
  const dots = Object.entries(PLACES).map(([id, p]) => { const go = reach[id] != null && !mini;
    return `<g class="${go ? 'go' : ''}" ${go ? `data-go="${id}" tabindex="0" role="button" aria-label="Đi tới ${p.name}"` : ''}><circle cx="${p.pos[0]}" cy="${p.pos[1]}" r="${mini ? 2.4 : 3.2}" fill="${id === here ? '#f4b942' : '#fff'}"/>${mini ? '' : `<text x="${p.pos[0] + 5}" y="${p.pos[1] + 1.5}" font-size="4.2" fill="#fff">${p.name}</text>`}</g>`; }).join('');
  const who = marks.map(m => { const p = PLACES[m.place].pos; return `<circle cx="${p[0] - m.k * 3 + 6}" cy="${p[1] - 6}" r="2.4" fill="${COLORS[m.k % 5]}" stroke="#fff" stroke-width=".6"/>`; }).join('');
  return `<svg class="map" viewBox="0 0 110 190" role="img" aria-label="Bản đồ Việt Nam"><path d="${OUT}" fill="#2d4a7a" stroke="#6f8fd6" stroke-width="1"/><circle cx="22" cy="150" r="3.5" fill="#2d4a7a" stroke="#6f8fd6" stroke-width=".8"/>${lines}${dots}${who}</svg>`;
}
