// Bắn máy bay: lưới 10x10, mỗi người giấu 3 máy bay (10 ô: đầu, cánh 5 ô, thân, đuôi 3 ô). Bắn trúng ĐẦU thì hạ máy bay. Hàm thuần.
// Mỗi máy bay lưu dạng [x, y, hướng]: (x, y) là góc trên trái của khung bao, hướng 0..3 là xoay 90 độ.
export const N = 10, PLANES = 3;
const BASE = [[2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 2], [1, 3], [2, 3], [3, 3]];   // phần tử đầu tiên là đầu máy bay
export function shape(d) {
  if (!Number.isInteger(d) || d < 0 || d > 3) throw new Error('Hướng máy bay không hợp lệ.');
  let s = BASE.map(p => [...p]), w = 5, h = 4;
  for (let i = 0; i < d; i++) { s = s.map(([x, y]) => [h - 1 - y, x]); [w, h] = [h, w]; }
  return { s, w, h };
}
export function cells(x, y, d) { const { s, w, h } = shape(d); return { c: s.map(([a, b]) => [x + a, y + b]), w, h }; }
const idxs = (x, y, d) => cells(x, y, d).c.map(([a, b]) => b * N + a);
export const fits = (x, y, d) => {
  if (![x, y, d].every(Number.isInteger) || d < 0 || d > 3) return false;
  const { w, h } = shape(d); return x >= 0 && y >= 0 && x + w <= N && y + h <= N;
};
export function validBoard(board, complete = false) {
  if (!Array.isArray(board) || board.length > PLANES || complete && board.length !== PLANES) return false;
  const used = new Set();
  for (const plane of board) {
    if (!Array.isArray(plane) || plane.length !== 3 || !fits(...plane)) return false;
    for (const i of idxs(...plane)) { if (used.has(i)) return false; used.add(i); }
  }
  return true;
}
export const coord = cell => `${String.fromCharCode(65 + cell % N)}${Math.floor(cell / N) + 1}`;
export function atHead(cell, d) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= N * N) throw new Error('Ô đầu máy bay không hợp lệ.');
  const [hx, hy] = shape(d).s[0];
  return [cell % N - hx, Math.floor(cell / N) - hy, d];
}
export const headCell = plane => idxs(...plane)[0];
export function canPlace(board, x, y, d) {
  if (!validBoard(board) || board.length >= PLANES || !fits(x, y, d)) return false;
  const used = new Set(board.flatMap(([px, py, pd]) => idxs(px, py, pd)));
  return idxs(x, y, d).every(i => !used.has(i));
}
export function randomBoard() {
  const candidates = [];
  for (let d = 0; d < 4; d++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (fits(x, y, d)) candidates.push([x, y, d]);
  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const board = [];
    for (const plane of shuffled) {
      if (canPlace(board, ...plane)) board.push(plane);
      if (board.length === PLANES) return board;
    }
  }
  return [[0, 0, 0], [5, 0, 0], [0, 5, 0]];
}
// 'k' = trúng đầu (hạ máy bay), 'h' = trúng thân, 'm' = trượt
export function shotResult(board, cell) {
  if (!validBoard(board, true) || !Number.isInteger(cell) || cell < 0 || cell >= N * N) throw new Error('Đội hình hoặc ô bắn không hợp lệ.');
  for (const [x, y, d] of board) { const c = idxs(x, y, d); if (c[0] === cell) return 'k'; if (c.includes(cell)) return 'h'; }
  return 'm';
}
export const cellsOf = board => new Map(board.flatMap(([x, y, d]) => idxs(x, y, d).map((i, j) => [i, j === 0])));
export const kills = (shots, uid) => new Set(shots.filter(s => s.by === uid && s.r === 'k').map(s => s.c)).size;

export function normalize(raw) {
  if (!raw) return null;
  return { ...raw, players: Object.values(raw.players || {}), s: Object.values(raw.s || {}).filter(Boolean),
    b: Object.fromEntries(Object.entries(raw.b || {}).map(([uid, board]) => [uid, Object.values(board || {}).map(p => Object.values(p || {}))])),
    revision: raw.revision || 0, winner: raw.winner ?? null };
}

export function newMatch(players, id) {
  if (!Array.isArray(players) || players.length !== 2 || players.some(p => !p || typeof p.uid !== 'string' || !p.uid || typeof p.name !== 'string') || players[0].uid === players[1].uid || !id) throw new Error('Cần hai người khác nhau để bắt đầu.');
  return { schema: 2, id, revision: 0, players: players.map(({ uid, name }) => ({ uid, name })), b: {}, s: [], winner: null };
}

export const readyToPlay = s => s?.players?.length === 2 && s.players.every(p => validBoard(s.b[p.uid], true));
export function move(raw, uid, id, revision, action) {
  const s = normalize(raw);
  if (!s || s.schema !== 2 || s.id !== id) throw new Error('Ván đã thay đổi. Hãy đồng bộ lại.');
  const seat = s.players.findIndex(p => p.uid === uid);
  if (seat < 0) throw new Error('Bạn đang xem ván đấu.');
  if (s.winner != null) throw new Error('Ván đã kết thúc.');
  if (action.type === 'ready') {
    if (!validBoard(action.board, true)) throw new Error('Cần đúng 3 máy bay, nằm trong lưới và không chồng nhau.');
    if (s.b[uid]) {
      if (JSON.stringify(s.b[uid]) === JSON.stringify(action.board)) return s;
      throw new Error('Đội hình đã khóa. Không thể xác nhận đội hình khác.');
    }
    if (s.s.length) throw new Error('Không thể đổi đội hình khi đã bắn.');
    // Independent ready submissions can merge, even if the other player just confirmed.
    return { ...s, revision: s.revision + 1, b: { ...s.b, [uid]: action.board.map(p => [...p]) } };
  }
  if (action.type === 'unready') {
    if (s.revision !== revision) throw new Error('Đội hình vừa thay đổi. Hãy đồng bộ lại.');
    if (!s.b[uid] || readyToPlay(s) || s.s.length) throw new Error('Hai bên đã sẵn sàng; đội hình đã khóa.');
    const board = { ...s.b }; delete board[uid];
    return { ...s, b: board, revision: s.revision + 1 };
  }
  if (action.type !== 'shoot') throw new Error('Thao tác không hợp lệ.');
  if (s.revision !== revision) throw new Error('Lượt chơi vừa thay đổi. Hãy đồng bộ lại.');
  if (!readyToPlay(s)) throw new Error('Cả hai người cần xác nhận đội hình trước.');
  if (s.players[s.s.length % 2].uid !== uid) throw new Error('Chưa đến lượt bạn bắn.');
  if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= N * N) throw new Error('Ô bắn không hợp lệ.');
  if (s.s.some(shot => shot.by === uid && shot.c === action.cell)) throw new Error('Bạn đã bắn ô này rồi.');
  const target = s.players[1 - seat].uid;
  const shot = { by: uid, c: action.cell, r: shotResult(s.b[target], action.cell) };
  const shots = [...s.s, shot];
  return { ...s, s: shots, revision: s.revision + 1, winner: kills(shots, uid) === PLANES ? uid : null };
}

export async function commitMove(room, snapshot, uid, action) {
  let error;
  const result = await room.transact('g/bm', raw => {
    try { const next = move(raw, uid, snapshot.id, snapshot.revision, action); error = null; return next; }
    catch (err) { error = err; return undefined; }
  });
  if (!result.committed) throw error || new Error('Chưa xác nhận được thao tác.');
  return normalize(result.value);
}
