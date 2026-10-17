import './trip.css';
import { PLACES, EDGES, sceneSVG } from './scenes.js';
import { mapSVG, COLORS } from './map.js';
import { photoSVG, download } from './photo.js';
import { openPano } from './pano.js';
import { panoAll } from './idb.js';
import { mountManage } from './manage.js';
import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { clack } from '../../core/sound.js';
import { onChange } from '../../core/room.js';

const MAX = 5, BASE = import.meta.env.BASE_URL, today = () => new Date().toLocaleDateString('sv');   // mỗi ngày có MAX bước
const cost = (a, b) => EDGES.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
const STICK = ['✨', '❤️', '🌸', '📸'], FRAME = ['#c23b32', '#f4b942', '#26407a'];

export default {
  id: 'du-lich', name: 'Du lịch', icon: '🗺️', desc: 'Đi khắp Việt Nam, gặp nhau và chụp ảnh đôi', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {}, view = 'scene', show360 = false, repo = {}, local = {}, urls = [], pv = null, md = null, lastKey = '', managed = false;
    let draft = { sticker: '✨', frame: FRAME[0], caption: '' };
    el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn"></div></div><div class="act tabs"><button data-v="scene">Cảnh</button><button data-v="map">Bản đồ</button><button data-v="manage">Quản lý cảnh</button></div><div class="stagebox"></div><div class="main"></div><h2>Album chung</h2><div class="alb"></div></section>`;
    const q = s => el.querySelector(s), ps = () => room.players().map((p, k) => ({ ...p, k })), at = u => st.pos?.[u] || 'hanoi';
    const used = () => { const s = st.steps?.[me.uid]; return s?.day === today() ? s.used : 0; };
    const here = () => ps().filter(p => at(p.uid) === at(me.uid)), rec = () => ({ scene: at(me.uid), who: here().map(p => ({ n: p.name, k: p.k, a: p.avatar })), ...draft });
    // Ảnh 360° ưu tiên bản riêng trên máy, sau đó tới bản trong repo (public/scenes/panos.json)
    const panoFor = P => local[P] ? { ...local[P], src: 'máy này' } : repo[P] ? { ...repo[P], url: BASE + 'scenes/' + repo[P].file, src: 'repo' } : null;
    const drop = () => { pv?.then(v => v.destroy()).catch(() => {}); pv = null; };
    function loadLocal() {
      return panoAll().then(list => { urls.forEach(u => URL.revokeObjectURL(u)); urls = []; local = {}; list.forEach(r => { r.url = URL.createObjectURL(r.blob); urls.push(r.url); local[r.place] = r; }); render(); }).catch(() => {});
    }

    function render() {
      const P = at(me.uid), pano = panoFor(P), h = here(), others = ps().filter(p => p.uid !== me.uid), marks = ps().map(p => ({ place: at(p.uid), k: p.k }));
      q('.turn').textContent = `${PLACES[P].name}, còn ${MAX - used()}/${MAX} bước hôm nay`;
      el.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('pri', b.dataset.v === view));
      if (view === 'scene') {
        const on360 = show360 && !!pano, key = P + '|' + (on360 ? pano.url : 'art');
        if (!q('.stage') || key !== lastKey) {   // chỉ dựng lại khung cảnh khi đổi điểm hoặc đổi chế độ xem, để không giật góc nhìn 360°
          drop(); lastKey = key;
          q('.stagebox').innerHTML = `<div class="stage"><div class="view">${on360 ? '<div class="pano"></div>' : sceneSVG(P)}</div><div class="mini"></div></div>`
            + (pano ? `<div class="act"><button data-t="art" class="${on360 ? '' : 'pri'}">🖼️ Tranh</button><button data-t="360" class="${on360 ? 'pri' : ''}">🌐 Xem 360°</button></div>` : '')
            + (on360 ? `<p class="msg">360°: ${esc(pano.credit || 'không rõ nguồn')} ${pano.license ? '(' + esc(pano.license) + ')' : ''}, nguồn ${pano.src}${pano.src === 'máy này' ? '. Người kia sẽ không thấy ảnh này.' : ''}</p>` : '');
          if (on360) pv = openPano(q('.pano'), pano);
        }
        q('.mini').innerHTML = mapSVG({ marks, mini: true, here: P });
      } else { drop(); lastKey = ''; q('.stagebox').innerHTML = ''; }

      if (view === 'manage') {
        if (!managed) { managed = true; md?.(); md = mountManage(q('.main'), { places: PLACES, repo: () => repo, local: () => local, reload: loadLocal, toast: ctx.toast }); }
      } else {
        managed = false; md?.(); md = null;
        if (view === 'map') {
          const reach = {}; EDGES.forEach(([a, b, c]) => { if (a === P) reach[b] = c; if (b === P) reach[a] = c; });
          q('.main').innerHTML = `<div class="panel">${mapSVG({ marks, reach, here: P })}<p class="msg">Chạm vào điểm đang nhấp nháy để đi. Số trên đường là số bước cần dùng.</p></div>`;
        } else q('.main').innerHTML = `<div class="chips">${h.map(p => `<span class="chip" style="border-left:6px solid ${COLORS[p.k % 5]}">${avatarSVG(p.avatar, 24)} ${esc(p.name)}</span>`).join('')}</div>` + (h.length > 1
          ? `<div class="panel"><b>Mọi người đang ở cùng nhau tại ${PLACES[P].name}!</b><div class="prev">${photoSVG(rec())}</div>
            <div class="row">${STICK.map(s => `<button class="btn" data-s="${s}" aria-label="Nhãn dán ${s}">${s}</button>`).join('')}${FRAME.map(f => `<button class="btn" data-f="${f}" style="background:${f}" aria-label="Khung màu">&nbsp;&nbsp;</button>`).join('')}</div>
            <input class="cap" maxlength="40" placeholder="Chú thích" aria-label="Chú thích" value="${esc(draft.caption)}"><button class="btn pri" data-a="shoot">📸 Chụp!</button></div>`
          : `<p class="msg">${others.map(p => `${esc(p.name)} đang ở ${PLACES[at(p.uid)].name}`).join('; ') || 'Chưa có ai khác trong phòng'}. Mở bản đồ để đi tìm nhau.</p>`);
      }
      const alb = Object.entries(st.album || {}).sort((a, b) => b[1].at - a[1].at).slice(0, 12);
      q('.alb').innerHTML = alb.map(([id, r]) => `<figure>${photoSVG(r)}<button class="btn" data-dl="${id}">Tải ảnh</button></figure>`).join('') || '<p class="msg">Chưa có ảnh nào. Gặp nhau rồi chụp tấm đầu tiên nhé.</p>';
    }
    el.onclick = e => {
      const t = e.target, d = k => t.closest(`[${k}]`)?.getAttribute(k);
      if (d('data-v')) { view = d('data-v'); render(); }
      else if (d('data-t')) { show360 = d('data-t') === '360'; render(); }
      else if (d('data-go')) {
        const to = d('data-go'), c = cost(at(me.uid), to);
        if (MAX - used() < c) return ctx.toast('Hôm nay hết bước, mai đi tiếp nhé');
        view = 'scene'; room.update({ [`g/trip/pos/${me.uid}`]: to, [`g/trip/steps/${me.uid}`]: { day: today(), used: used() + c } }); clack(); ctx.ping(null, `${me.name} vừa đến ${PLACES[to].name}`);
      } else if (d('data-s')) { draft.sticker = d('data-s'); q('.prev').innerHTML = photoSVG(rec()); }
      else if (d('data-f')) { draft.frame = d('data-f'); q('.prev').innerHTML = photoSVG(rec()); }
      else if (d('data-a') === 'shoot') { room.set(`g/trip/album/${Date.now()}-${me.uid.slice(0, 4)}`, { ...rec(), at: Date.now() }); ctx.toast('Đã lưu vào album chung!'); clack(); ctx.ping(null, `${me.name} vừa chụp ảnh ở ${PLACES[at(me.uid)].name}`); }
      else if (d('data-dl')) download(st.album[d('data-dl')]);
    };
    el.oninput = e => { if (e.target.classList.contains('cap')) { draft.caption = e.target.value; q('.prev').innerHTML = photoSVG(rec()); } };
    el.onkeydown = e => { if (e.key === 'Enter' && e.target.dataset?.go) e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); };
    fetch(BASE + 'scenes/panos.json').then(r => r.json()).then(j => { repo = j && typeof j === 'object' ? j : {}; render(); }).catch(() => {});
    loadLocal();
    ctx.onLeave(room.watch('g/trip', v => { st = v || {}; render(); }));
    ctx.onLeave(onChange(render));
    ctx.onLeave(() => { drop(); md?.(); urls.forEach(u => URL.revokeObjectURL(u)); });
  }
};
