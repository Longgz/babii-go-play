// Thiết kế thẻ bài Mèo Phá Bom chuẩn phong cách Exploding Kittens với tranh minh họa SVG vector
export const INFO = {
  D: ['✂️', 'Gỡ bom', '#16A34A', '#15803D', 'Vô hiệu hóa quả bom'],
  X: ['💣', 'Bom', '#DC2626', '#991B1B', 'Rút trúng là nổ tung!'],
  S: ['⏭️', 'Né', '#2563EB', '#1D4ED8', 'Bỏ qua lượt không rút'],
  A: ['⚔️', 'Tấn công', '#EA580C', '#C2410C', 'Ép người kế đi 2 lượt'],
  H: ['🔀', 'Xào bài', '#9333EA', '#7E22CE', 'Trộn lại cọc bài rút'],
  F: ['🔮', 'Nhìn trước', '#0891B2', '#0E7490', 'Xem 3 lá trên cùng'],
  V: ['🙏', 'Xin bài', '#DB2777', '#BE185D', 'Bắt 1 người nộp bài'],
  C1: ['🌮', 'Mèo Taco', '#D97706', '#B45309', 'Cặp đôi lấy trộm 1 lá'],
  C2: ['🍉', 'Mèo Dưa Hấu', '#059669', '#047857', 'Cặp đôi lấy trộm 1 lá'],
  C3: ['🥔', 'Mèo Khoai Tây', '#78350F', '#451A03', 'Cặp đôi lấy trộm 1 lá'],
  C4: ['🌈', 'Mèo Cầu Vồng', '#7C3AED', '#6D28D9', 'Cặp đôi lấy trộm 1 lá']
};

// Tranh minh họa vector độc quyền phong cách Exploding Kittens (The Oatmeal)
function getIllustration(code) {
  switch (code) {
    case 'X': // BOM: Quả bom nổ tung + chú mèo hoảng hốt
      return `
        <!-- Vụ nổ phía sau -->
        <polygon points="50,22 56,36 70,30 64,44 78,48 66,58 76,70 60,70 64,84 50,76 36,84 40,70 24,70 34,58 22,48 36,44 30,30 44,36" fill="#FBBF24" opacity="0.9"/>
        <polygon points="50,28 54,38 64,34 60,44 70,48 60,54 68,64 56,64 58,74 50,68 42,74 44,64 32,64 40,54 30,48 40,44 36,34 46,38" fill="#F87171"/>
        <!-- Quả bom đen tròn -->
        <circle cx="50" cy="56" r="20" fill="#18181B" stroke="#000" stroke-width="2"/>
        <ellipse cx="45" cy="50" rx="6" ry="3" fill="#3F3F46"/>
        <!-- Ngòi nổ & tia lửa -->
        <path d="M50 36 C50 28 58 26 56 20" stroke="#713F12" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="56" cy="19" r="4" fill="#FDE047"/>
        <path d="M56 13 L56 25 M50 19 L62 19" stroke="#EF4444" stroke-width="2"/>
        <!-- Khuôn mặt mèo trên quả bom -->
        <circle cx="43" cy="54" r="3" fill="#fff"/><circle cx="43" cy="54" r="1.5" fill="#000"/>
        <circle cx="57" cy="54" r="3" fill="#fff"/><circle cx="57" cy="54" r="1.5" fill="#000"/>
        <path d="M46 62 Q50 67 54 62" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <polygon points="34,42 38,34 44,40" fill="#18181B"/>
        <polygon points="66,42 62,34 56,40" fill="#18181B"/>
      `;

    case 'D': // GỠ BOM: Bút chiếu laser chấm đỏ + kìm cắt dây
      return `
        <!-- Nền phòng tối -->
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#ECFDF5"/>
        <!-- Tia laser đỏ chiếu xuống -->
        <path d="M28 32 L68 68" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="2,2"/>
        <circle cx="68" cy="68" r="4" fill="#EF4444" filter="drop-shadow(0 0 4px #EF4444)"/>
        <!-- Bút laser cầm tay -->
        <rect x="23" y="28" width="10" height="6" rx="2" fill="#374151" transform="rotate(45 28 31)"/>
        <!-- Bàn chân mèo tóm lấy tia laser -->
        <ellipse cx="62" cy="60" rx="9" ry="7" fill="#F59E0B" transform="rotate(-20 62 60)"/>
        <circle cx="55" cy="55" r="2.5" fill="#FDE68A"/>
        <circle cx="60" cy="53" r="2.5" fill="#FDE68A"/>
        <circle cx="66" cy="54" r="2.5" fill="#FDE68A"/>
        <circle cx="70" cy="58" r="2.5" fill="#FDE68A"/>
        <!-- Kìm cắt dây bên góc -->
        <path d="M30 68 L40 58 M36 72 L42 64" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
      `;

    case 'S': // NÉ: Mèo cưỡi tên lửa phản lực bay vèo
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#EFF6FF"/>
        <!-- Vệt khói gió tốc độ -->
        <line x1="22" y1="40" x2="38" y2="40" stroke="#93C5FD" stroke-width="2" stroke-linecap="round"/>
        <line x1="20" y1="58" x2="42" y2="58" stroke="#93C5FD" stroke-width="2" stroke-linecap="round"/>
        <!-- Quả tên lửa đỏ -->
        <path d="M40 50 Q56 42 74 46 Q70 58 40 54 Z" fill="#EF4444" stroke="#1E3A8A" stroke-width="1.5"/>
        <polygon points="38,48 30,42 34,50" fill="#F97316"/>
        <polygon points="38,52 30,58 34,50" fill="#F97316"/>
        <path d="M30 50 C24 46 22 54 18 50 C22 52 24 48 30 50 Z" fill="#FBBF24"/>
        <!-- Mèo cưỡi trên lưng tên lửa -->
        <ellipse cx="54" cy="40" rx="10" ry="8" fill="#F3F4F6" stroke="#111" stroke-width="1.5"/>
        <polygon points="46,34 49,27 52,33" fill="#F3F4F6" stroke="#111" stroke-width="1.2"/>
        <polygon points="56,33 59,27 62,34" fill="#F3F4F6" stroke="#111" stroke-width="1.2"/>
        <!-- Kính râm cực ngầu -->
        <rect x="48" y="38" width="6" height="4" rx="1" fill="#111"/>
        <rect x="55" y="38" width="6" height="4" rx="1" fill="#111"/>
        <line x1="53" y1="40" x2="56" y2="40" stroke="#111" stroke-width="1.5"/>
      `;

    case 'A': // TẤN CÔNG: Mèo xòe vuốt cào xé + sấm sét
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#FFF7ED"/>
        <!-- Tia sét vàng phía sau -->
        <polygon points="48,26 40,46 48,46 42,68 62,44 52,44 58,26" fill="#FBBF24" opacity="0.8"/>
        <!-- 3 Vết cào rách toạc nền -->
        <path d="M28 32 L36 72" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/>
        <path d="M46 28 L52 76" stroke="#DC2626" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M64 32 L68 72" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/>
        <!-- Bàn chân mèo dũng mãnh -->
        <ellipse cx="50" cy="56" rx="12" ry="10" fill="#EA580C" stroke="#000" stroke-width="1.5"/>
        <path d="M40 48 Q42 42 44 48" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M48 46 Q50 40 52 46" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M56 48 Q58 42 60 48" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      `;

    case 'H': // XÀO BÀI: Mèo trong lốc xoáy lốc bài
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#FAF5FF"/>
        <!-- Lốc xoáy xoắn ốc -->
        <path d="M50 78 C32 78 28 66 38 58 C48 50 64 52 62 42 C60 34 46 32 44 26" stroke="#C084FC" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- Các lá bài con bay tứ tung -->
        <rect x="25" y="34" width="8" height="12" rx="1" fill="#fff" stroke="#9333EA" stroke-width="1" transform="rotate(-25 29 40)"/>
        <rect x="65" y="48" width="8" height="12" rx="1" fill="#fff" stroke="#9333EA" stroke-width="1" transform="rotate(35 69 54)"/>
        <rect x="36" y="66" width="8" height="12" rx="1" fill="#fff" stroke="#9333EA" stroke-width="1" transform="rotate(15 40 72)"/>
        <!-- Đầu mèo chóng mặt xoay tít -->
        <circle cx="50" cy="46" r="11" fill="#E9D5FF" stroke="#6B21A8" stroke-width="1.5"/>
        <!-- Mắt xoắn ốc chóng mặt -->
        <path d="M46 45 C44 45 44 43 46 43 C47 43 47 46 45 46" stroke="#6B21A8" stroke-width="1.2" fill="none"/>
        <path d="M54 45 C52 45 52 43 54 43 C55 43 55 46 53 46" stroke="#6B21A8" stroke-width="1.2" fill="none"/>
        <polygon points="41,38 44,32 47,37" fill="#E9D5FF" stroke="#6B21A8" stroke-width="1"/>
        <polygon points="53,37 56,32 59,38" fill="#E9D5FF" stroke="#6B21A8" stroke-width="1"/>
      `;

    case 'F': // NHÌN TRƯỚC: Mèo phù thủy + Quả cầu tiên tri
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#ECFEFF"/>
        <!-- Quả cầu pha lê phát sáng -->
        <circle cx="50" cy="54" r="18" fill="#A5F3FC" stroke="#0891B2" stroke-width="2"/>
        <ellipse cx="44" cy="46" rx="6" ry="3" fill="#fff" opacity="0.8"/>
        <!-- Chân đế quả cầu -->
        <path d="M40 72 L60 72 L56 68 L44 68 Z" fill="#0E7490"/>
        <!-- Con mắt thứ 3 ma thuật trong quả cầu -->
        <path d="M40 54 Q50 44 60 54 Q50 64 40 54 Z" fill="#fff" stroke="#0E7490" stroke-width="1.2"/>
        <circle cx="50" cy="54" r="4" fill="#0891B2"/>
        <circle cx="50" cy="54" r="1.5" fill="#fff"/>
        <!-- Tai mèo phù thủy nhô ra phía sau -->
        <polygon points="26,42 32,30 38,40" fill="#0E7490"/>
        <polygon points="62,40 68,30 74,42" fill="#0E7490"/>
        <!-- Ngôi sao lấp lánh -->
        <text x="30" y="32" font-size="10" fill="#0891B2">✦</text>
        <text x="68" y="34" font-size="8" fill="#0891B2">✦</text>
      `;

    case 'V': // XIN BÀI: Mèo con chắp tay xin xỏ siêu cute
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#FDF2F8"/>
        <!-- Đầu mèo trắng xinh xắn -->
        <circle cx="50" cy="46" r="15" fill="#FFFFFF" stroke="#DB2777" stroke-width="1.8"/>
        <!-- Tai hồng -->
        <polygon points="36,36 40,24 47,34" fill="#FBCFE8" stroke="#DB2777" stroke-width="1.5"/>
        <polygon points="53,34 60,24 64,36" fill="#FBCFE8" stroke="#DB2777" stroke-width="1.5"/>
        <!-- Mắt long lanh to tròn ngấn lệ -->
        <circle cx="44" cy="46" r="4" fill="#1F2937"/><circle cx="43" cy="44" r="1.5" fill="#fff"/><circle cx="45" cy="47" r="0.8" fill="#fff"/>
        <circle cx="56" cy="46" r="4" fill="#1F2937"/><circle cx="55" cy="44" r="1.5" fill="#fff"/><circle cx="57" cy="47" r="0.8" fill="#fff"/>
        <!-- Má hồng & miệng cười mếu đáng thương -->
        <circle cx="39" cy="52" r="2.5" fill="#F472B6" opacity="0.7"/>
        <circle cx="61" cy="52" r="2.5" fill="#F472B6" opacity="0.7"/>
        <path d="M47 53 Q50 51 53 53" stroke="#DB2777" stroke-width="1.5" fill="none"/>
        <!-- Hai bàn tay chắp trước ngực -->
        <ellipse cx="47" cy="62" rx="4" ry="5" fill="#fff" stroke="#DB2777" stroke-width="1.5"/>
        <ellipse cx="53" cy="62" rx="4" ry="5" fill="#fff" stroke="#DB2777" stroke-width="1.5"/>
        <path d="M50 32 Q50 26 53 28 Q56 26 56 32" stroke="#DB2777" fill="#F472B6" stroke-width="0.8" transform="translate(-3, -3) scale(0.6)"/>
      `;

    case 'C1': // MÈO TACO (Taco Cat)
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#FFFBEB"/>
        <!-- Vỏ bánh Taco vàng giòn -->
        <path d="M26 62 Q50 78 74 62 Q70 42 26 62 Z" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
        <!-- Nhân rau xà lách & phô mai -->
        <path d="M30 58 Q40 50 50 56 Q60 52 70 58" stroke="#10B981" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M36 56 Q44 48 54 52 Q62 48 66 54" stroke="#EF4444" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- Chú mèo mướp chui trong bánh taco -->
        <ellipse cx="50" cy="44" rx="11" ry="9" fill="#FBBF24" stroke="#92400E" stroke-width="1.5"/>
        <polygon points="41,37 43,30 47,36" fill="#FBBF24" stroke="#92400E" stroke-width="1.2"/>
        <polygon points="53,36 57,30 59,37" fill="#FBBF24" stroke="#92400E" stroke-width="1.2"/>
        <circle cx="46" cy="43" r="1.5" fill="#000"/><circle cx="54" cy="43" r="1.5" fill="#000"/>
        <path d="M48 47 Q50 49 52 47" stroke="#000" stroke-width="1.2" fill="none"/>
        <!-- Vằn mướp -->
        <path d="M49 37 L49 40 M46 38 L47 40 M52 38 L51 40" stroke="#78350F" stroke-width="1"/>
      `;

    case 'C2': // MÈO DƯA HẤU (Melon Cat)
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#ECFDF5"/>
        <!-- Miếng dưa hấu đỏ vỏ xanh -->
        <path d="M26 40 Q50 76 74 40 Z" fill="#EF4444" stroke="#047857" stroke-width="3"/>
        <path d="M25 40 Q50 78 75 40" stroke="#10B981" stroke-width="3.5" fill="none"/>
        <!-- Hạt dưa hấu -->
        <circle cx="42" cy="50" r="1.5" fill="#111"/><circle cx="58" cy="50" r="1.5" fill="#111"/><circle cx="50" cy="58" r="1.5" fill="#111"/>
        <!-- Chú mèo tam thể ngồi trong dưa hấu -->
        <circle cx="50" cy="38" r="10" fill="#FFFFFF" stroke="#047857" stroke-width="1.5"/>
        <polygon points="42,32 44,25 48,31" fill="#F97316"/>
        <polygon points="52,31 56,25 58,32" fill="#1F2937"/>
        <circle cx="46" cy="37" r="1.5" fill="#000"/><circle cx="54" cy="37" r="1.5" fill="#000"/>
        <ellipse cx="50" cy="41" rx="2" ry="1" fill="#F43F5E"/>
      `;

    case 'C3': // MÈO KHOAI TÂY (Potato Cat)
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#FEF3C7"/>
        <!-- Thân hình củ khoai tây lông lá -->
        <path d="M32 54 C28 40 38 32 50 34 C62 36 68 44 66 58 C64 70 54 74 42 70 C34 66 34 62 32 54 Z" fill="#B45309" stroke="#451A03" stroke-width="2"/>
        <!-- Tai mèo cụp tròn xoe -->
        <circle cx="38" cy="34" r="4" fill="#B45309" stroke="#451A03" stroke-width="1.5"/>
        <circle cx="58" cy="35" r="4" fill="#B45309" stroke="#451A03" stroke-width="1.5"/>
        <!-- Mắt ngơ ngác đờ đẫn hài hước -->
        <circle cx="44" cy="46" r="3.5" fill="#fff" stroke="#451A03" stroke-width="1.2"/><circle cx="45" cy="46" r="1.5" fill="#000"/>
        <circle cx="54" cy="47" r="3.5" fill="#fff" stroke="#451A03" stroke-width="1.2"/><circle cx="55" cy="47" r="1.5" fill="#000"/>
        <!-- Mồm méo ngơ ngác -->
        <ellipse cx="49" cy="54" rx="2" ry="3" fill="#451A03"/>
        <!-- Râu mèo dài ngoẵng -->
        <line x1="30" y1="48" x2="40" y2="50" stroke="#451A03" stroke-width="1.2"/>
        <line x1="30" y1="54" x2="40" y2="53" stroke="#451A03" stroke-width="1.2"/>
        <line x1="68" y1="49" x2="58" y2="51" stroke="#451A03" stroke-width="1.2"/>
        <line x1="68" y1="55" x2="58" y2="54" stroke="#451A03" stroke-width="1.2"/>
      `;

    case 'C4': // MÈO CẦU VỒNG (Rainbow Cat)
      return `
        <rect x="20" y="24" width="60" height="58" rx="6" fill="#F5F3FF"/>
        <!-- Vòng cầu vồng rực rỡ -->
        <path d="M22 62 C26 44 40 34 50 34 C60 34 74 44 78 62" stroke="#EF4444" stroke-width="2" fill="none"/>
        <path d="M24 64 C28 47 41 38 50 38 C59 38 72 47 76 64" stroke="#F59E0B" stroke-width="2" fill="none"/>
        <path d="M26 66 C30 50 42 42 50 42 C58 42 70 50 74 66" stroke="#10B981" stroke-width="2" fill="none"/>
        <path d="M28 68 C32 53 43 46 50 46 C57 46 68 53 72 68" stroke="#3B82F6" stroke-width="2" fill="none"/>
        <path d="M30 70 C34 56 44 50 50 50 C56 50 66 56 70 70" stroke="#8B5CF6" stroke-width="2" fill="none"/>
        <!-- Mèo bay giữa cầu vồng -->
        <circle cx="50" cy="46" r="10" fill="#DDD6FE" stroke="#5B21B6" stroke-width="1.5"/>
        <polygon points="43,39 45,32 49,38" fill="#DDD6FE" stroke="#5B21B6" stroke-width="1"/>
        <polygon points="51,38 55,32 57,39" fill="#DDD6FE" stroke="#5B21B6" stroke-width="1"/>
        <circle cx="47" cy="45" r="1.5" fill="#000"/><circle cx="53" cy="45" r="1.5" fill="#000"/>
        <path d="M48 49 Q50 51 52 49" stroke="#5B21B6" stroke-width="1" fill="none"/>
        <text x="32" y="32" font-size="8" fill="#A78BFA">✨</text>
      `;

    default:
      return `<circle cx="50" cy="53" r="18" fill="#e4e4e7"/>`;
  }
}

export function cardSVG(code, w = 60) {
  const item = INFO[code] || ['❓', 'Lá bài', '#4B5563', '#1F2937', ''];
  const [icon, name, colPrimary, colDark, desc] = item;
  const h = Math.round(w * 1.46);

  return `<svg class="card meo-card" width="${w}" height="${h}" viewBox="0 0 100 146" role="img" aria-label="Lá ${name}: ${desc}">
    <!-- Viền ngoài thẻ bài trắng sáng bo góc -->
    <rect width="100" height="146" rx="9" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="1.2"/>
    <!-- Nền dải viền chủ đạo -->
    <rect x="4" y="4" width="92" height="138" rx="7" fill="${colPrimary}"/>
    <!-- Khung tranh màu trắng ngà bên trong -->
    <rect x="7" y="20" width="86" height="106" rx="5" fill="#FAFAFA" stroke="#E5E7EB" stroke-width="1"/>
    
    <!-- Dải Banner trên cùng: Tên lá bài & Biểu tượng -->
    <g transform="translate(8, 15)">
      <text x="0" y="0" font-size="11" font-weight="900" font-family="'Arial Black', Impact, sans-serif" fill="#FFFFFF" letter-spacing="0.5">${name.toUpperCase()}</text>
    </g>
    <text x="88" y="15" text-anchor="end" font-size="11">${icon}</text>

    <!-- Tranh minh họa trung tâm -->
    <g class="meo-art">
      ${getIllustration(code)}
    </g>

    <!-- Dải Banner dưới cùng: Mô tả chức năng ngắn gọn -->
    <rect x="7" y="86" width="86" height="40" rx="3" fill="#FFFFFF" fill-opacity="0.95"/>
    <text x="50" y="99" text-anchor="middle" font-size="8.5" font-weight="800" font-family="sans-serif" fill="${colDark}">
      ${desc ? (desc.length > 24 ? desc.slice(0, 22) + '…' : desc) : name}
    </text>
    <line x1="16" y1="104" x2="84" y2="104" stroke="${colPrimary}" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="50" y="117" text-anchor="middle" font-size="7.5" font-family="sans-serif" font-weight="600" fill="#6B7280">
      ${code === 'X' ? '💥 NGUY HIỂM 💥' : code === 'D' ? '🛡️ CỨU MẠNG 🛡️' : 'MÈO PHÁ BOM'}
    </text>

    <!-- Biểu tượng góc nhỏ ở chân lá bài -->
    <text x="12" y="138" font-size="9">${icon}</text>
    <text x="88" y="138" text-anchor="end" font-size="8" font-weight="800" font-family="'Arial Black', sans-serif" fill="#FFFFFF">${code}</text>
  </svg>`;
}

// Mặt sau lá bài Mèo Phá Bom cực chất
export function backSVG(w = 60) {
  const h = Math.round(w * 1.46);
  return `<svg class="card meo-back" width="${w}" height="${h}" viewBox="0 0 100 146" role="img" aria-label="Chồng bài Mèo Phá Bom">
    <!-- Viền ngoài thẻ trắng -->
    <rect width="100" height="146" rx="9" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>
    <!-- Nền đỏ đô đậm phong cách Exploding Kittens -->
    <rect x="4" y="4" width="92" height="138" rx="7" fill="#881337"/>
    <!-- Viền trang trí vàng cam -->
    <rect x="7" y="7" width="86" height="132" rx="5" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="4,2"/>
    <!-- Vòng tròn huy hiệu tâm điểm -->
    <circle cx="50" cy="73" r="28" fill="#1C1917" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="50" cy="73" r="25" fill="#4C0519"/>
    
    <!-- Đầu mèo nổ tung và tia lửa trên mặt sau -->
    <g transform="translate(50,68)">
      <polygon points="0,-18 5,-8 16,-12 10,-2 18,6 7,8 8,19 0,11 -8,19 -7,8 -18,6 -10,-2 -16,-12 -5,-8" fill="#FBBF24"/>
      <!-- Đầu mèo đen tinh nghịch -->
      <circle cx="0" cy="4" r="10" fill="#18181B" stroke="#F59E0B" stroke-width="1.2"/>
      <polygon points="-7,-1 -9,-8 -2,-4" fill="#18181B" stroke="#F59E0B" stroke-width="0.8"/>
      <polygon points="7,-1 9,-8 2,-4" fill="#18181B" stroke="#F59E0B" stroke-width="0.8"/>
      <circle cx="-3" cy="3" r="1.5" fill="#FBBF24"/>
      <circle cx="3" cy="3" r="1.5" fill="#FBBF24"/>
      <path d="M-2 7 Q0 9 2 7" stroke="#fff" stroke-width="1" fill="none"/>
    </g>

    <!-- Dòng chữ tên game uốn lượn -->
    <text x="50" y="112" text-anchor="middle" font-size="7.5" font-family="'Arial Black', Impact, sans-serif" font-weight="900" fill="#FBBF24" letter-spacing="0.5">MÈO PHÁ BOM</text>
    <text x="50" y="122" text-anchor="middle" font-size="6" font-family="sans-serif" font-weight="700" fill="#FDA4AF" letter-spacing="1">EXPLODING KITTENS</text>
  </svg>`;
}
