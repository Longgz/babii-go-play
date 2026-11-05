export const PATH = 'g/fold-and-shoot';
export const W = 800, H = 500, UNIT_R = 16, INK_R = 14, FOLD_MS = 700;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mirror = ({ x, y }) => ({ x: W - x, y });
export const unitCount = s => s?.count ?? 3;
export const unitRadius = s => ({ 3: 16, 4: 14, 5: 12 })[unitCount(s)];
export function valid(s) {
  return !!s && [1, 2].includes(s.v) && [3, 4, 5].includes(unitCount(s)) && typeof s.id === 'string' && Number.isInteger(s.rev) && s.rev >= 0 &&
    Array.isArray(s.players) && s.players.length === 2 && s.players.every(p => typeof p.uid === 'string' && typeof p.name === 'string') && s.players[0].uid !== s.players[1].uid &&
    [0, 1].includes(s.turn) && [-1, 0, 1].includes(s.winner) && Number.isFinite(s.readyAt) &&
    Array.isArray(s.units) && s.units.length === unitCount(s) * 2 && [0, 1].every(side => s.units.filter(u => u.side === side).length === unitCount(s)) &&
    s.units.every(u => Number.isFinite(u.x) && Number.isFinite(u.y) && u.x >= 50 && u.x <= 750 && u.y >= 50 && u.y <= 450 && (u.side === 0 ? u.x < 400 : u.x > 400) && typeof u.alive === 'boolean') &&
    (s.shots == null || Array.isArray(s.shots) && s.shots.length <= 40 && s.shots.every(t => Number.isFinite(t.x) && Number.isFinite(t.y) && [0, 1].includes(t.side) && Number.isInteger(t.n) && Number.isInteger(t.hits) && t.hits >= 0 && t.hits <= unitCount(s)));
}
export function newGame(players, id, random = Math.random, count = 3) {
  if (players.length !== 2 || players[0].uid === players[1].uid) throw new Error('Cần hai người chơi khác nhau.');
  if (![3, 4, 5].includes(count)) throw new Error('Mỗi đội có từ 3 đến 5 quân.');
  // Pick distinct cells in a folded coordinate system: no enemy is hidden
  // behind a friendly unit, and even a constant RNG has a bounded fallback.
  const cells = [];
  for (let y = 70; y <= 430; y += 90) for (let x = 65; x <= 335; x += 90) cells.push({ x, y });
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.max(0, Math.min(i, Math.floor((Number(random()) || 0) * (i + 1))));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const units = cells.slice(0, count * 2).map((p, i) => {
    const side = i < count ? 0 : 1;
    const jitter = () => Math.max(-10, Math.min(10, ((Number(random()) || 0) - .5) * 20));
    const point = { x: p.x + jitter(), y: p.y + jitter() };
    return { ...(side ? mirror(point) : point), side, alive: true };
  });
  return { v: 2, count, id, rev: 0, players: players.map(p => ({ uid: p.uid, name: p.name.slice(0, 40) })), units, turn: 0, winner: -1, readyAt: 0, shots: [] };
}
export function aimError(s, p) {
  if (!valid(s)) return 'Chưa có ván hợp lệ.';
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.y < INK_R || p.y > H - INK_R || (s.turn === 0 ? p.x < INK_R || p.x > W / 2 - INK_R : p.x < W / 2 + INK_R || p.x > W - INK_R)) return `Chấm mực trong nửa giấy ${s.turn ? 'bên phải' : 'bên trái'}.`;
  if (s.units.some(u => u.alive && u.side === s.turn && distance(u, p) <= unitRadius(s) + INK_R)) return 'Không được chấm mực đè lên quân của mình.';
  return '';
}
export function stamp(s, { id, rev, uid, x, y }, now) {
  if (!valid(s) || s.id !== id || s.rev !== rev || s.winner !== -1 || s.players[s.turn].uid !== uid || !Number.isFinite(now) || now < s.readyAt || aimError(s, { x, y })) return undefined;
  const target = mirror({ x, y });
  let hits = 0;
  const units = s.units.map(u => {
    if (u.alive && u.side !== s.turn && distance(u, target) <= unitRadius(s) + INK_R) { hits++; return { ...u, alive: false }; }
    return { ...u };
  });
  const winner = units.some(u => u.alive && u.side !== s.turn) ? -1 : s.turn;
  const shot = { x, y, side: s.turn, hits, n: s.rev + 1 };
  return { ...s, rev: s.rev + 1, units, winner, turn: winner < 0 ? 1 - s.turn : s.turn, readyAt: now + FOLD_MS, shots: [...(s.shots || []), shot].slice(-40) };
}
