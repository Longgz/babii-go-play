// "Bài Bốn Màu": Trò chơi đánh bài Uno mở rộng kịch tính cho 2-5 người
// Hỗ trợ House Rules: Cộng dồn phạt (+2, +4, Khiên phản đòn), Đổi bài Swap Hands,
// Xả bài Discard All, Rút tới bến Color Roulette, Tặng quà Giveaway, Bắt lỗi hô UNO.

export const COLORS = ['R', 'Y', 'B', 'G'];

export const isWild = c => c === 'W' || c === 'F' || c === 'SW' || c === 'WC' || c === 'GV';
export const isDeflect = c => c && c.length === 2 && c[1] === 'F';
export const isDiscardAll = c => c && c.length === 2 && c[1] === 'A';

export function deck() {
  const d = [];
  // 1 lá số 0 cho mỗi màu
  for (const c of COLORS) d.push(c + '0');
  
  // 2 lá số 1-9, S (Chặn), V (Đổi chiều), D (Rút +2) cho mỗi màu
  for (const c of COLORS) {
    for (const v of '123456789SVD') d.push(c + v, c + v);
    // Lá mở rộng màu: 2 lá Xả màu (A) và 2 lá Khiên Phản Đòn (F)
    d.push(c + 'A', c + 'A');
    d.push(c + 'F', c + 'F');
  }

  // Thẻ Wild đặc biệt
  for (let i = 0; i < 4; i++) d.push('W');   // 4 lá Wild Đổi màu
  for (let i = 0; i < 4; i++) d.push('F');   // 4 lá Wild +4
  for (let i = 0; i < 2; i++) d.push('SW');  // 2 lá Wild Swap Hands (Đổi bài)
  for (let i = 0; i < 2; i++) d.push('WC');  // 2 lá Wild Color Roulette (Rút tới bến)
  for (let i = 0; i < 2; i++) d.push('GV');  // 2 lá Wild Giveaway (Tặng quà)

  return d;
}

export const shuffle = a => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const next = (t, dir, n) => ((t + dir) % n + n) % n;

// Kiểm tra xem lá bài có hợp lệ để đánh không
// top = { code, col }: col là màu hiện hành.
// pend > 0: đang bị dồn phạt rút bài (+2, +4)
export function canPlay(card, top, pend) {
  if (pend > 0) {
    // Cơ chế Stacking: Đang bị dồn phạt thì chỉ được đánh lá phản kháng
    // 1. Lá +2 (bất kỳ màu nào)
    if (card[1] === 'D') return true;
    // 2. Lá Wild +4
    if (card === 'F') return true;
    // 3. Lá Khiên Phản Đòn (Deflect): Cùng màu hiện hành hoặc cùng là lá Deflect
    if (isDeflect(card)) {
      return card[0] === top.col || (top.code && top.code.endsWith('F'));
    }
    return false;
  }

  // Trạng thái bình thường không bị phạt dồn
  if (isWild(card)) return true;
  if (card[0] === top.col) return true;
  if (!isWild(top.code) && card.slice(1) === top.code.slice(1)) return true;
  return false;
}

export function deal(n) {
  const d = shuffle(deck());
  const hands = Array.from({ length: n }, () => d.splice(0, 7));
  // Lá khởi đầu: tìm lá số thường (không phải Wild, không phải chức năng)
  const tIdx = d.findIndex(c => !isWild(c) && /\d/.test(c[1]));
  const t = d.splice(tIdx >= 0 ? tIdx : 0, 1)[0];

  return {
    hands,
    state: {
      n,
      pile: d,
      disc: [],
      top: { code: t, col: t[0] },
      turn: 0,
      dir: 1,
      pend: 0,
      drew: false,
      roulette: null,
      swap: null,
      unoSafe: Array(n).fill(false),
      counts: hands.map(h => h.length),
      winner: null,
      log: 'Trò chơi bắt đầu!'
    }
  };
}

// Rút k lá; hết chồng bốc thì xào lại chồng bài đã đánh
export function take(pile, disc, k) {
  pile = [...(pile || [])];
  disc = [...(disc || [])];
  const got = [];
  while (got.length < k) {
    if (!pile.length) {
      if (!disc.length) break;
      pile = shuffle(disc);
      disc = [];
    }
    got.push(pile.shift());
  }
  return { got, pile, disc };
}

// Người pl đánh lá card (col: màu chọn nếu là lá Wild). Trả về trạng thái công khai mới.
// extra: { discardedCount: số lá cùng màu đã xả thêm khi đánh Discard All }
export function play(s, pl, card, col, extra = {}) {
  const wild = isWild(card);
  const v = wild ? card : card.slice(1);
  const n = {
    ...s,
    disc: [...(s.disc || []), s.top.code],
    counts: [...s.counts],
    unoSafe: [...(s.unoSafe || Array(s.n).fill(false))],
    drew: false,
    pend: 0,
    roulette: null
  };

  // Giảm số lá bài (nếu là Discard All thì giảm thêm số lá cùng màu đã xả)
  const discardBonus = extra.discardedCount || 0;
  n.counts[pl] -= (1 + discardBonus);
  if (n.counts[pl] < 0) n.counts[pl] = 0;

  // Cập nhật lá trên cùng và màu hiện hành
  n.top = {
    code: card,
    col: wild ? col : card[0]
  };

  let step = 1;

  // Xử lý các hiệu ứng đặc biệt
  if (v === 'S') {
    // Chặn lượt (Skip)
    step = 2;
  } else if (v === 'V') {
    // Đổi chiều (Reverse): Khi chơi 2 người thì có tác dụng như Skip (bạn đánh tiếp)
    n.dir = -s.dir;
    if (s.n === 2) step = 0;
  } else if (v === 'D') {
    // Rút 2 (+2): Cơ chế Stacking cộng dồn
    n.pend = (s.pend || 0) + 2;
    step = 1;
  } else if (v === 'F' && wild) {
    // Wild +4: Cơ chế Stacking cộng dồn
    n.pend = (s.pend || 0) + 4;
    step = 1;
  } else if (v === 'F' && !wild) {
    // Khiên Phản Đòn (Deflect): Dội ngược toàn bộ số bài phạt cho kẻ vừa đánh
    if (s.pend > 0) {
      n.pend = s.pend;
      n.dir = -s.dir;
      step = 1;
    } else {
      step = 1;
    }
  } else if (v === 'WC') {
    // Rút Tới Bến (Color Roulette): Bắt người kế tiếp bốc bài tới khi ra màu chọn
    n.roulette = col;
    step = 1;
  } else if (v === 'SW') {
    // Đổi bài (Swap Hands): Hoán đổi với đối thủ
    step = 1;
  } else if (v === 'GV') {
    // Tặng quà (Giveaway)
    step = 1;
  }

  // Nếu người chơi còn nhiều hơn 1 lá, xóa cờ an toàn uno
  if (n.counts[pl] > 1) {
    n.unoSafe[pl] = false;
  }

  n.turn = ((pl + n.dir * step) % s.n + s.n) % s.n;

  if (n.counts[pl] === 0) {
    n.winner = pl;
  }

  return n;
}
