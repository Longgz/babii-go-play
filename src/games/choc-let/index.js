import { esc } from '../../core/ui.js';
import { clack, tone } from '../../core/sound.js';
export default {
  id: 'choc-let', name: 'Chọc lét', icon: '👉', desc: 'Chọc một cái, chọc lại một cái', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx; let st = {}, seen = 0;
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Chọc lét</h2><button class="poke">👉 Chọc!</button><p class="msg" role="status" aria-live="polite"></p><ul class="tally"></ul></section>`;
    const q = s => el.querySelector(s), nameOf = u => room.players().find(p => p.uid === u)?.name || 'Ai đó';
    q('.poke').onclick = () => {
      room.update({ ['g/choc/count/' + me.uid]: (st.count?.[me.uid] || 0) + 1, 'g/choc/last': { uid: me.uid, at: Date.now() } });
      clack(); navigator.vibrate?.(30); ctx.ping(null, `${me.name} vừa chọc bạn!`);
    };
    ctx.onLeave(room.watch('g/choc', v => {
      st = v || {}; const l = st.last;
      if (l && l.at > seen) {
        if (seen && l.uid !== me.uid) {
          q('.msg').textContent = `${nameOf(l.uid)} vừa chọc bạn!`; navigator.vibrate?.(200); tone(300, .2, .2, 'square');
          q('.poke').classList.add('hit'); setTimeout(() => q('.poke')?.classList.remove('hit'), 400);
        }
        seen = l.at;
      }
      q('.tally').innerHTML = room.players().map(p => `<li>${esc(p.name)}: <b>${st.count?.[p.uid] || 0}</b></li>`).join('');
    }));
  }
};
