import { openPano } from './pano.js';
import { panoPut, panoDel } from './idb.js';
import { esc } from '../../core/ui.js';

// Thu nhỏ ảnh về tối đa 4096 px ngang để điện thoại dựng được và nhẹ dung lượng
async function shrink(f) {
  const b = await createImageBitmap(f), k = Math.min(1, 4096 / b.width), c = document.createElement('canvas');
  c.width = b.width * k | 0; c.height = b.height * k | 0; c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return { blob: await new Promise(r => c.toBlob(r, 'image/jpeg', .85)), w: c.width, h: c.height };
}
// Trả về hàm dọn dẹp
export function mountManage(box, { places, repo, local, reload, toast }) {
  let cur = null, pv = null, url = null;
  box.innerHTML = `<div class="panel"><b>Quản lý cảnh 360°</b>
    <label>Điểm đến <select class="place">${Object.entries(places).map(([id, p]) => `<option value="${id}">${p.name}</option>`).join('')}</select></label>
    <label>Ảnh toàn cảnh <input type="file" class="file" accept="image/*"></label>
    <label>Góc ngang của ảnh (độ) <input type="number" class="haov" value="360" min="30" max="360"></label><small class="hint">Chọn ảnh 360° (tỉ lệ 2:1) hoặc ảnh panorama chụp bằng điện thoại.</small>
    <input class="credit" maxlength="80" placeholder="Tác giả / nguồn" aria-label="Tác giả"><input class="lic" maxlength="40" placeholder="Giấy phép (CC0, CC BY 4.0, tự chụp...)" aria-label="Giấy phép">
    <div class="pano pv"></div>
    <div class="row"><button class="btn pri" data-m="local">Dùng trên máy này</button><button class="btn" data-m="json">Chuẩn bị đưa vào repo</button></div>
    <pre class="out"></pre><p class="msg" role="status"></p></div>
    <div class="panel"><b>Cảnh 360° đang có</b><ul class="wish list"></ul></div>`;
  const q = s => box.querySelector(s), drop = () => { pv?.then(v => v.destroy()).catch(() => {}); pv = null; };
  const meta = () => { const haov = Math.min(360, Math.max(30, +q('.haov').value || 360));
    return { place: q('.place').value, haov, vaov: Math.min(180, Math.round(haov * cur.h / cur.w)), vOffset: 0, credit: q('.credit').value.trim(), license: q('.lic').value.trim() }; };
  const preview = () => { drop(); pv = openPano(q('.pv'), { url, ...meta() }); };
  const drawList = () => {
    const rows = [...Object.entries(repo()).map(([id, r]) => [id, r, 'repo']), ...Object.entries(local()).map(([id, r]) => [id, r, 'máy này'])];
    q('.list').innerHTML = rows.map(([id, r, src]) => `<li><b>${esc(places[id]?.name || id)}</b> (${src}) ${esc(r.credit || '')} ${src === 'máy này' ? `<button class="btn" data-del="${id}">Xóa</button>` : ''}</li>`).join('') || '<li>Chưa có cảnh 360° nào, đang dùng tranh minh họa.</li>';
  };
  q('.file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { cur = await shrink(f); } catch { return toast('Không đọc được ảnh này'); }
    if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(cur.blob);
    const full = Math.abs(cur.w / cur.h - 2) < .1; q('.haov').value = full ? 360 : 180;
    q('.hint').textContent = full ? 'Ảnh tỉ lệ 2:1, coi là 360° đầy đủ.' : 'Ảnh không phải 2:1: hãy nhập góc ngang thật của ảnh (panorama điện thoại thường 180-270 độ).';
    preview();
  };
  q('.haov').onchange = () => cur && preview();
  box.onclick = async e => {
    const m = e.target.closest('[data-m]')?.dataset.m, del = e.target.closest('[data-del]')?.dataset.del;
    if (del) { await panoDel(del).catch(() => {}); await reload(); return drawList(); }
    if (!m) return; if (!cur) return toast('Chọn ảnh trước đã');
    const x = meta();
    if (m === 'local') { try { await panoPut({ ...x, blob: cur.blob }); await reload(); drawList(); toast('Đã lưu trên máy này'); } catch { toast('Trình duyệt không cho lưu (chế độ riêng tư?)'); } }
    if (m === 'json') {
      const file = x.place + '.jpg', a = document.createElement('a'); a.href = url; a.download = file; a.click();
      q('.out').textContent = `"${x.place}": ${JSON.stringify({ file, haov: x.haov, vaov: x.vaov, credit: x.credit, license: x.license })}`;
      q('.msg').textContent = `Đã tải ${file}. Đặt file vào public/scenes/, dán dòng trên vào public/scenes/panos.json (các dòng cách nhau dấu phẩy), rồi push. Ảnh trong repo public ai cũng tải được: chỉ dùng ảnh phong cảnh và đúng giấy phép.`;
    }
  };
  drawList();
  return () => { drop(); if (url) URL.revokeObjectURL(url); };
}
