// "Bài Bốn Màu": Trò chơi đánh bài Uno mở rộng kịch tính cho 2-5 người
// Hỗ trợ House Rules: Cộng dồn phạt (+2, +4, Khiên phản đòn), Đổi bài Swap Hands,
// Xả bài Discard All, Rút tới bến Color Roulette, Tặng quà Giveaway, Bắt lỗi hô UNO.

export const COLORS = ['R', 'Y', 'B', 'G'];
export const NAME = { R: 'Đỏ', Y: 'Vàng', B: 'Xanh dương', G: 'Xanh lá' };
export const values = o => o ? Object.values(o) : [];
const validCard = c => typeof c === 'string' && (isWild(c) || /^[RYBG][0-9SVDAF]$/.test(c));

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
  if (!validCard(card) || !top || !validCard(top.code) || !COLORS.includes(top.col)) return false;
  if (pend > 0) {
    // Cơ chế Stacking: Đang bị dồn phạt thì chỉ được đánh lá phản kháng
    // 1. Lá +2 (bất kỳ màu nào)
    if (card[1] === 'D') return true;
    // 2. Lá Wild +4
    if (card === 'F') return true;
    // 3. Lá Khiên Phản Đòn (Deflect): Cùng màu hiện hành hoặc cùng là lá Deflect
    if (isDeflect(card)) {
      return card[0] === top.col || isDeflect(top.code);
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
  if (!Number.isInteger(n) || n < 2 || n > 5) throw new Error('Cần từ 2 đến 5 người để chia bài.');
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
      drawnIndex: null,
      roulette: null,
      swap: null,
      unoSafe: Array(n).fill(false),
      unoPending: [],
      counts: hands.map(h => h.length),
      winner: null,
      log: 'Trò chơi bắt đầu!'
    }
  };
}

// Rút k lá; hết chồng bốc thì xào lại chồng bài đã đánh
export function take(pile, disc, k) {
  if (!Number.isInteger(k) || k < 0) throw new Error('Số lá rút không hợp lệ.');
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

export function normalize(s) {
  if (!s) return null;
  return {
    ...s, pile: values(s.pile), disc: values(s.disc), counts: values(s.counts),
    players: values(s.players), refs: values(s.refs), history: values(s.history),
    unoSafe: values(s.unoSafe), unoPending: values(s.unoPending),
    winner: s.winner ?? null, swap: s.swap ?? null, roulette: s.roulette ?? null,
    drawnIndex: s.drawnIndex ?? null, revision: s.revision ?? 0,
  };
}

export function cardName(c) {
  const special = { W: 'Đổi màu', F: 'Đổi màu +4', SW: 'Đổi Bài', WC: 'Rút Tới Bến', GV: 'Tặng Quà' };
  return special[c] || `${({ S: 'Chặn lượt', V: 'Đổi chiều', D: '+2', A: 'Xả Màu', F: 'Khiên Phản Đòn' })[c?.[1]] || c?.[1]} ${NAME[c?.[0]] || ''}`;
}

export function playable(s, pl, hand, index) {
  return !!s && s.winner == null && !s.swap && !s.roulette && s.turn === pl
    && Number.isInteger(index) && index >= 0 && index < hand.length
    && (!s.drew || index === s.drawnIndex) && canPlay(hand[index], s.top, s.pend);
}

function require(condition, message) {
  if (!condition) throw new Error(message);
}

function record(s, actor, type, text, card = null) {
  const entry = { seq: s.revision + 1, actor, type, text, card };
  s.revision++;
  s.log = text;
  s.history = [...s.history, entry].slice(-30);
  return s;
}

// Pure rules: private cards enter/leave through the result, never through public state.
export function act(raw, pl, inputHand, action) {
  const s = normalize(raw);
  require(s && s.winner == null, 'Ván đã kết thúc hoặc chưa chia bài.');
  require(Number.isInteger(pl) && pl >= 0 && pl < s.n, 'Bạn đang xem ván đấu.');
  require(Array.isArray(inputHand) && inputHand.length === s.counts[pl] && inputHand.every(validCard), 'Bài đang đồng bộ. Hãy thử lại.');
  require(!s.swap || (action.type === 'finish-swap' && s.swap.to === pl), 'Đang chờ hoàn tất đổi bài.');
  let h = [...inputHand];
  const n = { ...s, counts: [...s.counts], unoSafe: [...s.unoSafe], unoPending: [...s.unoPending] };
  const deliveries = [];
  const name = i => s.players[i]?.name || `Người chơi ${i + 1}`;
  const who = name(pl);
  const changed = (i, count) => {
    n.counts[i] = count;
    n.unoSafe[i] = false;
    n.unoPending = n.unoPending.filter(p => p !== i);
    if (count === 1) n.unoPending.push(i);
  };
  const advance = () => {
    n.turn = next(pl, n.dir, n.n); n.drew = false; n.drawnIndex = null;
  };
  const result = (text, card) => {
    if (!n.swap) {
      const winner = n.counts.findIndex(c => c === 0);
      if (winner >= 0) {
        if (n.pend || n.roulette) text += ' Ván kết thúc, không rút phạt thêm.';
        n.winner = winner; n.pend = 0; n.roulette = null; n.unoPending = [];
        text += ` 🏆 ${name(winner)} hết bài và thắng ván!`;
      }
    }
    record(n, pl, action.type, text, card);
    return { state: n, hand: h, deliveries };
  };

  if (action.type === 'call-uno') {
    require(h.length === 1 && !s.unoSafe[pl], 'Chỉ hô UNO khi còn đúng 1 lá và chưa hô.');
    n.unoSafe[pl] = true;
    n.unoPending = n.unoPending.filter(p => p !== pl);
    return result(`📣 ${who} đã hô UNO — còn 1 lá.`);
  }
  if (action.type === 'catch-uno') {
    const t = action.target;
    require(Number.isInteger(t) && t !== pl && s.unoPending.includes(t) && s.counts[t] === 1 && !s.unoSafe[t], 'Đã hết thời gian bắt lỗi UNO hoặc người chơi đã hô.');
    const draw = take(s.pile, s.disc, 2);
    n.pile = draw.pile; n.disc = draw.disc;
    changed(t, s.counts[t] + draw.got.length);
    n.unoPending = n.unoPending.filter(p => p !== t);
    if (!draw.got.length) n.unoSafe[t] = true;
    if (draw.got.length) deliveries.push({ to: t, cards: draw.got, mode: 'append' });
    return result(`🚨 ${who} bắt lỗi UNO của ${name(t)}; ${name(t)} rút ${draw.got.length}/2 lá phạt${draw.got.length < 2 ? ' (hết bài để rút)' : ''}.`);
  }
  if (action.type === 'finish-swap') {
    require(s.swap && s.swap.to === pl, 'Không có lượt đổi bài cần nhận.');
    const incoming = action.incoming;
    require(Array.isArray(incoming) && incoming.length === s.counts[s.swap.from] && incoming.every(validCard), 'Chưa nhận đủ bài đổi.');
    const from = s.swap.from;
    deliveries.push({ to: from, cards: h, mode: 'replace' });
    n.unoPending = [];
    changed(from, h.length); h = [...incoming]; changed(pl, h.length);
    n.swap = null; n.turn = next(from, n.dir, n.n);
    return result(`🔀 ${name(from)} và ${who} đã đổi bài: ${name(from)} còn ${n.counts[from]} lá, ${who} còn ${h.length} lá.`);
  }

  require(s.turn === pl, 'Chưa đến lượt bạn.');
  n.unoPending = []; // The next turn action closes the previous UNO catch window.
  if (action.type === 'play') {
    const { index, col, target, giftIndex } = action, c = h[index];
    require(playable(s, pl, h, index), 'Lá bài không hợp lệ ở lượt này.');
    require(!isWild(c) || COLORS.includes(col), 'Hãy chọn màu hợp lệ.');
    if (c === 'SW' || (c === 'GV' && h.length > 1)) {
      require(Number.isInteger(target) && target >= 0 && target < s.n && target !== pl, 'Hãy chọn một đối thủ trong ván.');
    }
    if (c === 'GV' && h.length > 1) {
      require(Number.isInteger(giftIndex) && giftIndex >= 0 && giftIndex < h.length && giftIndex !== index, 'Hãy chọn một lá khác để tặng.');
    }
    h.splice(index, 1);
    n.disc = [...s.disc, s.top.code];
    n.top = { code: c, col: isWild(c) ? col : c[0] };
    advance(); n.pend = 0;
    let text = `${who} đánh ${cardName(c)}.`;
    if (isWild(c)) text += ` Chọn màu ${NAME[col]}.`;
    if (isDiscardAll(c)) {
      const extra = h.filter(k => !isWild(k) && k[0] === c[0]);
      h = h.filter(k => isWild(k) || k[0] !== c[0]);
      n.disc.push(...extra);
      text = `🔥 ${who} đánh Xả Màu ${NAME[c[0]]}, xả ${extra.length + 1} lá (gồm lá Xả Màu). Các lá xả kèm không kích hoạt hiệu ứng.`;
    } else if (!isWild(c) && c[1] === 'S') {
      const skipped = n.turn; n.turn = next(n.turn, n.dir, n.n);
      text += ` ${name(skipped)} bị mất lượt.`;
    } else if (!isWild(c) && c[1] === 'V') {
      n.dir = -s.dir; n.turn = s.n === 2 ? pl : next(pl, n.dir, n.n);
      text += s.n === 2 ? ` ${who} được đánh tiếp.` : ' Đã đảo chiều chơi.';
    } else if (c[1] === 'D' || c === 'F') {
      n.pend = s.pend + (c === 'F' ? 4 : 2);
      text += ` ${name(n.turn)} phải đỡ hoặc rút ${n.pend} lá phạt.`;
    } else if (isDeflect(c) && s.pend > 0) {
      n.dir = -s.dir; n.turn = next(pl, n.dir, n.n); n.pend = s.pend;
      text += ` Dội ${n.pend} lá phạt về ${name(n.turn)} và đảo chiều chơi.`;
    } else if (c === 'WC') {
      n.roulette = col;
      text += ` ${name(n.turn)} phải rút tới khi gặp màu ${NAME[col]}, rồi mất lượt.`;
    } else if (c === 'GV' && h.length) {
      const gift = inputHand[giftIndex];
      h.splice(giftIndex > index ? giftIndex - 1 : giftIndex, 1);
      deliveries.push({ to: target, cards: [gift], mode: 'append' });
      changed(target, s.counts[target] + 1);
      text += ` Tặng 1 lá cho ${name(target)}.`;
    } else if (c === 'SW') {
      n.swap = { from: pl, to: target }; n.turn = pl;
      deliveries.push({ to: target, cards: [...h], mode: 'swap' });
      text += ` Chờ ${name(target)} nhận và đổi toàn bộ bài.`;
    }
    changed(pl, h.length);
    return result(text, c);
  }

  if (action.type === 'roulette') {
    require(!!s.roulette, 'Không có hiệu ứng Rút Tới Bến.');
    const drawn = []; let pile = s.pile, disc = s.disc, found = false;
    // A finite stock is consumed once; wild cards never satisfy the requested color.
    while (pile.length || disc.length) {
      const draw = take(pile, disc, 1);
      pile = draw.pile; disc = draw.disc;
      const c = draw.got[0]; drawn.push(c);
      if (!isWild(c) && c[0] === s.roulette) { found = true; break; }
    }
    h.push(...drawn); n.pile = pile; n.disc = disc; n.roulette = null;
    changed(pl, h.length); advance();
    return result(`🎰 ${who} rút ${drawn.length} lá${found ? ` tới khi gặp màu ${NAME[s.roulette]}` : ` nhưng hết bài để rút, chưa gặp màu ${NAME[s.roulette]}`}; mất lượt.`);
  }
  require(!s.roulette, 'Bạn cần xử lý Rút Tới Bến trước.');
  if (action.type === 'draw' || action.type === 'penalty') {
    const penalty = action.type === 'penalty';
    require(penalty ? s.pend > 0 : !s.pend && !s.drew, 'Không thể rút thêm bài ở bước này.');
    const k = penalty ? s.pend : 1, draw = take(s.pile, s.disc, k);
    n.pile = draw.pile; n.disc = draw.disc;
    h.push(...draw.got); if (draw.got.length) changed(pl, h.length);
    if (penalty) { n.pend = 0; advance(); }
    else { n.drew = true; n.drawnIndex = draw.got.length ? h.length - 1 : null; }
    return result(`${penalty ? '⚠️' : '🂠'} ${who} ${penalty ? 'chịu phạt ' : ''}rút ${draw.got.length}${penalty ? `/${k}` : ''} lá${draw.got.length < k ? ' (hết bài để rút)' : ''}.${penalty ? ' Mất lượt.' : ' Chỉ được đánh lá vừa rút hoặc bỏ lượt.'}`);
  }
  if (action.type === 'pass') {
    require(s.drew && !s.pend, 'Phải rút bài trước khi bỏ lượt.');
    advance(); return result(`⏭ ${who} bỏ lượt sau khi rút bài.`);
  }
  throw new Error('Thao tác không hợp lệ.');
}
