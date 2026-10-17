import { getAvatar, setAvatar, randomAvatar, avatarSVG, OPT, SKIN, HAIRC, TOPC, encode, decode } from './core/avatar.js';
import { syncAvatar } from './core/room.js';

const GROUPS = [['skin', 'Màu da', SKIN], ['hair', 'Kiểu tóc', OPT.hair], ['hairC', 'Màu tóc', HAIRC], ['top', 'Trang phục', OPT.top], ['topC', 'Màu áo', TOPC], ['hat', 'Mũ, khăn', OPT.hat], ['acc', 'Phụ kiện', OPT.acc], ['face', 'Biểu cảm', OPT.face]];
export function mountAvatar(el, ctx) {
  let a = getAvatar();
  el.innerHTML = `<section><div class="bar"><a class="bk" href="#/">Quay lại</a></div><h2>Avatar của bạn</h2><div class="avprev"></div><div class="opts"></div>
    <div class="row"><button class="btn" data-a="rnd">Ngẫu nhiên</button><button class="btn" data-a="copy">Sao chép mã avatar</button></div>
    <div class="row panel"><input class="code-in" placeholder="Dán mã avatar từ máy khác" aria-label="Mã avatar"><button class="btn" data-a="imp">Nhập mã</button></div></section>`;
  const q = s => el.querySelector(s), save = () => { setAvatar(a); syncAvatar(); render(); };
  function render() {
    q('.avprev').innerHTML = avatarSVG(a, 150);
    q('.opts').innerHTML = GROUPS.map(([k, t, arr]) => `<fieldset><legend>${t}</legend><div class="row">${arr.map((v, i) => String(v).startsWith('#')
      ? `<button class="sw ${a[k] === i ? 'on' : ''}" style="background:${v}" data-k="${k}" data-i="${i}" aria-label="${t} ${i + 1}"></button>`
      : `<button class="opt ${a[k] === i ? 'on' : ''}" data-k="${k}" data-i="${i}">${avatarSVG({ ...a, [k]: i }, 44)}<small>${v}</small></button>`).join('')}</div></fieldset>`).join('');
  }
  el.onclick = e => {
    const b = e.target.closest('[data-k],[data-a]'); if (!b) return;
    if (b.dataset.k) { a = { ...a, [b.dataset.k]: +b.dataset.i }; return save(); }
    if (b.dataset.a === 'rnd') { a = randomAvatar(); save(); }
    if (b.dataset.a === 'copy') { navigator.clipboard?.writeText(encode(a)).then(() => ctx.toast('Đã sao chép mã avatar'), () => ctx.toast('Không sao chép được')); }
    if (b.dataset.a === 'imp') { const d = decode(q('.code-in').value); if (!d) return ctx.toast('Mã không hợp lệ'); a = d; save(); ctx.toast('Đã nhập avatar'); }
  };
  render();
}
