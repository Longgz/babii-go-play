import { sceneInner, PLACES } from './scenes.js';
import { avatarInner } from '../../core/avatar.js';
import { esc } from '../../core/ui.js';

// Bưu thiếp du lịch Polaroid kỷ niệm chân thực với toàn thân nhân vật, con tem bưu điện và con dấu
export function photoSVG(r) {
  const w = r.who?.length ? Object.values(r.who) : [];
  const n = w.length || 1;
  const place = PLACES[r.scene] || PLACES.hanoi;
  const name = place.name;
  const dateStr = r.at ? new Date(r.at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');

  // Các nhân vật đứng cùng nhau trong khung hình
  const av = w.map((p, i) => {
    const x = 400 + (i - (n - 1) / 2) * 135;
    return `
      <!-- Nhân vật toàn thân đứng trên phong cảnh -->
      <svg x="${x - 55}" y="275" width="110" height="176" viewBox="0 0 100 160" filter="drop-shadow(0 4px 10px rgba(0,0,0,0.5))">
        ${avatarInner(p.a)}
      </svg>
      <!-- Tên người chơi -->
      <text x="${x}" y="468" text-anchor="middle" font-size="15" font-weight="800" fill="#ffffff" stroke="#00000088" stroke-width="3" paint-order="stroke" font-family="'Be Vietnam Pro', sans-serif">
        ${esc((p.n || '').slice(0, 12))}
      </text>
    `;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 580" role="img" aria-label="Bưu thiếp kỷ niệm tại ${name}">
      <!-- Viền khung ảnh Polaroid dày thanh lịch -->
      <rect width="800" height="580" rx="14" fill="${r.frame || '#c23b32'}"/>
      <!-- Nền giấy ảnh bên trong -->
      <rect x="18" y="18" width="764" height="470" rx="10" fill="#0f172a"/>
      <!-- Cảnh quan thiên nhiên / di tích lịch sử -->
      <svg x="18" y="18" width="764" height="470" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" rx="10">
        ${sceneInner(r.scene)}
      </svg>
      <!-- Nhân vật đứng chụp hình -->
      ${av}

      <!-- Con tem Bưu chính Việt Nam cổ điển ở góc trên phải -->
      <g transform="translate(675, 32)">
        <rect x="0" y="0" width="85" height="100" fill="#fff" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3"/>
        <rect x="4" y="4" width="77" height="92" fill="#e2e8f0"/>
        <text x="42" y="22" text-anchor="middle" font-size="8" font-weight="900" fill="#dc2626" font-family="'Be Vietnam Pro', sans-serif" letter-spacing="0.5">VIỆT NAM</text>
        <circle cx="42" cy="50" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <text x="42" y="55" text-anchor="middle" font-size="18">🇻🇳</text>
        <text x="42" y="86" text-anchor="middle" font-size="9" font-weight="800" fill="#0369a1" font-family="'Be Vietnam Pro', sans-serif">BƯU CHÍNH</text>
      </g>

      <!-- Dấu mộc đóng bưu điện (Postmark stamp) -->
      <g transform="translate(635, 75) rotate(-15)">
        <circle cx="45" cy="45" r="32" fill="none" stroke="#dc2626bb" stroke-width="2.5"/>
        <circle cx="45" cy="45" r="28" fill="none" stroke="#dc262688" stroke-width="1"/>
        <text x="45" y="32" text-anchor="middle" font-size="7.5" font-weight="800" fill="#dc2626bb" font-family="'Be Vietnam Pro', sans-serif">★ ${name.toUpperCase()} ★</text>
        <line x1="22" y1="45" x2="68" y2="45" stroke="#dc2626bb" stroke-width="1.5"/>
        <text x="45" y="43" text-anchor="middle" font-size="8.5" font-weight="900" fill="#dc2626" font-family="'Be Vietnam Pro', sans-serif">${dateStr}</text>
        <text x="45" y="62" text-anchor="middle" font-size="7" font-weight="700" fill="#dc2626bb" font-family="'Be Vietnam Pro', sans-serif">CHECK-IN</text>
      </g>

      <!-- Sticker cảm xúc trang trí -->
      <text x="42" y="92" font-size="64" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.4))">${r.sticker || '✨'}</text>

      <!-- Dòng chú thích kỷ niệm dưới đáy khung ảnh Polaroid -->
      <text x="400" y="542" text-anchor="middle" font-size="24" font-weight="800" fill="#ffffff" font-family="'Be Vietnam Pro', sans-serif" letter-spacing="0.5">
        ${esc(r.caption || `${name} — Kỷ niệm ngọt ngào`)}
      </text>
      <!-- Ngày tháng chụp ảnh -->
      <text x="760" y="562" text-anchor="end" font-size="13" font-weight="600" fill="#ffffffaa" font-family="'Be Vietnam Pro', sans-serif">
        ${dateStr}
      </text>
    </svg>
  `;
}

export function download(r) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1160;
    c.getContext('2d').drawImage(img, 0, 0, 1600, 1160);
    c.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `babii-du-lich-${r.scene}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(photoSVG(r));
}
