import './trip.css';
import { PLACES, EDGES, sceneSVG } from './scenes.js';
import { mapSVG, COLORS } from './map.js';
import { photoSVG, download } from './photo.js';
import { openPano } from './pano.js';
import { panoAll } from './idb.js';
import { mountManage } from './manage.js';
import { esc } from '../../core/ui.js';
import { avatarSVG } from '../../core/avatar.js';
import { clack, tone } from '../../core/sound.js';
import { onChange } from '../../core/room.js';

const MAX = 5, BASE = import.meta.env.BASE_URL, today = () => new Date().toLocaleDateString('sv');
const cost = (a, b) => EDGES.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
const STICK = ['✨', '❤️', '🌸', '📸', '☕', '🏮', '🏖️'], FRAME = ['#c23b32', '#f4b942', '#26407a', '#1e293b'];

// Âm thanh máy ảnh chụp hình chân thực
function playCameraShutter() {
  clack();
  tone(850, 0.04, 0.2, 'square');
  setTimeout(() => tone(620, 0.06, 0.25, 'triangle'), 60);
}

// Âm thanh còi tàu khi di chuyển qua các tỉnh thành
function playTravelWhistle() {
  tone(440, 0.14, 0.18, 'triangle');
  setTimeout(() => tone(554, 0.18, 0.22, 'triangle'), 110);
  setTimeout(() => tone(659, 0.25, 0.25, 'sine'), 240);
}

export default {
  id: 'du-lich',
  name: 'Du lịch',
  icon: '🗺️',
  desc: 'Du lịch khắp Việt Nam, khám phá ảnh 360°, thu thập tem hộ chiếu và chụp ảnh đôi',
  min: 2,
  max: 5,
  ready: true,
  room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {}, view = 'scene', show360 = false, repo = {}, local = {}, urls = [], pv = null, md = null, lastKey = '', managed = false;
    let draft = { sticker: '✨', frame: FRAME[0], caption: '' };

    el.innerHTML = `
      <section>
        <div class="bar">
          <a class="bk" href="#/">Quay lại</a>
          <div class="turn"></div>
        </div>
        <div class="act tabs">
          <button data-v="scene">🖼️ Thắng cảnh</button>
          <button data-v="map">🗺️ Bản đồ</button>
          <button data-v="passport">📖 Hộ chiếu</button>
          <button data-v="manage">⚙️ Quản lý cảnh</button>
        </div>
        <div class="stagebox"></div>
        <div class="main"></div>
        <h2>Album ảnh du lịch đôi</h2>
        <div class="alb"></div>
      </section>
    `;

    const q = s => el.querySelector(s);
    const ps = () => room.players().map((p, k) => ({ ...p, k }));
    const at = u => st.pos?.[u] || 'hanoi';
    const used = () => {
      const s = st.steps?.[me.uid];
      return s?.day === today() ? s.used : 0;
    };
    const here = () => ps().filter(p => at(p.uid) === at(me.uid));
    const rec = () => ({
      scene: at(me.uid),
      who: here().map(p => ({ n: p.name, k: p.k, a: p.avatar })),
      at: Date.now(),
      ...draft
    });

    const panoFor = P => local[P]
      ? { ...local[P], src: 'máy này' }
      : repo[P]
        ? { ...repo[P], url: BASE + 'scenes/' + repo[P].file, src: 'kho ảnh' }
        : null;

    const drop = () => {
      pv?.then(v => v.destroy()).catch(() => {});
      pv = null;
    };

    function loadLocal() {
      return panoAll().then(list => {
        urls.forEach(u => URL.revokeObjectURL(u));
        urls = [];
        local = {};
        list.forEach(r => {
          r.url = URL.createObjectURL(r.blob);
          urls.push(r.url);
          local[r.place] = r;
        });
        render();
      }).catch(() => {});
    }

    function render() {
      const P = at(me.uid);
      const placeInfo = PLACES[P] || PLACES.hanoi;
      const pano = panoFor(P);
      const h = here();
      const others = ps().filter(p => p.uid !== me.uid);
      const marks = ps().map(p => ({ place: at(p.uid), k: p.k }));
      const myStamps = st.stamps?.[me.uid] || {};
      const visitedCount = Object.keys(myStamps).length || 1;

      q('.turn').textContent = `${placeInfo.name}, còn ${MAX - used()}/${MAX} bước hôm nay`;
      el.querySelectorAll('.tabs button').forEach(b => {
        if (b.dataset.v === 'passport') {
          b.textContent = `📖 Hộ chiếu (${visitedCount}/${Object.keys(PLACES).length})`;
        }
        b.classList.toggle('pri', b.dataset.v === view);
      });

      // Tự động đóng dấu địa điểm hiện tại nếu chưa có
      if (!myStamps[P] && st.pos) {
        room.update({ [`g/trip/stamps/${me.uid}/${P}`]: Date.now() });
      }

      if (view === 'scene') {
        const on360 = show360 && !!pano;
        const key = P + '|' + (on360 ? pano.url : 'art');

        if (!q('.stage') || key !== lastKey) {
          drop();
          lastKey = key;
          q('.stagebox').innerHTML = `
            <div class="stage">
              <div class="view">${on360 ? '<div class="pano"></div>' : sceneSVG(P)}</div>
              <div class="mini"></div>
            </div>
            ${pano ? `
              <div class="act" style="margin-top:8px">
                <button data-t="art" class="${on360 ? '' : 'pri'}">🖼️ Tranh phong cảnh</button>
                <button data-t="360" class="${on360 ? 'pri' : ''}">🌐 Khám phá 360°</button>
              </div>
            ` : ''}
            ${on360 ? `
              <p class="msg" style="color:#fcd34d">
                🌐 Chế độ 360°: Kéo xoay để ngắm nhìn toàn cảnh, cuộn để phóng to thu nhỏ!
                <br><small style="color:var(--mute)">Nguồn: ${esc(pano.credit || '')} ${pano.license ? `(${esc(pano.license)})` : ''}</small>
              </p>
            ` : ''}
            <!-- Thẻ thông tin văn hóa & ẩm thực của điểm đến -->
            <div class="panel trip-info-card" style="margin-top:10px;background:linear-gradient(135deg,#ffffff14,#ffffff08);border:1px solid #ffffff26;border-radius:14px;padding:12px 14px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <b style="font-size:1.05rem;color:var(--lantern)">📍 ${placeInfo.name}</b>
                <span style="font-size:0.8rem;background:#f59e0b22;color:#fcd34d;padding:2px 8px;border-radius:99px;font-weight:700">Đã ghé thăm</span>
              </div>
              <p style="margin:0 0 6px;font-size:0.88rem;color:#f3ecda;line-height:1.45">${placeInfo.desc}</p>
              <div style="font-size:0.84rem;color:#93c5fd">🍜 <b>Đặc sản trứ danh:</b> ${placeInfo.food}</div>
            </div>
          `;

          if (on360) pv = openPano(q('.pano'), pano);
        }
        q('.mini').innerHTML = mapSVG({ marks, mini: true, here: P });
      } else {
        drop();
        lastKey = '';
        q('.stagebox').innerHTML = '';
      }

      if (view === 'manage') {
        if (!managed) {
          managed = true;
          md?.();
          md = mountManage(q('.main'), {
            places: PLACES,
            repo: () => repo,
            local: () => local,
            reload: loadLocal,
            toast: ctx.toast
          });
        }
      } else if (view === 'passport') {
        managed = false;
        md?.();
        md = null;

        // Giao diện Hộ chiếu du lịch Việt Nam
        q('.main').innerHTML = `
          <div class="passport-cover" style="background:linear-gradient(145deg,#064e3b,#022c22);border:2px solid #f59e0b;border-radius:18px;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,0.6);margin-bottom:16px">
            <div style="text-align:center;border-bottom:1px solid #f59e0b55;padding-bottom:14px;margin-bottom:16px">
              <div style="font-size:1.6rem;margin-bottom:4px">🇻🇳</div>
              <div style="font-size:0.88rem;font-weight:800;letter-spacing:1px;color:#fef08a">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-size:1.2rem;font-weight:900;color:#f59e0b;margin-top:2px;letter-spacing:1px">HỘ CHIẾU DU LỊCH ĐÔI</div>
            </div>

            <!-- Thông tin người mang hộ chiếu -->
            <div style="display:flex;align-items:center;gap:16px;background:#ffffff0f;border-radius:12px;padding:12px 16px;margin-bottom:16px">
              ${avatarSVG(me.avatar || {}, 52, { crop: 'head' })}
              <div>
                <div style="font-size:0.78rem;color:#cbd5e1;text-transform:uppercase">Người đồng hành</div>
                <b style="font-size:1.1rem;color:#fff">${esc(me.name)}</b>
                <div style="font-size:0.84rem;color:#fcd34d;margin-top:2px">Đã đóng dấu: <b>${visitedCount} / ${Object.keys(PLACES).length} địa danh</b></div>
              </div>
            </div>

            <h4 style="margin:0 0 12px;font-size:0.92rem;color:#fef08a;text-transform:uppercase;letter-spacing:0.5px">Bộ sưu tập Con tem Lữ hành:</h4>
            
            <!-- Danh sách các con tem đóng dấu của các tỉnh thành -->
            <div class="stamp-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px">
              ${Object.entries(PLACES).map(([id, p]) => {
                const stampedAt = myStamps[id];
                const dateText = stampedAt ? new Date(stampedAt).toLocaleDateString('vi-VN') : null;
                return `
                  <div class="passport-stamp ${stampedAt ? 'stamped' : 'locked'}" style="background:${stampedAt ? '#ffffff14' : '#00000033'};border:1.5px ${stampedAt ? 'solid #f59e0b' : 'dashed #ffffff33'};border-radius:12px;padding:10px 8px;text-align:center;transition:transform .15s">
                    <div style="font-size:1.3rem;margin-bottom:4px">${stampedAt ? '🎖️' : '🔒'}</div>
                    <b style="display:block;font-size:0.86rem;color:${stampedAt ? '#fef08a' : '#94a3b8'}">${p.name}</b>
                    <small style="font-size:0.72rem;color:${stampedAt ? '#86efac' : '#64748b'};display:block;margin-top:2px">
                      ${stampedAt ? dateText : 'Chưa đến'}
                    </small>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        managed = false;
        md?.();
        md = null;

        if (view === 'map') {
          const reach = {};
          EDGES.forEach(([a, b, c]) => {
            if (a === P) reach[b] = c;
            if (b === P) reach[a] = c;
          });
          q('.main').innerHTML = `
            <div class="panel">
              ${mapSVG({ marks, reach, here: P })}
              <p class="msg" style="text-align:center;margin-top:10px;font-size:0.88rem">
                👉 Chạm vào địa danh đang nhấp nháy trên bản đồ để di chuyển. Con số trên đường là số bước tiêu tốn.
              </p>
            </div>
          `;
        } else {
          // Tab Thắng cảnh & Chụp ảnh đôi
          q('.main').innerHTML = `
            <div class="chips">
              ${h.map(p => `
                <span class="chip" style="border-left:6px solid ${COLORS[p.k % 5]}">
                  ${avatarSVG(p.avatar, 24)} ${esc(p.name)}
                </span>
              `).join('')}
            </div>
            ${h.length > 1 ? `
              <div class="panel" style="margin-top:12px;background:linear-gradient(135deg,#c23b3222,#f4b94222);border:1px solid #f4b94266">
                <b style="display:block;font-size:1.05rem;color:var(--lantern);margin-bottom:10px">
                  🎉 Hai bạn đang ở cùng nhau tại ${placeInfo.name}! Hãy chụp một bức ảnh kỷ niệm:
                </b>
                <div class="prev">${photoSVG(rec())}</div>
                <div class="row" style="margin:10px 0;justify-content:center;gap:8px">
                  ${STICK.map(s => `<button class="btn ${draft.sticker === s ? 'pri' : ''}" data-s="${s}" aria-label="Nhãn dán ${s}" style="font-size:1.1rem;padding:6px 12px">${s}</button>`).join('')}
                  ${FRAME.map(f => `<button class="btn" data-f="${f}" style="background:${f};width:32px;height:32px;padding:0;border-radius:50%;border:${draft.frame === f ? '3px solid #fff' : '2px solid transparent'}" aria-label="Khung màu"></button>`).join('')}
                </div>
                <input class="cap" maxlength="40" placeholder="Viết chú thích cho bức ảnh kỷ niệm..." aria-label="Chú thích" value="${esc(draft.caption)}" style="width:100%;margin-bottom:10px;box-sizing:border-box">
                <button class="btn pri" data-a="shoot" style="width:100%;font-size:1rem;padding:10px">📸 Chụp và đóng dấu vào Album!</button>
              </div>
            ` : `
              <div class="panel" style="margin-top:12px">
                <p class="msg" style="margin:0 0 8px">
                  ${others.map(p => `<b>${esc(p.name)}</b> đang ở <i>${PLACES[at(p.uid)]?.name || 'Hà Nội'}</i>`).join('; ') || 'Chưa có ai khác trong phòng'}.
                </p>
                <button class="btn pri" data-v="map" style="font-size:0.9rem">🗺️ Mở Bản đồ để đi tìm nhau</button>
              </div>
            `}
          `;
        }
      }

      // Render danh sách Album ảnh chung
      const alb = Object.entries(st.album || {}).sort((a, b) => b[1].at - a[1].at).slice(0, 16);
      q('.alb').innerHTML = alb.map(([id, r]) => `
        <figure>
          ${photoSVG(r)}
          <button class="btn" data-dl="${id}" style="width:100%;margin-top:4px">📥 Tải ảnh Polaroid về máy</button>
        </figure>
      `).join('') || '<p class="msg">Chưa có bức ảnh kỷ niệm nào. Hãy cùng đến một địa danh và chụp tấm đầu tiên nhé!</p>';
    }

    el.onclick = e => {
      const t = e.target, d = k => t.closest(`[${k}]`)?.getAttribute(k);

      if (d('data-v')) {
        view = d('data-v');
        render();
      } else if (d('data-t')) {
        show360 = d('data-t') === '360';
        render();
      } else if (d('data-go')) {
        const to = d('data-go');
        const c = cost(at(me.uid), to);
        if (MAX - used() < c) return ctx.toast('Hôm nay đã hết bước, hãy nghỉ ngơi mai đi tiếp nhé!');

        playTravelWhistle();
        view = 'scene';
        room.update({
          [`g/trip/pos/${me.uid}`]: to,
          [`g/trip/steps/${me.uid}`]: { day: today(), used: used() + c },
          [`g/trip/stamps/${me.uid}/${to}`]: Date.now()
        });
        ctx.toast(`🚂 Đã tới ${PLACES[to].name}! Con tem đã được đóng vào hộ chiếu.`);
        ctx.ping(null, `${me.name} vừa đặt chân đến ${PLACES[to].name}`);
      } else if (d('data-s')) {
        draft.sticker = d('data-s');
        q('.prev').innerHTML = photoSVG(rec());
      } else if (d('data-f')) {
        draft.frame = d('data-f');
        q('.prev').innerHTML = photoSVG(rec());
      } else if (d('data-a') === 'shoot') {
        playCameraShutter();
        room.set(`g/trip/album/${Date.now()}-${me.uid.slice(0, 4)}`, rec());
        ctx.toast('📸 Đã chụp và lưu bưu thiếp vào album chung!');
        ctx.ping(null, `${me.name} vừa chụp ảnh kỷ niệm tại ${PLACES[at(me.uid)].name}`);
      } else if (d('data-dl')) {
        download(st.album[d('data-dl')]);
      }
    };

    el.oninput = e => {
      if (e.target.classList.contains('cap')) {
        draft.caption = e.target.value;
        q('.prev').innerHTML = photoSVG(rec());
      }
    };

    el.onkeydown = e => {
      if (e.key === 'Enter' && e.target.dataset?.go) {
        e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    };

    fetch(BASE + 'scenes/panos.json')
      .then(r => r.json())
      .then(j => {
        repo = j && typeof j === 'object' ? j : {};
        render();
      })
      .catch(() => {});

    loadLocal();

    ctx.onLeave(room.watch('g/trip', v => {
      st = v || {};
      render();
    }));

    ctx.onLeave(onChange(render));
    ctx.onLeave(() => {
      drop();
      md?.();
      urls.forEach(u => URL.revokeObjectURL(u));
    });
  }
};
