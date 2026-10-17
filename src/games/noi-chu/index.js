import { esc } from '../../core/ui.js';
import { clack } from '../../core/sound.js';
const norm = s => s.trim().toLowerCase().normalize('NFC').replace(/\s+/g, ' ');
export default {
  id: 'noi-chu', name: 'Nối chữ', icon: '🔤', desc: 'Từ cuối của bạn là từ đầu của người ấy', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, dict = null;
    fetch(import.meta.env.BASE_URL + 'words-vi.json').then(r => r.json()).then(a => { if (Array.isArray(a) && a.length) dict = new Set(a.map(norm)); }).catch(() => {});
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Nối chữ</h2><div class="panel main"></div><div class="chips"></div><ul class="tally"></ul></section>`;
    const q = s => el.querySelector(s), list = () => Object.values(st.w || {}).filter(Boolean);
    function render() {
      const ps = room.players(), w = list(), real = w.filter(x => !x.skip), last = real.at(-1), cur = ps[w.length % (ps.length || 1)];
      const need = last ? norm(last.word).split(' ').at(-1) : null, keep = q('input')?.value;
      q('.main').innerHTML = cur?.uid === me.uid
        ? `<p>${need ? `Từ phải bắt đầu bằng <b class="big">${esc(need)}</b>` : 'Bạn đi trước, nhập một từ ghép.'}</p><input maxlength="30" placeholder="Từ ghép (ví dụ: bàn ghế)" aria-label="Từ"><div class="row"><button class="btn pri" data-a="go">Gửi</button><button class="btn" data-a="skip">Bí rồi, bỏ lượt</button></div><p class="err"></p>`
        : `<p>Lượt của <b>${esc(cur?.name || '?')}</b>${need ? `, cần từ bắt đầu bằng <b>${esc(need)}</b>` : ''}</p>`;
      if (keep && q('input')) q('input').value = keep;
      q('.chips').innerHTML = real.map(x => `<span class="chip">${esc(x.word)} <small>${esc(ps.find(p => p.uid === x.uid)?.name || '')}</small></span>`).join('');
      const sc = {}; real.forEach(x => sc[x.uid] = (sc[x.uid] || 0) + 1);
      q('.tally').innerHTML = ps.map(p => `<li>${esc(p.name)}: <b>${sc[p.uid] || 0}</b></li>`).join('');
    }
    el.onclick = e => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      const w = list(), real = w.filter(x => !x.skip), err = t => q('.err').textContent = t;
      if (a === 'skip') return room.set(`g/noi/w/${w.length}`, { uid: me.uid, skip: 1 });
      const word = norm(q('input').value), s = word.split(' '), last = real.at(-1);
      if (s.length < 2 || s.some(x => !x)) return err('Cần từ ghép có ít nhất 2 tiếng.');
      if (last && s[0] !== norm(last.word).split(' ').at(-1)) return err('Chưa nối đúng tiếng cuối.');
      if (real.some(x => x.word === word)) return err('Từ này đã dùng rồi.');
      if (dict && !dict.has(word)) return err('Không có trong từ điển.');
      clack(); room.set(`g/noi/w/${w.length}`, { uid: me.uid, word }); const pl = room.players(); ctx.ping([pl[(w.length + 1) % pl.length]?.uid], 'Đến lượt bạn nối chữ');
    };
    ctx.onLeave(room.watch('g/noi', v => { st = v || {}; render(); }));
  }
};
