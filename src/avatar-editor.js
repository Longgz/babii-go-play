import { getAvatar, setAvatar, randomAvatar, avatarSVG, norm, DEFAULT, OPT, SKIN, HAIRC, TOPC, BOTC, SHOESC, ACCENTS, BACKDROPS, encode, decode } from './core/avatar.js';
import './styles/avatar.css';

const TABS = [['looks', '✦', 'Bộ phối'], ['body', '👤', 'Dáng người'], ['face', '☺', 'Tóc & mặt'], ['clothes', '👕', 'Trang phục'], ['acc', '🧢', 'Phụ kiện'], ['effects', '✨', 'Hiệu ứng']];
const LOOKS = [
  { name: 'Dạo phố', note: 'Varsity · sắc xanh', values: { top: 7, topC: 2, bot: 5, botC: 0, shoes: 5, shoesC: 0, hat: 3, acc: 0, accentC: 5, pattern: 0, backdrop: 0, effect: 1, motion: 1 } },
  { name: 'Kẹo bông', note: 'Pastel · dịu dàng', values: { top: 8, topC: 10, bot: 6, botC: 8, shoes: 2, shoesC: 0, hat: 6, acc: 3, accentC: 1, pattern: 0, backdrop: 1, effect: 2, motion: 3 } },
  { name: 'Tết rực rỡ', note: 'Áo dài · sắc đỏ', values: { top: 3, topC: 0, bot: 0, botC: 6, shoes: 2, shoesC: 1, hat: 1, acc: 8, accentC: 0, pattern: 2, backdrop: 3, effect: 4, motion: 1 } },
  { name: 'Vũ trụ nhỏ', note: 'Hoodie · tím đêm', values: { top: 2, topC: 5, bot: 2, botC: 3, shoes: 5, shoesC: 1, hat: 0, acc: 4, accentC: 3, pattern: 2, backdrop: 4, effect: 3, motion: 2 } },
  { name: 'Vườn mùa hè', note: 'Bạc hà · năng động', values: { top: 9, topC: 12, bot: 1, botC: 6, shoes: 1, shoesC: 0, hat: 7, acc: 6, accentC: 4, pattern: 0, backdrop: 2, effect: 1, motion: 3 } },
  { name: 'Chiều ấm', note: 'Áo len · mật ong', values: { top: 8, topC: 13, bot: 0, botC: 10, shoes: 4, shoesC: 1, hat: 5, acc: 7, accentC: 0, pattern: 0, backdrop: 3, effect: 5, motion: 1 } },
];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function mountAvatar(el, ctx) {
  let a = getAvatar(), currentTab = 'looks', alive = true, paused = false, demoFace;
  let undo = [], redo = [], demoTimer, syncTimer, syncRunning = false;
  let revision = 0, synced = 0, localOK = true, syncError = false;
  const room = ctx.room, uid = ctx.me?.uid;
  const q = selector => el.querySelector(selector);
  el.innerHTML = `<section class="avatar-studio">
    <div class="bar"><a class="bk" href="#/">Quay lại</a><span class="av-eyebrow">GÓC PHỐI ĐỒ CỦA BẠN</span></div>
    <div class="av-heading"><div><h2>Studio avatar<span>Nhỏ xinh. Rất riêng.</span></h2><p>Một chút màu sắc, một chút cá tính.</p></div><span class="av-studio-spark" aria-hidden="true">✦</span></div>
    <div class="av-studio-preview">
      <div class="av-live"></div>
      <div class="av-preview-info"><span class="av-eyebrow">XEM TRƯỚC TRỰC TIẾP</span><div class="av-identity"></div><p class="av-outfit-name"></p>
        <div class="av-demo" aria-label="Thử biểu cảm"><button data-demo="1" title="Thử cười tươi">😊 Vui</button><button data-demo="5" title="Thử phản ứng khi nhột">😆 Nhột</button><button data-demo="4" title="Thử ngạc nhiên">😮 Ồ!</button></div>
        <button class="av-pause" data-a="pause" aria-pressed="false">Ⅱ Dừng xem trước</button>
        <small>Thử biểu cảm không đổi avatar đã lưu.</small>
      </div>
    </div>
    <div class="av-save-line"><span class="av-save-status" role="status" aria-live="polite"></span><button class="av-retry" data-a="retry" hidden>Lưu lại</button></div>
    <div class="av-toolbar"><button class="btn pri" data-a="random">🎲 Phối ngẫu nhiên</button><div><button class="btn" data-a="undo" aria-label="Hoàn tác">↶ Hoàn tác</button><button class="btn" data-a="redo" aria-label="Làm lại">↷</button></div></div>
    <div class="av-tabs" role="tablist" aria-label="Các mục chỉnh sửa">${TABS.map(([id, icon, title]) => `<button class="av-tab" role="tab" id="av-tab-${id}" aria-controls="av-options" data-tab="${id}"><span aria-hidden="true">${icon}</span> ${title}</button>`).join('')}</div>
    <div class="av-options" id="av-options" role="tabpanel"></div>
    <details class="av-share"><summary>Chia sẻ &amp; nhập avatar</summary><p>Sao chép mã để dùng lại trên máy khác hoặc gửi bạn bè.</p><button class="btn" data-a="copy">Sao chép mã avatar</button><div class="row"><input class="code-in" maxlength="8192" placeholder="Dán mã avatar vào đây" aria-label="Mã avatar" autocomplete="off" spellcheck="false"><button class="btn" data-a="import">Nhập mã</button></div></details>
    <button class="av-reset" data-a="reset">Khôi phục avatar mặc định</button>
  </section>`;

  function status() {
    if (!alive) return;
    q('.av-save-status').textContent = !localOK ? 'Chưa lưu được trên máy. Hãy thử lại trước khi rời trang.'
      : syncError ? 'Đã lưu trên máy · Chưa đồng bộ được vào phòng'
      : syncRunning || synced < revision && room ? 'Đã lưu trên máy · Đang đồng bộ…'
      : room ? '✓ Avatar đã được lưu' : '✓ Đã lưu trên máy · Tự đồng bộ khi vào phòng';
    q('.av-retry').hidden = localOK && !syncError;
  }

  async function flushSync() {
    clearTimeout(syncTimer);
    if (!room || !uid || !localOK || syncRunning || synced === revision) return;
    const sendingRevision = revision, snapshot = { ...a };
    syncRunning = true; status();
    try {
      // Pin the room and serialize requests so a slower old save cannot win.
      await room.set(`members/${uid}/avatar`, snapshot);
      synced = sendingRevision; syncError = false;
    } catch { syncError = true; }
    finally {
      syncRunning = false; status();
      if (revision > sendingRevision) void flushSync();
    }
  }

  function persist() {
    localOK = setAvatar(a); revision++; syncError = false;
    clearTimeout(syncTimer);
    if (localOK && room) syncTimer = setTimeout(() => void flushSync(), 300);
    status();
  }

  function apply(value) {
    const next = norm(value);
    if (same(a, next)) return;
    undo = [...undo, a].slice(-30); redo = []; a = next;
    demoFace = undefined; clearTimeout(demoTimer);
    persist(); render();
  }

  function preview() {
    q('.av-studio-preview').style.setProperty('--av-scene', BACKDROPS[a.backdrop]);
    q('.av-studio-preview').style.setProperty('--av-accent', ACCENTS[a.accentC]);
    q('.av-live').innerHTML = `${avatarSVG(a, 158, { crop: 'full', animate: !paused, overrideFace: demoFace })}<div class="av-floor"></div>`;
    q('.av-identity').innerHTML = `${avatarSVG(a, 44, { crop: 'head', animate: false })}<span>Ảnh đại diện<small>${OPT.face[a.face]}</small></span>`;
    q('.av-outfit-name').textContent = `${OPT.top[a.top]} · ${a.hat === 0 ? (a.gender ? OPT.hairF : OPT.hairM)[a.hair] : OPT.hat[a.hat]}`;
    q('[data-a="pause"]').textContent = paused ? '▶ Chạy xem trước' : 'Ⅱ Dừng xem trước';
    q('[data-a="pause"]').setAttribute('aria-pressed', String(paused));
  }

  function field(key, title, options, hint = '') {
    const colors = typeof options[0] === 'string' && options[0].startsWith('#');
    const head = ['hair', 'face', 'hat', 'acc'].includes(key);
    const thumbs = head || ['top', 'bot', 'shoes'].includes(key);
    return `<fieldset class="av-fieldset"><legend>${title}<small>${options.length} lựa chọn</small></legend>${hint ? `<p class="av-field-hint">${hint}</p>` : ''}
      <div class="${colors ? 'av-colors' : thumbs ? 'av-option-grid' : 'av-option-row'}">${options.map((value, i) => {
        const selected = a[key] === i;
        return colors ? `<button class="av-color ${selected ? 'selected' : ''}" style="--swatch:${value}" data-k="${key}" data-i="${i}" aria-label="${title} ${i + 1}, ${value}" aria-pressed="${selected}" title="${value}" ${key === 'shoesC' && a.shoes === 3 ? 'disabled' : ''}><span aria-hidden="true">${selected ? '✓' : ''}</span></button>`
          : `<button class="av-option ${selected ? 'selected' : ''}" data-k="${key}" data-i="${i}" aria-pressed="${selected}">${thumbs ? `<span class="av-option-art" aria-hidden="true">${avatarSVG({ ...a, [key]: i, effect: 0, motion: 0 }, head ? 48 : 40, { crop: head ? 'head' : 'full', animate: false })}</span>` : ''}<span>${value}</span>${selected ? '<i aria-hidden="true">✓</i>' : ''}</button>`;
      }).join('')}</div></fieldset>`;
  }

  function render() {
    if (!alive) return;
    preview(); status();
    q('[data-a="undo"]').disabled = !undo.length; q('[data-a="redo"]').disabled = !redo.length;
    el.querySelectorAll('[data-tab]').forEach(button => {
      const selected = button.dataset.tab === currentTab;
      button.classList.toggle('active', selected); button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    q('.av-options').setAttribute('aria-labelledby', `av-tab-${currentTab}`);
    let content = '';
    if (currentTab === 'looks') content = `<div class="av-section-title"><h3>Mặc đẹp trong một chạm</h3><p>Bộ phối thay trang phục và hiệu ứng, giữ nguyên gương mặt, màu da và kiểu tóc của bạn.</p></div><div class="av-look-grid">${LOOKS.map((look, i) => `<button class="av-look" data-look="${i}" style="--look-color:${BACKDROPS[look.values.backdrop]}"><span class="av-look-art" aria-hidden="true">${avatarSVG({ ...a, ...look.values }, 66, { crop: 'full', animate: false })}</span><b>${look.name}</b><small>${look.note}</small></button>`).join('')}</div>`;
    if (currentTab === 'body') content = field('gender', 'Phong cách nhân vật', OPT.gender) + field('weight', 'Vóc dáng', OPT.weight) + field('skin', 'Màu da', SKIN);
    if (currentTab === 'face') content = field('face', 'Hôm nay bạn thấy thế nào?', OPT.face) + field('hair', 'Kiểu tóc', a.gender ? OPT.hairF : OPT.hairM) + field('hairC', 'Màu tóc', HAIRC);
    if (currentTab === 'clothes') content = field('top', 'Chọn một chiếc áo', OPT.top) + field('topC', 'Màu áo', TOPC) + field('pattern', 'Họa tiết trên áo', OPT.pattern) + field('bot', 'Quần & váy', OPT.bot) + field('botC', 'Màu quần / váy', BOTC) + field('shoes', 'Giày dép', OPT.shoes) + field('shoesC', 'Màu giày', SHOESC, a.shoes === 3 ? 'Chọn một đôi giày để đổi màu.' : 'Màu giày độc lập với kiểu giày.');
    if (currentTab === 'acc') content = field('hat', 'Mũ & băng đô', OPT.hat) + field('acc', 'Thêm một điểm nhấn', OPT.acc) + field('accentC', 'Màu điểm nhấn', ACCENTS, 'Dùng cho phụ kiện mới, họa tiết và hiệu ứng.');
    if (currentTab === 'effects') content = field('effect', 'Không khí quanh bạn', OPT.effect) + field('motion', 'Chuyển động', OPT.motion) + field('accentC', 'Màu hiệu ứng', ACCENTS) + field('backdrop', 'Phông xem trước & ảnh đại diện', OPT.backdrop, 'Chuyển động tự tắt khi thiết bị bật giảm chuyển động.');
    q('.av-options').innerHTML = content;
  }

  el.onclick = async e => {
    const button = e.target.closest('button');
    if (!button || !el.contains(button) || button.disabled || !alive) return;
    const { tab, k, i, look, demo } = button.dataset, action = button.dataset.a;
    if (tab) { currentTab = tab; render(); return; }
    if (k) { apply({ ...a, [k]: Number(i) }); q(`[data-k="${k}"][data-i="${i}"]`)?.focus({ preventScroll: true }); return; }
    if (look != null) { apply({ ...a, ...LOOKS[Number(look)].values }); return; }
    if (demo != null) { clearTimeout(demoTimer); demoFace = Number(demo); preview(); demoTimer = setTimeout(() => { if (alive) { demoFace = undefined; preview(); } }, 1800); return; }
    if (action === 'pause') { paused = !paused; preview(); return; }
    if (action === 'random') return apply(randomAvatar());
    if (action === 'reset') return apply(DEFAULT);
    if (action === 'retry') { persist(); void flushSync(); return; }
    if (action === 'undo' && undo.length) { redo.push(a); a = undo.pop(); demoFace = undefined; persist(); render(); return; }
    if (action === 'redo' && redo.length) { undo.push(a); a = redo.pop(); demoFace = undefined; persist(); render(); return; }
    if (action === 'import') {
      const value = decode(q('.code-in').value);
      if (!value) return ctx.toast('Mã không hợp lệ. Hãy dán đầy đủ mã avatar đã sao chép.');
      apply(value); ctx.toast('Đã nhập avatar. Bạn có thể hoàn tác nếu muốn.'); return;
    }
    if (action === 'copy') {
      const code = encode(a);
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard');
        await navigator.clipboard.writeText(code); if (alive) ctx.toast('Đã sao chép mã avatar!');
      } catch {
        if (!alive) return;
        q('.av-share').open = true; q('.code-in').value = code; q('.code-in').focus(); q('.code-in').select();
        ctx.toast('Mã đã được chọn. Bạn có thể sao chép thủ công.');
      }
    }
  };
  el.onkeydown = e => {
    const button = e.target.closest('[data-tab]');
    if (!button || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const index = TABS.findIndex(([id]) => id === currentTab);
    currentTab = TABS[e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length][0];
    render(); q(`[data-tab="${currentTab}"]`).focus();
  };
  ctx.onLeave(() => { alive = false; clearTimeout(demoTimer); clearTimeout(syncTimer); void flushSync(); el.onclick = null; el.onkeydown = null; });
  render();
}
