// Thiết kế đồ họa và asset vector cho Cờ Cá Ngựa (Ludo) với Hệ thống Item & Kỹ năng
export const COL = ['#E52521', '#0066D6', '#F8B600', '#2BA84A'];
export const COL_NAMES = ['Đỏ', 'Xanh dương', 'Vàng', 'Xanh lá'];

// Thông tin chi tiết các loại thẻ kỹ năng trong túi đồ
export const SKILL_INFO = {
  SHIELD: {
    icon: '🛡️',
    name: 'Khiên Phản Đòn',
    color: '#0284C7',
    desc: 'Chống 1 lần đá/bom. Kẻ tấn công bị phản đòn bật lùi 2 ô!'
  },
  SWAP: {
    icon: '🔄',
    name: 'Hoán Đổi Vị Trí',
    color: '#7C3AED',
    desc: 'Đổi chỗ 1 quân mình và 1 quân địch đang trên vòng đua ngoài!'
  },
  GOLDEN_DICE: {
    icon: '🎲✨',
    name: 'Xúc Xắc Vàng',
    color: '#D97706',
    desc: 'Tự chọn chính xác số điểm 1-6 cho lần đổ tiếp theo!'
  },
  FREEZE: {
    icon: '❄️',
    name: 'Băng Phong',
    color: '#06B6D4',
    desc: 'Khóa chân 1 quân đối thủ trong 1 lượt chơi!'
  },
  BANANA: {
    icon: '🍌',
    name: 'Bẫy Chuối',
    color: '#EAB308',
    desc: 'Đặt bẫy vỏ chuối trên đường đua, ai đạp phải bị trượt lùi 3 ô!'
  },
  BOMB: {
    icon: '💣',
    name: 'Mìn Bẫy',
    color: '#DC2626',
    desc: 'Đặt mìn bí mật, quân nào dẫm trúng bị nổ văng về chuồng!'
  }
};

// Viên xúc xắc 3D chuẩn casino với các chấm tròn sắc nét
export function diceSVG(val, size = 48) {
  if (!val || val < 1 || val > 6) {
    return `<svg class="dice-box" width="${size}" height="${size}" viewBox="0 0 50 50">
      <rect x="2" y="2" width="46" height="46" rx="10" fill="#ffffff18" stroke="#ffffff33" stroke-width="1.5"/>
      <text x="25" y="32" text-anchor="middle" font-size="20" fill="#fff" opacity="0.35">🎲</text>
    </svg>`;
  }

  const isOne = val === 1;
  const pCol = isOne ? '#E52521' : '#1E293B';
  const dotR = isOne ? 6.5 : 4;
  
  const dotsMap = {
    1: [[25, 25]],
    2: [[14, 14], [36, 36]],
    3: [[14, 14], [25, 25], [36, 36]],
    4: [[14, 14], [36, 14], [14, 36], [36, 36]],
    5: [[14, 14], [36, 14], [25, 25], [14, 36], [36, 36]],
    6: [[14, 13], [36, 13], [14, 25], [36, 25], [14, 37], [36, 37]]
  };

  const dots = (dotsMap[val] || []).map(([cx, cy]) => {
    const isCenter5 = val === 5 && cx === 25 && cy === 25;
    return `<circle cx="${cx}" cy="${cy}" r="${isCenter5 ? 3.5 : dotR}" fill="${isCenter5 ? '#E52521' : pCol}"/>`;
  }).join('');

  return `<svg class="dice-box ${val === 6 ? 'dice-six' : ''}" width="${size}" height="${size}" viewBox="0 0 50 50" role="img" aria-label="Xúc xắc ${val} điểm">
    <defs>
      <linearGradient id="diceGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#E2E8F0" />
      </linearGradient>
    </defs>
    <!-- Thân viên xúc xắc 3D bo góc -->
    <rect x="2" y="2" width="46" height="46" rx="10" fill="url(#diceGrad)" stroke="#CBD5E1" stroke-width="1.5" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))"/>
    <rect x="4" y="4" width="42" height="42" rx="8" fill="none" stroke="#FFFFFF" stroke-width="1"/>
    ${dots}
  </svg>`;
}

// Quân cờ cá ngựa (kèm hiệu ứng Khiên bảo vệ hoặc Đóng băng)
export function horseSVG(color, isLegal = false, token = {}) {
  const hasShield = token.hasShield;
  const isFrozen = (token.frozenTurns || 0) > 0;

  return `<g class="horse-token ${isLegal && !isFrozen ? 'horse-ready' : ''} ${isFrozen ? 'horse-frozen' : ''}">
    <!-- Hào quang sẵn sàng đi -->
    ${isLegal && !isFrozen ? `<circle r="14" fill="${color}" opacity="0.38" class="pulse-aura"/>` : ''}

    <!-- Hào quang Khiên bảo vệ phản đòn -->
    ${hasShield ? `
      <circle r="13" fill="#38BDF8" fill-opacity="0.25" stroke="#38BDF8" stroke-width="1.8" class="shield-aura"/>
      <path d="M0,-14 L5,-11 L3,-5 L0,-3 L-3,-5 L-5,-11 Z" fill="#38BDF8" stroke="#fff" stroke-width="0.8"/>
    ` : ''}

    <!-- Đế cờ tròn 3D viền trắng -->
    <circle r="9.5" fill="${color}" stroke="#FFFFFF" stroke-width="2.2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
    <circle r="7.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="0.8"/>
    
    <!-- Biểu tượng đầu chú ngựa sắc nét -->
    <path d="M-3,4.5 L3.5,4.5 C3.5,3 2.5,1.5 1,0.5 C2,-0.5 3.5,-2 2,-4 C2,-5 0,-4.5 -1,-5.5 C-1,-4.5 -2,-3.5 -1,-2.5 C-2.5,-2 -3.5,0.5 -3,4.5 Z" fill="#FFFFFF"/>
    <circle cx="0.5" cy="-2.5" r="0.75" fill="${color}"/>

    <!-- Khối tinh thể đóng băng nếu bị Freeze -->
    ${isFrozen ? `
      <circle r="11" fill="#A5F3FC" fill-opacity="0.5" stroke="#06B6D4" stroke-width="1.5"/>
      <text x="0" y="3" text-anchor="middle" font-size="9" fill="#0891B2">❄️</text>
    ` : ''}
  </g>`;
}

// Vẽ vật phẩm xuất hiện trên các ô của bàn cờ
export function itemSVG(type) {
  if (type === 'MYSTERY_BOX') {
    return `<g class="board-item item-box" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))">
      <rect x="-6.5" y="-5.5" width="13" height="12" rx="2" fill="#F59E0B" stroke="#B45309" stroke-width="1"/>
      <rect x="-7.5" y="-7.5" width="15" height="3.5" rx="1.2" fill="#FBBF24" stroke="#B45309" stroke-width="0.8"/>
      <line x1="0" y1="-7.5" x2="0" y2="6.5" stroke="#DC2626" stroke-width="1.8"/>
      <line x1="-6.5" y1="0.5" x2="6.5" y2="0.5" stroke="#DC2626" stroke-width="1.8"/>
    </g>`;
  }
  if (type === 'BOOST') {
    return `<g class="board-item item-boost" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))">
      <polygon points="0,-7 4.5,0 3,5.5 -3,5.5 -4.5,0" fill="#EF4444" stroke="#991B1B" stroke-width="0.8"/>
      <circle cx="0" cy="0" r="1.6" fill="#67E8F9"/>
      <polygon points="0,5.5 -2,8.5 0,7.5 2,8.5" fill="#F59E0B"/>
    </g>`;
  }
  if (type === 'BANANA') {
    return `<g class="board-item item-banana" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))">
      <path d="M-5,3 C-3,7 3,7 5,0 C4,2 0,4 -2,1 Z" fill="#FACC15" stroke="#CA8A04" stroke-width="1"/>
      <circle cx="-5" cy="3" r="0.7" fill="#713F12"/>
    </g>`;
  }
  if (type === 'BOMB') {
    return `<g class="board-item item-bomb" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.4))">
      <circle cx="0" cy="1" r="5" fill="#18181B" stroke="#000" stroke-width="1"/>
      <path d="M0,-4 C0,-6.5 2.5,-6.5 2.5,-8" stroke="#92400E" stroke-width="1" fill="none"/>
      <circle cx="2.5" cy="-8" r="1" fill="#EF4444"/>
    </g>`;
  }
  return '';
}
