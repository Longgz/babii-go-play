import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
import { buildCrossword } from './crossword.js';

const BASE = import.meta.env.BASE_URL;

// Game Tìm Chữ Ô Chữ Đan Chéo (Crossword Word Search):
// Các từ mục tiêu được sắp xếp đan xen hàng ngang và cột dọc giao nhau tại các chữ cái chung.
// Điểm = số chữ - 2 (từ dùng hết chữ cái được +3). Các từ tìm được ngoài ô chữ được cộng điểm thưởng.
export default {
  id: 'tim-chu',
  name: 'Tìm chữ tiếng Anh',
  icon: '🔠',
  desc: 'Nối chữ cái trên bánh xe để giải ô chữ đan chéo hàng cột',
  min: 2,
  max: 5,
  ready: true,
  room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {}, levels = null, sel = [], order = null, shown = 0;

    el.innerHTML = `
      <section>
        <div class="bar">
          <a class="bk" href="#/">Quay lại</a>
          <div class="turn" role="status" aria-live="polite"></div>
        </div>
        <div class="panel main"></div>
        <ul class="tally"></ul>
      </section>
    `;

    const q = s => el.querySelector(s);

    fetch(BASE + 'wordfinder-levels.json')
      .then(r => r.json())
      .then(j => {
        levels = j;
        render();
      })
      .catch(() => {
        q('.main').textContent = 'Không tải được màn chơi.';
      });

    function render() {
      if (!levels) return q('.main').replaceChildren('Đang tải màn chơi…');

      const ps = room.players();
      const lv = st.lv || 1;
      const L = levels[(lv - 1) % levels.length];
      const n = L.l.length;
      const list = Object.values(st.f?.[lv] || {}).filter(Boolean);
      const found = list.filter(x => !x.skip);
      const cur = ps[list.length % (ps.length || 1)];
      const mine = cur?.uid === me.uid;
      const foundWords = new Set(found.map(x => x.word));
      const done = L.t.every(t => foundWords.has(t));

      if (!order || order.lv !== lv) {
        order = [...L.l].map((_, i) => i);
        order.lv = lv;
        sel = [];
      }

      if (done && shown !== lv) {
        shown = lv;
        fanfare();
      }

      const on = mine && !done;
      q('.turn').textContent = done
        ? `🎉 Hoàn thành màn ${lv}!`
        : `Lượt của ${cur?.name || '?'}`;

      // Tạo bảng ô chữ đan chéo từ danh sách từ mục tiêu
      const cw = buildCrossword(L.t);

      q('.main').innerHTML = `
        <!-- Bảng ô chữ đan chéo hàng - cột (Crossword Grid) -->
        <div class="crossword-board" style="--cw-rows:${cw.rows};--cw-cols:${cw.cols}" aria-label="Bảng ô chữ đan chéo">
          ${cw.cells.map(cell => {
            const isRevealed = cell.words.some(w => foundWords.has(w));
            return `
              <div class="cw-cell ${isRevealed ? 'found' : 'empty'}" 
                style="grid-row:${cell.r + 1};grid-column:${cell.c + 1}">
                ${isRevealed ? cell.letter.toUpperCase() : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Chữ đang được chọn nối trên bánh xe -->
        <div class="cur" aria-live="polite">${sel.map(i => L.l[i]).join('') || '&nbsp;'}</div>

        <!-- Bánh xe nối chữ tròn -->
        <div class="wheel">
          ${order.map((li, pos) => {
            const a = 2 * Math.PI * pos / n - Math.PI / 2;
            return `
              <button class="tile ${sel.includes(li) ? 'on' : ''}" 
                style="left:${50 + 38 * Math.cos(a)}%;top:${50 + 38 * Math.sin(a)}%" 
                data-i="${li}" ${on ? '' : 'disabled'}>
                ${L.l[li]}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Hàng nút thao tác -->
        <div class="row">
          <button class="btn" data-a="clear">Xóa</button>
          <button class="btn" data-a="mix">Xáo chữ</button>
          <button class="btn pri" data-a="go" ${on ? '' : 'disabled'}>Gửi từ</button>
          <button class="btn" data-a="skip" ${on ? '' : 'disabled'}>Bỏ lượt</button>
          ${done ? '<button class="btn pri" data-a="next">Màn tiếp ❯</button>' : ''}
        </div>

        <p class="err" role="alert"></p>

        <!-- Các từ thưởng thêm tìm được ngoài ô chữ -->
        <div class="chips">
          ${found.filter(x => !L.t.includes(x.word)).map(x => `
            <span class="chip" style="background:#22c55e22;border:1px solid #22c55e55;color:#86efac">
              ${esc(x.word)} <small>+${x.p}đ</small>
            </span>
          `).join('')}
        </div>
      `;

      // Bảng điểm số
      const sc = {};
      Object.values(st.f || {}).forEach(lvl => {
        Object.values(lvl || {}).forEach(x => {
          if (x && !x.skip) sc[x.uid] = (sc[x.uid] || 0) + (x.p || 0);
        });
      });

      q('.tally').innerHTML = ps.map(p => `
        <li>${esc(p.name)}: <b>${sc[p.uid] || 0} điểm</b></li>
      `).join('');
    }

    el.onclick = e => {
      const b = e.target.closest('[data-i],[data-a]');
      if (!b || !levels) return;

      const ps = room.players();
      const lv = st.lv || 1;
      const L = levels[(lv - 1) % levels.length];
      const list = Object.values(st.f?.[lv] || {}).filter(Boolean);
      const err = t => { q('.err').textContent = t; };

      // Chọn hoặc bỏ chọn ký tự trên bánh xe
      if (b.dataset.i !== undefined) {
        const i = +b.dataset.i;
        sel = sel.includes(i)
          ? (sel.at(-1) === i ? sel.slice(0, -1) : sel)
          : [...sel, i];
        return render();
      }

      const a = b.dataset.a;
      if (a === 'clear') {
        sel = [];
        render();
      }
      if (a === 'mix') {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.random() * (i + 1) | 0;
          [order[i], order[j]] = [order[j], order[i]];
        }
        render();
      }
      if (a === 'next') {
        sel = [];
        room.set('g/wf/lv', lv + 1);
      }
      if (a === 'skip') {
        sel = [];
        room.set(`g/wf/f/${lv}/${list.length}`, { uid: me.uid, skip: 1 });
      }
      if (a === 'go') {
        const w = sel.map(i => L.l[i]).join('').toLowerCase();
        if (w.length < 3) return err('Từ cần ít nhất 3 chữ cái.');
        if (!L.w.includes(w)) return err('Không có trong từ điển hợp lệ.');
        if (list.some(x => x.word === w)) return err('Từ này đã được tìm rồi!');

        sel = [];
        const isTarget = L.t.includes(w);
        const pts = Math.max(1, w.length - 2) + (w.length === L.l.length ? 3 : 0);

        room.set(`g/wf/f/${lv}/${list.length}`, {
          uid: me.uid,
          word: w,
          p: pts
        });

        clack();
        if (isTarget) {
          ctx.toast(`✨ Bạn đã mở khóa từ "${w.toUpperCase()}" trên ô chữ! (+${pts}đ)`);
        } else {
          ctx.toast(`🌟 Tìm thấy từ thưởng "${w.toUpperCase()}"! (+${pts}đ)`);
        }

        ctx.ping([ps[(list.length + 1) % ps.length]?.uid], 'Đến lượt bạn tìm chữ');
      }
    };

    ctx.onLeave(room.watch('g/wf', v => {
      st = v || {};
      render();
    }));
  }
};
