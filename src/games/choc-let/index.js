import { esc } from '../../core/ui.js';
import { clack, tone } from '../../core/sound.js';
import { avatarSVG } from '../../core/avatar.js';

// Danh sách các điểm chọc trên cơ thể với tọa độ % tương đối trên toàn thân
const BODY_PARTS = [
  { id: 'head', name: 'Trán / Đầu', icon: '⭐', x: 50, y: 15, quote: 'Ui da! Cốc đầu tui hoài!', face: 4, soundTone: 680 },
  { id: 'cheek_l', name: 'Má trái', icon: '🌸', x: 33, y: 26, quote: 'Má phúng phính của tui đó!', face: 3, soundTone: 540 },
  { id: 'cheek_r', name: 'Má phải', icon: '🌸', x: 67, y: 26, quote: 'Đỏ hết cả má rồi nè!', face: 3, soundTone: 540 },
  { id: 'nose', name: 'Mũi', icon: '👃', x: 50, y: 27, quote: 'Hắt xìiii! Dám búng mũi tui!', face: 4, soundTone: 600 },
  { id: 'neck', name: 'Nách / Cổ', icon: '🪶', x: 32, y: 40, quote: 'Haha nhột quá tha cho tuiii!', face: 5, soundTone: 440 },
  { id: 'belly', name: 'Eo / Bụng mỡ', icon: '🍩', x: 50, y: 52, quote: 'Véo mỡ bụng hả, đền mỡ lại đây!', face: 5, soundTone: 380 },
  { id: 'hip', name: 'Hông / Mông', icon: '🍑', x: 50, y: 64, quote: 'Á biến thái quá nha! 😳', face: 3, soundTone: 320 },
  { id: 'thigh', name: 'Đùi / Chân', icon: '🦵', x: 42, y: 78, quote: 'Nhột chân quá đi thôi!', face: 5, soundTone: 410 }
];

export default {
  id: 'choc-let',
  name: 'Chọc lét',
  icon: '👉',
  desc: 'Chọc các vị trí nhạy cảm trên người đối phương, xem đối phương phản ứng trực tiếp',
  min: 2,
  max: 5,
  ready: true,
  room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {};
    let seen = 0;
    let targetUid = null;
    let myReaction = null; // { part, quote, at, face }
    let myReactionTimer = null;
    let oppPokeAnim = null; // { part, at }

    el.innerHTML = `
      <section>
        <div class="bar">
          <a class="bk" href="#/">Quay lại</a>
          <div class="turn">Trò chơi Chọc Lét</div>
        </div>
        <h2>👉 Đấu Trường Chọc Lét</h2>
        <div class="poke-content"></div>
      </section>
    `;

    const q = s => el.querySelector(s);
    const ps = () => room.players();
    const nameOf = u => ps().find(p => p.uid === u)?.name || 'Đối phương';
    const avatarOf = u => ps().find(p => p.uid === u)?.avatar || {};

    // Hiệu ứng âm thanh cù lét tinh nghịch
    function playTickleSound(baseTone = 440) {
      clack();
      tone(baseTone, 0.08, 0.15, 'triangle');
      setTimeout(() => tone(baseTone * 1.25, 0.09, 0.18, 'sine'), 90);
      setTimeout(() => tone(baseTone * 1.5, 0.12, 0.22, 'triangle'), 190);
    }

    // Thực hiện chọc vào 1 vị trí
    function pokePart(part) {
      if (!targetUid) return;
      const targetPlayer = ps().find(p => p.uid === targetUid);
      if (!targetPlayer) return;

      playTickleSound(part.soundTone);
      navigator.vibrate?.(40);

      // Hiệu ứng chọc trên màn hình của mình
      oppPokeAnim = { part, at: Date.now() };
      render();
      setTimeout(() => {
        oppPokeAnim = null;
        render();
      }, 700);

      const pokeData = {
        from: me.uid,
        to: targetUid,
        partId: part.id,
        partName: part.name,
        quote: part.quote,
        x: part.x,
        y: part.y,
        at: Date.now()
      };

      room.update({
        'g/choc/last': pokeData,
        [`g/choc/stats/${targetUid}/${part.id}`]: (st.stats?.[targetUid]?.[part.id] || 0) + 1,
        [`g/choc/count/${me.uid}`]: (st.count?.[me.uid] || 0) + 1
      });

      ctx.ping([targetUid], `${me.name} vừa chọc vào ${part.name} của bạn!`);
      ctx.toast(`👉 Bạn vừa chọc vào ${part.name} của ${targetPlayer.name}!`);
    }

    function render() {
      const P = ps();
      const opps = P.filter(p => p.uid !== me.uid);

      if (!opps.length) {
        q('.poke-content').innerHTML = `
          <div class="panel" style="text-align:center;padding:30px 16px">
            <p style="font-size:1.1rem;color:var(--mute);margin-bottom:12px">Đang chờ bạn bè vào phòng để cùng chọc lét…</p>
            <p style="font-size:0.88rem;color:#fcd34d">Gửi mã phòng <b>${room.code}</b> cho người yêu hoặc bạn bè nhé!</p>
          </div>
        `;
        return;
      }

      // Mặc định chọn đối thủ đầu tiên nếu chưa chọn
      if (!targetUid || !opps.some(p => p.uid === targetUid)) {
        targetUid = opps[0].uid;
      }

      const curOpp = ps().find(p => p.uid === targetUid) || opps[0];
      const myAvatarData = avatarOf(me.uid);
      const oppAvatarData = avatarOf(targetUid);

      // Thống kê điểm yếu bị chọc nhiều nhất của mình
      const myStats = st.stats?.[me.uid] || {};
      let mostPokedMyPart = null;
      let maxMyPokes = 0;
      for (const part of BODY_PARTS) {
        const count = myStats[part.id] || 0;
        if (count > maxMyPokes) {
          maxMyPokes = count;
          mostPokedMyPart = part;
        }
      }

      q('.poke-content').innerHTML = `
        <!-- Chọn đối thủ muốn chọc (nếu phòng > 2 người) -->
        ${opps.length > 1 ? `
          <div class="row" style="margin-bottom:14px;gap:8px;overflow-x:auto;padding-bottom:4px">
            <span style="font-size:0.85rem;color:var(--mute);align-self:center">Chọc ai:</span>
            ${opps.map(p => `
              <button class="btn ${p.uid === targetUid ? 'pri' : ''}" data-target-uid="${p.uid}" style="border-radius:99px;padding:4px 12px;font-size:0.84rem">
                ${esc(p.name)}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Đấu trường 2 bên: Bạn bị chọc & Đối phương bị chọc -->
        <div class="poke-arena">
          
          <!-- SÂN KHẤU CỦA BẠN (Xem mình bị chọc ở đâu) -->
          <div class="poke-stage">
            <div class="poke-stage-title">
              <span>🛡️ Bạn (${esc(me.name)})</span>
            </div>
            
            <div class="poke-char-wrap ${myReaction ? 'tickle-shake' : ''}">
              ${avatarSVG(myAvatarData, 120, {
                crop: 'full',
                overrideFace: myReaction ? myReaction.face : undefined
              })}

              <!-- Bong bóng thoại phản ứng khi bị chọc -->
              ${myReaction ? `
                <div class="poke-bubble">${esc(myReaction.quote)}</div>
                <!-- Sóng gợn đỏ tại vị trí bị chọc -->
                <div class="poke-ripple" style="left:${myReaction.x}%;top:${myReaction.y}%"></div>
                <!-- Bàn tay chọc bay vào -->
                <div class="poke-finger" style="left:${myReaction.x}%;top:${myReaction.y}%">👉</div>
              ` : ''}
            </div>

            <div style="font-size:0.85rem;color:${myReaction ? '#f87171' : 'var(--mute)'};min-height:24px;font-weight:700">
              ${myReaction
                ? `🚨 ${nameOf(st.last?.from)} vừa chọc vào [${st.last?.partName}]!`
                : (mostPokedMyPart ? `Điểm yếu nhất: ${mostPokedMyPart.name} (${maxMyPokes} lần)` : 'Chưa bị ai chọc')}
            </div>
          </div>

          <!-- SÂN KHẤU ĐỐI PHƯƠNG (Bấm trực tiếp lên người để chọc) -->
          <div class="poke-stage" style="border-color:#f4b94244">
            <div class="poke-stage-title" style="color:#fcd34d">
              <span>🎯 ${esc(curOpp.name)} (Chạm để chọc!)</span>
            </div>

            <div class="poke-char-wrap" id="opp-char-wrap">
              ${avatarSVG(oppAvatarData, 120, { crop: 'full' })}

              <!-- Các điểm Hotspot tương tác trên cơ thể đối phương -->
              ${BODY_PARTS.map(part => `
                <button class="poke-hotspot" 
                  data-part-id="${part.id}" 
                  style="left:${part.x}%;top:${part.y}%" 
                  title="${part.name}: ${part.desc}"
                  aria-label="Chọc vào ${part.name}">
                  ${part.icon}
                </button>
              `).join('')}

              <!-- Hiệu ứng tay chọc bay tới đối phương -->
              ${oppPokeAnim ? `
                <div class="poke-ripple" style="left:${oppPokeAnim.part.x}%;top:${oppPokeAnim.part.y}%"></div>
                <div class="poke-finger" style="left:${oppPokeAnim.part.x}%;top:${oppPokeAnim.part.y}%">👉</div>
              ` : ''}
            </div>

            <p style="font-size:0.82rem;color:var(--mute);margin:4px 0 10px">
              Chạm trực tiếp vào các điểm tròn trên cơ thể, hoặc chọn nhanh bên dưới:
            </p>

            <!-- Bảng nút chọn nhanh vị trí chọc -->
            <div class="poke-part-grid">
              ${BODY_PARTS.map(part => `
                <button class="btn-poke-part" data-part-id="${part.id}">
                  <span>${part.icon}</span>
                  <b>${part.name}</b>
                </button>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Bảng xếp hạng số lần chọc trong phòng -->
        <div class="panel" style="margin-top:16px">
          <h4 style="margin:0 0 8px;font-size:0.92rem;color:var(--lantern)">🏆 Bảng phong thần Chọc Lét</h4>
          <ul class="tally" style="list-style:none;padding:0;margin:0;display:grid;gap:6px">
            ${P.map(p => `
              <li style="display:flex;align-items:center;justify-content:space-between;background:#ffffff0d;padding:6px 12px;border-radius:10px;font-size:0.88rem">
                <span style="display:flex;align-items:center;gap:8px">
                  ${avatarSVG(p.avatar, 24)}
                  <b>${esc(p.name)}${p.uid === me.uid ? ' (Bạn)' : ''}</b>
                </span>
                <span>Đã chọc: <b style="color:#fcd34d">${st.count?.[p.uid] || 0}</b> cái</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    el.onclick = e => {
      const b = e.target.closest('[data-part-id],[data-target-uid]');
      if (!b) return;

      if (b.dataset.targetUid) {
        targetUid = b.dataset.targetUid;
        return render();
      }

      if (b.dataset.partId) {
        const part = BODY_PARTS.find(p => p.id === b.dataset.partId);
        if (part) pokePart(part);
      }
    };

    // Lắng nghe dữ liệu realtime từ Firebase
    ctx.onLeave(room.watch('g/choc', v => {
      st = v || {};
      const l = st.last;

      // Xử lý khi có người chọc MÌNH
      if (l && l.at > seen) {
        seen = l.at;

        if (l.to === me.uid && l.from !== me.uid) {
          const part = BODY_PARTS.find(p => p.id === l.partId) || BODY_PARTS[0];

          // Kích hoạt phản ứng biểu cảm và rung lắc
          playTickleSound(part.soundTone);
          navigator.vibrate?.([80, 40, 120]);

          myReaction = {
            part,
            quote: l.quote || part.quote,
            at: l.at,
            face: part.face || 5,
            x: l.x ?? part.x,
            y: l.y ?? part.y
          };

          // Tự động tắt phản ứng sau 2.5 giây
          clearTimeout(myReactionTimer);
          myReactionTimer = setTimeout(() => {
            myReaction = null;
            render();
          }, 2500);

          ctx.toast(`💥 ${nameOf(l.from)} vừa chọc vào [${l.partName}] của bạn!`);
        }
      }

      render();
    }));
  }
};
