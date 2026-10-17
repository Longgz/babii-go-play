// "Mèo Phá Bom": rút bài và né bom, người cuối cùng còn sống thắng. Bộ bài, tên và hình do mình tự đặt, tự vẽ.
// Mã lá: D gỡ bom, X bom, S né, A tấn công, H xào bài, F nhìn trước 3 lá, V xin bài, C1..C4 bốn loại mèo (đánh cặp giống nhau để lấy trộm một lá).
export const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rep = (c, k) => Array(k).fill(c);
export const nextAlive = (s, from) => { for (let k = 1; k <= s.n; k++) { const j = (from + k) % s.n; if (s.alive[j]) return j; } return from; };
export function deal(n) {
  const pool = shuffle([...rep('S', 4), ...rep('A', 4), ...rep('H', 4), ...rep('F', 5), ...rep('V', 4), ...['C1', 'C2', 'C3', 'C4'].flatMap(c => rep(c, 3))]);
  const hands = Array.from({ length: n }, () => ['D', ...pool.splice(0, 4)]);
  const pile = shuffle([...pool, 'D', 'D', ...rep('X', n - 1)]);
  return { hands, state: { n, pile, disc: [], turn: 0, left: 1, counts: hands.map(h => h.length), alive: rep(1, n), pend: null, bomb: null, winner: null, log: 'Ván mới' } };
}
// Người pl kết thúc một lượt (hết lượt thì sang người còn sống kế tiếp)
function finish(s, pl) { const n = { ...s, left: s.left - 1 }; if (n.left <= 0) { n.turn = nextAlive(s, pl); n.left = 1; } return n; }
// Đánh lá không cần chọn mục tiêu: S, A, H, F
export function playCard(s, pl, c) {
  const n = { ...s, disc: [...s.disc, c], counts: [...s.counts] }; n.counts[pl]--;
  if (c === 'S') return finish(n, pl);
  if (c === 'A') { n.turn = nextAlive(s, pl); n.left = 2; return n; }   // người kế đi 2 lượt
  if (c === 'H') n.pile = shuffle(s.pile);
  return n;   // 'F': chỉ xem, không đổi trạng thái
}
// Rút bài kết thúc lượt. ev: ok | defuse (rút trúng bom, đã dùng lá gỡ bom, phải cất bom lại) | dead
export function draw(s, pl, hand) {
  let pile = [...s.pile], disc = [...s.disc];
  if (!pile.length) { pile = shuffle(disc.filter(c => c !== 'X')); disc = []; }
  const c = pile.shift(), n = { ...s, pile, disc, counts: [...s.counts], alive: [...s.alive] };
  if (c === undefined) return { s: finish(n, pl), hand, ev: 'ok' };
  if (c !== 'X') { n.counts[pl]++; return { s: finish(n, pl), hand: [...hand, c], ev: 'ok' }; }
  if (hand.includes('D')) { const h = [...hand]; h.splice(h.indexOf('D'), 1); n.disc = [...disc, 'D']; n.counts[pl]--; n.bomb = pl; return { s: n, hand: h, ev: 'defuse' }; }
  n.disc = [...disc, ...hand, 'X']; n.counts[pl] = 0; n.alive[pl] = 0;
  if (n.alive.reduce((a, b) => a + b, 0) === 1) { n.winner = n.alive.indexOf(1); return { s: n, hand: [], ev: 'dead' }; }
  n.turn = nextAlive(n, pl); n.left = 1; return { s: n, hand: [], ev: 'dead' };
}
export function placeBomb(s, pos) { const pile = [...s.pile]; pile.splice(Math.max(0, Math.min(pos, pile.length)), 0, 'X'); return finish({ ...s, pile, bomb: null }, s.bomb); }
// Xin bài (V) hoặc lấy trộm bằng cặp mèo (steal): chờ máy người bị chọn xử lý
export function startReq(s, pl, type, cards, to) { const n = { ...s, disc: [...s.disc, ...cards], counts: [...s.counts] }; n.counts[pl] -= cards.length; n.pend = { type, by: pl, to }; return n; }
export function resolveReq(s, card) { const n = { ...s, counts: [...s.counts], pend: null }; if (card) { n.counts[s.pend.to]--; n.counts[s.pend.by]++; } return n; }
