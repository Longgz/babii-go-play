import { PLACES, EDGES } from './scenes.js';

export const COLORS = ['#e8665d', '#5d7fc7', '#6bbf8a', '#e0b04a', '#a07be0'];

// Đường viền địa lý dải đất hình chữ S của Việt Nam
const VN_MAINLAND = `
  M 28 14
  Q 38 6, 52 7
  Q 68 8, 80 18
  Q 76 26, 70 30
  Q 64 34, 58 42
  Q 56 50, 62 58
  Q 66 64, 70 72
  Q 74 78, 80 84
  Q 86 96, 88 108
  Q 90 118, 88 126
  Q 84 136, 78 144
  Q 72 152, 62 158
  Q 52 164, 42 170
  Q 32 176, 26 172
  Q 28 162, 34 154
  Q 32 144, 38 134
  Q 44 116, 46 98
  Q 42 82, 36 64
  Q 26 48, 22 36
  Q 20 24, 28 14 Z
`;

// marks: [{place, k}] vị trí từng người; reach: {điểm: số bước} các điểm đi tới được; here: điểm hiện tại
export function mapSVG({ marks = [], reach = {}, mini = false, here } = {}) {
  // Đường nối các địa danh
  const lines = EDGES.map(([a, b, c]) => {
    const A = PLACES[a]?.pos || [50, 50], B = PLACES[b]?.pos || [50, 50];
    return `
      <line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#f4b942" stroke-width="${mini ? '0.6' : '0.9'}" stroke-dasharray="2 1.5" opacity="0.75"/>
      ${mini ? '' : `<circle cx="${(A[0] + B[0]) / 2}" cy="${(A[1] + B[1]) / 2}" r="2.8" fill="#1e293b" stroke="#f4b942" stroke-width="0.5"/><text x="${(A[0] + B[0]) / 2}" y="${(A[1] + B[1]) / 2 + 1.2}" font-size="3.2" font-weight="900" fill="#fcd34d" text-anchor="middle">${c}</text>`}
    `;
  }).join('');

  // Các điểm mốc tỉnh thành trên bản đồ
  const dots = Object.entries(PLACES).map(([id, p]) => {
    const go = reach[id] != null && !mini;
    const isCurrent = id === here;
    return `
      <g class="${go ? 'go' : ''}" ${go ? `data-go="${id}" tabindex="0" role="button" aria-label="Đi tới ${p.name}"` : ''}>
        <!-- Vòng hào quang nhấp nháy cho điểm có thể đi tới -->
        ${go ? `<circle cx="${p.pos[0]}" cy="${p.pos[1]}" r="6" fill="#f4b942" opacity="0.3" class="map-pulse"/>` : ''}
        ${isCurrent ? `<circle cx="${p.pos[0]}" cy="${p.pos[1]}" r="${mini ? '3.8' : '5'}" fill="#f4b942" opacity="0.45"/>` : ''}
        <circle cx="${p.pos[0]}" cy="${p.pos[1]}" r="${mini ? 2.2 : 3.4}" fill="${isCurrent ? '#f59e0b' : go ? '#22c55e' : '#ffffff'}" stroke="#1e293b" stroke-width="0.8"/>
        ${mini ? '' : `
          <!-- Tên địa danh -->
          <text x="${p.pos[0] + 5}" y="${p.pos[1] + 1.4}" font-size="4.2" font-weight="700" fill="#ffffff" filter="drop-shadow(0 1px 2px #000)">${p.name}</text>
        `}
      </g>
    `;
  }).join('');

  // Vị trí của người chơi
  const who = marks.map(m => {
    const p = PLACES[m.place]?.pos || [50, 50];
    return `<circle cx="${p[0] - m.k * 3.5 + 5}" cy="${p[1] - 5}" r="${mini ? 2 : 2.8}" fill="${COLORS[m.k % 5]}" stroke="#ffffff" stroke-width="0.8" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.6))"/>`;
  }).join('');

  // Quần đảo Hoàng Sa & Trường Sa và các đảo biển
  const seaAndIslands = `
    <!-- Biển Đông Việt Nam -->
    ${mini ? '' : `<text x="86" y="104" font-size="4.8" font-weight="900" fill="#38bdf8" opacity="0.4" letter-spacing="1.5" text-anchor="middle">BIỂN ĐÔNG</text>`}

    <!-- Đảo Phú Quốc (Kiên Giang) -->
    <g id="dao-phu-quoc">
      <ellipse cx="19" cy="160" rx="3.5" ry="6" transform="rotate(-15 19 160)" fill="#3b82f6" stroke="#93c5fd" stroke-width="0.8"/>
      ${mini ? '' : `<text x="14" y="170" font-size="2.6" fill="#bfdbfe" font-weight="600">Phú Quốc</text>`}
    </g>

    <!-- Côn Đảo (Bà Rịa - Vũng Tàu) -->
    <g id="con-dao">
      <ellipse cx="60" cy="176" rx="2.5" ry="1.6" transform="rotate(35 60 176)" fill="#3b82f6" stroke="#93c5fd" stroke-width="0.6"/>
      ${mini ? '' : `<text x="56" y="182" font-size="2.4" fill="#bfdbfe">Côn Đảo</text>`}
    </g>

    <!-- Quần đảo Hoàng Sa (Đà Nẵng, Việt Nam) -->
    <g id="quan-dao-hoang-sa">
      ${mini ? '' : `<rect x="91" y="60" width="36" height="26" rx="3" fill="#1e293b" fill-opacity="0.3" stroke="#f59e0b" stroke-width="0.5" stroke-dasharray="1.5 1.5"/>`}
      <!-- Các đảo Hoàng Sa, Phú Lâm, Tri Tôn, Cây... -->
      <circle cx="97" cy="69" r="1.4" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="102" cy="67" r="1.6" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="107" cy="72" r="1.3" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="101" cy="75" r="1.5" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="111" cy="69" r="1.2" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="96" cy="77" r="1.3" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      ${mini ? `
        <text x="104" y="82" font-size="2.6" font-weight="700" fill="#fef08a" text-anchor="middle">Hoàng Sa</text>
      ` : `
        <text x="109" y="64" font-size="3.5" font-weight="800" fill="#fef08a" text-anchor="middle">QĐ. HOÀNG SA</text>
        <text x="109" y="84" font-size="2.6" font-weight="600" fill="#93c5fd" text-anchor="middle">(Việt Nam)</text>
      `}
    </g>

    <!-- Quần đảo Trường Sa (Khánh Hòa, Việt Nam) -->
    <g id="quan-dao-truong-sa">
      ${mini ? '' : `<rect x="91" y="118" width="40" height="38" rx="3" fill="#1e293b" fill-opacity="0.3" stroke="#f59e0b" stroke-width="0.5" stroke-dasharray="1.5 1.5"/>`}
      <!-- Các đảo Song Tử Tây, Nam Yết, Sinh Tồn, Trường Sa Lớn, Đá Tây... -->
      <circle cx="98" cy="126" r="1.5" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="106" cy="129" r="1.7" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="114" cy="126" r="1.4" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="102" cy="135" r="1.8" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="110" cy="137" r="1.5" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="118" cy="133" r="1.3" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="105" cy="145" r="1.6" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      <circle cx="112" cy="148" r="1.4" fill="#facc15" stroke="#1e293b" stroke-width="0.4"/>
      ${mini ? `
        <text x="108" y="154" font-size="2.6" font-weight="700" fill="#fef08a" text-anchor="middle">Trường Sa</text>
      ` : `
        <text x="111" y="123" font-size="3.5" font-weight="800" fill="#fef08a" text-anchor="middle">QĐ. TRƯỜNG SA</text>
        <text x="111" y="153" font-size="2.6" font-weight="600" fill="#93c5fd" text-anchor="middle">(Việt Nam)</text>
      `}
    </g>
  `;

  return `
    <svg class="map ${mini ? 'mini-map' : 'full-map'}" viewBox="0 0 135 200" role="img" aria-label="Bản đồ Việt Nam">
      <!-- Nền biển xanh êm đềm -->
      <rect width="135" height="200" fill="#0f172a" fill-opacity="0.35" rx="14"/>

      <!-- Quần đảo Hoàng Sa & Trường Sa -->
      ${seaAndIslands}

      <!-- Dải đất liền hình chữ S thiêng liêng của Việt Nam -->
      <path d="${VN_MAINLAND}" fill="#1e3a8a" stroke="#60a5fa" stroke-width="${mini ? '0.8' : '1.2'}" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"/>

      <!-- Mạng lưới giao thông và các địa danh -->
      ${lines}
      ${dots}
      ${who}
    </svg>
  `;
}
