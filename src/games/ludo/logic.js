// Cờ cá ngựa (Ludo), 2-4 người, mỗi người 4 quân. Hàm thuần.
// Vị trí quân p: -1 = trong chuồng; 0..50 = trên vòng 52 ô (ô xuất phát của mình là 0); 51..55 = đường về đích; 56 = đã về đích.
// Cần đổ 6 để ra quân. Đổ 6 được đổ tiếp. Đáp xuống ô có quân đối phương thì đá về chuồng (ô xuất phát là ô an toàn).
export const START = [0, 13, 26, 39];
export const newGame = n => ({ n, seats: n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n), pc: Array.from({ length: n }, () => [-1, -1, -1, -1]), turn: 0, dice: 0, last: null });
export const absOf = (s, p) => p >= 0 && p <= 50 ? (START[s] + p) % 52 : -1;
export function legal(g, d) {
  return g.pc[g.turn].map((p, k) => (p === -1 ? d === 6 : p + d <= 56) ? k : -1).filter(k => k >= 0);
}
const clone = g => ({ ...g, pc: g.pc.map(a => [...a]) });
// Đổ xúc xắc ra d. Không có nước đi thì mất lượt luôn.
export function roll(g, d) {
  if (g.winner != null || g.dice) return g;
  const n = clone(g);
  if (!legal(g, d).length) { n.last = { pl: g.turn, d, note: 'không đi được' }; n.turn = (g.turn + 1) % g.n; return n; }
  n.dice = d; return n;
}
// Đi quân k theo số vừa đổ
export function move(g, k) {
  const d = g.dice, pl = g.turn; if (!d || g.winner != null || !legal(g, d).includes(k)) return g;
  const n = clone(g), s = g.seats[pl]; n.pc[pl][k] = n.pc[pl][k] === -1 ? 0 : n.pc[pl][k] + d;
  const a = absOf(s, n.pc[pl][k]); let cap = 0;
  if (a >= 0 && a % 13 !== 0) n.pc.forEach((arr, o) => { if (o !== pl) arr.forEach((q, j) => { if (absOf(g.seats[o], q) === a) { arr[j] = -1; cap++; } }); });
  n.last = { pl, d, cap }; n.dice = 0;
  if (n.pc[pl].every(p => p === 56)) n.winner = pl; else if (d !== 6) n.turn = (pl + 1) % g.n;
  return n;
}
