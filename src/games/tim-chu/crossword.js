export const MAX_GRID = 9;
const cache = new Map();
const key = (r, c) => `${r},${c}`;
const cellAt = (p, i) => [p.r + (p.dir === 'V' ? i : 0), p.c + (p.dir === 'H' ? i : 0)];
function bounds(placed) {
  const rs = placed.flatMap(p => [p.r, p.r + (p.dir === 'V' ? p.word.length - 1 : 0)]);
  const cs = placed.flatMap(p => [p.c, p.c + (p.dir === 'H' ? p.word.length - 1 : 0)]);
  const minR = Math.min(...rs), minC = Math.min(...cs);
  return { minR, minC, rows: Math.max(...rs) - minR + 1, cols: Math.max(...cs) - minC + 1 };
}
function fits(next, placed, grid) {
  const { rows, cols } = bounds([...placed, next]);
  if (rows > MAX_GRID || cols > MAX_GRID) return false;
  const before = cellAt(next, -1), after = cellAt(next, next.word.length);
  if (grid.has(key(...before)) || grid.has(key(...after))) return false;
  let crossings = 0;
  for (let i = 0; i < next.word.length; i++) {
    const [r, c] = cellAt(next, i), existing = grid.get(key(r, c));
    if (existing) {
      // A shorter word must not be hidden on top of a longer word in the same direction.
      if (existing.letter !== next.word[i] || existing.dirs.includes(next.dir)) return false;
      crossings++;
    } else if (next.dir === 'H'
      ? grid.has(key(r - 1, c)) || grid.has(key(r + 1, c))
      : grid.has(key(r, c - 1)) || grid.has(key(r, c + 1))) return false;
  }
  return crossings > 0;
}
function add(grid, p) {
  const next = new Map(grid);
  for (let i = 0; i < p.word.length; i++) {
    const k = key(...cellAt(p, i)), existing = grid.get(k);
    next.set(k, { letter: p.word[i], dirs: [...(existing?.dirs || []), p.dir] });
  }
  return next;
}
export function buildCrossword(words) {
  const list = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b)), cacheKey = list.join('|');
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (!list.length || new Set(list).size !== list.length || list.some(w => !/^[a-z]{3,6}$/.test(w))) return null;
  let attempts = 0;
  function search(placed, remaining, grid) {
    if (!remaining.length) return placed;
    if (++attempts > 12000) return null;
    for (const word of remaining) {
      const candidates = new Map();
      for (const p of placed) for (let i = 0; i < word.length; i++) for (let j = 0; j < p.word.length; j++) {
        if (word[i] !== p.word[j]) continue;
        const [r, c] = cellAt(p, j), dir = p.dir === 'H' ? 'V' : 'H';
        const next = { word, dir, r: r - (dir === 'V' ? i : 0), c: c - (dir === 'H' ? i : 0) };
        if (fits(next, placed, grid)) candidates.set(`${next.r},${next.c},${dir}`, next);
      }
      const score = p => { const b = bounds([...placed, p]); return b.rows * b.cols + Math.abs(b.cols - b.rows); };
      for (const candidate of [...candidates.values()].sort((a, b) => score(a) - score(b))) {
        const solved = search([...placed, candidate], remaining.filter(w => w !== word), add(grid, candidate));
        if (solved) return solved;
      }
    }
    return null;
  }
  const first = { word: list[0], r: 0, c: 0, dir: 'H' };
  const placed = search([first], list.slice(1), add(new Map(), first));
  if (!placed) return null; // Never silently drop words or grow a disconnected oversized board.
  const { rows, cols, minR, minC } = bounds(placed);
  const normalized = placed.map(p => ({ ...p, r: p.r - minR, c: p.c - minC }));
  const starts = [...new Set(normalized.map(p => key(p.r, p.c)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number), [br, bc] = b.split(',').map(Number); return ar - br || ac - bc;
  });
  normalized.forEach(p => { p.number = starts.indexOf(key(p.r, p.c)) + 1; });
  const cells = new Map();
  normalized.forEach(p => {
    for (let i = 0; i < p.word.length; i++) {
      const [r, c] = cellAt(p, i), k = key(r, c);
      if (!cells.has(k)) cells.set(k, { r, c, letter: p.word[i], words: [] });
      const cell = cells.get(k); cell.words.push(p.word);
      if (i === 0) cell.number = p.number;
    }
  });
  const result = { rows, cols, placed: normalized, cells: [...cells.values()] };
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  cache.set(cacheKey, result);
  return result;
}
