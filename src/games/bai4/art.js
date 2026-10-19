// Thiết kế lá bài phong cách Uno chính thống bằng SVG vector sắc nét
export const COL = {
  R: '#E52521', // Đỏ son rực rỡ
  Y: '#F8B600', // Vàng nghệ tươi
  B: '#0066D6', // Xanh hoàng gia
  G: '#2BA84A'  // Xanh lục tươi
};

const NAME = { R: 'Đỏ', Y: 'Vàng', B: 'Xanh dương', G: 'Xanh lá' };

// SVG định nghĩa các biểu tượng đặc trưng Uno
function getSymbolSVG(type, col, size = 52) {
  if (type === 'S') {
    // Biểu tượng Chặn (Skip): Vòng tròn gạch chéo chuẩn Uno
    return `<g transform="translate(50,73) rotate(-28)">
      <circle r="22" fill="none" stroke="${col}" stroke-width="6.5"/>
      <line x1="-15.5" y1="-15.5" x2="15.5" y2="15.5" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/>
    </g>`;
  }
  if (type === 'V') {
    // Biểu tượng Đổi chiều (Reverse): 2 mũi tên cong uốn lượn ngược chiều chuẩn Uno
    return `<g transform="translate(50,73) rotate(-28)">
      <!-- Mũi tên trên (vòng sang trái) -->
      <path d="M-18,-6 C-18,-18 12,-18 18,-6 L18,-14 L24,-4 L12,-2 L14,-7 C8,-14 -12,-14 -12,-6 Z" fill="${col}"/>
      <!-- Mũi tên dưới (vòng sang phải) -->
      <path d="M18,6 C18,18 -12,18 -18,6 L-18,14 L-24,4 L-12,2 L-14,7 C-8,14 12,14 12,6 Z" fill="${col}"/>
    </g>`;
  }
  if (type === 'D') {
    // Biểu tượng +2: Chữ +2 đậm nghiêng và 2 thẻ bài con lồng nhau
    return `<g transform="translate(50,73) rotate(-28)">
      <rect x="-20" y="-18" width="16" height="24" rx="3" fill="#fff" stroke="${col}" stroke-width="2.5" transform="rotate(-12 -12 -6)"/>
      <rect x="-8" y="-14" width="16" height="24" rx="3" fill="${col}" stroke="#fff" stroke-width="2" transform="rotate(10 0 -2)"/>
      <text x="14" y="14" text-anchor="middle" font-size="28" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" fill="${col}">+2</text>
    </g>`;
  }
  // Số 0-9
  const is6or9 = type === '6' || type === '9';
  return `<g transform="translate(50,73) rotate(-28)">
    <text x="0" y="19" text-anchor="middle" font-size="${size}" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" fill="${col}" stroke="#111" stroke-width="1.5" paint-order="stroke fill">${type}</text>
    ${is6or9 ? `<line x1="-12" y1="24" x2="12" y2="24" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
  </g>`;
}

// Biểu tượng nhỏ ở góc
function getCornerSymbol(type, size = 15) {
  if (type === 'S') return '⊘';
  if (type === 'V') return '⇄';
  if (type === 'D') return '+2';
  if (type === 'W') return '★';
  if (type === 'F') return '+4';
  return type;
}

export function cardSVG(code, w = 64) {
  const h = Math.round(w * 1.46);
  const wild = code === 'W' || code === 'F';
  const c = code[0];
  const v = wild ? code : code[1];
  const cCol = wild ? '#1A1A22' : COL[c];
  const cornerLabel = getCornerSymbol(v);
  const is6or9 = v === '6' || v === '9';

  // Khung giữa lá bài
  let centerContent = '';
  if (v === 'W') {
    // Lá đổi màu: Oval chia 4 múi màu rực rỡ chuẩn Uno
    centerContent = `
      <g transform="translate(50,73) rotate(-28)">
        <ellipse cx="0" cy="0" rx="27" ry="43" fill="#111" />
        <clipPath id="ovalClip-${w}-${code}">
          <ellipse cx="0" cy="0" rx="26" ry="42" />
        </clipPath>
        <g clip-path="url(#ovalClip-${w}-${code})">
          <!-- 4 góc 4 màu: Đỏ, Vàng, Xanh lam, Xanh lục -->
          <path d="M-30,-50 L30,-50 L30,0 L-30,0 Z" fill="${COL.R}"/>
          <path d="M0,-50 L30,-50 L30,50 L0,50 Z" fill="${COL.Y}"/>
          <path d="M-30,0 L30,0 L30,50 L-30,50 Z" fill="${COL.G}"/>
          <path d="M-30,-50 L0,-50 L0,50 L-30,50 Z" fill="${COL.B}"/>
        </g>
        <ellipse cx="0" cy="0" rx="10" ry="16" fill="#fff" opacity="0.95"/>
        <text x="0" y="6" text-anchor="middle" font-size="14" font-family="'Arial Black', sans-serif" font-weight="900" fill="#111">WILD</text>
      </g>`;
  } else if (v === 'F') {
    // Lá +4 (Wild Draw Four): 4 lá bài con xòe quạt và chữ +4 nổi bật
    centerContent = `
      <g transform="translate(50,73) rotate(-28)">
        <ellipse cx="0" cy="0" rx="27" ry="43" fill="#111" />
        <rect x="-18" y="-24" width="14" height="22" rx="2.5" fill="${COL.B}" stroke="#fff" stroke-width="1.5" transform="rotate(-30 -11 -13)"/>
        <rect x="-6" y="-26" width="14" height="22" rx="2.5" fill="${COL.G}" stroke="#fff" stroke-width="1.5" transform="rotate(-10 1 -15)"/>
        <rect x="4" y="-23" width="14" height="22" rx="2.5" fill="${COL.R}" stroke="#fff" stroke-width="1.5" transform="rotate(12 11 -12)"/>
        <rect x="10" y="-16" width="14" height="22" rx="2.5" fill="${COL.Y}" stroke="#fff" stroke-width="1.5" transform="rotate(32 17 -5)"/>
        <ellipse cx="0" cy="12" rx="18" ry="14" fill="#111" opacity="0.8"/>
        <text x="0" y="20" text-anchor="middle" font-size="28" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" fill="#fff" stroke="#111" stroke-width="2" paint-order="stroke fill">+4</text>
      </g>`;
  } else {
    // Lá thường: Oval trắng nghiêng và biểu tượng/số màu bên trong
    centerContent = `
      <ellipse cx="50" cy="73" rx="28" ry="44" transform="rotate(-28 50 73)" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
      ${getSymbolSVG(v, cCol)}`;
  }

  // Góc trên-trái và góc dưới-phải (xoay 180 độ)
  const cornerClass = wild ? 'fill="#f4b942"' : 'fill="#ffffff"';
  const cornerSVG = `
    <!-- Góc trên trái -->
    <g transform="translate(12, 22)">
      <text x="0" y="0" font-size="${cornerLabel.length > 1 ? 13 : 16}" font-weight="900" font-family="'Arial Black', Impact, sans-serif" font-style="italic" ${cornerClass} stroke="#000" stroke-width="1" paint-order="stroke fill" text-anchor="start">${cornerLabel}</text>
      ${is6or9 ? '<line x1="0" y1="3" x2="10" y2="3" stroke="#fff" stroke-width="2"/>' : ''}
    </g>
    <!-- Góc dưới phải (lộn ngược) -->
    <g transform="translate(88, 124) rotate(180)">
      <text x="0" y="0" font-size="${cornerLabel.length > 1 ? 13 : 16}" font-weight="900" font-family="'Arial Black', Impact, sans-serif" font-style="italic" ${cornerClass} stroke="#000" stroke-width="1" paint-order="stroke fill" text-anchor="start">${cornerLabel}</text>
      ${is6or9 ? '<line x1="0" y1="3" x2="10" y2="3" stroke="#fff" stroke-width="2"/>' : ''}
    </g>
  `;

  return `<svg class="card uno-card" width="${w}" height="${h}" viewBox="0 0 100 146" role="img" aria-label="Lá ${wild ? (v === 'W' ? 'Đổi màu' : 'Đổi màu rút 4') : (NAME[c] || '') + ' ' + v}">
    <defs>
      <linearGradient id="g-${c}-${w}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${cCol}" />
        <stop offset="100%" stop-color="${wild ? '#0a0a0f' : cCol}" stop-opacity="0.88" />
      </linearGradient>
    </defs>
    <!-- Viền trắng ngoài cùng -->
    <rect width="100" height="146" rx="9" fill="#ffffff" stroke="#ddd" stroke-width="1"/>
    <!-- Nền màu lá bài -->
    <rect x="4" y="4" width="92" height="138" rx="7" fill="url(#g-${c}-${w})"/>
    <rect x="5" y="5" width="90" height="136" rx="6" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
    ${centerContent}
    ${cornerSVG}
  </svg>`;
}

// Mặt sau lá bài phong cách Uno chuẩn
export function backSVG(w = 64) {
  const h = Math.round(w * 1.46);
  return `<svg class="card uno-back" width="${w}" height="${h}" viewBox="0 0 100 146" role="img" aria-label="Mặt sau lá bài">
    <!-- Viền ngoài trắng -->
    <rect width="100" height="146" rx="9" fill="#ffffff" stroke="#bbb" stroke-width="1"/>
    <!-- Nền đen sang trọng -->
    <rect x="4" y="4" width="92" height="138" rx="7" fill="#12131C"/>
    <!-- Viền chỉ vàng kim -->
    <rect x="7" y="7" width="86" height="132" rx="5" fill="none" stroke="#F8B600" stroke-width="2" stroke-opacity="0.9"/>
    <!-- Oval đỏ trung tâm nghiêng -28 độ -->
    <ellipse cx="50" cy="73" rx="28" ry="45" transform="rotate(-28 50 73)" fill="#E52521" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.6))"/>
    <!-- Chữ BABII vàng rực phong cách Uno -->
    <g transform="translate(50,73) rotate(-28)">
      <text x="0" y="8" text-anchor="middle" font-size="21" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" fill="#F8B600" stroke="#ffffff" stroke-width="2.5" paint-order="stroke fill">BABII</text>
      <text x="0" y="20" text-anchor="middle" font-size="8" font-family="'Arial Black', sans-serif" font-weight="900" letter-spacing="2" fill="#ffffff" opacity="0.95">4 MÀU</text>
    </g>
  </svg>`;
}
