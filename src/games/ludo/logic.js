// Logic Cờ Cá Ngựa (Ludo) nâng cao với Hệ tọa độ 1D, Hệ thống Item đột biến và Đồng bộ thời gian thực
export const START = [0, 13, 26, 39];
export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47]; // Ô xuất phát & Ô ngôi sao an toàn

export const ITEM_TYPES = {
  MYSTERY_BOX: 'MYSTERY_BOX', // Hộp quà bí ẩn 🎁 (nhặt nhận skill)
  BOOST: 'BOOST',             // Tên lửa tăng tốc 🚀 (+4 ô)
  BANANA: 'BANANA',           // Vỏ chuối trượt lùi 🍌 (-3 ô)
  BOMB: 'BOMB'                // Mìn nổ văng về chuồng 💣
};

export const SKILL_TYPES = {
  SHIELD: 'SHIELD',           // Khiên bảo vệ 🛡️ (chống 1 lần đá/bom, phản đòn lùi 2 ô)
  SWAP: 'SWAP',               // Hoán đổi vị trí 🔄 (đổi chỗ 1 quân mình và 1 quân địch)
  GOLDEN_DICE: 'GOLDEN_DICE', // Xúc xắc vàng 🎲✨ (chọn chính xác số 1-6)
  FREEZE: 'FREEZE',           // Đóng băng ❄️ (khóa 1 quân địch trong 1 lượt)
  BANANA: 'BANANA',           // Đặt bẫy chuối 🍌
  BOMB: 'BOMB'                // Đặt mìn bẫy 💣
};

const SKILL_POOL = [
  SKILL_TYPES.SHIELD,
  SKILL_TYPES.SWAP,
  SKILL_TYPES.GOLDEN_DICE,
  SKILL_TYPES.FREEZE,
  SKILL_TYPES.BANANA,
  SKILL_TYPES.BOMB
];

export const getRandomSkill = () => SKILL_POOL[Math.random() * SKILL_POOL.length | 0];

export const absOf = (s, p) => (p >= 0 && p <= 50) ? (START[s] + p) % 52 : -1;

// Chuẩn hóa State phòng ngừa Firebase chuyển Array thành Object
export function normalizeState(g) {
  if (!g) return null;
  const seats = g.seats ? Object.values(g.seats) : [0, 2];
  const pc = (g.pc ? Object.values(g.pc) : []).map(arr => 
    (arr ? Object.values(arr) : []).map(t => ({
      step: typeof t === 'object' ? (t.step ?? -1) : (typeof t === 'number' ? t : -1),
      hasShield: typeof t === 'object' ? !!t.hasShield : false,
      frozenTurns: typeof t === 'object' ? (t.frozenTurns || 0) : 0
    }))
  );
  const inventory = (g.inventory ? Object.values(g.inventory) : []).map(inv => inv ? Object.values(inv) : []);
  const boardItems = g.boardItems ? { ...g.boardItems } : {};
  const lastActionLog = g.lastActionLog ? Object.values(g.lastActionLog) : [];

  return {
    ...g,
    seats,
    pc,
    inventory,
    boardItems,
    lastActionLog,
    turn: g.turn ?? 0,
    dice: g.dice ?? 0,
    goldenDice: g.goldenDice ?? null,
    turnCount: g.turnCount ?? 0,
    winner: g.winner ?? null,
    last: g.last ?? null
  };
}

// Khởi tạo ván mới với các tinh chỉnh:
// 1. Mặc định quân 0 đã xuất chuồng sẵn ở vạch xuất phát (step = 0)
// 2. Khởi tạo một số Item ngẫu nhiên trên đường đua
export function newGame(n) {
  const seats = n === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, n);
  
  // Mỗi người 4 quân: quân đầu tiên (index 0) đứng sẵn ở vạch xuất phát (step = 0)
  const pc = Array.from({ length: n }, () => [
    { step: 0, hasShield: false, frozenTurns: 0 },
    { step: -1, hasShield: false, frozenTurns: 0 },
    { step: -1, hasShield: false, frozenTurns: 0 },
    { step: -1, hasShield: false, frozenTurns: 0 }
  ]);

  const inventory = Array.from({ length: n }, () => []);

  // Sinh sẵn 4-5 vật phẩm khởi đầu trên các ô trống của vòng đua
  const boardItems = {};
  const spawnPoints = [
    [5, ITEM_TYPES.MYSTERY_BOX],
    [10, ITEM_TYPES.BOOST],
    [18, ITEM_TYPES.BANANA],
    [31, ITEM_TYPES.MYSTERY_BOX],
    [44, ITEM_TYPES.BOOST]
  ];
  spawnPoints.forEach(([pos, type]) => {
    boardItems[pos] = { type };
  });

  return {
    n,
    seats,
    pc,
    inventory,
    boardItems,
    turn: 0,
    dice: 0,
    goldenDice: null,
    turnCount: 0,
    lastActionLog: [],
    last: null,
    winner: null
  };
}

// Kiểm tra danh sách quân cờ hợp lệ có thể đi với điểm xúc xắc d
export function legal(g, d) {
  if (!g || !g.pc || !g.pc[g.turn]) return [];
  const pl = g.turn;
  const tokens = g.pc[pl];

  return tokens.map((t, k) => {
    // Quân đang bị đóng băng thì không được đi
    if (t.frozenTurns > 0) return -1;

    // Ở trong chuồng: Cho phép ra quân khi đổ 1 hoặc 6 (tinh chỉnh tăng tốc!)
    if (t.step === -1) {
      return (d === 1 || d === 6) ? k : -1;
    }

    // Đang trên đường đua hoặc đường về đích
    if (t.step >= 0 && t.step <= 55) {
      return (t.step + d <= 56) ? k : -1;
    }

    return -1;
  }).filter(k => k >= 0);
}

// Đổ xúc xắc
export function roll(g, d) {
  if (g.winner != null || g.dice) return g;
  const n = normalizeState(JSON.parse(JSON.stringify(g)));
  
  // Nếu có kích hoạt Xúc xắc vàng
  if (n.goldenDice) {
    d = n.goldenDice;
    n.goldenDice = null;
  }

  const legals = legal(n, d);
  if (!legals.length) {
    // Không có quân nào đi được -> Mất lượt, chuyển người kế
    n.last = { pl: n.turn, d, note: 'không có quân đi được' };
    n.lastActionLog = [{ type: 'NO_MOVE', pl: n.turn, dice: d }];
    n.turn = (n.turn + 1) % n.n;
    n.dice = 0;
    // Giảm số lượt đóng băng của người kế
    n.pc[n.turn]?.forEach(t => { if (t.frozenTurns > 0) t.frozenTurns--; });
    return n;
  }

  n.dice = d;
  return n;
}

// Di chuyển quân k với điểm xúc xắc hiện tại (Xử lý toàn bộ chuỗi phản ứng Item & Đá quân)
export function move(g, k) {
  const d = g.dice, pl = g.turn;
  if (!d || g.winner != null || !legal(g, d).includes(k)) return g;

  const n = normalizeState(JSON.parse(JSON.stringify(g)));
  const s = n.seats[pl];
  const token = n.pc[pl][k];
  const actionLog = [];
  let extraTurn = (d === 6);
  let capCount = 0;

  // 1. Xuất quân từ trong chuồng
  if (token.step === -1) {
    token.step = 0;
    actionLog.push({ type: 'SPAWN', pl, tokenIndex: k, toStep: 0 });
  } 
  // 2. Di chuyển thông thường
  else {
    const targetStep = token.step + d;
    
    // Kiểm tra lướt qua Hộp Bí Ẩn (Mystery Box) trên đường đi
    for (let st = token.step + 1; st <= targetStep; st++) {
      if (st <= 50) {
        const passGlobalPos = (st + START[s]) % 52;
        const item = n.boardItems[passGlobalPos];
        if (item && item.type === ITEM_TYPES.MYSTERY_BOX) {
          const grantedSkill = getRandomSkill();
          if (!n.inventory[pl]) n.inventory[pl] = [];
          if (n.inventory[pl].length < 2) {
            n.inventory[pl].push(grantedSkill);
          }
          delete n.boardItems[passGlobalPos];
          actionLog.push({ type: 'PICKUP_BOX', pl, atGlobalPos: passGlobalPos, skill: grantedSkill });
        }
      }
    }

    token.step = targetStep;
    actionLog.push({ type: 'MOVE', pl, tokenIndex: k, toStep: token.step });
  }

  // 3. Vòng lặp xử lý Hiệu ứng mặt đất tại điểm dừng (Chain-reaction)
  let loopGuard = 0;
  while (token.step >= 0 && token.step <= 50 && loopGuard < 4) {
    loopGuard++;
    const currentGlobalPos = (token.step + START[s]) % 52;
    const groundItem = n.boardItems[currentGlobalPos];

    if (!groundItem) break; // Ô trống -> dừng chuỗi phản ứng

    delete n.boardItems[currentGlobalPos]; // Xóa vật phẩm sau khi dẫm

    if (groundItem.type === ITEM_TYPES.BOOST) {
      token.step = Math.min(50, token.step + 4);
      actionLog.push({ type: 'TRIGGER_BOOST', pl, tokenIndex: k, toStep: token.step });
    } 
    else if (groundItem.type === ITEM_TYPES.BANANA) {
      token.step = Math.max(0, token.step - 3);
      actionLog.push({ type: 'TRIGGER_BANANA', pl, tokenIndex: k, toStep: token.step });
    } 
    else if (groundItem.type === ITEM_TYPES.BOMB) {
      if (token.hasShield) {
        token.hasShield = false;
        actionLog.push({ type: 'SHIELD_BLOCKED_BOMB', pl, tokenIndex: k, atGlobalPos: currentGlobalPos });
      } else {
        token.step = -1;
        actionLog.push({ type: 'TRIGGER_BOMB', pl, tokenIndex: k, toStep: -1 });
      }
      break; // Nổ về chuồng thì kết thúc chuỗi phản ứng
    }
  }

  // 4. Xét Đá ngựa (Capture) & Phản đòn Khiên tại điểm dừng cuối cùng
  if (token.step >= 0 && token.step <= 50) {
    const finalGlobalPos = (token.step + START[s]) % 52;

    // Không được đá nếu đang đứng trên ô an toàn
    if (!SAFE_ZONES.includes(finalGlobalPos)) {
      n.pc.forEach((oppTokens, oppPl) => {
        if (oppPl !== pl) {
          const oppSeat = n.seats[oppPl];
          oppTokens.forEach((oppToken, oppIdx) => {
            if (oppToken.step >= 0 && oppToken.step <= 50) {
              const oppGlobalPos = (oppToken.step + START[oppSeat]) % 52;
              if (oppGlobalPos === finalGlobalPos) {
                // Nếu đối phương có Khiên bảo hộ: Kẻ tấn công bị phản đòn bật lùi 2 ô!
                if (oppToken.hasShield) {
                  oppToken.hasShield = false;
                  token.step = Math.max(0, token.step - 2);
                  actionLog.push({ type: 'SHIELD_REFLECT', pl, attackerTokenIdx: k, attackerNewStep: token.step, oppPl, defenderIdx: oppIdx });
                } 
                // Đá đối phương về chuồng!
                else {
                  oppToken.step = -1;
                  extraTurn = true; // Thưởng thêm lượt khi đá được ngựa
                  capCount++;

                  // Cơ chế Báo thù (Catch-up): tặng ngay 1 skill ngẫu nhiên cho người vừa bị đá
                  if (!n.inventory[oppPl]) n.inventory[oppPl] = [];
                  if (n.inventory[oppPl].length < 2) {
                    const revengeSkill = getRandomSkill();
                    n.inventory[oppPl].push(revengeSkill);
                    actionLog.push({ type: 'REVENGE_GIFT', oppPl, skill: revengeSkill });
                  }

                  actionLog.push({ type: 'CAPTURE', pl, tokenIndex: k, oppPl, oppTokenIndex: oppIdx, atGlobalPos: finalGlobalPos });
                }
              }
            }
          });
        }
      });
    }
  }

  // 5. Kiểm tra về đích
  if (token.step === 56) {
    extraTurn = true;
    actionLog.push({ type: 'HOME_REACHED', pl, tokenIndex: k });
  }

  // 6. Kiểm tra điều kiện thắng (Đưa đủ 4 quân về đích)
  if (n.pc[pl].every(t => t.step === 56)) {
    n.winner = pl;
  }

  // 7. Cập nhật lượt chơi
  n.last = { pl, d, cap: capCount };
  n.lastActionLog = actionLog;
  n.dice = 0;
  n.turnCount++;

  if (n.winner == null && !extraTurn) {
    n.turn = (pl + 1) % n.n;
    // Giảm thời gian đóng băng cho người chơi kế tiếp
    n.pc[n.turn]?.forEach(t => { if (t.frozenTurns > 0) t.frozenTurns--; });
  }

  // 8. Tự động sinh vật phẩm định kỳ (mỗi 3 lượt nếu bàn cờ còn ít vật phẩm)
  if (n.turnCount % 3 === 0 && Object.keys(n.boardItems).length < 6) {
    const emptyCells = [];
    for (let c = 0; c < 52; c++) {
      if (!SAFE_ZONES.includes(c) && !n.boardItems[c]) {
        emptyCells.push(c);
      }
    }
    if (emptyCells.length) {
      const luckyCell = emptyCells[Math.random() * emptyCells.length | 0];
      const randomType = Math.random() < 0.5 ? ITEM_TYPES.MYSTERY_BOX : (Math.random() < 0.5 ? ITEM_TYPES.BOOST : ITEM_TYPES.BANANA);
      n.boardItems[luckyCell] = { type: randomType };
      n.lastActionLog.push({ type: 'SPAWN_ITEM', atGlobalPos: luckyCell, itemType: randomType });
    }
  }

  return n;
}

// Sử dụng thẻ kỹ năng từ túi đồ (Pocket Item)
export function useSkill(g, pl, skillType, args = {}) {
  const n = normalizeState(JSON.parse(JSON.stringify(g)));
  const inv = n.inventory[pl] || [];
  const idx = inv.indexOf(skillType);
  if (idx === -1) return g; // Không có thẻ này trong túi

  inv.splice(idx, 1); // Sử dụng và xóa khỏi túi đồ
  const s = n.seats[pl];

  if (skillType === SKILL_TYPES.SHIELD) {
    // Gắn khiên bảo vệ cho quân đang dẫn đầu của mình
    const activeTokens = n.pc[pl].filter(t => t.step >= 0 && t.step <= 55 && !t.hasShield);
    const target = activeTokens.length ? activeTokens.reduce((a, b) => a.step > b.step ? a : b) : n.pc[pl][0];
    if (target) {
      target.hasShield = true;
      n.last = { pl, note: 'đã kích hoạt Khiên Bảo Vệ 🛡️' };
    }
  }
  else if (skillType === SKILL_TYPES.GOLDEN_DICE) {
    // Đặt trước số điểm mong muốn cho lần gieo tiếp theo
    n.goldenDice = args.value ? Math.min(6, Math.max(1, +args.value)) : 6;
    n.last = { pl, note: `đã kích hoạt Xúc Xắc Vàng (${n.goldenDice} điểm) 🎲✨` };
  }
  else if (skillType === SKILL_TYPES.SWAP) {
    // Hoán đổi vị trí quân mình và quân địch đang trên vòng đua ngoài (0 <= step <= 50)
    let myToken = n.pc[pl].find(t => t.step >= 0 && t.step <= 50);
    let oppPl = (pl + 1) % n.n;
    let oppToken = n.pc[oppPl]?.find(t => t.step >= 0 && t.step <= 50);

    if (myToken && oppToken) {
      const oppSeat = n.seats[oppPl];
      const myGlobal = (myToken.step + START[s]) % 52;
      const oppGlobal = (oppToken.step + START[oppSeat]) % 52;

      // Đổi vị trí bằng công thức quy đổi ngược
      myToken.step = (oppGlobal - START[s] + 52) % 52;
      oppToken.step = (myGlobal - START[oppSeat] + 52) % 52;
      n.last = { pl, note: 'đã dùng Hoán Đổi Vị Trí 🔄' };
    }
  }
  else if (skillType === SKILL_TYPES.FREEZE) {
    // Đóng băng quân dẫn đầu của đối thủ kế tiếp
    const oppPl = (pl + 1) % n.n;
    const oppTokens = (n.pc[oppPl] || []).filter(t => t.step >= 0 && t.step <= 55);
    const target = oppTokens.length ? oppTokens.reduce((a, b) => a.step > b.step ? a : b) : null;
    if (target) {
      target.frozenTurns = 1;
      n.last = { pl, note: 'đã Đóng Băng 1 quân đối thủ ❄️' };
    }
  }
  else if (skillType === SKILL_TYPES.BANANA || skillType === SKILL_TYPES.BOMB) {
    // Đặt bẫy vào ô cách phía trước 4 ô của quân mình hoặc ô ngẫu nhiên
    const activeToken = n.pc[pl].find(t => t.step >= 0 && t.step <= 50);
    const placePos = activeToken ? (activeToken.step + START[s] + 4) % 52 : ((START[s] + 10) % 52);
    n.boardItems[placePos] = { type: skillType };
    n.last = { pl, note: `đã đặt bẫy ${skillType === SKILL_TYPES.BANANA ? 'Vỏ Chuối 🍌' : 'Mìn Nổ 💣'}` };
  }

  return n;
}
