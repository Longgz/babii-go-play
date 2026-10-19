// "Mèo Phá Bom": rút bài và né bom, mở rộng thêm các lá bài chiến thuật kịch tính (Streaking & Imploding)
// Mã lá: 
// D gỡ bom, X bom, S né, A tấn công, H xào bài, F nhìn trước 3 lá, V xin bài
// B rút đáy, T thao túng (alter), W đảo đầu đuôi, M mèo đa năng (feral), K mèo ôm bom (streaking), N chặn đứng (nope)
// C1..C4 bốn loại mèo thường (ghép cặp hoặc bộ ba lấy trộm bài)

export const shuffle = a => { 
  a = [...a]; 
  for (let i = a.length - 1; i > 0; i--) { 
    const j = Math.random() * (i + 1) | 0; 
    [a[i], a[j]] = [a[j], a[i]]; 
  } 
  return a; 
};

const rep = (c, k) => Array(k).fill(c);

export const nextAlive = (s, from) => { 
  for (let k = 1; k <= s.n; k++) { 
    const j = (from + k) % s.n; 
    if (s.alive[j]) return j; 
  } 
  return from; 
};

export function deal(n) {
  // Bộ bài mở rộng phong phú và cân bằng cho cả 2 người và nhiều người
  const pool = shuffle([
    ...rep('S', 4),  // Né (Skip)
    ...rep('A', 4),  // Tấn công (Attack)
    ...rep('H', 4),  // Xào bài (Shuffle)
    ...rep('F', 4),  // Nhìn trước (See the Future)
    ...rep('V', 3),  // Xin bài (Favor)
    ...rep('B', 4),  // Rút đáy (Draw from Bottom)
    ...rep('T', 4),  // Thao túng (Alter the Future)
    ...rep('W', 3),  // Đảo đầu đuôi (Swap Top & Bottom)
    ...rep('M', 4),  // Mèo đa năng (Feral Cat)
    ...rep('N', 4),  // Chặn đứng (Nope)
    ...['C1', 'C2', 'C3', 'C4'].flatMap(c => rep(c, 3)) // 4 loại mèo thường
  ]);

  // Mỗi người 4 lá ngẫu nhiên + 1 lá Gỡ bom D
  const hands = Array.from({ length: n }, () => ['D', ...pool.splice(0, 4)]);

  // Trộn thêm 1 lá Mèo ôm bom K, các lá Gỡ bom còn lại và số Bom X = n - 1
  const pile = shuffle([...pool, 'K', 'D', 'D', ...rep('X', n - 1)]);

  return { 
    hands, 
    state: { 
      n, 
      pile, 
      disc: [], 
      turn: 0, 
      left: 1, 
      counts: hands.map(h => h.length), 
      alive: rep(1, n), 
      pend: null, 
      bomb: null, 
      alter: null, // Trạng thái thao túng 3 lá
      winner: null, 
      log: 'Ván mới bắt đầu' 
    } 
  };
}

// Kết thúc một lượt (hết lượt thì sang người còn sống kế tiếp)
export function finish(s, pl) { 
  const n = { ...s, left: s.left - 1 }; 
  if (n.left <= 0) { 
    n.turn = nextAlive(s, pl); 
    n.left = 1; 
  } 
  return n; 
}

// Đánh lá chức năng
export function playCard(s, pl, c) {
  const n = { ...s, disc: [...s.disc, c], counts: [...s.counts] }; 
  n.counts[pl]--;

  if (c === 'S') return finish(n, pl); // Né: kết thúc 1 lượt

  if (c === 'A') { 
    // Cộng dồn Tấn Công (A chồng A): nếu đang bị tấn công dồn thì cộng thêm 2 lượt bắt người sau chịu
    const extra = (s.left > 1 ? s.left : 0) + 2;
    n.turn = nextAlive(s, pl); 
    n.left = extra; 
    return n; 
  }

  if (c === 'H') {
    n.pile = shuffle(s.pile); // Xào bài
    return n;
  }

  if (c === 'W') {
    // Đảo Đầu Đuôi: đổi chỗ lá trên cùng và lá dưới đáy cọc bài
    if (n.pile.length >= 2) {
      const top = n.pile[0];
      n.pile[0] = n.pile[n.pile.length - 1];
      n.pile[n.pile.length - 1] = top;
    }
    return n;
  }

  return n; // 'F', 'T', 'B', 'K', 'M' xử lý riêng tại index.js
}

// Rút bài kết thúc lượt (hỗ trợ rút đỉnh cọc hoặc rút đáy cọc bài)
export function draw(s, pl, hand, fromBottom = false) {
  let pile = [...s.pile], disc = [...s.disc];
  if (!pile.length) { 
    pile = shuffle(disc.filter(c => c !== 'X')); 
    disc = []; 
  }

  // Rút đỉnh (shift) hoặc rút đáy (pop)
  const c = fromBottom ? pile.pop() : pile.shift();
  const n = { ...s, pile, disc, counts: [...s.counts], alive: [...s.alive] };

  if (c === undefined) return { s: finish(n, pl), hand, ev: 'ok' };

  if (c !== 'X') { 
    n.counts[pl]++; 
    return { s: finish(n, pl), hand: [...hand, c], ev: 'ok' }; 
  }

  // RÚT TRÚNG BOM 'X':
  // 1. Kiểm tra Mèo Ôm Bom (K): được phép an toàn giữ 1 quả Bom trên tay!
  if (hand.includes('K') && !hand.includes('X')) {
    n.counts[pl]++;
    return { s: finish(n, pl), hand: [...hand, 'X'], ev: 'streak_safe' };
  }

  // 2. Kiểm tra lá Gỡ Bom (D)
  if (hand.includes('D')) { 
    const h = [...hand]; 
    h.splice(h.indexOf('D'), 1); 
    n.disc = [...disc, 'D']; 
    n.counts[pl]--; 
    n.bomb = pl; 
    return { s: n, hand: h, ev: 'defuse' }; 
  }

  // 3. Không có cách cứu -> Bị loại!
  n.disc = [...disc, ...hand, 'X']; 
  n.counts[pl] = 0; 
  n.alive[pl] = 0;

  if (n.alive.reduce((a, b) => a + b, 0) === 1) { 
    n.winner = n.alive.indexOf(1); 
    return { s: n, hand: [], ev: 'dead' }; 
  }

  n.turn = nextAlive(n, pl); 
  n.left = 1; 
  return { s: n, hand: [], ev: 'dead' };
}

// Cất bom lại vào cọc bài sau khi gỡ
export function placeBomb(s, pos) { 
  const pile = [...s.pile]; 
  pile.splice(Math.max(0, Math.min(pos, pile.length)), 0, 'X'); 
  return finish({ ...s, pile, bomb: null }, s.bomb); 
}

// Thao túng: lưu lại thứ tự mới của 3 lá trên cùng
export function saveAlter(s, newTop3) {
  const pile = [...s.pile];
  for (let i = 0; i < Math.min(3, newTop3.length); i++) {
    pile[i] = newTop3[i];
  }
  return { ...s, pile, alter: null };
}

// Khởi tạo yêu cầu: Xin bài (V), Cặp mèo trộm mù (steal), hoặc Bộ 3 mèo đòi đích danh (name_card)
export function startReq(s, pl, type, cards, to, targetCard = null) { 
  const n = { ...s, disc: [...s.disc, ...cards], counts: [...s.counts] }; 
  n.counts[pl] -= cards.length; 
  n.pend = { type, by: pl, to, targetCard }; 
  return n; 
}

// Xử lý hoàn tất yêu cầu
export function resolveReq(s, card) { 
  const n = { ...s, counts: [...s.counts], pend: null }; 
  if (card) { 
    n.counts[s.pend.to]--; 
    n.counts[s.pend.by]++; 
  } 
  return n; 
}

// Kiểm tra 2 lá có thể ghép cặp trộm bài (tính cả Mèo Đa Năng 'M')
export const canPair = (c1, c2) => {
  const isCat1 = c1.startsWith('C') || c1 === 'M';
  const isCat2 = c2.startsWith('C') || c2 === 'M';
  if (!isCat1 || !isCat2) return false;
  return c1 === c2 || c1 === 'M' || c2 === 'M';
};

// Kiểm tra 3 lá có thể ghép bộ ba đòi đích danh
export const canTriple = (c1, c2, c3) => {
  const cats = [c1, c2, c3];
  if (!cats.every(c => c.startsWith('C') || c === 'M')) return false;
  const nonM = cats.filter(c => c !== 'M');
  if (nonM.length <= 1) return true; // toàn M hoặc 2 M + 1 mèo
  return nonM.every(c => c === nonM[0]);
};
