import { esc } from '../../core/ui.js';
export default {
  id: 'hoi-dap-anh', name: 'Hỏi đáp tiếng Anh', icon: '📖', desc: 'Người ra từ, người đoán nghĩa', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me, store } = ctx; let st = {};
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Hỏi đáp tiếng Anh</h2><div class="panel main"></div><ul class="tally"></ul><h2>Sổ từ cần ôn</h2><ul class="wrong"></ul></section>`;
    const q = s => el.querySelector(s);
    function render() {
      const ps = room.players(), n = st.n || 1, cur = st.q?.[n] || {}, ask = ps[(n - 1) % (ps.length || 1)];
      if (!ask) return;
      const mineAsk = ask.uid === me.uid, others = ps.filter(p => p.uid !== ask.uid), ans = cur.ans || {}, ok = cur.ok || {}, keep = q('input')?.value; let h;
      if (!cur.word) h = mineAsk ? `<p>Đến lượt bạn ra từ.</p><input maxlength="40" placeholder="Từ tiếng Anh" aria-label="Từ tiếng Anh"><button class="btn" data-a="word">Gửi từ</button>` : `<p>Chờ ${esc(ask.name)} ra từ…</p>`;
      else if (mineAsk) h = `<p>Từ: <b class="big">${esc(cur.word)}</b></p>` + others.map(p => `<div class="row"><span>${esc(p.name)}: ${ans[p.uid] ? esc(ans[p.uid]) : '<i>chưa trả lời</i>'}</span>${ans[p.uid] && ok[p.uid] === undefined ? `<button class="btn" data-a="ok" data-u="${p.uid}" data-v="1">Đúng</button><button class="btn" data-a="ok" data-u="${p.uid}" data-v="0">Sai</button>` : ok[p.uid] === undefined ? '' : ok[p.uid] ? '✓' : '✗'}</div>`).join('') + `<button class="btn pri" data-a="next">Câu tiếp</button>`;
      else if (ans[me.uid] === undefined) h = `<p>Nghĩa của <b class="big">${esc(cur.word)}</b> là gì?</p><input maxlength="80" placeholder="Nhập nghĩa" aria-label="Nghĩa"><button class="btn" data-a="ans">Gửi</button>`;
      else h = `<p>Từ <b>${esc(cur.word)}</b>, bạn trả lời: ${esc(ans[me.uid])}</p><p>${ok[me.uid] === undefined ? `Chờ ${esc(ask.name)} chấm…` : ok[me.uid] ? 'Đúng rồi ✓' : 'Chưa đúng ✗, đã lưu vào sổ ôn.'}</p>`;
      q('.main').innerHTML = h; if (keep && q('input')) q('input').value = keep;
      const wrong = store.get('qa:wrong', []), key = room.code + n;
      if (!mineAsk && cur.word && ok[me.uid] === false && !wrong.some(w => w.k === key)) { wrong.push({ k: key, word: cur.word, a: ans[me.uid] }); store.set('qa:wrong', wrong); }
      q('.wrong').innerHTML = wrong.map(w => `<li>${esc(w.word)} <small>(bạn đoán: ${esc(w.a)})</small></li>`).join('') || '<li>Chưa có từ nào</li>';
      const sc = {}; for (const k in st.q || {}) for (const u in st.q[k]?.ok || {}) if (st.q[k].ok[u]) sc[u] = (sc[u] || 0) + 1;
      q('.tally').innerHTML = ps.map(p => `<li>${esc(p.name)}: <b>${sc[p.uid] || 0}</b></li>`).join('');
    }
    el.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, n = st.n || 1, i = q('input')?.value.trim();
      if (a === 'word' && i) { room.set(`g/qa/q/${n}/word`, i); ctx.ping(null, 'Có từ mới, vào đoán nghĩa nhé!'); }
      if (a === 'ans' && i) { room.set(`g/qa/q/${n}/ans/${me.uid}`, i); const pl = room.players(); ctx.ping([pl[(n - 1) % pl.length]?.uid], `${me.name} đã trả lời, vào chấm nhé`); }
      if (a === 'ok') { room.set(`g/qa/q/${n}/ok/${b.dataset.u}`, b.dataset.v === '1'); ctx.ping([b.dataset.u], 'Câu trả lời của bạn đã được chấm'); }
      if (a === 'next') room.set('g/qa/n', n + 1);
    };
    ctx.onLeave(room.watch('g/qa', v => { st = v || {}; render(); }));
  }
};
