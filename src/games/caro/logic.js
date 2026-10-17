export const N = 15, WIN = 5;
const DIRS = [[1,0],[0,1],[1,1],[1,-1]];
export const newGame = first => ({ b: Array(N*N).fill(0), turn: first, last: -1, moves: 0, win: null });

function lineAt(b, i) {
  const p = b[i], x = i % N, y = (i / N) | 0;
  for (const [dx, dy] of DIRS) {
    const cells = [i];
    for (const s of [1, -1]) {
      let cx = x + dx*s, cy = y + dy*s;
      while (cx >= 0 && cy >= 0 && cx < N && cy < N && b[cy*N+cx] === p) {
        cells.push(cy*N+cx); cx += dx*s; cy += dy*s;
      }
    }
    if (cells.length >= WIN) return cells;
  }
  return null;
}
export function applyMove(s, i) {
  if (s.win || s.b[i]) return s;
  const b = s.b.slice(); b[i] = s.turn;
  const line = lineAt(b, i), moves = s.moves + 1;
  const win = line ? { p: s.turn, line } : (moves === N*N ? { p: 0, line: [] } : null);
  return { b, turn: line ? s.turn : 3 - s.turn, last: i, moves, win };
}

