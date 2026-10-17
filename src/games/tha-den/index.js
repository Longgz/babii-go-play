import { esc } from '../../core/ui.js';
import { clack } from '../../core/sound.js';
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const KIND = { den: '🏮 Đèn hoa đăng', dieu: '🪁 Diều' };
export default {
  id: 'tha-den', name: 'Thả đèn, thả diều', icon: '🏮', desc: 'Gửi lời nhắn lên bầu trời chung', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, seen = 0;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Bầu trời chung</h2><div class="sky2" aria-label="Bầu trời với đèn và diều"></div>
      <div class="panel"><div class="row">${Object.entries(KIND).map(([k, v], i) => `<label><input type="radio" name="k" value="${k}" ${i ? '' : 'checked'}> ${v}</label>`).join('')}</div>
      <input maxlength="60" placeholder="Lời nhắn hoặc điều ước" aria-label="Lời nhắn"><button class="btn pri">Thả lên trời</button></div><p class="msg" role="status" aria-live="polite"></p><ul class="wish"></ul></section>`;
    const q = s => el.querySelector(s), nameOf = u => room.players().find(p => p.uid === u)?.name || 'Ai đó';
    q('.btn').onclick = () => {
      const t = q('input').value.trim(); if (!t) return;
      const id = Date.now() + '-' + me.uid.slice(0, 4), kind = el.querySelector('input[name=k]:checked').value;
      room.set('g/den/items/' + id, { uid: me.uid, text: t, kind, at: Date.now() }); q('input').value = ''; clack(); ctx.ping(null, `${me.name} vừa thả ${kind === 'den' ? 'một chiếc đèn' : 'một cánh diều'}`);
    };
    ctx.onLeave(room.watch('g/den/items', v => {
      st = v || {}; const all = Object.entries(st).sort((a, b) => a[1].at - b[1].at), last = all.at(-1)?.[1];
      if (last && last.at > seen) { if (seen && last.uid !== me.uid) q('.msg').textContent = `${nameOf(last.uid)} vừa thả ${last.kind === 'den' ? 'một chiếc đèn' : 'một cánh diều'}!`; seen = last.at; }
      q('.sky2').innerHTML = all.slice(-30).map(([id, it]) => { const h = hash(id), x = 4 + h % 82, y = it.kind === 'den' ? 55 + h % 30 : 5 + h % 40;
        return `<span class="fl" style="left:${x}%;top:${y}%;--t:${6 + h % 6}s;--dx:${(h % 5) * 6 - 12}px;--dy:${(h % 7) * 4 - 12}px" title="${esc(it.text)}">${it.kind === 'den' ? '<svg width="30" height="54" viewBox="0 0 46 84"><use href="#l"/></svg>' : '<span style="font-size:2rem">🪁</span>'}</span>`; }).join('');
      q('.wish').innerHTML = all.slice(-20).reverse().map(([, it]) => `<li><b>${esc(nameOf(it.uid))}</b> ${it.kind === 'den' ? '🏮' : '🪁'} ${esc(it.text)}</li>`).join('');
    }));
  }
};
