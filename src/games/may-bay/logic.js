// Bắn máy bay: lưới 10x10, mỗi người giấu 3 máy bay (10 ô: đầu, cánh 5 ô, thân, đuôi 3 ô). Bắn trúng ĐẦU thì hạ máy bay. Hàm thuần.
// Mỗi máy bay lưu dạng [x, y, hướng]: (x, y) là góc trên trái của khung bao, hướng 0..3 là xoay 90 độ.
export const N = 10, PLANES = 3;
const BASE = [[2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 2], [1, 3], [2, 3], [3, 3]];   // phần tử đầu tiên là đầu máy bay
export function shape(d) {
  let s = BASE.map(p => [...p]), w = 5, h = 4;
  for (let i = 0; i < d; i++) { s = s.map(([x, y]) => [h - 1 - y, x]); [w, h] = [h, w]; }
  return { s, w, h };
}
export function cells(x, y, d) { const { s, w, h } = shape(d); return { c: s.map(([a, b]) => [x + a, y + b]), w, h }; }
const idxs = (x, y, d) => cells(x, y, d).c.map(([a, b]) => b * N + a);
export const fits = (x, y, d) => { const { w, h } = shape(d); return x >= 0 && y >= 0 && x + w <= N && y + h <= N; };
export function canPlace(board, x, y, d) {
  if (!fits(x, y, d)) return false;
  const used = new Set(board.flatMap(([px, py, pd]) => idxs(px, py, pd)));
  return idxs(x, y, d).every(i => !used.has(i));
}
export function randomBoard() {
  for (;;) {
    const b = []; let t = 0;
    while (b.length < PLANES && t++ < 300) { const d = Math.random() * 4 | 0, x = Math.random() * N | 0, y = Math.random() * N | 0; if (canPlace(b, x, y, d)) b.push([x, y, d]); }
    if (b.length === PLANES) return b;
  }
}
// 'k' = trúng đầu (hạ máy bay), 'h' = trúng thân, 'm' = trượt
export function shotResult(board, cell) {
  for (const [x, y, d] of board) { const c = idxs(x, y, d); if (c[0] === cell) return 'k'; if (c.includes(cell)) return 'h'; }
  return 'm';
}
export const cellsOf = board => new Map(board.flatMap(([x, y, d]) => idxs(x, y, d).map((i, j) => [i, j === 0])));
export const kills = (shots, uid) => shots.filter(s => s.by === uid && s.r === 'k').length;
