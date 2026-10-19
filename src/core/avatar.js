import { store } from './store.js';

// Hệ thống Avatar Toàn Thân (Full-Body Modular SVG Character)
// Hỗ trợ: Nam / Nữ, Độ béo gầy, Áo quần đa dạng, Kiểu tóc, Biểu cảm và Phụ kiện.

export const SKIN = ['#FFDFD3', '#F6D5B8', '#EFC29A', '#D9A477', '#B9805A', '#8A5A3C'];
export const HAIRC = ['#1B1B1F', '#3D2314', '#663B1C', '#A05C2B', '#D8B45A', '#C0392B', '#8B5CF6', '#94A3B8'];
export const TOPC = ['#E52521', '#F8B600', '#0066D6', '#2BA84A', '#EC4899', '#8B5CF6', '#1E293B', '#F8FAFC', '#F97316', '#14B8A6'];
export const BOTC = ['#1E293B', '#2563EB', '#475569', '#0F172A', '#D97706', '#DB2777', '#F1F5F9', '#059669'];
export const SHOESC = ['#FFFFFF', '#1E293B', '#DC2626', '#F59E0B', '#3B82F6', '#64748B'];

export const OPT = {
  gender: ['Nam', 'Nữ'],
  weight: ['Gầy (Slim)', 'Cân đối (Fit)', 'Mũm mĩm (Chubby)'],
  face: ['Cười nhẹ', 'Cười tươi', 'Nháy mắt', 'Đỏ mặt', 'Ngơ ngác', 'Cười nhe răng'],
  hairM: ['Undercut', 'Mái rủ Hàn Quốc', 'Xoăn nhẹ', 'Đầu nấm', 'Vuốt dựng', 'Cột búi', 'Đầu đinh'],
  hairF: ['Dài xoăn sóng', 'Bob ngắn', 'Đuôi ngựa', 'Buộc 2 chùm', 'Búi củ tỏi', 'Layer vai', 'Tóc tém'],
  top: ['Áo thun', 'Sơ mi', 'Hoodie', 'Áo dài', 'Áo bà ba', 'Croptop / Đầm', 'Áo ba lỗ'],
  bot: ['Quần jeans', 'Quần short', 'Quần jogger', 'Chân váy', 'Quần yếm'],
  shoes: ['Sneaker', 'Sandal', 'Giày búp bê / da', 'Chân trần'],
  hat: ['Không', 'Nón lá', 'Khăn rằn', 'Mũ lưỡi trai', 'Khăn đóng', 'Mũ len'],
  acc: ['Không', 'Kính tròn', 'Kính râm', 'Kẹp hoa / nơ', 'Tai nghe', 'Khẩu trang']
};

export const DEFAULT = {
  gender: 0,
  weight: 1,
  skin: 1,
  hair: 0,
  hairC: 0,
  face: 0,
  top: 0,
  topC: 2,
  bot: 0,
  botC: 0,
  shoes: 0,
  hat: 0,
  acc: 0
};

export const LEN = {
  gender: 2,
  weight: 3,
  skin: 6,
  hair: 7,
  hairC: 8,
  face: 6,
  top: 7,
  topC: 10,
  bot: 5,
  botC: 8,
  shoes: 4,
  hat: 6,
  acc: 6
};

export const norm = raw => {
  const a = { ...DEFAULT };
  for (const k in LEN) {
    const v = Math.floor(+raw?.[k]);
    if (v >= 0 && v < LEN[k]) a[k] = v;
  }
  return a;
};

// Hàm render chi tiết SVG cho toàn thân nhân vật (viewBox 0 0 100 160)
export function avatarInner(raw, opts = {}) {
  const a = norm(raw);
  const isFemale = a.gender === 1;
  const w = a.weight; // 0: Slim, 1: Normal, 2: Chubby

  const sk = SKIN[a.skin];
  const hc = HAIRC[a.hairC];
  const tc = TOPC[a.topC];
  const bc = BOTC[a.botC];
  const sc = SHOESC[a.shoes];

  // Cho phép ghi đè biểu cảm (ví dụ khi bị chọc lét)
  const faceIdx = opts.overrideFace !== undefined ? opts.overrideFace : a.face;

  // Tính toán kích thước theo độ béo gầy
  const bodyW = w === 0 ? 25 : w === 2 ? 34 : 29;
  const shoulderW = isFemale ? (w === 0 ? 28 : w === 2 ? 34 : 31) : (w === 0 ? 33 : w === 2 ? 40 : 36);
  const headRx = w === 2 ? 20.5 : 19.5;
  const headRy = 19;
  const armThick = w === 0 ? 7 : w === 2 ? 10.5 : 8.5;
  const legThick = w === 0 ? 8 : w === 2 ? 12 : 9.5;
  const legGap = w === 2 ? 9 : 7.5;

  // 1. LỚP TÓC PHÍA SAU (Back hair)
  let backHair = '';
  if (isFemale) {
    if (a.hair === 0) {
      // Dài xoăn sóng
      backHair = `<path d="M28 35 Q18 78 26 100 Q50 106 74 100 Q82 78 72 35 Z" fill="${hc}"/>`;
    } else if (a.hair === 2) {
      // Đuôi ngựa buộc cao
      backHair = `<path d="M68 28 Q88 42 78 72 Q68 76 66 60 Z" fill="${hc}"/><ellipse cx="68" cy="30" rx="4" ry="4" fill="${tc}"/>`;
    } else if (a.hair === 3) {
      // Buộc 2 chùm
      backHair = `
        <path d="M26 36 Q10 52 14 82 Q24 84 26 62 Z" fill="${hc}"/>
        <path d="M74 36 Q90 52 86 82 Q76 84 74 62 Z" fill="${hc}"/>
        <circle cx="23" cy="40" r="3.5" fill="${tc}"/>
        <circle cx="77" cy="40" r="3.5" fill="${tc}"/>`;
    } else if (a.hair === 4) {
      // Búi củ tỏi cao
      backHair = `<ellipse cx="50" cy="14" rx="10" ry="9" fill="${hc}"/><ellipse cx="50" cy="18" rx="7" ry="2.5" fill="${tc}"/>`;
    } else if (a.hair === 5) {
      // Layer vai
      backHair = `<path d="M29 36 Q22 68 28 84 Q50 88 72 84 Q78 68 71 36 Z" fill="${hc}"/>`;
    }
  } else {
    if (a.hair === 5) {
      // Nam cột búi lãng tử
      backHair = `<ellipse cx="50" cy="18" rx="6" ry="6" fill="${hc}"/>`;
    }
  }

  // 2. CHÂN & QUẦN & GIÀY (Legs, Pants, Shoes)
  const legLeftX = 50 - legGap;
  const legRightX = 50 + legGap;

  // Giày dép
  const renderShoes = (x, flip = false) => {
    if (a.shoes === 3) {
      // Chân trần
      return `<ellipse cx="${x + (flip ? 2 : -2)}" cy="151" rx="${legThick * 0.55}" ry="3" fill="${sk}"/>`;
    }
    if (a.shoes === 1) {
      // Sandal
      return `
        <ellipse cx="${x + (flip ? 2 : -2)}" cy="152" rx="${legThick * 0.6}" ry="3.5" fill="#334155"/>
        <path d="M${x - 3} 150 L${x + 3} 150 M${x - 2} 152 L${x + 4} 152" stroke="#e2e8f0" stroke-width="2"/>`;
    }
    if (a.shoes === 2) {
      // Giày búp bê / da
      return `<path d="M${x - 5} 149 Q${x + (flip ? 7 : -7)} 148 ${x + (flip ? 6 : -6)} 153 L${x - 4} 153 Z" fill="#1e1b4b" stroke="#000" stroke-width="0.8"/>`;
    }
    // Sneaker thể thao
    return `
      <path d="M${x - 5.5} 148 Q${x + (flip ? 7 : -7)} 147 ${x + (flip ? 6 : -6)} 153 L${x - 5} 153 Z" fill="${sc}" stroke="#334155" stroke-width="0.8"/>
      <rect x="${x - 5.5}" y="152" width="12" height="2" rx="1" fill="#f8fafc"/>
      <circle cx="${x}" cy="150" r="1.2" fill="#e2e8f0"/>`;
  };

  // Quần / Váy (Bottoms)
  let bottomSVG = '';
  const legSkin = `
    <rect x="${legLeftX - legThick / 2}" y="100" width="${legThick}" height="48" rx="${legThick / 2}" fill="${sk}"/>
    <rect x="${legRightX - legThick / 2}" y="100" width="${legThick}" height="48" rx="${legThick / 2}" fill="${sk}"/>
  `;

  if (a.bot === 0) {
    // Quần jeans dài
    bottomSVG = `
      <path d="M${50 - bodyW / 2} 94 L${50 + bodyW / 2} 94 L${legRightX + legThick / 2} 148 L${legRightX - legThick / 2} 148 L50 110 L${legLeftX + legThick / 2} 148 L${legLeftX - legThick / 2} 148 Z" fill="${bc}" stroke="#00000022" stroke-width="1.2"/>
      <line x1="50" y1="94" x2="50" y2="108" stroke="#ffffff44" stroke-width="1.5"/>
      <path d="M${50 - bodyW / 2 + 3} 99 Q${50 - bodyW / 2 + 7} 107 ${50 - bodyW / 2 + 10} 99" stroke="#ffffff44" stroke-width="1.2" fill="none"/>
      <path d="M${50 + bodyW / 2 - 3} 99 Q${50 + bodyW / 2 - 7} 107 ${50 + bodyW / 2 - 10} 99" stroke="#ffffff44" stroke-width="1.2" fill="none"/>`;
  } else if (a.bot === 1) {
    // Quần short
    bottomSVG = `
      ${legSkin}
      <path d="M${50 - bodyW / 2} 94 L${50 + bodyW / 2} 94 L${legRightX + legThick / 2 + 1} 118 L${legRightX - legThick / 2} 118 L50 108 L${legLeftX + legThick / 2} 118 L${legLeftX - legThick / 2 - 1} 118 Z" fill="${bc}"/>
      <line x1="50" y1="94" x2="50" y2="107" stroke="#00000033" stroke-width="1.5"/>`;
  } else if (a.bot === 2) {
    // Quần jogger thể thao
    bottomSVG = `
      <path d="M${50 - bodyW / 2} 94 L${50 + bodyW / 2} 94 L${legRightX + legThick / 2 + 2} 144 L${legRightX - legThick / 2 - 1} 144 L50 112 L${legLeftX + legThick / 2 + 1} 144 L${legLeftX - legThick / 2 - 2} 144 Z" fill="${bc}"/>
      <!-- Bo gấu quần -->
      <rect x="${legLeftX - legThick / 2 - 1}" y="144" width="${legThick + 2}" height="4" rx="2" fill="#0f172a"/>
      <rect x="${legRightX - legThick / 2 - 1}" y="144" width="${legThick + 2}" height="4" rx="2" fill="#0f172a"/>
      <!-- Sọc thể thao -->
      <path d="M${50 - bodyW / 2 + 2} 96 L${legLeftX - legThick / 2} 144" stroke="#ffffff77" stroke-width="1.5"/>
      <path d="M${50 + bodyW / 2 - 2} 96 L${legRightX + legThick / 2} 144" stroke="#ffffff77" stroke-width="1.5"/>`;
  } else if (a.bot === 3) {
    // Chân váy / Váy xòe
    bottomSVG = `
      ${legSkin}
      <path d="M${50 - bodyW / 2} 93 L${50 + bodyW / 2} 93 L${50 + bodyW / 2 + 9} 120 L${50 - bodyW / 2 - 9} 120 Z" fill="${bc}"/>
      <!-- Đường xếp ly váy -->
      <line x1="${50 - bodyW / 4}" y1="94" x2="${50 - bodyW / 3 - 3}" y2="120" stroke="#00000022" stroke-width="1.2"/>
      <line x1="${50 + bodyW / 4}" y1="94" x2="${50 + bodyW / 3 + 3}" y2="120" stroke="#00000022" stroke-width="1.2"/>
      <line x1="50" y1="94" x2="50" y2="120" stroke="#00000022" stroke-width="1.2"/>`;
  } else if (a.bot === 4) {
    // Quần yếm
    bottomSVG = `
      <path d="M${50 - bodyW / 2} 94 L${50 + bodyW / 2} 94 L${legRightX + legThick / 2} 148 L${legRightX - legThick / 2} 148 L50 110 L${legLeftX + legThick / 2} 148 L${legLeftX - legThick / 2} 148 Z" fill="${bc}"/>
      <!-- Yếm ngực & quai yếm -->
      <rect x="${50 - bodyW / 2.5}" y="76" width="${bodyW * 0.8}" height="20" rx="3" fill="${bc}"/>
      <rect x="${50 - bodyW / 2.5 + 3}" y="60" width="4.5" height="24" fill="${bc}"/>
      <rect x="${50 + bodyW / 2.5 - 7.5}" y="60" width="4.5" height="24" fill="${bc}"/>
      <circle cx="${50 - bodyW / 2.5 + 5.2}" cy="82" r="1.6" fill="#facc15"/>
      <circle cx="${50 + bodyW / 2.5 - 5.2}" cy="82" r="1.6" fill="#facc15"/>
      <rect x="44" y="85" width="12" height="7" rx="1.5" fill="#00000022"/>`;
  }

  // 3. THÂN NGƯỜI & ÁO (Torso & Tops)
  // Bụng mỡ đáng yêu khi chubby
  const bellyFat = w === 2 ? `<ellipse cx="50" cy="88" rx="${bodyW * 0.52}" ry="13" fill="${tc}"/>` : '';

  let topSVG = '';
  if (a.top === 0) {
    // Áo thun (T-shirt basic)
    topSVG = `
      <path d="M${50 - shoulderW / 2} 62 L${50 + shoulderW / 2} 62 L${50 + bodyW / 2} 96 L${50 - bodyW / 2} 96 Z" fill="${tc}"/>
      ${bellyFat}
      <!-- Cổ áo tròn -->
      <path d="M43 62 Q50 71 57 62" stroke="#00000033" stroke-width="2.5" fill="none"/>
      <path d="M43 62 Q50 70 57 62 Z" fill="${sk}"/>`;
  } else if (a.top === 1) {
    // Áo sơ mi
    topSVG = `
      <path d="M${50 - shoulderW / 2} 62 L${50 + shoulderW / 2} 62 L${50 + bodyW / 2} 96 L${50 - bodyW / 2} 96 Z" fill="${tc}"/>
      ${bellyFat}
      <!-- Cổ bẻ sơ mi -->
      <path d="M42 62 L50 74 L46 64 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
      <path d="M58 62 L50 74 L54 64 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
      <!-- Hàng nút áo -->
      <line x1="50" y1="74" x2="50" y2="96" stroke="#00000033" stroke-width="1.5"/>
      <circle cx="50" cy="80" r="1.3" fill="#ffffff"/>
      <circle cx="50" cy="88" r="1.3" fill="#ffffff"/>`;
  } else if (a.top === 2) {
    // Áo Hoodie
    topSVG = `
      <path d="M${50 - shoulderW / 2 - 1} 62 L${50 + shoulderW / 2 + 1} 62 L${50 + bodyW / 2 + 1} 97 L${50 - bodyW / 2 - 1} 97 Z" fill="${tc}"/>
      ${bellyFat}
      <!-- Mũ trùm sau gáy -->
      <path d="M41 62 Q50 74 59 62" stroke="#00000044" stroke-width="4" fill="none"/>
      <!-- Túi kangaroo bụng -->
      <rect x="${50 - bodyW / 3}" y="85" width="${bodyW * 0.66}" height="10" rx="3" fill="#0000001a"/>
      <!-- Dây rút hoodie -->
      <path d="M46 68 L45 78 M54 68 L55 78" stroke="#ffffffbb" stroke-width="1.4" stroke-linecap="round"/>`;
  } else if (a.top === 3) {
    // Áo dài truyền thống Việt Nam
    topSVG = `
      <!-- Thân áo ôm -->
      <path d="M${50 - shoulderW / 2} 62 L${50 + shoulderW / 2} 62 L${50 + bodyW / 2} 94 L${50 - bodyW / 2} 94 Z" fill="${tc}"/>
      <!-- Cổ tàu cao sang trọng -->
      <rect x="44" y="58" width="12" height="5" rx="2" fill="${tc}" stroke="#ffffff44" stroke-width="0.8"/>
      <!-- Tà áo dài thướt tha xẻ hông bay đến bắp chân -->
      <path d="M${50 - bodyW / 2 + 1} 94 L${50 + bodyW / 2 - 1} 94 L${50 + bodyW / 2 + 3} 138 L${50 - bodyW / 2 - 3} 138 Z" fill="${tc}" stroke="#0000001a" stroke-width="1"/>
      <!-- Viền cúc xéo ngực truyền thống -->
      <path d="M50 63 Q56 68 58 78" stroke="#ffffff77" stroke-width="1.2" fill="none"/>`;
  } else if (a.top === 4) {
    // Áo bà ba Nam Bộ
    topSVG = `
      <path d="M${50 - shoulderW / 2} 62 L${50 + shoulderW / 2} 62 L${50 + bodyW / 2} 96 L${50 - bodyW / 2} 96 Z" fill="${tc}"/>
      ${bellyFat}
      <!-- Cổ tròn xẻ giữa -->
      <path d="M44 62 Q50 68 56 62" stroke="#00000022" stroke-width="2" fill="none"/>
      <path d="M44 62 Q50 67 56 62 Z" fill="${sk}"/>
      <line x1="50" y1="67" x2="50" y2="96" stroke="#00000033" stroke-width="1.5"/>
      <!-- 2 túi áo dưới -->
      <rect x="${50 - bodyW / 2 + 2}" y="86" width="7" height="7" rx="1.5" fill="#00000022"/>
      <rect x="${50 + bodyW / 2 - 9}" y="86" width="7" height="7" rx="1.5" fill="#00000022"/>
      <circle cx="50" cy="74" r="1.3" fill="#ffffff"/>
      <circle cx="50" cy="82" r="1.3" fill="#ffffff"/>`;
  } else if (a.top === 5) {
    // Croptop (Nữ) hoặc Áo cộc
    topSVG = `
      <path d="M${50 - shoulderW / 2} 62 L${50 + shoulderW / 2} 62 L${50 + bodyW / 2} 84 L${50 - bodyW / 2} 84 Z" fill="${tc}"/>
      <!-- Lộ eo da -->
      <rect x="${50 - bodyW / 2 + 1}" y="84" width="${bodyW - 2}" height="10" fill="${sk}"/>
      <!-- Cổ áo vuông/tim -->
      <path d="M43 62 L45 70 L55 70 L57 62 Z" fill="${sk}"/>`;
  } else if (a.top === 6) {
    // Áo ba lỗ thể thao (Tank top)
    topSVG = `
      <path d="M${50 - shoulderW / 2 + 4} 62 L${50 + shoulderW / 2 - 4} 62 L${50 + bodyW / 2} 96 L${50 - bodyW / 2} 96 Z" fill="${tc}"/>
      ${bellyFat}
      <path d="M42 62 Q50 74 58 62 Z" fill="${sk}"/>`;
  }

  // 4. TAY & CÁNH TAY (Arms & Hands)
  const leftArmX = 50 - shoulderW / 2 - armThick / 2 + 2;
  const rightArmX = 50 + shoulderW / 2 + armThick / 2 - 2;
  const armSleeveLen = a.top === 6 ? 0 : (a.top === 2 || a.top === 3) ? 26 : 14;

  const armsSVG = `
    <!-- Tay trái -->
    <rect x="${leftArmX}" y="63" width="${armThick}" height="32" rx="${armThick / 2}" fill="${sk}"/>
    ${armSleeveLen > 0 ? `<rect x="${leftArmX - 0.5}" y="62" width="${armThick + 1}" height="${armSleeveLen}" rx="${armThick / 2}" fill="${tc}"/>` : ''}
    <circle cx="${leftArmX + armThick / 2}" cy="96" r="${armThick * 0.52}" fill="${sk}"/>

    <!-- Tay phải -->
    <rect x="${rightArmX - armThick}" y="63" width="${armThick}" height="32" rx="${armThick / 2}" fill="${sk}"/>
    ${armSleeveLen > 0 ? `<rect x="${rightArmX - armThick - 0.5}" y="62" width="${armThick + 1}" height="${armSleeveLen}" rx="${armThick / 2}" fill="${tc}"/>` : ''}
    <circle cx="${rightArmX - armThick / 2}" cy="96" r="${armThick * 0.52}" fill="${sk}"/>
  `;

  // 5. ĐẦU, CỔ & KHUÔN MẶT (Head, Neck, Face)
  const neckSVG = `<rect x="${50 - (w === 2 ? 6.5 : 5)}" y="52" width="${w === 2 ? 13 : 10}" height="12" rx="3" fill="${sk}"/>`;
  const headSVG = `
    <!-- Tai trái & Tai phải -->
    <circle cx="${50 - headRx}" cy="40" r="4.2" fill="${sk}"/>
    <circle cx="${50 + headRx}" cy="40" r="4.2" fill="${sk}"/>
    <!-- Khối đầu chính -->
    <ellipse cx="50" cy="38" rx="${headRx}" ry="${headRy}" fill="${sk}"/>
    <!-- Má phúng phính khi chubby -->
    ${w === 2 ? `<ellipse cx="50" cy="42" rx="${headRx + 1.2}" ry="12" fill="${sk}"/>` : ''}
  `;

  // Biểu cảm (Face expressions)
  let eyesAndMouth = '';
  // Má hồng
  const blush = `<circle cx="34" cy="44" r="4" fill="#f43f5e" opacity="0.35"/><circle cx="66" cy="44" r="4" fill="#f43f5e" opacity="0.35"/>`;

  if (faceIdx === 0) {
    // Cười nhẹ hiền dịu
    eyesAndMouth = `
      ${blush}
      <path d="M38 39 Q42 35 46 39" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M54 39 Q58 35 62 39" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M44 46 Q50 51 56 46" stroke="#991b1b" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (faceIdx === 1) {
    // Cười tươi mắt long lanh
    eyesAndMouth = `
      ${blush}
      <circle cx="42" cy="38" r="3.2" fill="#1e293b"/>
      <circle cx="43.2" cy="36.8" r="1.2" fill="#ffffff"/>
      <circle cx="58" cy="38" r="3.2" fill="#1e293b"/>
      <circle cx="59.2" cy="36.8" r="1.2" fill="#ffffff"/>
      <path d="M43 45 Q50 54 57 45 Z" fill="#991b1b"/>
      <path d="M46 45 Q50 48 54 45" fill="#f87171"/>`;
  } else if (faceIdx === 2) {
    // Nháy mắt tinh nghịch
    eyesAndMouth = `
      ${blush}
      <path d="M37 38 L42 41 L47 38" stroke="#1e293b" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="58" cy="38" r="3.2" fill="#1e293b"/>
      <circle cx="59.2" cy="36.8" r="1.2" fill="#ffffff"/>
      <path d="M45 46 Q50 52 55 46" stroke="#991b1b" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  } else if (faceIdx === 3) {
    // Đỏ mặt thẹn thùng
    eyesAndMouth = `
      <circle cx="34" cy="44" r="5.5" fill="#ef4444" opacity="0.6"/>
      <circle cx="66" cy="44" r="5.5" fill="#ef4444" opacity="0.6"/>
      <!-- Vạch ngượng -->
      <line x1="31" y1="42" x2="35" y2="46" stroke="#b91c1c" stroke-width="1.2"/>
      <line x1="34" y1="42" x2="38" y2="46" stroke="#b91c1c" stroke-width="1.2"/>
      <line x1="62" y1="42" x2="66" y2="46" stroke="#b91c1c" stroke-width="1.2"/>
      <line x1="65" y1="42" x2="69" y2="46" stroke="#b91c1c" stroke-width="1.2"/>
      <circle cx="42" cy="39" r="2.8" fill="#1e293b"/>
      <circle cx="58" cy="39" r="2.8" fill="#1e293b"/>
      <ellipse cx="50" cy="47" rx="3" ry="2" fill="#991b1b"/>`;
  } else if (faceIdx === 4) {
    // Ngơ ngác mắt tròn xoe
    eyesAndMouth = `
      ${blush}
      <circle cx="42" cy="38" r="4.5" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
      <circle cx="42" cy="38" r="2" fill="#1e293b"/>
      <circle cx="58" cy="38" r="4.5" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
      <circle cx="58" cy="38" r="2" fill="#1e293b"/>
      <circle cx="50" cy="47" r="2.5" fill="#991b1b"/>`;
  } else if (faceIdx === 5) {
    // Cười nhe răng há miệng (cực hợp khi bị cù lét)
    eyesAndMouth = `
      <circle cx="34" cy="44" r="5" fill="#f43f5e" opacity="0.5"/>
      <circle cx="66" cy="44" r="5" fill="#f43f5e" opacity="0.5"/>
      <path d="M37 37 Q42 32 47 37" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M53 37 Q58 32 63 37" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M42 45 Q50 56 58 45 Z" fill="#7f1d1d"/>
      <path d="M44 45 Q50 49 56 45" stroke="#ffffff" stroke-width="2" fill="none"/>
      <!-- Nước mắt cười lăn -->
      <path d="M31 40 Q28 44 31 46 Q33 44 31 40 Z" fill="#38bdf8"/>
      <path d="M69 40 Q72 44 69 46 Q67 44 69 40 Z" fill="#38bdf8"/>`;
  }

  // 6. TÓC PHÍA TRƯỚC (Front hair & Bangs)
  let frontHair = '';
  if (isFemale) {
    if (a.hair === 0) {
      // Dài xoăn sóng (Mái thưa)
      frontHair = `
        <path d="M30 38 Q29 16 50 16 Q71 16 70 38 Q64 26 50 26 Q36 26 30 38 Z" fill="${hc}"/>
        <path d="M42 26 Q44 33 46 33 M54 26 Q56 33 58 33" stroke="${hc}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M30 36 Q25 55 28 72 Q33 72 32 46 Z" fill="${hc}"/>
        <path d="M70 36 Q75 55 72 72 Q67 72 68 46 Z" fill="${hc}"/>`;
    } else if (a.hair === 1) {
      // Bob ngắn ôm cằm
      frontHair = `
        <path d="M29 38 Q28 16 50 16 Q72 16 71 38 Q62 25 50 25 Q38 25 29 38 Z" fill="${hc}"/>
        <path d="M29 36 Q26 52 32 58 Q36 58 34 42 Z" fill="${hc}"/>
        <path d="M71 36 Q74 52 68 58 Q64 58 66 42 Z" fill="${hc}"/>`;
    } else if (a.hair === 2) {
      // Đuôi ngựa mái bay
      frontHair = `
        <path d="M30 38 Q28 17 50 17 Q72 17 70 38 Q62 25 50 25 Q38 25 30 38 Z" fill="${hc}"/>
        <path d="M31 36 Q28 46 32 54" stroke="${hc}" stroke-width="3" stroke-linecap="round"/>
        <path d="M69 36 Q72 46 68 54" stroke="${hc}" stroke-width="3" stroke-linecap="round"/>`;
    } else if (a.hair === 3) {
      // Buộc 2 chùm mái bằng
      frontHair = `
        <path d="M29 38 Q28 16 50 16 Q72 16 71 38 Q65 28 50 28 Q35 28 29 38 Z" fill="${hc}"/>
        <path d="M34 28 L34 35 Q42 36 50 35 Q58 36 66 35 L66 28 Z" fill="${hc}"/>`;
    } else if (a.hair === 4) {
      // Búi củ tỏi mái ngố
      frontHair = `
        <path d="M30 38 Q28 17 50 17 Q72 17 70 38 Q64 27 50 27 Q36 27 30 38 Z" fill="${hc}"/>
        <path d="M36 27 Q50 32 64 27 L64 34 Q50 36 36 34 Z" fill="${hc}"/>`;
    } else if (a.hair === 5) {
      // Layer vai
      frontHair = `
        <path d="M29 38 Q28 16 50 16 Q72 16 71 38 Q64 26 50 26 Q36 26 29 38 Z" fill="${hc}"/>
        <path d="M29 36 Q25 56 30 68" stroke="${hc}" stroke-width="4" stroke-linecap="round"/>
        <path d="M71 36 Q75 56 70 68" stroke="${hc}" stroke-width="4" stroke-linecap="round"/>`;
    } else if (a.hair === 6) {
      // Tóc tém cá tính
      frontHair = `
        <path d="M28 38 Q26 15 50 15 Q74 15 72 38 Q65 24 50 24 Q35 24 28 38 Z" fill="${hc}"/>
        <path d="M32 26 L38 34 M44 25 L47 33 M56 25 L53 33 M68 26 L62 34" stroke="${hc}" stroke-width="3" stroke-linecap="round"/>`;
    }
  } else {
    // TÓC NAM
    if (a.hair === 0) {
      // Undercut vuốt lệch bảnh bao
      frontHair = `
        <path d="M28 36 Q27 13 46 13 Q72 13 72 36 Q64 22 48 22 Q34 22 28 36 Z" fill="${hc}"/>
        <path d="M36 18 Q48 10 66 18" stroke="${hc}" stroke-width="5" stroke-linecap="round"/>`;
    } else if (a.hair === 1) {
      // 2 mái rủ Hàn Quốc (Two-block)
      frontHair = `
        <path d="M28 36 Q27 15 50 15 Q73 15 72 36 Q64 23 50 23 Q36 23 28 36 Z" fill="${hc}"/>
        <path d="M34 23 Q40 34 46 30" stroke="${hc}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M66 23 Q60 34 54 30" stroke="${hc}" stroke-width="4.5" stroke-linecap="round"/>`;
    } else if (a.hair === 2) {
      // Xoăn nhẹ layer trẻ trung
      frontHair = `
        <path d="M28 36 Q26 14 50 14 Q74 14 72 36 Q64 23 50 23 Q36 23 28 36 Z" fill="${hc}"/>
        <circle cx="38" cy="20" r="4.5" fill="${hc}"/>
        <circle cx="48" cy="18" r="5" fill="${hc}"/>
        <circle cx="58" cy="19" r="4.5" fill="${hc}"/>
        <circle cx="44" cy="25" r="3.5" fill="${hc}"/>
        <circle cx="54" cy="25" r="3.5" fill="${hc}"/>`;
    } else if (a.hair === 3) {
      // Đầu nấm dễ thương
      frontHair = `
        <path d="M27 38 Q26 14 50 14 Q74 14 73 38 Z" fill="${hc}"/>
        <rect x="33" y="27" width="34" height="6" rx="2" fill="${hc}"/>`;
    } else if (a.hair === 4) {
      // Vuốt dựng thể thao
      frontHair = `
        <path d="M28 36 Q27 16 50 16 Q73 16 72 36 Q64 24 50 24 Q36 24 28 36 Z" fill="${hc}"/>
        <polygon points="40,18 45,8 48,17" fill="${hc}"/>
        <polygon points="46,17 50,6 54,17" fill="${hc}"/>
        <polygon points="52,17 56,9 60,18" fill="${hc}"/>`;
    } else if (a.hair === 5) {
      // Cột búi lãng tử
      frontHair = `
        <path d="M28 36 Q27 15 50 15 Q73 15 72 36 Q64 24 50 24 Q36 24 28 36 Z" fill="${hc}"/>
        <path d="M30 35 Q36 22 50 22 Q64 22 70 35" stroke="${hc}" stroke-width="3" fill="none"/>`;
    } else if (a.hair === 6) {
      // Đầu đinh / Buzz cut
      frontHair = `<path d="M30 36 Q28 17 50 17 Q72 17 70 36 Q62 26 50 26 Q38 26 30 36 Z" fill="${hc}" opacity="0.6"/>`;
    }
  }

  // 7. PHỤ KIỆN (Accessories)
  let accSVG = '';
  if (a.acc === 1) {
    // Kính tròn Nobita
    accSVG = `
      <g stroke="#1e293b" stroke-width="1.8" fill="none">
        <circle cx="42" cy="38" r="5.5"/>
        <circle cx="58" cy="38" r="5.5"/>
        <line x1="47.5" y1="38" x2="52.5" y2="38"/>
        <line x1="36.5" y1="38" x2="31" y2="37"/>
        <line x1="63.5" y1="38" x2="69" y2="37"/>
      </g>`;
  } else if (a.acc === 2) {
    // Kính râm ngầu
    accSVG = `
      <g fill="#0f172a" stroke="#000" stroke-width="1">
        <path d="M36 34 L48 34 L47 43 Q42 45 37 43 Z"/>
        <path d="M52 34 L64 34 L63 43 Q58 45 53 43 Z"/>
        <line x1="48" y1="35" x2="52" y2="35" stroke="#0f172a" stroke-width="2"/>
        <!-- Ánh bóng kính râm -->
        <line x1="38" y1="36" x2="41" y2="42" stroke="#ffffff66" stroke-width="1.2"/>
        <line x1="54" y1="36" x2="57" y2="42" stroke="#ffffff66" stroke-width="1.2"/>
      </g>`;
  } else if (a.acc === 3) {
    // Kẹp hoa / nơ cài tóc
    accSVG = `
      <circle cx="68" cy="24" r="4.5" fill="#f43f5e"/>
      <circle cx="68" cy="24" r="2" fill="#fef08a"/>
      <circle cx="64" cy="22" r="3" fill="#fb7185"/>
      <circle cx="72" cy="22" r="3" fill="#fb7185"/>`;
  } else if (a.acc === 4) {
    // Tai nghe Headphone gaming chụp tai
    accSVG = `
      <!-- Vòng cung quàng qua đầu -->
      <path d="M28 38 Q26 10 50 10 Q74 10 72 38" stroke="#0f172a" stroke-width="4" fill="none"/>
      <!-- Hai củ loa ốp tai -->
      <rect x="25" y="32" width="6" height="14" rx="3" fill="${tc}" stroke="#0f172a" stroke-width="1.2"/>
      <rect x="69" y="32" width="6" height="14" rx="3" fill="${tc}" stroke="#0f172a" stroke-width="1.2"/>`;
  } else if (a.acc === 5) {
    // Khẩu trang cute
    accSVG = `
      <rect x="40" y="42" width="20" height="11" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <line x1="33" y1="44" x2="40" y2="44" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="60" y1="44" x2="67" y2="44" stroke="#ffffff" stroke-width="1.5"/>
      <!-- Mũi gấu trên khẩu trang -->
      <circle cx="50" cy="46" r="1.5" fill="#1e293b"/>
      <path d="M48 48 Q50 50 52 48" stroke="#1e293b" stroke-width="1" fill="none"/>`;
  }

  // 8. MŨ & KHĂN (Hats)
  let hatSVG = '';
  if (a.hat === 1) {
    // Nón lá Việt Nam
    hatSVG = `
      <path d="M12 36 Q50 -6 88 36 Q50 28 12 36 Z" fill="#fef08a" stroke="#ca8a04" stroke-width="1.2"/>
      <!-- Quai nón hồng duyên dáng -->
      <path d="M32 36 Q34 52 50 56 Q66 52 68 36" stroke="#f43f5e" stroke-width="1.8" fill="none"/>`;
  } else if (a.hat === 2) {
    // Khăn rằn Nam Bộ
    hatSVG = `
      <path d="M26 30 Q50 14 74 30 L74 36 Q50 22 26 36 Z" fill="#ffffff" stroke="#334155" stroke-width="1"/>
      <path d="M27 30 Q50 18 73 30" stroke="#0284c7" stroke-width="3" stroke-dasharray="3 3" fill="none"/>
      <!-- Dải khăn buông xéo vai -->
      <path d="M70 32 L78 52 L73 53 L67 36 Z" fill="#ffffff" stroke="#334155" stroke-width="0.8"/>
      <line x1="71" y1="36" x2="76" y2="52" stroke="#0284c7" stroke-width="2" stroke-dasharray="3 3"/>`;
  } else if (a.hat === 3) {
    // Mũ lưỡi trai (Snapback)
    hatSVG = `
      <path d="M28 32 Q50 10 72 32 Z" fill="${tc}" stroke="#00000033" stroke-width="1"/>
      <!-- Vành mũ chìa ra -->
      <path d="M52 32 H86 Q84 37 54 37 Z" fill="${tc}" stroke="#00000033" stroke-width="1"/>`;
  } else if (a.hat === 4) {
    // Khăn đóng truyền thống
    hatSVG = `
      <path d="M28 32 Q28 12 50 10 Q72 12 72 32 Q50 26 28 32 Z" fill="#1e3a8a"/>
      <path d="M30 26 Q50 18 70 26" stroke="#facc15" stroke-width="2" fill="none"/>
      <circle cx="50" cy="18" r="3" fill="#facc15"/>`;
  } else if (a.hat === 5) {
    // Mũ len Beanie mùa đông
    hatSVG = `
      <path d="M28 32 Q30 8 50 8 Q70 8 72 32 Z" fill="${tc}"/>
      <!-- Vành gập mũ len -->
      <rect x="27" y="27" width="46" height="7" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8"/>
      <!-- Quả bông len trên đỉnh -->
      <circle cx="50" cy="7" r="4.5" fill="#f8fafc"/>`;
  }

  // Kết hợp tất cả các lớp theo thứ tự chiều sâu
  return `
    ${backHair}
    ${renderShoes(legLeftX, false)}
    ${renderShoes(legRightX, true)}
    ${bottomSVG}
    ${armsSVG}
    ${neckSVG}
    ${topSVG}
    ${headSVG}
    ${eyesAndMouth}
    ${frontHair}
    ${accSVG}
    ${hatSVG}
  `;
}

// Hàm xuất SVG hoàn chỉnh
// w: chiều rộng hiển thị
// opts: { crop: 'head' | 'full', overrideFace, animate }
export function avatarSVG(raw, w = 64, opts = {}) {
  const isHeadOnly = opts.crop === 'head' || (opts.crop !== 'full' && w <= 36);

  if (isHeadOnly) {
    // Hiển thị khung tròn cận cảnh khuôn mặt (Headshot avatar badge)
    const h = w;
    return `<svg class="avatar avatar-head" width="${w}" height="${h}" viewBox="22 10 56 56" role="img" aria-label="Avatar Chibi">
      <defs>
        <clipPath id="headClip-${w}-${Math.random().toString(36).slice(2, 6)}">
          <circle cx="50" cy="38" r="28" />
        </clipPath>
      </defs>
      <g clip-path="url(#headClip-${w})">
        <circle cx="50" cy="38" r="28" fill="#ffffff12"/>
        ${avatarInner(raw, opts)}
      </g>
    </svg>`;
  }

  // Hiển thị toàn thân nhân vật (viewBox 0 0 100 160)
  const h = Math.round(w * 1.6);
  return `<svg class="avatar avatar-full" width="${w}" height="${h}" viewBox="0 0 100 160" role="img" aria-label="Avatar Toàn Thân">
    ${avatarInner(raw, opts)}
  </svg>`;
}

export const getAvatar = () => norm(store.get('avatar', {}));
export const setAvatar = a => store.set('avatar', norm(a));

export const randomAvatar = () => {
  const gender = Math.random() < 0.5 ? 0 : 1;
  return {
    gender,
    weight: Math.random() * LEN.weight | 0,
    skin: Math.random() * LEN.skin | 0,
    hair: Math.random() * LEN.hair | 0,
    hairC: Math.random() * LEN.hairC | 0,
    face: Math.random() * LEN.face | 0,
    top: Math.random() * LEN.top | 0,
    topC: Math.random() * LEN.topC | 0,
    bot: Math.random() * LEN.bot | 0,
    botC: Math.random() * LEN.botC | 0,
    shoes: Math.random() * LEN.shoes | 0,
    hat: Math.random() * LEN.hat | 0,
    acc: Math.random() * LEN.acc | 0
  };
};

export const encode = a => btoa(JSON.stringify(norm(a)));
export function decode(s) {
  try {
    return norm(JSON.parse(atob(s.trim())));
  } catch {
    return null;
  }
}
