import {
  getAvatar,
  setAvatar,
  randomAvatar,
  avatarSVG,
  OPT,
  SKIN,
  HAIRC,
  TOPC,
  BOTC,
  SHOESC,
  encode,
  decode
} from './core/avatar.js';
import { syncAvatar } from './core/room.js';

export function mountAvatar(el, ctx) {
  let a = getAvatar();
  let currentTab = 'body'; // 'body' | 'face' | 'clothes' | 'acc'

  el.innerHTML = `
    <section>
      <div class="bar">
        <a class="bk" href="#/">Quay lại</a>
      </div>
      <h2>Tùy chỉnh Avatar toàn thân</h2>
      
      <!-- Khung xem trước Avatar toàn thân -->
      <div class="avprev-wrap">
        <div class="avprev"></div>
        <div class="av-shadow"></div>
      </div>

      <!-- Thanh chọn chuyên mục tùy chỉnh -->
      <div class="av-tabs">
        <button class="av-tab ${currentTab === 'body' ? 'active' : ''}" data-tab="body">👤 Dáng người</button>
        <button class="av-tab ${currentTab === 'face' ? 'active' : ''}" data-tab="face">😊 Khuôn mặt</button>
        <button class="av-tab ${currentTab === 'clothes' ? 'active' : ''}" data-tab="clothes">👕 Trang phục</button>
        <button class="av-tab ${currentTab === 'acc' ? 'active' : ''}" data-tab="acc">🧢 Phụ kiện</button>
      </div>

      <!-- Khu vực các tùy chọn của tab hiện tại -->
      <div class="opts-panel"></div>

      <!-- Các thao tác phụ -->
      <div class="row" style="margin-top:16px;justify-content:center;gap:10px">
        <button class="btn" data-a="rnd">🎲 Ngẫu nhiên</button>
        <button class="btn" data-a="copy">📋 Sao chép mã avatar</button>
      </div>
      <div class="row panel" style="margin-top:12px;gap:8px">
        <input class="code-in" placeholder="Dán mã avatar từ máy bạn bè" aria-label="Mã avatar" style="flex:1">
        <button class="btn" data-a="imp">Nhập mã</button>
      </div>
    </section>
  `;

  const q = s => el.querySelector(s);
  const save = () => {
    setAvatar(a);
    syncAvatar();
    render();
  };

  function render() {
    // Render avatar toàn thân kích thước lớn
    q('.avprev').innerHTML = avatarSVG(a, 130, { crop: 'full' });

    // Cập nhật trạng thái active của tab
    el.querySelectorAll('.av-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === currentTab);
    });

    const isFemale = a.gender === 1;
    let fieldsets = [];

    if (currentTab === 'body') {
      fieldsets = [
        { key: 'gender', title: 'Giới tính', options: OPT.gender },
        { key: 'weight', title: 'Độ béo / gầy (Vóc dáng)', options: OPT.weight },
        { key: 'skin', title: 'Màu da', options: SKIN }
      ];
    } else if (currentTab === 'face') {
      const hairList = isFemale ? OPT.hairF : OPT.hairM;
      fieldsets = [
        { key: 'face', title: 'Biểu cảm khuôn mặt', options: OPT.face },
        { key: 'hair', title: `Kiểu tóc (${isFemale ? 'Nữ' : 'Nam'})`, options: hairList },
        { key: 'hairC', title: 'Màu tóc', options: HAIRC }
      ];
    } else if (currentTab === 'clothes') {
      fieldsets = [
        { key: 'top', title: 'Kiểu áo', options: OPT.top },
        { key: 'topC', title: 'Màu áo', options: TOPC },
        { key: 'bot', title: 'Kiểu quần / váy', options: OPT.bot },
        { key: 'botC', title: 'Màu quần / váy', options: BOTC },
        { key: 'shoes', title: 'Giày dép', options: OPT.shoes }
      ];
    } else if (currentTab === 'acc') {
      fieldsets = [
        { key: 'hat', title: 'Mũ & Nón', options: OPT.hat },
        { key: 'acc', title: 'Phụ kiện đeo', options: OPT.acc }
      ];
    }

    q('.opts-panel').innerHTML = fieldsets.map(({ key, title, options }) => `
      <fieldset class="av-fieldset">
        <legend class="av-legend">${title}</legend>
        <div class="row ${key.endsWith('C') || key === 'skin' ? 'sw-row' : 'opt-row'}">
          ${options.map((v, i) => {
            const isSelected = a[key] === i;
            if (String(v).startsWith('#')) {
              // Nút chọn màu sắc
              return `<button class="sw ${isSelected ? 'on' : ''}" style="background:${v}" data-k="${key}" data-i="${i}" aria-label="${title} ${i + 1}"></button>`;
            }
            // Nút chọn văn bản / kiểu dáng
            return `<button class="opt ${isSelected ? 'on' : ''}" data-k="${key}" data-i="${i}">
              <span class="opt-label">${v}</span>
            </button>`;
          }).join('')}
        </div>
      </fieldset>
    `).join('');
  }

  el.onclick = e => {
    const b = e.target.closest('[data-k],[data-a],[data-tab]');
    if (!b) return;

    if (b.dataset.tab) {
      currentTab = b.dataset.tab;
      return render();
    }

    if (b.dataset.k) {
      a = { ...a, [b.dataset.k]: +b.dataset.i };
      return save();
    }

    if (b.dataset.a === 'rnd') {
      a = randomAvatar();
      save();
    }

    if (b.dataset.a === 'copy') {
      navigator.clipboard?.writeText(encode(a)).then(
        () => ctx.toast('Đã sao chép mã avatar!'),
        () => ctx.toast('Không thể sao chép')
      );
    }

    if (b.dataset.a === 'imp') {
      const d = decode(q('.code-in').value);
      if (!d) return ctx.toast('Mã avatar không hợp lệ!');
      a = d;
      save();
      ctx.toast('Đã nhập avatar thành công!');
    }
  };

  render();
}
