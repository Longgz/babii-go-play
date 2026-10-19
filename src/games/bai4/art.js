// Thiết kế lá bài phong cách Uno chính thống bằng SVG vector sắc nét
export const COL = {
  R: '#E52521', // Đỏ son rực rỡ
  Y: '#F8B600', // Vàng nghệ tươi
  B: '#0066D6', // Xanh hoàng gia
  G: '#2BA84A'  // Xanh lục tươi
};

const NAME = { R: 'Đỏ', Y: 'Vàng', B: 'Xanh dương', G: 'Xanh lá' };

export const isWildCode = c => c === 'W' || c === 'F' || c === 'SW' || c === 'WC' || c === 'GV';

// SVG định nghĩa các biểu tượng đặc trưng Uno trên các thẻ màu
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
  if (type === 'A') {
    // Biểu tượng Xả Toàn Bộ Bài Cùng Màu (Discard All): Quạt 3 lá bài và mũi tên xả xuống
    return `<g transform="translate(50,73) rotate(-28)">
      <rect x="-20" y="-18" width="15" height="22" rx="2.5" fill="#fff" stroke="${col}" stroke-width="2" transform="rotate(-20)"/>
      <rect x="-7.5" y="-18" width="15" height="22" rx="2.5" fill="${col}" stroke="#fff" stroke-width="2"/>
      <rect x="5" y="-18" width="15" height="22" rx="2.5" fill="#fff" stroke="${col}" stroke-width="2" transform="rotate(20)"/>
      <path d="M0,8 L0,22 M-6,16 L0,22 L6,16" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="34" text-anchor="middle" font-size="12" font-family="'Arial Black', Impact, sans-serif" font-weight="900" fill="${col}">XẢ ALL</text>
    </g>`;
  }
  if (type === 'F') {
    // Biểu tượng Khiên Phản Đòn (Deflect): Khiên bảo vệ phản hồi bài phạt
    return `<g transform="translate(50,73) rotate(-28)">
      <path d="M0,-24 L18,-15 C18,8 10,21 0,26 C-10,21 -18,8 -18,-15 Z" fill="${col}" stroke="#fff" stroke-width="3"/>
      <path d="M-8,-4 L-1,3 L7,-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M-1,3 C4,3 9,0 9,-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <text x="0" y="16" text-anchor="middle" font-size="10" font-family="'Arial Black', sans-serif" font-weight="900" fill="#fff">KHIÊN</text>
    </g>`;
  }
  // Số 0-9
  const is6or9 = type === '6' || type === '9';
  return `<g transform="translate(50,73) rotate(-28)">
    <text x="0" y="19" text-anchor="middle" font-size="${size}" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-style="italic" fill="${col}" stroke="#111" stroke-width="1.5" paint-order="stroke fill">${type}</text>
    ${is6or9 ? `<line x1="-12" y1="24" x2="12" y2="24" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
  </g>`;
}

// Biểu tượng nhỏ ở góc lá bài
function getCornerSymbol(type, wild = false) {
  if (type === 'S') return '⊘';
  if (type === 'V') return '⇄';
  if (type === 'D') return '+2';
  if (type === 'W') return '★';
  if (type === 'F' && wild) return '+4';
  if (type === 'F' && !wild) return '🛡';
  if (type === 'A') return '⇊';
  if (type === 'SW') return '🔀';
  if (type === 'WC') return '🎰';
  if (type === 'GV') return '🎁';
  return type;
}

export function cardSVG(code, w = 64) {
  const h = Math.round(w * 1.46);
  const wild = isWildCode(code);
  const c = wild ? null : code[0];
  const v = wild ? code : code.slice(1);
  const cCol = wild ? '#1A1A22' : COL[c];
  const cornerLabel = getCornerSymbol(v, wild);
  const is6or9 = v === '6' || v === '9';

  // Khung trung tâm lá bài
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
  } else if (v === 'SW') {
    // Lá Đổi bài (Wild Swap Hands): Hoán đổi xấp bài với đối thủ
    centerContent = `
      <g transform="translate(50,73) rotate(-28)">
        <ellipse cx="0" cy="0" rx="27" ry="43" fill="#111" />
        <!-- 2 xấp bài xoay vòng trao đổi -->
        <rect x="-17" y="-16" width="14" height="21" rx="2.5" fill="${COL.R}" stroke="#fff" stroke-width="1.5" transform="rotate(-18)"/>
        <rect x="3" y="-13" width="14" height="21" rx="2.5" fill="${COL.B}" stroke="#fff" stroke-width="1.5" transform="rotate(18)"/>
        <!-- 2 mũi tên cong hoán đổi vàng kim -->
        <path d="M-11,-21 C-3,-25 7,-21 11,-15" fill="none" stroke="#F8B600" stroke-width="3" stroke-linecap="round"/>
        <polygon points="13,-13 11,-19 7,-15" fill="#F8B600"/>
        <path d="M11,15 C3,19 -7,15 -11,9" fill="none" stroke="#F8B600" stroke-width="3" stroke-linecap="round"/>
        <polygon points="-13,7 -11,13 -7,9" fill="#F8B600"/>
        <ellipse cx="0" cy="20" rx="20" ry="10" fill="#111"/>
        <text x="0" y="24" text-anchor="middle" font-size="12" font-family="'Arial Black', sans-serif" font-weight="900" fill="#F8B600">SWAP</text>
      </g>`;
  } else if (v === 'WC') {
    // Lá Rút Tới Bến (Wild Color Roulette): Vòng xoay 4 múi màu & kim quay
    centerContent = `
      <g transform="translate(50,73) rotate(-28)">
        <ellipse cx="0" cy="0" rx="27" ry="43" fill="#111" />
        <g transform="translate(0,-6)">
          <circle cx="0" cy="0" r="21" fill="#fff" stroke="#fff" stroke-width="1.5"/>
          <path d="M0,0 L0,-20 A20,20 0 0,1 20,0 Z" fill="${COL.R}"/>
          <path d="M0,0 L20,0 A20,20 0 0,1 0,20 Z" fill="${COL.Y}"/>
          <path d="M0,0 L0,20 A20,20 0 0,1 -20,0 Z" fill="${COL.G}"/>
          <path d="M0,0 L-20,0 A20,20 0 0,1 0,-20 Z" fill="${COL.B}"/>
          <circle cx="0" cy="0" r="5" fill="#111" stroke="#fff" stroke-width="1.5"/>
          <polygon points="0,-14 3,-3 -3,-3" fill="#fff" stroke="#111" stroke-width="1" transform="rotate(45)"/>
        </g>
        <ellipse cx="0" cy="22" rx="23" ry="10" fill="#111"/>
        <text x="0" y="26" text-anchor="middle" font-size="10" font-family="'Arial Black', sans-serif" font-weight="900" fill="#F8B600" letter-spacing="0.5">ROULETTE</text>
      </g>`;
  } else if (v === 'GV') {
    // Lá Tặng Quà (Wild Giveaway): Hộp quà rực rỡ trao đối phương
    centerContent = `
      <g transform="translate(50,73) rotate(-28)">
        <ellipse cx="0" cy="0" rx="27" ry="43" fill="#111" />
        <g transform="translate(0,-6)">
          <rect x="-16" y="-5" width="32" height="23" rx="3" fill="#E52521" stroke="#fff" stroke-width="1.5"/>
          <rect x="-18" y="-12" width="36" height="8" rx="2" fill="#F8B600" stroke="#fff" stroke-width="1.5"/>
          <rect x="-4" y="-12" width="8" height="30" fill="#fff"/>
          <path d="M-8,-16 C-12,-21 -2,-21 -3,-13 Z" fill="#F8B600" stroke="#fff" stroke-width="1"/>
          <path d="M8,-16 C12,-21 2,-21 3,-13 Z" fill="#F8B600" stroke="#fff" stroke-width="1"/>
          <circle cx="0" cy="-12" r="3" fill="#fff"/>
        </g>
        <ellipse cx="0" cy="22" rx="20" ry="10" fill="#111"/>
        <text x="0" y="26" text-anchor="middle" font-size="12" font-family="'Arial Black', sans-serif" font-weight="900" fill="#F8B600">GIVE</text>
      </g>`;
  } else {
    // Lá màu thường: Oval trắng nghiêng và biểu tượng/số màu bên trong
    centerContent = `
      <ellipse cx="50" cy="73" rx="28" ry="44" transform="rotate(-28 50 73)" fill="#ffffff" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
      ${getSymbolSVG(v, cCol)}`;
  }

  // Góc trên-trái và góc dưới-phải (xoay 180 độ)
  const cornerClass = wild ? 'fill="#f4b942"' : 'fill="#ffffff"';
  const cornerSVG = `
    <!-- Góc trên trái -->
    <g transform="translate(12, 22)">
      <text x="0" y="0" font-size="${cornerLabel.length > 2 ? 11 : cornerLabel.length > 1 ? 13 : 16}" font-weight="900" font-family="'Arial Black', Impact, sans-serif" font-style="italic" ${cornerClass} stroke="#000" stroke-width="1" paint-order="stroke fill" text-anchor="start">${cornerLabel}</text>
      ${is6or9 ? '<line x1="0" y1="3" x2="10" y2="3" stroke="#fff" stroke-width="2"/>' : ''}
    </g>
    <!-- Góc dưới phải (lộn ngược) -->
    <g transform="translate(88, 124) rotate(180)">
      <text x="0" y="0" font-size="${cornerLabel.length > 2 ? 11 : cornerLabel.length > 1 ? 13 : 16}" font-weight="900" font-family="'Arial Black', Impact, sans-serif" font-style="italic" ${cornerClass} stroke="#000" stroke-width="1" paint-order="stroke fill" text-anchor="start">${cornerLabel}</text>
      ${is6or9 ? '<line x1="0" y1="3" x2="10" y2="3" stroke="#fff" stroke-width="2"/>' : ''}
    </g>
  `;

  const ariaDesc = wild 
    ? (v === 'W' ? 'Đổi màu' : v === 'F' ? 'Đổi màu rút 4' : v === 'SW' ? 'Đổi bài Swap Hands' : v === 'WC' ? 'Rút tới bến Color Roulette' : 'Tặng quà Giveaway')
    : `${NAME[c] || ''} ${v === 'A' ? 'Xả màu' : v === 'F' ? 'Khiên phản đòn' : v}`;

  return `<svg class="card uno-card" width="${w}" height="${h}" viewBox="0 0 100 146" role="img" aria-label="Lá ${ariaDesc}">
    <defs>
      <linearGradient id="g-${c || 'W'}-${w}-${code}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${cCol}" />
        <stop offset="100%" stop-color="${wild ? '#0a0a0f' : cCol}" stop-opacity="0.88" />
      </linearGradient>
    </defs>
    <!-- Viền trắng ngoài cùng -->
    <rect width="100" height="146" rx="9" fill="#ffffff" stroke="#ddd" stroke-width="1"/>
    <!-- Nền màu lá bài -->
    <rect x="4" y="4" width="92" height="138" rx="7" fill="url(#g-${c || 'W'}-${w}-${code})"/>
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
