import 'pannellum/build/pannellum.css';
// p = { url, haov, vaov, vOffset }. Ảnh 360° đầy đủ: haov 360, vaov 180. Ảnh panorama một phần: nhập góc thật.
export async function openPano(el, p) {
  await import('pannellum/build/pannellum.js');
  const full = !p.haov || p.haov >= 360;
  return window.pannellum.viewer(el, { type: 'equirectangular', panorama: p.url, autoLoad: true, compass: false,
    haov: p.haov || 360, vaov: p.vaov || 180, vOffset: p.vOffset || 0, hfov: full ? 100 : Math.min(100, p.haov), minHfov: 40, maxHfov: 120 });
}
