import { esc } from '../../core/ui.js';
import { clack, tone } from '../../core/sound.js';
import { avatarSVG } from '../../core/avatar.js';

const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const KIND = {
  den: { name: '🏮 Đèn hoa đăng', icon: '🏮', desc: 'Thắp sáng lời ước bập bùng' },
  dieu: { name: '🪁 Cánh diều', icon: '🪁', desc: 'Gửi ước mơ bay cao đón gió' },
  tim: { name: '💖 Trái tim yêu thương', icon: '💖', desc: 'Lời tỏ tình & nhắn nhủ ngọt ngào' }
};

const DEFAULT_WISHES = {
  den: 'Thắp sáng ước mơ & bình an ✨',
  dieu: 'Bay cao đón gió tự do 🪁',
  tim: 'Yêu thương gửi trao 💖'
};

const TIMER_OPTIONS = [
  { val: 0, label: '🔓 Mở ngay (Ai cũng xem được)' },
  { val: 60 * 1000, label: '⏳ Mở sau 1 phút (Thử nghiệm)' },
  { val: 10 * 60 * 1000, label: '⏳ Mở sau 10 phút' },
  { val: 60 * 60 * 1000, label: '⏳ Mở sau 1 giờ' },
  { val: 24 * 60 * 60 * 1000, label: '⏳ Mở sau 24 giờ (1 ngày)' },
  { val: 3 * 24 * 60 * 60 * 1000, label: '⏳ Mở sau 3 ngày' },
  { val: 7 * 24 * 60 * 60 * 1000, label: '⏳ Mở sau 7 ngày (1 tuần)' },
  { val: 30 * 24 * 60 * 60 * 1000, label: '⏳ Mở sau 30 ngày (1 tháng)' },
  { val: 365 * 24 * 60 * 60 * 1000, label: '⏳ Mở sau 1 năm (Kỷ niệm 1 năm)' }
];

function playReleaseSound(kind) {
  if (kind === 'tim') {
    tone(659, 0.15, 0.15, 'sine');
    setTimeout(() => tone(880, 0.25, 0.18, 'sine'), 100);
  } else if (kind === 'dieu') {
    tone(440, 0.18, 0.15, 'triangle');
    setTimeout(() => tone(660, 0.22, 0.15, 'sine'), 110);
  } else {
    tone(523, 0.18, 0.15, 'sine');
    setTimeout(() => tone(659, 0.22, 0.15, 'sine'), 100);
    setTimeout(() => tone(784, 0.3, 0.2, 'sine'), 210);
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Đã mở khóa';
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (day > 0) return `${day} ngày ${hr} giờ ${min} phút`;
  if (hr > 0) return `${hr} giờ ${min} phút ${sec} giây`;
  if (min > 0) return `${min} phút ${sec} giây`;
  return `${sec} giây`;
}

function formatBadge(ms) {
  if (ms <= 0) return '🔓';
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / (1000 * 60)) % 60;
  const hr = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const day = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (day > 0) return `🔒 ${day}d ${hr}h`;
  if (hr > 0) return `🔒 ${hr}h ${min}m`;
  if (min > 0) return `🔒 ${min}m ${sec}s`;
  return `🔒 ${sec}s`;
}

// SVG đồ họa cho từng loại vật phẩm
function getItemSVG(kind, color = '#f4b942') {
  if (kind === 'dieu') {
    return `
      <svg class="kite-svg" width="36" height="60" viewBox="0 0 48 80">
        <polygon points="24,4 44,28 24,52 4,28" fill="#e11d48" stroke="#fef08a" stroke-width="1.5"/>
        <polygon points="24,4 34,28 24,52 14,28" fill="${color}"/>
        <line x1="24" y1="4" x2="24" y2="52" stroke="#fff" stroke-width="1.5"/>
        <line x1="4" y1="28" x2="44" y2="28" stroke="#fff" stroke-width="1.5"/>
        <!-- Đuôi diều uốn lượn -->
        <path d="M24 52 Q16 62 26 70 Q32 76 24 80" stroke="#fef08a" stroke-width="1.5" fill="none"/>
        <circle cx="20" cy="62" r="2.5" fill="#38bdf8"/>
        <circle cx="28" cy="72" r="2.5" fill="#4ade80"/>
      </svg>
    `;
  }
  if (kind === 'tim') {
    return `
      <svg class="heart-svg" width="34" height="40" viewBox="0 0 40 40">
        <path d="M20 36 C8 24 2 17 2 10 A8 8 0 0 1 18 6 L20 8 L22 6 A8 8 0 0 1 38 10 C38 17 32 24 20 36 Z" 
          fill="#f43f5e" stroke="#ffe4e6" stroke-width="1.5" filter="drop-shadow(0 0 8px #f43f5e)"/>
        <ellipse cx="12" cy="11" rx="3.5" ry="1.8" fill="#ffffff" opacity="0.8" transform="rotate(-30 12 11)"/>
      </svg>
    `;
  }
  // Mặc định: Đèn hoa đăng
  return `
    <svg class="lamp-svg" width="32" height="56" viewBox="0 0 46 84">
      <use href="#l"/>
      <ellipse cx="23" cy="42" rx="7" ry="12" fill="#fffef0" opacity="0.85" filter="drop-shadow(0 0 6px #fef08a)"/>
    </svg>
  `;
}

// Sinh vị trí cố định ngẫu nhiên cho các vì sao nền
const STARS = Array.from({ length: 36 }, (_, i) => ({
  x: (i * 37 + 13) % 96 + 2,
  y: (i * 47 + 7) % 85 + 2,
  delay: ((i * 17) % 25) / 10
}));

export default {
  id: 'tha-den',
  name: 'Thả đèn, diều & trái tim',
  icon: '🏮',
  desc: 'Gửi gắm ước nguyện, hẹn giờ mở thư tình, ngắm bầu trời chung rực rỡ',
  min: 2,
  max: 5,
  ready: true,
  room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {}, seen = 0, selectedItem = null, timerId = null;

    el.innerHTML = `
      <section>
        <div class="bar">
          <a class="bk" href="#/">Quay lại</a>
          <div class="turn">Bầu trời chung</div>
        </div>

        <h2>🌌 Bầu trời Ước nguyện &amp; Gửi gắm Yêu thương</h2>

        <!-- Khung bầu trời to rộng lộng lẫy -->
        <div class="sky2" aria-label="Bầu trời với đèn, diều và trái tim">
          <!-- Vầng trăng huyền ảo -->
          <div class="sky-moon"></div>
          <!-- Các vì sao lấp lánh -->
          ${STARS.map(s => `
            <div class="sky-star" style="left:${s.x}%;top:${s.y}%;animation-delay:${s.delay}s"></div>
          `).join('')}
          <!-- Mặt nước phản chiếu phía dưới -->
          <div class="sky-water"></div>
          <!-- Vùng chứa các vật phẩm bay -->
          <div class="sky-items"></div>
        </div>

        <!-- Bảng điều khiển thả vật phẩm -->
        <div class="panel" style="margin-top:14px;background:linear-gradient(135deg,#ffffff14,#ffffff08);border:1px solid #ffffff26;border-radius:18px;padding:16px">
          
          <!-- Chọn loại vật phẩm -->
          <div class="row" style="margin-bottom:12px;gap:10px;justify-content:center;flex-wrap:wrap">
            ${Object.entries(KIND).map(([k, v], i) => `
              <label class="btn" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 14px">
                <input type="radio" name="k" value="${k}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--lantern)">
                <b>${v.name}</b>
              </label>
            `).join('')}
          </div>

          <!-- Nhập điều ước / lời nhắn (có thể để trống để thả nhanh làm đẹp trời) -->
          <div style="margin-bottom:12px">
            <input class="wish-input" maxlength="120" placeholder="Viết điều ước, lời nhắn (hoặc để trống để thả nhanh cho đẹp trời ✨)..." aria-label="Lời nhắn" style="width:100%;box-sizing:border-box;padding:10px 14px;font-size:0.95rem">
          </div>

          <!-- Tùy chọn nâng cao: Số lượng đèn & Hẹn giờ đếm ngược -->
          <div class="row" style="gap:10px;margin-bottom:12px;flex-wrap:wrap">
            
            <!-- Chọn số lượng thả -->
            <div style="flex:1;min-width:140px">
              <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Số lượng thả:</label>
              <select class="count-select" style="width:100%;background:#ffffff1a;color:#fff;border:1px solid #ffffff2a;border-radius:10px;padding:8px 10px;font:inherit">
                <option value="1">1 chiếc (Đơn lẻ)</option>
                <option value="3">3 chiếc (Chùm tam ước)</option>
                <option value="5">5 chiếc (Ngũ phúc lâm môn)</option>
                <option value="7">7 chiếc (Bầy sao ước nguyện)</option>
              </select>
            </div>

            <!-- Chọn hẹn giờ đếm ngược mở ra -->
            <div style="flex:2;min-width:200px">
              <label style="font-size:0.8rem;color:var(--mute);display:block;margin-bottom:4px">Hẹn giờ mở khóa điều ước:</label>
              <select class="timer-select" style="width:100%;background:#ffffff1a;color:#fff;border:1px solid #ffffff2a;border-radius:10px;padding:8px 10px;font:inherit">
                ${TIMER_OPTIONS.map(opt => `<option value="${opt.val}">${opt.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="row" style="justify-content:center">
            <button class="btn pri release-btn" style="font-size:1.05rem;padding:10px 24px;border-radius:99px;cursor:pointer">
              ✨ Thả lên trời
            </button>
          </div>
        </div>

        <p class="msg" role="status" aria-live="polite" style="text-align:center;color:#fcd34d;font-weight:700"></p>

        <!-- Danh sách lời ước trên bầu trời -->
        <h3 style="margin:20px 0 10px;font-size:1rem;color:var(--lantern)">💌 Lời ước &amp; Thông điệp gửi gắm</h3>
        <ul class="wish"></ul>

        <!-- Modal xem chi tiết điều ước khi bấm vào đèn/diều/trái tim -->
        <div class="wish-modal-container"></div>
      </section>
    `;

    const q = s => el.querySelector(s);
    const ps = () => room.players();
    const nameOf = u => ps().find(p => p.uid === u)?.name || 'Ai đó';
    const avatarOf = u => ps().find(p => p.uid === u)?.avatar || {};

    // Cập nhật giao diện bầu trời và danh sách
    function renderSky() {
      const all = Object.entries(st).sort((a, b) => a[1].at - b[1].at);
      const now = Date.now();

      // Render các vật phẩm bay trên bầu trời
      q('.sky-items').innerHTML = all.slice(-45).map(([id, it]) => {
        const h = hash(id);
        const x = 5 + (h % 86);
        const yBase = it.kind === 'den' ? 45 : it.kind === 'tim' ? 30 : 10;
        const y = yBase + (h % 38);
        const isLocked = it.unlockAt && now < it.unlockAt;
        const diff = isLocked ? it.unlockAt - now : 0;
        const isAuthor = it.uid === me.uid;
        const defaultText = DEFAULT_WISHES[it.kind] || 'Nguyện ước an lành';

        return `
          <button class="fl ${selectedItem?.id === id ? 'focus' : ''}" 
            data-item-id="${id}"
            style="left:${x}%;top:${y}%;--t:${6 + (h % 6)}s;--dx:${(h % 5) * 6 - 12}px;--dy:${(h % 7) * 4 - 12}px"
            title="${isLocked && !isAuthor ? 'Đèn ước bí mật (Đang khóa)' : esc(it.text || defaultText)}"
            aria-label="${KIND[it.kind]?.name || 'Đèn'}: ${isLocked && !isAuthor ? 'Đang khóa' : esc(it.text || defaultText)}">
            ${getItemSVG(it.kind, it.color || '#f4b942')}
            <span class="fl-badge ${isLocked ? '' : 'unlocked'}">
              ${isLocked ? formatBadge(diff) : (it.hearts ? `❤️ ${it.hearts}` : '✨')}
            </span>
          </button>
        `;
      }).join('');

      // Render danh sách bên dưới
      q('.wish').innerHTML = all.slice(-25).reverse().map(([id, it]) => {
        const isLocked = it.unlockAt && now < it.unlockAt;
        const isAuthor = it.uid === me.uid;
        const icon = KIND[it.kind]?.icon || '🏮';
        const authorName = esc(it.author || nameOf(it.uid));
        const defaultText = DEFAULT_WISHES[it.kind] || 'Thắp sáng bầu trời';

        return `
          <li data-item-id="${id}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
              <b>${icon} ${authorName}</b>
              <span style="font-size:0.75rem;color:${isLocked ? '#fcd34d' : '#86efac'}">
                ${isLocked ? `🔒 ${formatBadge(it.unlockAt - now)}` : (it.hearts ? `❤️ ${it.hearts}` : '✨ Mở')}
              </span>
            </div>
            <div style="font-size:0.88rem;color:#f3ecda">
              ${isLocked && !isAuthor
                ? '<i style="color:var(--mute)">🔒 Lời ước đang được niêm phong thời gian... Bấm để xem đếm ngược</i>'
                : (it.text ? esc(it.text) : `<i style="color:#fde68a">✨ ${defaultText}</i>`)}
            </div>
          </li>
        `;
      }).join('') || '<li style="text-align:center;color:var(--mute)">Chưa có ngọn đèn nào trên bầu trời. Hãy là người đầu tiên thả nhé!</li>';

      // Cập nhật modal nếu đang mở
      if (selectedItem) {
        if (!st[selectedItem.id]) {
          selectedItem = null;
          renderModal();
        } else {
          const likeBtn = q('[data-action="like-wish"]');
          if (likeBtn) {
            likeBtn.textContent = `❤️ Thả tim (${st[selectedItem.id].hearts || 0})`;
          }
        }
      }
    }

    // Render Modal xem chi tiết điều ước khi bấm vào đèn/diều/trái tim
    function renderModal() {
      const modalBox = q('.wish-modal-container');
      if (!selectedItem) {
        modalBox.innerHTML = '';
        return;
      }

      const it = st[selectedItem.id];
      if (!it) {
        selectedItem = null;
        modalBox.innerHTML = '';
        return;
      }

      const now = Date.now();
      const isLocked = it.unlockAt && now < it.unlockAt;
      const isAuthor = it.uid === me.uid;
      const diff = isLocked ? it.unlockAt - now : 0;
      const authorAvatar = avatarOf(it.uid);
      const authorName = esc(it.author || nameOf(it.uid));
      const kindInfo = KIND[it.kind] || KIND.den;
      const defaultText = DEFAULT_WISHES[it.kind] || 'Thắp sáng bầu trời';
      const displayText = it.text
        ? `"${esc(it.text)}"`
        : `<span style="font-weight:600;color:#fef08a">✨ ${defaultText}</span>`;

      modalBox.innerHTML = `
        <div class="wish-modal-mask" data-action="close-modal">
          <div class="wish-modal-card">
            
            <!-- Nút đóng góc phải -->
            <button data-action="close-modal" aria-label="Đóng" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#94a3b8;font-size:1.4rem;cursor:pointer;line-height:1;padding:4px">✕</button>

            <!-- Tiêu đề & Tác giả -->
            <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #ffffff1a;padding-bottom:12px;margin-bottom:14px">
              ${avatarSVG(authorAvatar, 46, { crop: 'head' })}
              <div>
                <b style="font-size:1.05rem;color:var(--lantern)">${authorName}</b>
                <div style="font-size:0.8rem;color:var(--mute)">Đã thả ${kindInfo.name}</div>
              </div>
            </div>

            ${isLocked ? `
              <!-- Trường hợp ĐANG KHÓA HẸN GIỜ -->
              <div class="countdown-box">
                <div style="font-size:2rem;margin-bottom:4px">⏳</div>
                <b style="color:#fcd34d;font-size:0.95rem">
                  ${isAuthor ? 'Lời ước bí mật của bạn đang được niêm phong!' : 'Điều ước này đang được niêm phong thời gian!'}
                </b>
                <p style="margin:6px 0;font-size:0.82rem;color:#f3ecda">
                  ${isAuthor ? 'Người khác sẽ chỉ thấy nội dung này sau khi thời gian đếm ngược kết thúc:' : 'Sẽ tự động bung tỏa và mở ra sau:'}
                </p>
                <div class="countdown-digits">${formatCountdown(diff)}</div>
              </div>

              ${isAuthor ? `
                <div style="background:#00000044;border-radius:12px;padding:10px 14px;margin:10px 0;border-left:4px solid var(--lantern)">
                  <span style="font-size:0.75rem;color:var(--mute);display:block;margin-bottom:2px">Nội dung bạn đã ghi:</span>
                  <div style="font-size:0.95rem;color:#fff;font-style:italic">${displayText}</div>
                </div>
              ` : `
                <p style="font-size:0.82rem;color:var(--mute);text-align:center;margin:8px 0">
                  Hãy quay lại cùng nhau mở ra đúng ngày hẹn ước nhé ✨
                </p>
              `}
            ` : `
              <!-- Trường hợp ĐÃ MỞ (Ai cũng xem được) -->
              <div style="background:linear-gradient(135deg,#ffffff12,#ffffff06);border:1px solid #ffffff22;border-radius:16px;padding:16px;margin:14px 0;text-align:center;position:relative">
                <span style="font-size:2.2rem;display:block;margin-bottom:8px">${kindInfo.icon}</span>
                <p style="margin:0;font-size:1.1rem;line-height:1.55;color:#fffef0;font-style:italic;font-weight:600">
                  ${displayText}
                </p>
                <div style="font-size:0.75rem;color:var(--mute);margin-top:10px">
                  Thả lúc: ${new Date(it.at).toLocaleString('vi-VN')}
                </div>
              </div>

              <!-- Nút Thả tim đáp lại tình cảm -->
              <div class="row" style="justify-content:center;gap:10px">
                <button class="btn pri" data-action="like-wish" data-id="${selectedItem.id}" style="font-size:0.95rem;padding:8px 20px;border-radius:99px;cursor:pointer">
                  ❤️ Thả tim (${it.hearts || 0})
                </button>
              </div>
            `}

            <div class="row" style="justify-content:center;margin-top:14px">
              <button class="btn" data-action="close-modal" style="font-size:0.88rem;padding:6px 22px;cursor:pointer">Đóng</button>
            </div>
          </div>
        </div>
      `;
    }

    // Xử lý nút Thả lên trời (không bắt buộc phải ghi nội dung)
    q('.release-btn').onclick = () => {
      const textInput = q('.wish-input');
      const t = textInput.value.trim();
      const kind = el.querySelector('input[name=k]:checked')?.value || 'den';
      const count = +q('.count-select')?.value || 1;
      const timerVal = +q('.timer-select')?.value || 0;
      const now = Date.now();
      const unlockAt = timerVal > 0 ? now + timerVal : null;

      const colors = ['#f4b942', '#f43f5e', '#38bdf8', '#a855f7', '#fb923c', '#ec4899', '#10b981'];
      const chosenColor = colors[Math.random() * colors.length | 0];

      // Thả số lượng đèn theo yêu cầu (1, 3, 5, 7)
      const updates = {};
      for (let i = 0; i < count; i++) {
        const id = `${now + i}-${me.uid.slice(0, 4)}`;
        updates['g/den/items/' + id] = {
          uid: me.uid,
          author: me.name,
          text: t, // Có thể rỗng, vẫn thả được để trang trí bầu trời
          kind,
          color: chosenColor,
          at: now + i,
          unlockAt: unlockAt,
          hearts: 0
        };
      }

      room.update(updates);
      textInput.value = '';
      playReleaseSound(kind);

      const kindName = KIND[kind]?.name || 'Đèn';
      ctx.toast(`✨ Đã thả ${count > 1 ? `${count} chiếc ` : ''}${kindName} lên bầu trời!`);
      ctx.ping(null, `${me.name} vừa thả ${count > 1 ? `${count} chiếc ` : ''}${kindName} lên bầu trời!`);
    };

    // Nhấn Enter trong ô nhập cũng thả ngay
    q('.wish-input').onkeydown = e => {
      if (e.key === 'Enter') {
        q('.release-btn').click();
      }
    };

    // Xử lý tương tác nhấn vào đèn trên trời hoặc danh sách
    el.onclick = e => {
      // 1. Đóng modal nếu nhấn nút close hoặc click ra ngoài vùng mask
      const closeBtn = e.target.closest('[data-action="close-modal"]');
      if (closeBtn || e.target.classList.contains('wish-modal-mask')) {
        selectedItem = null;
        renderModal();
        return;
      }

      // 2. Thả tim
      const likeBtn = e.target.closest('[data-action="like-wish"]');
      if (likeBtn) {
        const id = likeBtn.dataset.id;
        const it = st[id];
        if (it) {
          tone(784, 0.15, 0.18, 'sine');
          room.update({ [`g/den/items/${id}/hearts`]: (it.hearts || 0) + 1 });
          ctx.toast('💖 Đã gửi tim yêu thương!');
        }
        return;
      }

      // 3. Nếu click bên trong card modal: không làm gì (không đóng, không mở lại)
      if (e.target.closest('.wish-modal-card')) {
        return;
      }

      // 4. Mở modal khi bấm vào vật phẩm trên bầu trời hoặc danh sách
      const itemEl = e.target.closest('[data-item-id]');
      if (itemEl) {
        clack();
        selectedItem = { id: itemEl.dataset.itemId };
        renderModal();
      }
    };

    // Nhấn phím Escape để đóng modal
    const onKeyDown = e => {
      if (e.key === 'Escape' && selectedItem) {
        selectedItem = null;
        renderModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Bộ hẹn giờ cập nhật đếm ngược mỗi giây: CHỈ cập nhật số mà KHÔNG re-render DOM modal để tránh popup liên tục
    timerId = setInterval(() => {
      const now = Date.now();

      // Cập nhật số đếm ngược trong modal nếu đang mở
      if (selectedItem) {
        const it = st[selectedItem.id];
        if (it && it.unlockAt) {
          const diff = it.unlockAt - now;
          const digitsEl = q('.countdown-digits');
          if (digitsEl) {
            if (diff <= 0) {
              renderModal(); // Vừa hết giờ, hiển thị nội dung
            } else {
              digitsEl.textContent = formatCountdown(diff);
            }
          }
        }
      }

      // Cập nhật huy hiệu đếm ngược trên các vật phẩm bay
      const hasLocked = Object.values(st).some(it => it.unlockAt && it.unlockAt > now);
      if (hasLocked) {
        el.querySelectorAll('.fl[data-item-id]').forEach(btn => {
          const id = btn.dataset.itemId;
          const it = st[id];
          if (it && it.unlockAt) {
            const badge = btn.querySelector('.fl-badge');
            if (badge) {
              const diff = it.unlockAt - now;
              badge.textContent = formatBadge(diff);
              if (diff <= 0) badge.classList.add('unlocked');
            }
          }
        });
      }
    }, 1000);

    // Lắng nghe cập nhật realtime từ Firebase
    ctx.onLeave(room.watch('g/den/items', v => {
      st = v || {};
      const all = Object.entries(st).sort((a, b) => a[1].at - b[1].at);
      const last = all.at(-1)?.[1];

      if (last && last.at > seen) {
        if (seen && last.uid !== me.uid) {
          const kindName = KIND[last.kind]?.name || 'một chiếc đèn';
          const msgEl = q('.msg');
          if (msgEl) {
            msgEl.textContent = `✨ ${esc(last.author || nameOf(last.uid))} vừa thả ${kindName} lên trời!`;
            setTimeout(() => {
              if (msgEl.textContent.includes('vừa thả')) msgEl.textContent = '';
            }, 4500);
          }
        }
        seen = last.at;
      }

      renderSky();
    }));

    ctx.onLeave(() => {
      if (timerId) clearInterval(timerId);
      window.removeEventListener('keydown', onKeyDown);
    });
  }
};
