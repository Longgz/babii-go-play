// 9 điểm đến trải dài khắp Việt Nam. pos = vị trí trên bản đồ (khung 120x200).
// Tranh SVG vẽ bằng mã vector phẳng nhiều lớp phong cách Retro Travel Poster.
export const PLACES = {
  sapa:    { name: 'Sa Pa',     pos: [36, 14],  sky: ['#bfe0f0', '#f4e0b8'], art: 'terrace', desc: 'Đỉnh Fansipan hùng vĩ, ruộng bậc thang Mường Hoa', food: 'Thắng cố, cá hồi Na Hang' },
  hanoi:   { name: 'Hà Nội',    pos: [52, 26],  sky: ['#f9d8a8', '#ee9a74'], art: 'pagoda', desc: 'Hồ Gươm tháp Rùa, 36 phố phường rêu phong', food: 'Phở bò Hà Nội, bún chả' },
  halong:  { name: 'Hạ Long',   pos: [68, 24],  sky: ['#ffe3b0', '#7cc4d6'], art: 'karst', desc: 'Kỳ quan thiên nhiên vịnh đảo đá vôi ngút ngàn', food: 'Chả mực Hạ Long, sá sùng' },
  quangtri:{ name: 'Quảng Trị', pos: [64, 56],  sky: ['#93c5fd', '#fef08a'], art: 'quangtri', desc: 'Cầu Hiền Lương, sông Bến Hải vĩ tuyến 17 & Thành Cổ hào hùng', food: 'Bánh bột lọc, cháo bột Hải Lăng' },
  hue:     { name: 'Huế',       pos: [68, 70],  sky: ['#f3c7d0', '#c58aa8'], art: 'pagoda', desc: 'Đại Nội cổ kính, sông Hương êm đềm & chùa Thiên Mụ', food: 'Bún bò Huế, bánh nậm, chè hẻm' },
  hoian:   { name: 'Hội An',    pos: [78, 82],  sky: ['#2a2358', '#e0794a'], art: 'lanterns', sun: '#ffd9a0', desc: 'Phố cổ đèn lồng rực rỡ, sông Hoài hoa đăng lung linh', food: 'Cao lầu, bánh mì Phượng' },
  dalat:   { name: 'Đà Lạt',    pos: [72, 128], sky: ['#cfe3f5', '#f1d9e4'], art: 'pines', desc: 'Thành phố sương mù, rừng thông reo & ngàn hoa khoe sắc', food: 'Bánh tráng nướng, sữa đậu nành' },
  saigon:  { name: 'Sài Gòn',   pos: [56, 150], sky: ['#1d2c58', '#e6853f'], art: 'skyline', sun: '#ffe2b0', desc: 'Hòn ngọc Viễn Đông sôi động, Nhà thờ Đức Bà, Bến Bạch Đằng', food: 'Cơm tấm sườn bì, cà phê vợt' },
  phuquoc: { name: 'Phú Quốc',  pos: [22, 160], sky: ['#9fe0f2', '#fff1c1'], art: 'palm', desc: 'Đảo Ngọc biển xanh cát trắng, hoàng hôn Bãi Sao đẹp nao lòng', food: 'Gỏi cá trích, bún quậy Kiến Xây' }
};

// Mạng lưới đường đi kết nối các tỉnh thành dọc theo chiều dài đất nước
export const EDGES = [
  ['sapa', 'hanoi', 1],
  ['hanoi', 'halong', 1],
  ['hanoi', 'quangtri', 2],
  ['quangtri', 'hue', 1],
  ['hue', 'hoian', 1],
  ['hoian', 'dalat', 2],
  ['dalat', 'saigon', 2],
  ['hoian', 'saigon', 3],
  ['saigon', 'phuquoc', 1]
];

const rnd = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const ridge = (y, amp, n, fill, seed) => {
  const r = rnd(seed);
  let d = `M0 500V${y}`;
  for (let i = 0; i <= n; i++) d += `L${i * 800 / n} ${y - r() * amp}`;
  return `<path d="${d}V500Z" fill="${fill}"/>`;
};

const lamp = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M23 0v14" stroke="#c9b27a" stroke-width="2"/>
  <ellipse cx="23" cy="20" rx="12" ry="5" fill="#8f2a2a"/>
  <path d="M11 20c-6 14-6 30 0 44h24c6-14 6-30 0-44z" fill="#e0483c"/>
  <ellipse cx="23" cy="64" rx="12" ry="5" fill="#8f2a2a"/>
</g>`;

const ART = {
  pagoda: () => ridge(380, 60, 8, '#3f6b57', 3) + `<rect y="400" width="800" height="100" fill="#6aa7b8"/>
    <g fill="#3b2a2a">
      <rect x="360" y="270" width="80" height="120"/>
      <path d="M335 275L400 235L465 275Z"/>
      <path d="M350 235L400 195L450 235Z"/>
    </g>`,
  karst: () => `<rect y="360" width="800" height="140" fill="#2b8c9e"/>` + [80, 230, 380, 540, 670].map((x, i) => `<path d="M${x} 380Q${x + 30} ${170 + i * 25} ${x + 90} 380Z" fill="${i % 2 ? '#5b8a7a' : '#3f6f62'}"/>`).join(''),
  terrace: () => ridge(300, 90, 7, '#4f7f5a', 5) + ['#8bb35a', '#6f9c4f', '#5b8a45', '#4a7a3b', '#3c6a30'].map((c, i) => `<path d="M0 ${340 + i * 32}Q400 ${300 + i * 32} 800 ${340 + i * 32}V500H0Z" fill="${c}"/>`).join(''),
  quangtri: () => `
    <!-- Dãy núi Trường Sơn phía xa -->
    ${ridge(340, 70, 7, '#334155', 4)}
    <!-- Dòng sông Bến Hải hiền hòa -->
    <rect y="380" width="800" height="120" fill="#0284c7"/>
    <path d="M0 430 Q400 390 800 420 L800 500 L0 500 Z" fill="#0369a1"/>
    <!-- Hai bờ cỏ xanh tươi -->
    <path d="M0 450 Q300 430 800 460 L800 500 L0 500 Z" fill="#15803d"/>
    <!-- Cầu Hiền Lương lịch sử 2 màu sơn Xanh - Vàng biểu tượng -->
    <g id="cau-hien-luong">
      <!-- Trụ cầu -->
      <rect x="220" y="330" width="22" height="110" fill="#64748b"/>
      <rect x="390" y="330" width="20" height="110" fill="#475569"/>
      <rect x="560" y="330" width="22" height="110" fill="#64748b"/>
      <!-- Nửa cầu bờ Bắc (Màu xanh hòa bình) -->
      <path d="M100 340 L400 340 L400 354 L100 354 Z" fill="#2563eb"/>
      <path d="M100 310 L400 310" stroke="#1d4ed8" stroke-width="5"/>
      <!-- Nửa cầu bờ Nam (Màu vàng đất mẹ) -->
      <path d="M400 340 L700 340 L700 354 L400 354 Z" fill="#eab308"/>
      <path d="M400 310 L700 310" stroke="#ca8a04" stroke-width="5"/>
      <!-- Vạch phân chia lịch sử tại nhịp giữa -->
      <line x1="400" y1="300" x2="400" y2="360" stroke="#ffffff" stroke-width="3.5"/>
      <!-- Khung thép giàn cầu -->
      <path d="M100 340 L160 310 L220 340 L280 310 L340 340 L400 310 L460 340 L520 310 L580 340 L640 310 L700 340" stroke="#ffffff" stroke-width="3" fill="none"/>
    </g>
    <!-- Cột cờ Hiền Lương & Cờ đỏ sao vàng tung bay -->
    <g transform="translate(180, 140)">
      <!-- Kỳ đài -->
      <rect x="18" y="90" width="24" height="110" fill="#cbd5e1"/>
      <polygon points="12,200 48,200 40,90 20,90" fill="#94a3b8"/>
      <line x1="30" y1="20" x2="30" y2="90" stroke="#e2e8f0" stroke-width="4"/>
      <!-- Lá cờ Tổ quốc -->
      <rect x="30" y="22" width="75" height="50" fill="#dc2626" rx="2"/>
      <!-- Ngôi sao vàng năm cánh -->
      <polygon points="67,35 71,46 82,46 73,53 76,64 67,58 58,64 61,53 52,46 63,46" fill="#facc15"/>
    </g>
    <!-- Đài tưởng niệm Khát vọng Thống nhất -->
    <path d="M680 370 L700 280 L720 370 Z" fill="#94a3b8"/>
  `,
  lanterns: () => `<rect y="380" width="800" height="120" fill="#3a5a6a"/>
    <rect x="120" y="260" width="560" height="130" fill="#e3b252"/>
    <rect x="120" y="250" width="560" height="14" fill="#8f4a2a"/>` + [0, 1, 2, 3, 4, 5, 6].map(i => lamp(110 + i * 95, 60 + (i % 2) * 30, .9)).join(''),
  pines: () => ridge(340, 80, 6, '#6a7fa8', 7) + [60, 160, 260, 380, 500, 610, 720].map((x, i) => {
    const h = 120 + i % 3 * 30;
    return `<path d="M${x} 440L${x + 40} ${440 - h}L${x + 80} 440Z" fill="#2f5d3f"/><path d="M${x + 8} ${440 - h * .5}L${x + 40} ${440 - h * 1.25}L${x + 72} ${440 - h * .5}Z" fill="#3c7550"/>`;
  }).join('') + `<rect y="440" width="800" height="60" fill="#2a4a33"/>`,
  skyline: () => ridge(420, 30, 10, '#2a3560', 9) + [40, 130, 215, 300, 470, 560, 650, 730].map((x, i) => `<rect x="${x}" y="${250 - i % 3 * 40}" width="70" height="${250 + i % 3 * 40}" fill="${i % 2 ? '#3a4a82' : '#2f3c70'}"/>`).join('') + `<rect x="385" y="120" width="40" height="380" fill="#4a5c9a"/><path d="M390 120L405 60L420 120Z" fill="#4a5c9a"/>`,
  palm: () => `<rect y="330" width="800" height="170" fill="#2fb3c8"/>
    <path d="M0 420Q400 380 800 430V500H0Z" fill="#efdca6"/>
    <path d="M560 440Q580 330 540 220" stroke="#6b4a2a" stroke-width="14" fill="none"/>` + [[-80, -40], [-40, -70], [10, -70], [60, -30], [0, -20]].map(([dx, dy]) => `<path d="M540 220Q${540 + dx} ${180 + dy} ${540 + dx * 1.8} ${250 + dy * .2}" stroke="#2f8a4a" stroke-width="16" fill="none" stroke-linecap="round"/>`).join('')
};

export function sceneInner(id) {
  const p = PLACES[id] || PLACES.hanoi;
  return `<defs>
    <linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.sky[0]}"/>
      <stop offset="100%" stop-color="${p.sky[1]}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sk-${id})"/>
  <circle cx="640" cy="110" r="46" fill="${p.sun || '#fff3c4'}" opacity=".9"/>
  ${ART[p.art] ? ART[p.art]() : ART.pagoda()}`;
}

export const sceneSVG = id => `<svg viewBox="0 0 800 500" role="img" aria-label="Cảnh ${(PLACES[id] || PLACES.hanoi).name}">${sceneInner(id)}</svg>`;
