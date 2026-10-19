import { esc } from '../../core/ui.js';
import { clack, fanfare, tone, sfx } from '../../core/sound.js';
import { 
  newGame, roll, move, legal, absOf, START, SAFE_ZONES, 
  ITEM_TYPES, SKILL_TYPES, useSkill, normalizeState 
} from './logic.js';
import { COL, COL_NAMES, diceSVG, horseSVG, itemSVG, SKILL_INFO } from './art.js';

const CX = 180, CY = 180, R = 125;
const pt = (a, r) => { const t = a / 52 * 2 * Math.PI - Math.PI / 2; return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; };
const colPt = (s, p) => pt((START[s] + 51) % 52, R - (p - 50) * (R - 26) / 6);

function xy(g, pl, k) {
  const s = g.seats[pl], token = g.pc[pl][k], p = token.step;
  if (p === -1) {
    const [x, y] = pt(START[s] + 2, R + 40), o = [[-9, -9], [9, -9], [-9, 9], [9, 9]][k];
    return [x + o[0], y + o[1]];
  }
  return p <= 50 ? pt(absOf(s, p), R) : colPt(s, p);
}

export default {
  id: 'ludo', name: 'Cờ cá ngựa', icon: '🐴', desc: 'Đổ xúc xắc, hệ thống Item đột biến, 2-4 người', min: 2, max: 4, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let g = null, won = false, showGoldenPicker = false, processedLogId = '';

    el.innerHTML = `<section>
      <div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <div class="panel">
        <svg class="ludo" viewBox="0 0 360 360" role="img" aria-label="Bàn cờ cá ngựa"></svg>
        <div class="ludo-inventory"></div>
        <p class="msg" role="status" style="text-align:center;font-weight:600;min-height:2.4em;margin:8px 0"></p>
        <div class="row" style="justify-content:center;gap:12px">
          <button class="btn pri" data-a="roll" style="display:flex;align-items:center;gap:8px;font-size:1.05rem;padding:10px 22px">
            <span>🎲</span><b>Đổ xúc xắc</b>
          </button>
          <button class="btn" data-a="new">Ván mới</button>
        </div>
      </div>
      <details class="rules-panel"><summary><span>📖 Luật chơi &amp; Hệ thống Item Cờ Cá Ngựa</span></summary>
        <div class="rules-content">
          <div class="rules-sec">
            <h4>🎯 Mục tiêu &amp; Tinh chỉnh tăng tốc</h4>
            <p style="margin:0;font-size:0.88rem;color:#f3ecda;line-height:1.45">
              Đưa đủ 4 chú ngựa về đích (chuồng số 6). <br>
              ⚡ <b>Khởi đầu nhanh:</b> Mỗi người chơi có sẵn <b>1 quân đứng ngay tại vạch xuất phát ⭐</b> khi bắt đầu! <br>
              🎲 <b>Ra quân dễ dàng:</b> Đổ được mặt <b>1</b> hoặc <b>6</b> đều được xuất chuồng (đổ 6 được đổ tiếp).
            </p>
          </div>
          <div class="rules-sec">
            <h4>🎁 Vật phẩm trên đường đua (Board Items)</h4>
            <div class="rules-grid">
              <div class="rules-item">
                <svg width="36" height="36" viewBox="-12 -12 24 24">${itemSVG('MYSTERY_BOX')}</svg>
                <div class="rules-info"><b>Hộp Quà Bí Ẩn</b><span>Đi ngang qua hoặc dừng lại để nhận 1 thẻ kỹ năng ngẫu nhiên vào túi đồ!</span></div>
              </div>
              <div class="rules-item">
                <svg width="36" height="36" viewBox="-12 -12 24 24">${itemSVG('BOOST')}</svg>
                <div class="rules-info"><b>Tên Lửa Tăng Tốc</b><span>Dừng đúng ô sẽ lập tức phóng vọt tới trước <b>+4 ô</b>!</span></div>
              </div>
              <div class="rules-item">
                <svg width="36" height="36" viewBox="-12 -12 24 24">${itemSVG('BANANA')}</svg>
                <div class="rules-info"><b>Vỏ Chuối Trượt Lùi</b><span>Đạp phải sẽ trượt lùi <b>-3 ô</b> (dễ trượt lùi rồi vô tình đá quân phía sau).</span></div>
              </div>
              <div class="rules-item">
                <svg width="36" height="36" viewBox="-12 -12 24 24">${itemSVG('BOMB')}</svg>
                <div class="rules-info"><b>Mìn Bẫy Nổ Tung</b><span>Dẫm trúng mìn sẽ nổ văng thẳng về chuồng (trừ khi có Khiên bảo vệ).</span></div>
              </div>
            </div>
          </div>
          <div class="rules-sec">
            <h4>🎒 Thẻ kỹ năng trong túi đồ (Inventory Items)</h4>
            <div class="rules-grid">
              <div class="rules-item">
                <span style="font-size:1.8rem">🛡️</span>
                <div class="rules-info"><b>Khiên Phản Đòn</b><span>Chống 1 lần đá/bom. Kẻ tấn công bị bật lùi lại 2 ô!</span></div>
              </div>
              <div class="rules-item">
                <span style="font-size:1.8rem">🔄</span>
                <div class="rules-info"><b>Hoán Đổi Vị Trí</b><span>Đổi chỗ 1 quân mình và 1 quân đối phương trên đường đua ngoài.</span></div>
              </div>
              <div class="rules-item">
                <span style="font-size:1.8rem">🎲✨</span>
                <div class="rules-info"><b>Xúc Xắc Vàng</b><span>Tự chọn chính xác số điểm từ 1 đến 6 cho lượt đổ tiếp theo!</span></div>
              </div>
              <div class="rules-item">
                <span style="font-size:1.8rem">❄️</span>
                <div class="rules-info"><b>Băng Phong</b><span>Đóng băng 1 quân đối thủ, khiến quân này không thể đi trong 1 lượt.</span></div>
              </div>
            </div>
          </div>
          <div class="rules-tip">
            🔥 <b>Cơ chế Báo thù (Catch-up):</b> Khi quân ngựa của bạn bị đối phương đá về chuồng, bạn sẽ được tặng ngay <b>1 thẻ kỹ năng ngẫu nhiên</b> vào túi đồ để lật ngược thế cờ!
          </div>
        </div>
      </details>
    </section>`;

    const q = s => el.querySelector(s);

    function render() {
      const ps = room.players(), nm = i => ps[i]?.name || '?';
      const mySeatIdx = g ? g.seats.findIndex((st, i) => ps[i]?.uid === me.uid) : -1;
      const myPl = mySeatIdx >= 0 ? mySeatIdx : 0;
      const mine = !!g && !g.winner && g.turn === myPl && ps[g.turn]?.uid === me.uid;

      if (!g) {
        q('.turn').textContent = 'Chưa bắt đầu';
        q('.ludo').innerHTML = '';
        q('.ludo-inventory').innerHTML = '';
        q('.msg').textContent = 'Bấm "Ván mới" khi có đủ từ 2 đến 4 người trong phòng.';
        q('[data-a=roll]').disabled = true;
        return;
      }

      let s = '';
      // 1. Khung nền bàn cờ tròn sang trọng
      s += `<circle cx="${CX}" cy="${CY}" r="176" fill="#0f172a" stroke="#ffffff1a" stroke-width="2"/>`;
      // Đường ray chạy 52 ô
      s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#ffffff12" stroke-width="18"/>`;

      // 2. Vẽ 4 khu chuồng ngựa ở 4 góc
      g.seats.forEach(st => {
        const [cx, cy] = pt(START[st] + 2, R + 40);
        s += `<circle cx="${cx}" cy="${cy}" r="22" fill="${COL[st]}" fill-opacity="0.14" stroke="${COL[st]}" stroke-width="2" stroke-dasharray="3,2"/>`;
        s += `<text x="${cx}" y="${cy - 12}" text-anchor="middle" font-size="7.5" font-weight="900" fill="${COL[st]}" opacity="0.9">CHUỒNG</text>`;
        // 4 bục đế cờ trong chuồng
        [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([ox, oy]) => {
          s += `<circle cx="${cx + ox}" cy="${cy + oy}" r="7" fill="#ffffff0c" stroke="${COL[st]}" stroke-width="1" stroke-dasharray="2,2"/>`;
        });
      });

      // 3. Vẽ 52 ô trên đường chạy
      for (let a = 0; a < 52; a++) {
        const [x, y] = pt(a, R);
        const isStart = a % 13 === 0;
        const isSafe = SAFE_ZONES.includes(a);
        if (isStart) {
          const colIdx = a / 13;
          s += `<circle cx="${x}" cy="${y}" r="8.5" fill="${COL[colIdx]}" stroke="#FFFFFF" stroke-width="2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>`;
          s += `<text x="${x}" y="${y + 2.5}" text-anchor="middle" font-size="7.5" fill="#FFFFFF">⭐</text>`;
        } else if (isSafe) {
          s += `<circle cx="${x}" cy="${y}" r="6.5" fill="#1e293b" stroke="#FBBF24" stroke-width="1.8"/>`;
          s += `<text x="${x}" y="${y + 2.2}" text-anchor="middle" font-size="6" fill="#FBBF24">✦</text>`;
        } else {
          s += `<circle cx="${x}" cy="${y}" r="5.5" fill="#1e293b" stroke="#ffffff44" stroke-width="1.2"/>`;
        }
      }

      // 4. Vẽ các vật phẩm trên mặt đất (Board Items)
      if (g.boardItems) {
        Object.entries(g.boardItems).forEach(([posStr, item]) => {
          const pos = +posStr;
          if (pos >= 0 && pos < 52 && item?.type) {
            const [ix, iy] = pt(pos, R);
            s += `<g transform="translate(${ix}, ${iy})">${itemSVG(item.type)}</g>`;
          }
        });
      }

      // 5. Đường bậc thang về đích (từ ô 51 đến 56)
      g.seats.forEach(st => {
        for (let p = 51; p <= 56; p++) {
          const [x, y] = colPt(st, p);
          const isHome = p === 56;
          s += `<circle cx="${x}" cy="${y}" r="${isHome ? 9 : 6.5}" fill="${COL[st]}" fill-opacity="${isHome ? '0.95' : '0.45'}" stroke="${COL[st]}" stroke-width="1.8"/>`;
          s += `<text x="${x}" y="${y + 2.5}" text-anchor="middle" font-size="${isHome ? 7 : 6}" font-weight="900" fill="#fff">${isHome ? '🏆' : (p - 50)}</text>`;
        }
      });

      // 6. Đấu trường trung tâm bàn cờ & Xúc xắc
      s += `<circle cx="${CX}" cy="${CY}" r="30" fill="#0b1329" stroke="#ffffff26" stroke-width="2"/>`;
      const curDice = g.dice || g.last?.d || 0;
      s += `<g transform="translate(${CX - 20}, ${CY - 20})">${diceSVG(curDice, 40)}</g>`;

      // 7. Vẽ các chú ngựa trên bàn cờ
      const L = mine && g.dice ? legal(g, g.dice) : [];
      g.pc.forEach((arr, pl) => arr.forEach((token, k) => {
        const [x, y] = xy(g, pl, k);
        const lg = pl === g.turn && L.includes(k);
        s += `<g transform="translate(${x}, ${y})" class="${lg ? 'lg' : ''}" ${lg ? `data-k="${k}" tabindex="0" role="button" aria-label="Đi quân ${k + 1}"` : ''}>
          ${horseSVG(COL[g.seats[pl]], lg, token)}
        </g>`;
      }));

      q('.ludo').innerHTML = s;

      // 8. Túi đồ cá nhân & Kỹ năng (Inventory Bar)
      const myInventory = (g.inventory && g.inventory[myPl]) || [];
      const invContainer = q('.ludo-inventory');
      let invHtml = '';

      if (showGoldenPicker && mine) {
        invHtml = `<div class="golden-picker">
          <span style="font-size:0.85rem;font-weight:700;color:#FBBF24">Chọn điểm Xúc Xắc Vàng:</span>
          ${[1, 2, 3, 4, 5, 6].map(v => `<button class="btn-dice-val" data-dice-val="${v}">${v}</button>`).join('')}
          <button class="btn" data-a="cancel-golden" style="padding:4px 8px;font-size:0.75rem">Hủy</button>
        </div>`;
      } else if (myInventory.length > 0) {
        invHtml = `<div class="inventory-wrap">
          <div class="inventory-head">
            <span>🎒 TÚI ĐỒ KỸ NĂNG CỦA BẠN (${myInventory.length}/2):</span>
            <small style="color:var(--lantern)">Dùng trước khi đổ xúc xắc</small>
          </div>
          <div class="inventory-list">
            ${myInventory.map(skill => {
              const info = SKILL_INFO[skill] || { icon: '✨', name: skill, desc: '' };
              return `<button class="skill-card" data-skill="${skill}" ${mine && !g.dice ? '' : 'disabled'} title="${info.desc}">
                <span>${info.icon}</span>
                <span>${info.name}</span>
                <small>Dùng</small>
              </button>`;
            }).join('')}
          </div>
        </div>`;
      }
      invContainer.innerHTML = invHtml;

      // 9. Thông báo lượt chơi & Chuỗi sự kiện
      const l = g.last;
      q('.turn').innerHTML = g.winner != null 
        ? `🏆 <b>${esc(nm(g.winner))}</b> đã đưa cả 4 chú ngựa về đích xuất sắc!` 
        : `<span class="dot" style="background:${COL[g.seats[g.turn]]}"></span> Lượt của <b>${esc(nm(g.turn))}</b> (${COL_NAMES[g.seats[g.turn]]})${g.goldenDice ? ' ✨ (Xúc xắc vàng)' : ''}`;

      q('.msg').innerHTML = g.winner != null 
        ? '🏁 Ván cờ đã kết thúc. Bấm "Ván mới" để tái đấu!' 
        : g.dice 
          ? (mine 
              ? `🎲 Bạn đổ được <b>${g.dice}</b>! Hãy chạm vào một chú ngựa đang nhấp nháy để phi nước đại.` 
              : `🎲 <b>${nm(g.turn)}</b> đổ được <b>${g.dice}</b> điểm.`) 
          : l 
            ? `🎲 <b>${nm(l.pl)}</b> ${l.note || `đổ ${l.d}`}${l.cap ? ` 💥 và đá ${l.cap} quân đối phương!` : ''}` 
            : (mine ? '👉 Đến lượt bạn: dùng kỹ năng trong túi (nếu có) rồi bấm <b>Đổ xúc xắc</b>.' : '⏳ Đang chờ người chơi đổ xúc xắc…');

      q('[data-a=roll]').disabled = !mine || !!g.dice;
      if (g.winner != null && !won) fanfare(); 
      won = g.winner != null;

      // 10. Chạy âm thanh & Toast theo actionLog mới
      if (g.lastActionLog && g.lastActionLog.length) {
        const logId = JSON.stringify(g.lastActionLog);
        if (logId !== processedLogId) {
          processedLogId = logId;
          g.lastActionLog.forEach(ev => {
            if (ev.type === 'TRIGGER_BOOST') ctx.toast('🚀 Tên lửa đẩy phóng vọt tới +4 ô!');
            else if (ev.type === 'TRIGGER_BANANA') ctx.toast('🍌 Trượt vỏ chuối lùi 3 ô!');
            else if (ev.type === 'TRIGGER_BOMB') {
              tone(120, .4, .3, 'sawtooth');
              ctx.toast('💣 Dẫm trúng mìn nổ văng về chuồng!');
            }
            else if (ev.type === 'SHIELD_BLOCKED_BOMB') ctx.toast('🛡️ Khiên đã chặn quả bom thành công!');
            else if (ev.type === 'SHIELD_REFLECT') ctx.toast('🛡️ Khiên phản đòn! Kẻ tấn công bị bật lùi 2 ô!');
            else if (ev.type === 'PICKUP_BOX') ctx.toast(`🎁 Nhặt được Hộp Bí Ẩn: ${SKILL_INFO[ev.skill]?.name || ev.skill}!`);
            else if (ev.type === 'REVENGE_GIFT') ctx.toast(`🔥 Báo thù: Nhận ngay 1 thẻ ${SKILL_INFO[ev.skill]?.name || ev.skill}!`);
          });
        }
      }
    }

    const publish = (n, prev) => {
      room.set('g/ludo', n);
      const ps = room.players();
      if (n.winner != null) ctx.ping(null, 'Ván cờ cá ngựa đã kết thúc');
      else if (n.turn !== prev.turn) ctx.ping([ps[n.turn]?.uid], 'Đến lượt bạn đổ xúc xắc trong Cờ Cá Ngựa');
    };

    el.onclick = e => {
      const k = e.target.closest('[data-k]');
      const a = e.target.closest('[data-a]')?.dataset.a;
      const skillBtn = e.target.closest('[data-skill]');
      const diceValBtn = e.target.closest('[data-dice-val]');

      // Sử dụng thẻ kỹ năng từ túi đồ
      if (skillBtn && g) {
        const skillType = skillBtn.dataset.skill;
        if (skillType === SKILL_TYPES.GOLDEN_DICE) {
          showGoldenPicker = true;
          render();
          return;
        }
        const n = useSkill(g, g.turn, skillType);
        if (n !== g) {
          publish(n, g);
          tone(520, .15, .2, 'triangle');
          ctx.toast(`✨ Đã kích hoạt ${SKILL_INFO[skillType]?.name || skillType}!`);
        }
        return;
      }

      // Chọn số điểm Xúc xắc vàng
      if (diceValBtn && g) {
        const val = +diceValBtn.dataset.diceVal;
        showGoldenPicker = false;
        const n = useSkill(g, g.turn, SKILL_TYPES.GOLDEN_DICE, { value: val });
        if (n !== g) {
          publish(n, g);
          tone(580, .15, .2, 'triangle');
          ctx.toast(`✨ Xúc xắc vàng đã khóa điểm: ${val}!`);
        }
        return;
      }

      if (a === 'cancel-golden') {
        showGoldenPicker = false;
        render();
        return;
      }

      // Di chuyển quân cờ
      if (k && g) {
        const n = move(g, +k.dataset.k);
        if (n !== g) {
          publish(n, g);
          if (n.last?.cap) {
            tone(440, .25, .25, 'triangle');
            ctx.toast(`💥 Đá văng ${n.last.cap} chú ngựa đối phương về chuồng!`);
          } else {
            sfx('card-place', () => clack());
          }
        }
      } 
      // Đổ xúc xắc
      else if (a === 'roll' && g) {
        const rolledVal = (Math.random() * 6 | 0) + 1;
        const n = roll(g, rolledVal);
        if (n !== g) {
          sfx('dice-roll', () => tone(260, .15, .15, 'square'));
          if (n.dice === 6) ctx.toast('🎉 Đổ được 6! Được thưởng thêm lượt!');
          publish(n, g);
        }
      } 
      // Bắt đầu ván mới
      else if (a === 'new') {
        const c = Math.min(4, room.players().length);
        if (c < 2) return ctx.toast('Cần ít nhất 2 người trong phòng để bắt đầu');
        room.set('g/ludo', newGame(c));
      }
    };

    el.onkeydown = e => {
      if (e.key === 'Enter' && e.target.dataset?.k) {
        e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    };

    ctx.onLeave(room.watch('g/ludo', v => {
      g = normalizeState(v);
      render();
    }));
  }
};
