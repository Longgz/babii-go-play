import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { sfx, fanfare, tone } from '../../core/sound.js';
import { deal, draw, playCard, placeBomb, startReq, resolveReq, saveAlter } from './logic.js';
import { INFO, cardSVG, backSVG } from './art.js';

const vals = o => o ? Object.values(o) : [];
const ORDER = ['D', 'X', 'S', 'A', 'H', 'F', 'V', 'B', 'T', 'W', 'M', 'K', 'N', 'C1', 'C2', 'C3', 'C4'];
const sortHand = h => [...h].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

export default {
  id: 'meo-bom', name: 'Mèo Phá Bom', icon: '💣', desc: 'Rút bài né bom, mở rộng Streaking & Imploding, 2-5 người', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; 
    let st = null, hand = [], ready = false, pick = null, peek = null, alterTop = null, busy = false, won = false;

    el.innerHTML = `<section>
      <div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <div class="panel main"></div>
      <details class="rules-panel"><summary><span>📖 Luật chơi &amp; Thẻ bài mở rộng (Streaking &amp; Imploding)</span></summary>
        <div class="rules-content">
          <div class="rules-sec">
            <h4>🎯 Mục tiêu trò chơi</h4>
            <p style="margin:0;font-size:0.88rem;color:#f3ecda;line-height:1.45">Mỗi người khởi đầu với <b>4 lá ngẫu nhiên + 1 lá Gỡ bom</b>. Hãy sống sót đến cùng! Người chơi cuối cùng còn sống sót trên bàn sẽ giành chiến thắng tuyệt đối.</p>
          </div>
          <div class="rules-sec">
            <h4>🔄 Vòng chơi mỗi lượt</h4>
            <ul class="rules-steps">
              <li class="rules-step"><span class="rules-num">1</span><span><b>Hành động (tùy chọn):</b> Đánh bao nhiêu lá chức năng tùy thích (hoặc không đánh lá nào). Đánh lá Tấn công (A) đè lên Tấn công để cộng dồn bắt đối thủ đi 4 lượt!</span></li>
              <li class="rules-step"><span class="rules-num">2</span><span><b>Rút bài (bắt buộc):</b> Rút lá trên cùng (hoặc dùng lá <b>Rút Đáy ⚓</b>) để kết thúc lượt. Nếu không may rút trúng <b>Bom</b> mà không có <b>Gỡ bom</b> hoặc <b>Mèo Ôm Bom</b>, bạn sẽ bị nổ tung và loại ngay!</span></li>
            </ul>
          </div>
          <div class="rules-sec">
            <h4>🃏 Toàn bộ thẻ bài trong game</h4>
            <div class="rules-grid">
              <div class="rules-item">${cardSVG('X', 44)}<div class="rules-info"><b>Bom Nổ (Exploding Kitten)</b><span>Rút trúng là nổ tung! Bị loại ngay nếu không có lá Gỡ bom hoặc Mèo ôm bom.</span></div></div>
              <div class="rules-item">${cardSVG('D', 44)}<div class="rules-info"><b>Gỡ Bom (Defuse)</b><span>Cứu sống bạn khi dính bom. Được bí mật cất lại bom vào vị trí tùy chọn.</span></div></div>
              <div class="rules-item">${cardSVG('S', 44)}<div class="rules-info"><b>Né Tránh (Skip)</b><span>Kết thúc lượt ngay lập tức mà không cần phải rút bài.</span></div></div>
              <div class="rules-item">${cardSVG('A', 44)}<div class="rules-info"><b>Tấn Công (Attack)</b><span>Kết thúc lượt không rút bài, ép người kế đi 2 lượt! Có thể đánh đè để cộng dồn.</span></div></div>
              <div class="rules-item">${cardSVG('H', 44)}<div class="rules-info"><b>Xào Bài (Shuffle)</b><span>Trộn đều lại toàn bộ cọc bài rút để đổi vận may.</span></div></div>
              <div class="rules-item">${cardSVG('F', 44)}<div class="rules-info"><b>Nhìn Trước (See the Future)</b><span>Bí mật nhìn trộm 3 lá trên cùng cọc bài rút.</span></div></div>
              <div class="rules-item">${cardSVG('V', 44)}<div class="rules-info"><b>Xin Bài (Favor)</b><span>Bắt một người chơi khác phải tự chọn và giao nộp 1 lá bài cho bạn.</span></div></div>
              <div class="rules-item">${cardSVG('B', 44)}<div class="rules-info"><b>Rút Đáy (Draw from Bottom)</b><span>Kết thúc lượt bằng cách rút lá dưới đáy cọc bài thay vì lá trên cùng.</span></div></div>
              <div class="rules-item">${cardSVG('T', 44)}<div class="rules-info"><b>Thao Túng (Alter the Future)</b><span>Nhìn 3 lá trên cùng và tự do sắp xếp lại thứ tự của chúng để gài bẫy.</span></div></div>
              <div class="rules-item">${cardSVG('W', 44)}<div class="rules-info"><b>Đảo Đầu Đuôi (Swap Top &amp; Bottom)</b><span>Hoán đổi lá trên cùng và lá dưới đáy cọc bài mà không cần nhìn.</span></div></div>
              <div class="rules-item">${cardSVG('M', 44)}<div class="rules-info"><b>Mèo Đa Năng (Feral Cat)</b><span>Lá bài đại diện: có thể ghép cặp với bất kỳ lá Mèo nào khác để trộm bài.</span></div></div>
              <div class="rules-item">${cardSVG('K', 44)}<div class="rules-info"><b>Mèo Ôm Bom (Streaking Kitten)</b><span>Khi giữ lá này trên tay, bạn được phép cầm 1 quả Bom Nổ mà không bị nổ!</span></div></div>
              <div class="rules-item">${cardSVG('N', 44)}<div class="rules-info"><b>Chặn Đứng (Nope)</b><span>Vô hiệu hóa hành động của đối phương vừa nhắm vào bạn!</span></div></div>
              <div class="rules-item">${cardSVG('C1', 44)}<div class="rules-info"><b>Cặp Mèo Giống Nhau</b><span>Đánh cặp 2 lá mèo giống nhau (hoặc với Mèo đa năng) để trộm 1 lá của đối thủ!</span></div></div>
            </div>
          </div>
          <div class="rules-tip">
            💡 <b>Tâm lý chiến với Mèo Ôm Bom (K):</b> Nếu bạn đang cầm K, bạn có thể tự tin rút trúng Bom và ôm quả Bom trên tay. Nếu đối phương dùng Cặp Mèo trộm bài mà xui xẻo bốc trúng quả Bom đó thì đối phương sẽ nổ tung ngay lập tức!
          </div>
        </div>
      </details>
    </section>`;

    const q = s => el.querySelector(s), ps = () => room.players().slice(0, 5), seat = () => ps().findIndex(p => p.uid === me.uid);
    const norm = v => v ? { 
      ...v, 
      pile: vals(v.pile), 
      disc: vals(v.disc), 
      counts: vals(v.counts), 
      alive: vals(v.alive), 
      left: v.left || 1, 
      pend: v.pend || null, 
      bomb: v.bomb ?? null 
    } : null;
    
    const pack = n => ({ ...n, winner: n.winner ?? null, pend: n.pend ?? null, bomb: n.bomb ?? null });
    
    const commit = (n, h, extra = {}) => {
      const prev = st; 
      room.update({ 'g/mk': pack(n), [`private/${me.uid}/h5`]: h, ...extra }); 
      hand = h;
      const P = ps();
      if (n.winner != null) ctx.ping(null, 'Ván Mèo Phá Bom đã kết thúc');
      else if (n.pend) ctx.ping([P[n.pend.to]?.uid], n.pend.type === 'favor' ? `${me.name} xin một lá bài của bạn` : `${me.name} lấy trộm bài của bạn`);
      else if (n.turn !== prev.turn) ctx.ping([P[n.turn]?.uid], 'Đến lượt bạn chơi Mèo Phá Bom');
    };

    function render() {
      const P = ps(), mi = seat(), main = q('.main');
      if (!st) { 
        q('.turn').textContent = 'Chưa chia bài'; 
        main.innerHTML = P.length < 2 ? '<p>Chờ thêm người vào phòng (2-5 người).</p>' : `<button class="btn pri" data-a="deal">Chia bài cho ${P.length} người</button>`; 
        return; 
      }
      if (!st.pend) busy = false;

      const alive = mi >= 0 && st.alive[mi];
      const mine = alive && st.turn === mi && st.winner == null;
      const free = mine && !st.pend && st.bomb == null && !pick && !alterTop;
      const give = st.pend?.type === 'favor' && st.pend.to === mi && alive;
      const targets = P.map((p, i) => i).filter(i => i !== mi && st.alive[i] && st.counts[i] > 0);

      q('.turn').textContent = st.winner != null 
        ? `🏆 ${P[st.winner]?.name} là người sống sót duy nhất!` 
        : `Lượt của ${P[st.turn]?.name || '?'}${st.left > 1 ? ` (còn ${st.left} lượt!)` : ''}`;

      const bombs = st.alive.reduce((a, b) => a + b, 0) - 1;
      let act = '';

      if (st.winner != null) {
        act = '';
      }
      // Gỡ bom và đặt lại vị trí
      else if (st.bomb === mi && mine) {
        act = `<div class="panel" style="background:#dc262622;border:1px solid #dc262655">
          <p class="msg" style="color:#fca5a5;font-weight:700">🚨 Bạn đã gỡ bom thành công! Hãy chọn vị trí cất bí mật quả bom vào lại cọc bài (0 là trên cùng, ${st.pile.length} là dưới cùng):</p>
          <div class="row" style="justify-content:center;gap:12px">
            <input type="range" class="pos" min="0" max="${st.pile.length}" value="${Math.min(2, st.pile.length)}" aria-label="Vị trí cất bom" style="max-width:200px">
            <output class="posv" style="font-weight:900;font-size:1.2rem;min-width:24px">${Math.min(2, st.pile.length)}</output>
            <button class="btn pri" data-a="bomb">Cất bom vào vị trí</button>
          </div>
        </div>`;
      }
      // Thao túng 3 lá đầu (Alter the future)
      else if (alterTop && mine) {
        act = `<div class="panel" style="background:#4f46e522;border:1px solid #4f46e555">
          <p class="msg" style="color:#a5b4fc;font-weight:700">🔮 Thao túng: Đổi vị trí 3 lá trên cùng để gài bẫy đối thủ!</p>
          <div class="row" style="justify-content:center;gap:12px;margin:10px 0">
            ${alterTop.map((c, idx) => `
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <span style="font-size:0.75rem;font-weight:700;color:var(--mute)">Vị trí ${idx + 1}</span>
                ${cardSVG(c, 56)}
                <div class="row" style="gap:4px">
                  <button class="btn" data-alter-swap="${idx}" ${idx === 0 ? 'disabled' : ''} style="padding:2px 8px;font-size:0.75rem">◀</button>
                  <button class="btn" data-alter-swap="${idx}" ${idx === alterTop.length - 1 ? 'disabled' : ''} style="padding:2px 8px;font-size:0.75rem">▶</button>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="row" style="justify-content:center"><button class="btn pri" data-a="save-alter">Xác nhận thứ tự</button></div>
        </div>`;
      }
      // Bị xin bài hoặc bị trộm bài
      else if ((give || (st.pend && st.pend.to === mi)) && alive) {
        const hasNope = hand.includes('N');
        act = `<div class="panel" style="background:#db277722;border:1px solid #db277755">
          <p class="msg" style="color:#f472b6;font-weight:700">
            🤲 ${esc(P[st.pend.by]?.name)} đang ${st.pend.type === 'favor' ? 'xin bài của bạn' : 'định trộm bài của bạn'}!
          </p>
          ${hasNope ? `<div class="row" style="justify-content:center;margin:6px 0"><button class="btn pri" data-a="use-nope" style="background:#be185d;color:#fff;border-color:transparent">🚫 DÙNG NOPE ĐỂ CHẶN ĐỨNG!</button></div>` : ''}
          ${give ? `<p style="font-size:0.85rem;color:var(--mute);text-align:center">Hoặc chạm vào một lá trên tay của bạn để tự nguyện giao nộp:</p>` : ''}
        </div>`;
      }
      else if (st.pend && st.pend.by === mi) {
        act = `<p class="msg">⏳ Đang chờ ${esc(P[st.pend.to]?.name)} xử lý yêu cầu…</p>`;
      }
      else if (pick) {
        act = `<div class="panel" style="background:#3b82f622;border:1px solid #3b82f655">
          <p class="msg" style="font-weight:700">${pick.type === 'favor' ? '🤲 Bạn muốn xin bài của ai?' : '🐱 Bạn muốn trộm bài của ai?'}</p>
          <div class="row" style="justify-content:center">${targets.map(i => `<button class="btn" data-t="${i}">👤 ${esc(P[i].name)} (${st.counts[i]} lá)</button>`).join('') || 'Không ai có bài.'}<button class="btn" data-a="cancel">Hủy</button></div>
        </div>`;
      }
      else if (mine) {
        act = `<p class="msg">👉 Đến lượt bạn: đánh các lá chức năng (hoặc không), rồi bấm nút rút bài để kết thúc lượt.</p>
          <div class="row" style="justify-content:center;gap:12px">
            <button class="btn pri" data-a="draw" style="font-size:1.05rem;padding:12px 24px">🃏 Rút bài &amp; Kết thúc lượt</button>
            ${hand.includes('B') ? `<button class="btn" data-a="draw-bottom" style="background:#0284c7;color:#fff;border-color:transparent;font-weight:700;padding:12px 18px">⚓ Rút đáy cọc bài</button>` : ''}
          </div>`;
      }
      else {
        act = `<p class="msg">${mi < 0 ? 'Bạn đang ở chế độ xem.' : !alive ? '💀 Bạn đã dính bom và bị loại khỏi ván này.' : 'Đang chờ đối thủ ra đòn…'}</p>`;
      }

      main.innerHTML = `<div class="opps">${P.map((p, i) => i === mi ? '' : `<div class="opp ${i === st.turn && st.winner == null ? 'cur' : ''} ${st.alive[i] ? '' : 'dead'}">${avatarSVG(p.avatar, 30)}<b>${esc(p.name)}</b><span>${st.alive[i] ? st.counts[i] + ' lá' : '💥 bị loại'}</span></div>`).join('')}</div>
        <div class="center"><div class="pile" aria-label="Chồng bài còn ${st.pile.length} lá">${backSVG(70)}<small>${st.pile.length}</small></div><div class="topc">${st.disc.length ? cardSVG(st.disc.at(-1), 74) : '<span class="msg" style="opacity:0.6;font-size:0.85rem">Chưa có lá nào</span>'}</div></div>
        <p class="msg" style="text-align:center">💣 Còn <b>${bombs}</b> quả bom trong cọc rút. ${st.log ? `<br><small style="color:var(--mute)">📜 ${esc(st.log)}</small>` : ''}</p>
        ${peek ? `<div class="panel" style="background:#0891b222;border:1px solid #0891b255"><p class="msg" style="color:#67e8f9;font-weight:700">🔮 3 lá trên cùng cọc bài rút:</p><div class="hand">${peek.map(c => cardSVG(c, 56)).join('')}</div><div class="row" style="justify-content:center;margin-top:8px"><button class="btn" data-a="close-peek">Đã xem xong</button></div></div>` : ''}${act}
        <div class="hand">${sortHand(hand).map(c => `<button class="hc ${free || give ? 'ok' : ''}" data-c="${c}" ${free || give ? '' : 'disabled'}>${cardSVG(c, 64)}</button>`).join('')}</div>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="deal">${st.winner != null ? 'Chia ván mới' : 'Chia lại'}</button></div>`;

      const rg = q('.pos'); 
      if (rg) rg.oninput = () => q('.posv').textContent = rg.value;
      if (st.winner != null && !won && st.winner === mi) fanfare(); 
      won = st.winner != null;

      // Xử lý lấy trộm: máy người bị trộm tự động gửi 1 lá sang người trộm
      if (ready && st.pend?.type === 'steal' && st.pend.to === mi && !busy) {
        busy = true;
        const stolenIdx = Math.random() * hand.length | 0;
        const card = hand.length ? hand[stolenIdx] : null;
        const h = [...hand];
        if (card) h.splice(stolenIdx, 1);

        // KỊCH BẢN TÂM LÝ CHIẾN MÈO ÔM BOM (K):
        // 1. Nếu đối phương trộm trúng quả BOM 'X' trên tay bạn: Kẻ trộm dính bom ngay!
        // 2. Nếu đối phương trộm mất lá 'K' và bạn vẫn còn ôm quả 'X': Bạn nổ tung ngay!
        const logMsg = `${P[st.pend.by]?.name} lấy trộm 1 lá của ${me.name}`;
        
        room.update({ 
          'g/mk': pack({ ...resolveReq(st, card), log: logMsg }), 
          [`private/${me.uid}/h5`]: h, 
          ...(card ? { [`private/${P[st.pend.by].uid}/in/${Date.now()}`]: card } : {}) 
        }); 
        hand = h;
      }
    }

    el.onclick = e => {
      const b = e.target.closest('[data-c],[data-a],[data-t],[data-alter-swap]'); 
      if (!b) return; 
      const a = b.dataset.a, mi = seat(), P = ps();

      if (a === 'deal') {
        if (P.length < 2) return; 
        if (st && st.winner == null && !confirm('Chia lại bài? Ván hiện tại sẽ bị hủy.')) return;
        const { hands, state } = deal(P.length);
        const upd = { 'g/mk': pack(state) }; 
        P.forEach((p, i) => { upd[`private/${p.uid}/h5`] = hands[i]; upd[`private/${p.uid}/in`] = null; });
        sfx('card-shuffle', () => tone(300, .2, .12, 'sawtooth')); 
        pick = peek = alterTop = null; 
        busy = false; 
        return room.update(upd);
      }

      if (a === 'close-peek') {
        peek = null;
        return render();
      }

      if (!st || mi < 0 || !st.alive[mi] || st.winner != null) return;

      // Dùng Chặn Đứng (Nope) để hủy yêu cầu nhắm vào mình
      if (a === 'use-nope' && hand.includes('N') && st.pend && st.pend.to === mi) {
        const h = [...hand];
        h.splice(h.indexOf('N'), 1);
        const n = { ...st, pend: null, disc: [...st.disc, 'N'], log: `🚫 ${me.name} đã dùng Chặn Đứng (Nope) hủy đòn!` };
        tone(600, .15, .2, 'triangle');
        ctx.toast('🚫 Bạn đã dùng Nope chặn đứng đòn đối thủ!');
        return commit(n, h);
      }

      // Đưa bài cho người xin (Favor)
      const give = st.pend?.type === 'favor' && st.pend.to === mi;
      if (give && b.dataset.c) {
        const c = b.dataset.c, h = [...hand]; 
        h.splice(h.indexOf(c), 1);
        room.update({ 
          'g/mk': pack({ ...resolveReq(st, c), log: `${me.name} đưa một lá cho ${P[st.pend.by]?.name}` }), 
          [`private/${me.uid}/h5`]: h, 
          [`private/${P[st.pend.by].uid}/in/${Date.now()}`]: c 
        }); 
        hand = h; 
        return;
      }

      if (st.turn !== mi || st.pend || (st.bomb != null && a !== 'bomb')) return;

      if (a === 'cancel') { 
        pick = null; 
        return render(); 
      }

      // Chọn mục tiêu trộm bài hoặc xin bài
      if (b.dataset.t && pick) {
        const t = +b.dataset.t, h = [...hand]; 
        pick.cards.forEach(c => h.splice(h.indexOf(c), 1));
        const n = startReq(st, mi, pick.type, pick.cards, t); 
        n.log = `${me.name} ${pick.type === 'favor' ? 'xin bài của' : 'lấy trộm bài của'} ${P[t].name}`; 
        pick = null; 
        return commit(n, h);
      }

      // Đổi thứ tự trong Thao Túng (Alter the future)
      if (b.dataset.alterSwap !== undefined && alterTop) {
        const idx = +b.dataset.alterSwap;
        const dir = b.textContent.includes('◀') ? -1 : 1;
        const targetIdx = idx + dir;
        if (targetIdx >= 0 && targetIdx < alterTop.length) {
          const temp = alterTop[idx];
          alterTop[idx] = alterTop[targetIdx];
          alterTop[targetIdx] = temp;
          render();
        }
        return;
      }

      if (a === 'save-alter' && alterTop) {
        const n = saveAlter(st, alterTop);
        n.log = `${me.name} đã Thao túng xong thứ tự cọc bài`;
        alterTop = null;
        ctx.toast('🔮 Đã lưu lại thứ tự 3 lá đầu!');
        return commit(n, hand);
      }

      // Đánh bài chức năng
      if (b.dataset.c && !pick && !alterTop) {
        const c = b.dataset.c; 
        sfx('card-place', () => tone(520, .09, .15, 'triangle')); 
        peek = null;

        // Lá đơn thông thường
        if ('SAHW'.includes(c)) { 
          const h = [...hand]; 
          h.splice(h.indexOf(c), 1); 
          const n = playCard(st, mi, c); 
          n.log = `${me.name} dùng ${INFO[c][1]}`; 
          commit(n, h); 
        }
        // Nhìn trước (See the Future)
        else if (c === 'F') {
          const h = [...hand]; 
          h.splice(h.indexOf('F'), 1);
          peek = st.pile.slice(0, 3);
          const n = { ...st, disc: [...st.disc, 'F'], counts: [...st.counts], log: `${me.name} dùng Nhìn Trước 🔮` };
          n.counts[mi]--;
          commit(n, h);
          render();
        }
        // Thao túng (Alter the Future)
        else if (c === 'T') {
          const h = [...hand];
          h.splice(h.indexOf('T'), 1);
          alterTop = st.pile.slice(0, 3);
          const n = { ...st, disc: [...st.disc, 'T'], counts: [...st.counts], log: `${me.name} dùng Thao Túng 🔮⚡` };
          n.counts[mi]--;
          commit(n, h);
          render();
        }
        // Rút đáy (Draw from Bottom)
        else if (c === 'B') {
          const h = [...hand];
          h.splice(h.indexOf('B'), 1);
          const r = draw(st, mi, h, true);
          sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
          r.s.disc = [...r.s.disc, 'B'];
          r.s.log = r.ev === 'dead' 
            ? `💥 ${me.name} rút đáy dính bom và bị loại` 
            : r.ev === 'defuse' 
              ? `${me.name} rút đáy trúng bom và đã gỡ!` 
              : r.ev === 'streak_safe'
                ? `🛡️ ${me.name} rút đáy dính bom nhưng có Mèo Ôm Bom an toàn!`
                : `${me.name} rút một lá dưới đáy cọc bài ⚓`;
          commit(r.s, r.hand);
        }
        // Xin bài (Favor)
        else if (c === 'V') { 
          pick = { type: 'favor', cards: ['V'] }; 
          render(); 
        }
        // Mèo thường hoặc Mèo Đa Năng (M): Ghép cặp trộm bài
        else if (c.startsWith('C') || c === 'M') {
          // Tìm xem có lá mèo khác cùng loại hoặc lá 'M' không
          const otherCats = hand.filter((x, i) => i !== hand.indexOf(c) && (x === c || x === 'M' || (c === 'M' && x.startsWith('C'))));
          if (otherCats.length > 0) {
            const partner = otherCats[0];
            pick = { type: 'steal', cards: [c, partner] };
            render();
          } else {
            ctx.toast('Cần ghép 2 lá mèo giống nhau (hoặc với Mèo Đa Năng) để trộm bài');
          }
        }
        else if (c === 'D') ctx.toast('Lá Gỡ bom sẽ tự động dùng khi bạn rút trúng bom');
        else if (c === 'K') ctx.toast('Mèo Ôm Bom tự động bảo vệ khi bạn rút trúng bom');
        else if (c === 'N') ctx.toast('Lá Nope dùng khi đối thủ nhắm đòn vào bạn');
      }
      // Rút bài bình thường kết thúc lượt
      else if (a === 'draw' && !pick && !alterTop) {
        peek = null; 
        const r = draw(st, mi, hand, false); 
        sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
        r.s.log = r.ev === 'dead' 
          ? `💥 ${me.name} dính bom và bị loại` 
          : r.ev === 'defuse' 
            ? `${me.name} gỡ được bom` 
            : r.ev === 'streak_safe'
              ? `🛡️ ${me.name} dính bom nhưng có Mèo Ôm Bom an toàn!`
              : `${me.name} rút một lá`;

        if (r.ev === 'dead') { 
          tone(120, .5, .25, 'sawtooth'); 
          ctx.toast('💥 Bạn dính bom!'); 
        }
        commit(r.s, r.hand);
      }
      // Rút đáy bằng nút nhanh nếu có lá B
      else if (a === 'draw-bottom' && hand.includes('B')) {
        const h = [...hand];
        h.splice(h.indexOf('B'), 1);
        const r = draw(st, mi, h, true);
        sfx('card-draw', () => tone(380, .08, .12, 'triangle'));
        r.s.disc = [...r.s.disc, 'B'];
        r.s.log = `${me.name} rút một lá dưới đáy cọc bài ⚓`;
        commit(r.s, r.hand);
      }
      // Cất bom lại sau khi gỡ
      else if (a === 'bomb') { 
        const pos = +q('.pos').value;
        const n = placeBomb(st, pos); 
        n.log = `${me.name} cất bom lại vào cọc bài`; 
        commit(n, hand); 
      }
    };

    ctx.onLeave(room.watch('g/mk', v => { 
      st = norm(v); 
      if (!st) { pick = peek = alterTop = null; busy = false; } 
      render(); 
    }));

    ctx.onLeave(room.watch(`private/${me.uid}/h5`, v => { 
      hand = vals(v); 
      ready = true; 
      render(); 
    }));

    // Hộp thư nhận bài từ người khác
    ctx.onLeave(room.watch(`private/${me.uid}/in`, v => { 
      const got = vals(v); 
      if (!got.length) return; 

      // Kiểm tra nếu nhận trúng quả BOM 'X' bị cướp
      if (got.includes('X')) {
        ctx.toast('🚨 Bạn vừa cướp trúng quả Bom X từ đối phương!');
      }

      hand = [...hand, ...got]; 
      room.update({ [`private/${me.uid}/h5`]: hand, [`private/${me.uid}/in`]: null }); 
    }));
  }
};
