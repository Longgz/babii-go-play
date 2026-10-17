// "Bài Bốn Màu": trò đánh hết bài trước. Bộ 108 lá do mình tự đặt tên, tự vẽ.
// Mã lá: màu (R đỏ son, Y vàng nghệ, B xanh chàm, G lục) + giá trị (0-9, S chặn, V đảo chiều, D rút hai); W đổi màu; F đổi màu + rút bốn.
export const COLORS = ['R', 'Y', 'B', 'G'];
export function deck() {
  const d = [];
  for (const c of COLORS) { d.push(c + '0'); for (const v of '123456789SVD') d.push(c + v, c + v); }
  for (let i = 0; i < 4; i++) d.push('W', 'F');
  return d;
}
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const isWild = c => c === 'W' || c === 'F';
export const next = (t, dir, n) => ((t + dir) % n + n) % n;
// top = { code, col }: col là màu hiện hành (với lá đổi màu là màu đã chọn). Đang bị phạt rút bài (pend) thì không đánh được.
export const canPlay = (card, top, pend) => !pend && (isWild(card) || card[0] === top.col || (!isWild(top.code) && card[1] === top.code[1]));
export function deal(n) {
  const d = shuffle(deck()), hands = Array.from({ length: n }, () => d.splice(0, 7));
  const t = d.splice(d.findIndex(c => !isWild(c) && /\d/.test(c[1])), 1)[0];
  return { hands, state: { n, pile: d, disc: [], top: { code: t, col: t[0] }, turn: 0, dir: 1, pend: 0, drew: false, counts: hands.map(h => h.length), winner: null } };
}
// Lấy k lá; hết chồng bốc thì xào lại chồng bài đã đánh
export function take(pile, disc, k) {
  pile = [...pile]; disc = [...disc]; const got = [];
  while (got.length < k) { if (!pile.length) { if (!disc.length) break; pile = shuffle(disc); disc = []; } got.push(pile.shift()); }
  return { got, pile, disc };
}
// Người pl đánh lá card (col: màu chọn nếu là lá đổi màu). Trả về trạng thái công khai mới.
export function play(s, pl, card, col) {
  const v = isWild(card) ? card : card[1], n = { ...s, disc: [...s.disc, s.top.code], counts: [...s.counts], drew: false, pend: 0 };
  n.counts[pl]--; n.top = { code: card, col: isWild(card) ? col : card[0] };
  let step = 1; if (v === 'V') { n.dir = -s.dir; if (s.n === 2) step = 0; } if (v === 'S') step = 2;
  if (v === 'D') n.pend = 2; if (v === 'F') n.pend = 4;
  n.turn = ((pl + n.dir * step) % s.n + s.n) % s.n;
  if (n.counts[pl] === 0) n.winner = pl;
  return n;
}
