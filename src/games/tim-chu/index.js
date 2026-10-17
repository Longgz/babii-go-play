import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
const BASE = import.meta.env.BASE_URL;
// Mỗi người một lượt: nối các chữ cái trên bánh xe thành một từ. Điểm = số chữ - 2 (từ dùng hết chữ cái được +3).
// Màn chơi (public/wordfinder-levels.json): l = chữ cái, w = mọi từ hợp lệ, t = các từ mục tiêu hiện thành ô chữ.
export default {
  id: 'tim-chu', name: 'Tìm chữ tiếng Anh', icon: '🔠', desc: 'Nối chữ cái trên bánh xe, mỗi người một lượt', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, levels = null, sel = [], order = null, shown = 0;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div><div class="panel main"></div><ul class="tally"></ul></section>`;
    const q = s => el.querySelector(s);
    fetch(BASE + 'wordfinder-levels.json').then(r => r.json()).then(j => { levels = j; render(); }).catch(() => { q('.main').textContent = 'Không tải được màn chơi.'; });
    function render() {
      if (!levels) return q('.main').replaceChildren('Đang tải màn chơi…');
      const ps = room.players(), lv = st.lv || 1, L = levels[(lv - 1) % levels.length], n = L.l.length;
      const list = Object.values(st.f?.[lv] || {}).filter(Boolean), found = list.filter(x => !x.skip), cur = ps[list.length % (ps.length || 1)];
      const mine = cur?.uid === me.uid, done = L.t.every(t => found.some(x => x.word === t));
      if (!order || order.lv !== lv) { order = [...L.l].map((_, i) => i); order.lv = lv; sel = []; }
      if (done && shown !== lv) { shown = lv; fanfare(); }
      const on = mine && !done;
      q('.turn').textContent = done ? 'Hoàn thành màn!' : `Lượt của ${cur?.name || '?'}`;
      q('.main').innerHTML = `<div class="slots">${L.t.map(t => { const f = found.some(x => x.word === t); return `<span class="slot" aria-label="${f ? t : t.length + ' chữ'}">${[...t].map(c => `<i>${f ? c.toUpperCase() : ''}</i>`).join('')}</span>`; }).join('')}</div>
        <div class="cur" aria-live="polite">${sel.map(i => L.l[i]).join('') || '&nbsp;'}</div>
        <div class="wheel">${order.map((li, pos) => { const a = 2 * Math.PI * pos / n - Math.PI / 2; return `<button class="tile ${sel.includes(li) ? 'on' : ''}" style="left:${50 + 38 * Math.cos(a)}%;top:${50 + 38 * Math.sin(a)}%" data-i="${li}" ${on ? '' : 'disabled'}>${L.l[li]}</button>`; }).join('')}</div>
        <div class="row"><button class="btn" data-a="clear">Xóa</button><button class="btn" data-a="mix">Xáo chữ</button><button class="btn pri" data-a="go" ${on ? '' : 'disabled'}>Gửi từ</button><button class="btn" data-a="skip" ${on ? '' : 'disabled'}>Bỏ lượt</button>${done ? '<button class="btn pri" data-a="next">Màn tiếp</button>' : ''}</div>
        <p class="err" role="alert"></p><div class="chips">${found.filter(x => !L.t.includes(x.word)).map(x => `<span class="chip">${esc(x.word)} <small>thêm</small></span>`).join('')}</div>`;
      const sc = {}; Object.values(st.f || {}).forEach(lvl => Object.values(lvl || {}).forEach(x => { if (x && !x.skip) sc[x.uid] = (sc[x.uid] || 0) + (x.p || 0); }));
      q('.tally').innerHTML = ps.map(p => `<li>${esc(p.name)}: <b>${sc[p.uid] || 0}</b></li>`).join('');
    }
    el.onclick = e => {
      const b = e.target.closest('[data-i],[data-a]'); if (!b || !levels) return;
      const ps = room.players(), lv = st.lv || 1, L = levels[(lv - 1) % levels.length], list = Object.values(st.f?.[lv] || {}).filter(Boolean), err = t => q('.err').textContent = t;
      if (b.dataset.i !== undefined) { const i = +b.dataset.i; sel = sel.includes(i) ? (sel.at(-1) === i ? sel.slice(0, -1) : sel) : [...sel, i]; return render(); }
      const a = b.dataset.a;
      if (a === 'clear') { sel = []; render(); }
      if (a === 'mix') { for (let i = order.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [order[i], order[j]] = [order[j], order[i]]; } render(); }
      if (a === 'next') { sel = []; room.set('g/wf/lv', lv + 1); }
      if (a === 'skip') { sel = []; room.set(`g/wf/f/${lv}/${list.length}`, { uid: me.uid, skip: 1 }); }
      if (a === 'go') {
        const w = sel.map(i => L.l[i]).join('').toLowerCase();
        if (w.length < 3) return err('Từ cần ít nhất 3 chữ.');
        if (!L.w.includes(w)) return err('Không có trong từ điển.');
        if (list.some(x => x.word === w)) return err('Từ này đã có rồi.');
        sel = []; room.set(`g/wf/f/${lv}/${list.length}`, { uid: me.uid, word: w, p: Math.max(1, w.length - 2) + (w.length === L.l.length ? 3 : 0) }); clack();
        ctx.ping([ps[(list.length + 1) % ps.length]?.uid], 'Đến lượt bạn tìm chữ');
      }
    };
    ctx.onLeave(room.watch('g/wf', v => { st = v || {}; render(); }));
  }
};
