// Thuật toán sinh lưới ô chữ đan chéo (Crossword Grid Generator)
// Sắp xếp các từ mục tiêu đan xen nhau theo hàng ngang (H) và cột dọc (V)

function canPlace(word, r, c, dir, grid) {
  const beforeR = dir === 'H' ? r : r - 1;
  const beforeC = dir === 'H' ? c - 1 : c;
  if (grid[beforeR + ',' + beforeC]) return false;

  const afterR = dir === 'H' ? r : r + word.length;
  const afterC = dir === 'H' ? c + word.length : c;
  if (grid[afterR + ',' + afterC]) return false;

  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const curR = dir === 'H' ? r : r + i;
    const curC = dir === 'H' ? c + i : c;
    const existing = grid[curR + ',' + curC];
    if (existing) {
      if (existing !== word[i]) return false;
      intersections++;
    } else {
      if (dir === 'H') {
        if (grid[(curR - 1) + ',' + curC] || grid[(curR + 1) + ',' + curC]) return false;
      } else {
        if (grid[curR + ',' + (curC - 1)] || grid[curR + ',' + (curC + 1)]) return false;
      }
    }
  }
  return intersections > 0;
}

function calcBoundingBox(placed, next) {
  let minR = next.r, maxR = next.r + (next.dir === 'V' ? next.word.length : 1);
  let minC = next.c, maxC = next.c + (next.dir === 'H' ? next.word.length : 1);
  for (const p of placed) {
    minR = Math.min(minR, p.r);
    maxR = Math.max(maxR, p.r + (p.dir === 'V' ? p.word.length : 1));
    minC = Math.min(minC, p.c);
    maxC = Math.max(maxC, p.c + (p.dir === 'H' ? p.word.length : 1));
  }
  return (maxR - minR) * (maxC - minC);
}

const cache = new Map();

export function buildCrossword(words) {
  const cacheKey = words.slice().sort().join('|');
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const list = [...words].sort((a, b) => b.length - a.length);
  const grid = {};
  const placed = [];

  // Đặt từ dài nhất nằm ngang ở trung tâm
  const first = list[0];
  for (let i = 0; i < first.length; i++) grid['0,' + i] = first[i];
  placed.push({ word: first, r: 0, c: 0, dir: 'H' });

  // Tìm vị trí đan chéo tối ưu cho các từ còn lại
  for (let wIdx = 1; wIdx < list.length; wIdx++) {
    const word = list[wIdx];
    let best = null;
    let minScore = Infinity;

    for (const p of placed) {
      const oppDir = p.dir === 'H' ? 'V' : 'H';
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < p.word.length; j++) {
          if (p.word[j] === word[i]) {
            const startR = p.dir === 'H' ? p.r - i : p.r + j;
            const startC = p.dir === 'H' ? p.c + j : p.c - i;
            if (canPlace(word, startR, startC, oppDir, grid)) {
              const score = calcBoundingBox(placed, { word, r: startR, c: startC, dir: oppDir });
              if (score < minScore) {
                minScore = score;
                best = { word, r: startR, c: startC, dir: oppDir };
              }
            }
          }
        }
      }
    }

    if (best) {
      for (let i = 0; i < word.length; i++) {
        const curR = best.dir === 'H' ? best.r : best.r + i;
        const curC = best.dir === 'H' ? best.c + i : best.c;
        grid[curR + ',' + curC] = word[i];
      }
      placed.push(best);
    } else {
      // Trường hợp không có chữ cái giao nhau: đặt song song bên dưới có khoảng cách 1 ô
      let maxR = -Infinity, minC = Infinity;
      for (const p of placed) {
        maxR = Math.max(maxR, p.r + (p.dir === 'V' ? p.word.length : 1));
        minC = Math.min(minC, p.c);
      }
      const fallback = { word, r: maxR + 1, c: minC, dir: 'H' };
      for (let i = 0; i < word.length; i++) grid[fallback.r + ',' + (fallback.c + i)] = word[i];
      placed.push(fallback);
    }
  }

  // Chuẩn hóa tọa độ về (0, 0)
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const p of placed) {
    minR = Math.min(minR, p.r);
    minC = Math.min(minC, p.c);
    maxR = Math.max(maxR, p.r + (p.dir === 'V' ? p.word.length - 1 : 0));
    maxC = Math.max(maxC, p.c + (p.dir === 'H' ? p.word.length - 1 : 0));
  }

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const normalizedPlaced = placed.map(p => ({
    ...p,
    r: p.r - minR,
    c: p.c - minC
  }));

  // Tạo map từng ô chữ (cell) và các từ đi qua ô đó
  const cellMap = {};
  normalizedPlaced.forEach(p => {
    for (let i = 0; i < p.word.length; i++) {
      const cr = p.dir === 'H' ? p.r : p.r + i;
      const cc = p.dir === 'H' ? p.c + i : p.c;
      const key = cr + ',' + cc;
      if (!cellMap[key]) {
        cellMap[key] = { r: cr, c: cc, letter: p.word[i], words: [] };
      }
      cellMap[key].words.push(p.word);
    }
  });

  const result = {
    rows,
    cols,
    placed: normalizedPlaced,
    cells: Object.values(cellMap)
  };

  cache.set(cacheKey, result);
  return result;
}
