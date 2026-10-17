import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
const C = { bua: ['✊', 'Búa'], bao: ['✋', 'Bao'], keo: ['✌️', 'Kéo'] }, beats = { bua: 'keo', keo: 'bao', bao: 'bua' };
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
function judge(ch) { const s = [...new Set(Object.values(ch))]; if (s.length !== 2) return []; const w = beats[s[0]] === s[1] ? s[0] : s[1]; return Object.keys(ch).filter(u => ch[u] === w); }
// Điểm tính lại từ lịch sử các ván; chỉ nhận lựa chọn khớp mã băm đã khóa từ trước
async function tally(st, n) {
  const score = {}, res = {};
  for (const k in st.r || {}) {
    const { commit = {}, reveal = {} } = st.r[k] || {}, ch = {};
    for (const u in reveal) if (await sha(reveal[u].c + ':' + reveal[u].s) === commit[u]) ch[u] = reveal[u].c;
    if (Object.keys(ch).length >= n) { res[k] = ch; judge(ch).forEach(u => score[u] = (score[u] || 0) + 1); }
  }
  return { score, res };
}
export default {
  id: 'oan-tu-ti', name: 'Oẳn tù tì', icon: '✌️', desc: 'Cùng chọn, cùng mở', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, mine = null, shown = 0;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Oẳn tù tì</h2><div class="panel main"></div><ul class="tally"></ul></section>`;
    const q = s => el.querySelector(s);
    async function render() {
      const ps = room.players(), n = st.round || 1, r = st.r?.[n] || {}, commit = r.commit || {}, name = u => ps.find(p => p.uid === u)?.name || '?';
      if (ps.length > 1 && Object.keys(commit).length >= ps.length && mine?.round === n && !r.reveal?.[me.uid]) room.set(`g/oan/r/${n}/reveal/${me.uid}`, { c: mine.c, s: mine.s });
      const { score, res } = await tally(st, ps.length); let h;
      if (res[n]) {
        const w = judge(res[n]);
        h = `<div class="picks">${ps.map(p => `<div class="pick">${C[res[n][p.uid]][0]}<br><small>${esc(p.name)}</small></div>`).join('')}</div><p class="msg">${w.length ? 'Thắng: ' + w.map(name).map(esc).join(', ') : 'Hòa!'}</p><button class="btn pri" data-a="next">Ván tiếp</button>`;
        if (shown !== n) { shown = n; w.includes(me.uid) ? fanfare() : clack(); }
      } else if (commit[me.uid]) h = `<p>Đã chọn. Chờ ${ps.filter(p => !commit[p.uid]).map(p => esc(p.name)).join(', ') || 'mở bài'}…</p>`;
      else h = `<p>Chọn của bạn (người kia không thấy cho đến khi mọi người đã chọn):</p><div class="picks">${Object.entries(C).map(([k, v]) => `<button class="pick" data-a="pick" data-c="${k}" aria-label="${v[1]}">${v[0]}<br><small>${v[1]}</small></button>`).join('')}</div>`;
      q('.main').innerHTML = h;
      q('.tally').innerHTML = ps.map(p => `<li>${esc(p.name)}: <b>${score[p.uid] || 0}</b></li>`).join('');
    }
    el.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const n = st.round || 1;
      if (b.dataset.a === 'pick') { const c = b.dataset.c, s = Math.random().toString(36).slice(2); mine = { round: n, c, s }; await room.set(`g/oan/r/${n}/commit/${me.uid}`, await sha(c + ':' + s)); ctx.ping(null, `${me.name} đã chọn oẳn tù tì, đến lượt bạn!`); }
      if (b.dataset.a === 'next') room.set('g/oan/round', n + 1);
    };
    ctx.onLeave(room.watch('g/oan', v => { st = v || {}; render(); }));
  }
};
