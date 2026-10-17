import { games } from './games/registry.js';
import { names, setName } from './core/players.js';
import { session, createRoom, joinRoom, leaveRoom, rename, onChange, setNotify } from './core/room.js';
import { notifyCfg } from './core/notify.js';
import { esc } from './core/ui.js';
import { avatarSVG, getAvatar } from './core/avatar.js';

const item = (g, inRoom) => {
  const on = g.ready && (!g.room || inRoom), tag = on ? 'Chơi ngay' : g.ready ? 'Vào phòng trước' : 'Sắp ra mắt';
  const body = `<span class="ic">${g.icon}</span><div><b>${g.name}</b><span>${g.desc}</span></div><span class="tag">${tag}</span>`;
  return `<li>${on ? `<a class="g on" href="#/${g.id}">${body}</a>` : `<button class="g" disabled>${body}</button>`}</li>`;
};

export function renderHub(el, ctx) {
  el.innerHTML = `<section>
    <div class="sky" aria-hidden="true">
      <svg class="lamp" style="left:8%" width="46" height="84" viewBox="0 0 46 84"><use href="#l"/></svg>
      <svg class="lamp" style="left:70%;top:-30px" width="38" height="70" viewBox="0 0 46 84"><use href="#l"/></svg>
      <svg class="lamp" style="left:84%;top:10px" width="30" height="56" viewBox="0 0 46 84"><use href="#l"/></svg>
      <h1 class="brand">Babii chơii đii<small>Trò chơi nhỏ cho 2-5 người</small></h1>
    </div><div id="dyn"></div></section>`;
  const dyn = el.querySelector('#dyn');
  const draw = () => {
    const r = session.room, ps = r ? r.players() : [];
    dyn.innerHTML = `<div class="pl"><label><span class="dot d1"></span><input data-k="0" maxlength="14" aria-label="Tên của bạn" value="${esc(names[0])}"></label>${r ? '' : `<label><span class="dot d2"></span><input data-k="1" maxlength="14" aria-label="Tên người chơi 2 (chung máy)" value="${esc(names[1])}"></label>`}</div>
    <div class="panel">${r
      ? `<div class="row"><span>Phòng</span><span class="code">${r.code}</span></div><div class="chips">${ps.map(p => `<span class="chip">${avatarSVG(p.avatar, 26)} ${esc(p.name)}${p.uid === session.me.uid ? ' (bạn)' : ''}</span>`).join('')}</div><button class="btn" data-a="leave">Rời phòng</button>`
      : `<div class="row"><button class="btn pri" data-a="new">Tạo phòng</button><input id="code" maxlength="6" placeholder="Mã phòng" aria-label="Mã phòng" style="flex:1;min-width:110px"><button class="btn" data-a="join">Vào phòng</button></div><p class="err"></p>${session.mode === 'local' ? '<small>Chế độ thử (chưa cấu hình Firebase): mở 2 tab cùng trình duyệt để thử chơi từ xa.</small>' : ''}`}</div>
    <a class="panel row avrow" href="#/avatar">${avatarSVG(getAvatar(), 56)}<span><b>Avatar của bạn</b><br><small>Chạm để chọn áo dài, nón lá, tóc, phụ kiện...</small></span></a>
    <details class="panel"><summary>Thông báo "đến lượt bạn"</summary><label><input type="checkbox" data-n="on" ${notifyCfg.on ? 'checked' : ''}> Nhận thông báo qua ntfy</label><small>Cài app ntfy (Android, iPhone), bấm dấu +, nhập chủ đề riêng của bạn: <b>${notifyCfg.topic}</b>. Chủ đề này như mật khẩu, đừng chia sẻ. Thông báo do máy của người kia gửi khi họ vừa chơi xong.</small><a href="https://ntfy.sh/${notifyCfg.topic}" target="_blank" rel="noopener">Xem thông báo trên web</a></details>
    <h2>Chọn trò chơi</h2><ul class="gl">${games.map(g => item(g, !!r)).join('')}</ul>`;
  };
  dyn.onchange = e => {
    if (e.target.dataset.n === 'on') return setNotify(e.target.checked);
    const i = e.target.closest('.pl input'); if (!i) return;
    setName(+i.dataset.k, i.value); if (i.dataset.k === '0') rename();
  };
  dyn.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    try { if (a === 'new') await createRoom(); if (a === 'join') await joinRoom(dyn.querySelector('#code').value); if (a === 'leave') leaveRoom(); }
    catch (err) { const m = dyn.querySelector('.err'); if (m) m.textContent = err.message; }
  };
  ctx.onLeave(onChange(draw)); draw();
}
