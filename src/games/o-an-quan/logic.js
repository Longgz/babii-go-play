// Luật Ô ăn quan (bản phổ biến), hàm thuần.
// 12 ô: ô 0 và ô 6 là ô quan (1 quan = 10 dân), ô 1-5 của người 0, ô 7-11 của người 1.
// Chọn một ô dân của mình, rải từng viên theo chiều đã chọn. Rải xong:
//  - ô kế tiếp có quân và là ô dân: bốc lên rải tiếp
//  - ô kế tiếp là ô quan có quân, hoặc hai ô liền sau đều trống: mất lượt
//  - ô kế tiếp trống, ô sau nó có quân: ăn, rồi cứ trống rồi có quân thì ăn tiếp
// Hết dân trên ô của mình thì vay 5 dân từ điểm đã ăn; không đủ thì hết ván.
// Hết ván khi cả hai quan bị ăn: mỗi người thu số dân còn trên phía mình.
const m = i => (i % 12 + 12) % 12;
export const mine = (p, i) => i % 6 !== 0 && (p === 0 ? i < 6 : i > 6);
export function newGame() {
  const d = Array(12).fill(5), q = Array(12).fill(0);
  d[0] = d[6] = 0; q[0] = q[6] = 1;
  return { d, q, sc: [0, 0], turn: 0, over: false, last: null };
}
const side = (s, p) => [0, 1, 2, 3, 4].map(k => (p === 0 ? 1 : 7) + k);
function finish(s) {
  for (const p of [0, 1]) for (const i of side(s, p)) { s.sc[p] += s.d[i]; s.d[i] = 0; }
  s.over = true;
}
export function play(s0, pit, dir) {
  if (s0.over || !mine(s0.turn, pit) || !s0.d[pit] || (dir !== 1 && dir !== -1)) return s0;
  const s = JSON.parse(JSON.stringify(s0)), val = i => s.d[i] + 10 * s.q[i];
  let i = pit, hand = s.d[i], guard = 0, got = 0; s.d[i] = 0;
  while (guard++ < 400) {
    while (hand > 0) { i = m(i + dir); s.d[i]++; hand--; }
    const nx = m(i + dir);
    if (val(nx) > 0) { if (nx % 6 === 0) break; hand = s.d[nx]; s.d[nx] = 0; i = nx; continue; }
    let e = nx;
    for (;;) { const t = m(e + dir), v = val(t); if (!v) break; got += v; s.sc[s.turn] += v; s.d[t] = 0; s.q[t] = 0; e = m(t + dir); if (val(e)) break; }
    break;
  }
  s.last = { pit, dir, got, by: s0.turn };
  if (!s.q[0] && !s.q[6]) { finish(s); return s; }
  const nxt = 1 - s0.turn;
  if (side(s, nxt).every(k => !s.d[k])) {
    if (s.sc[nxt] >= 5) { s.sc[nxt] -= 5; side(s, nxt).forEach(k => s.d[k] = 1); }
    else { finish(s); return s; }
  }
  s.turn = nxt; return s;
}
