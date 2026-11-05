import { ARENA } from './logic.js';

export function renderer(canvas) {
  const g = canvas.getContext('2d');
  let particles = [], cheers = [], shake = 0;
  function emit(events, world, reduced) {
    if (reduced) return;
    for (const e of events) {
      if (e.type === 'bump') shake = .15;
      const n = e.type === 'end' ? 45 : e.type === 'fall' ? 12 : 6;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, speed = 30 + Math.random() * 90;
        particles.push({ x: e.x || 0, y: e.y || 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: e.type === 'end' ? 2.5 : .6, color: e.type === 'end' ? world.players[i % world.players.length].color : '#ecfaff' });
      }
    }
    particles = particles.slice(-48);
  }
  function cheer(text) { cheers.push({ text, x: Math.random() * 250 - 125, y: 180, life: 2.5 }); cheers = cheers.slice(-6); }
  function draw(world, time, dt, reduced = false) {
    if (!g) return;
    const box = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = box.width, height = box.height;
    g.fillStyle = '#0a162e'; g.fillRect(0, 0, width, height);
    g.save(); g.translate(width / 2, height / 2 + 4);
    const scale = Math.min(width / 690, height / 600); g.scale(scale, scale);
    shake = Math.max(0, shake - dt);
    if (shake && !reduced) g.translate(Math.sin(time * 100) * 3, Math.cos(time * 94) * 2);
    const radius = world?.arena || ARENA, elapsed = world?.elapsed || 0;
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.ellipse(0, 10, radius + 24 + i * 32, radius + 15 + i * 30, 0, 0, Math.PI * 2); g.strokeStyle = `rgba(95,163,207,${.1 - i * .02})`; g.lineWidth = 2; g.stroke();
    }
    g.beginPath(); g.arc(0, 9, radius + 2, 0, Math.PI * 2); g.fillStyle = '#76a3d1'; g.fill();
    g.beginPath();
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, r = radius + (i % 2 ? 2 : -3); i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); const ice = g.createRadialGradient(-45, -70, 10, 0, 0, radius); ice.addColorStop(0, '#f6fbff'); ice.addColorStop(1, '#c4def3'); g.fillStyle = ice; g.fill();
    g.strokeStyle = elapsed > 35 ? '#ed8298' : '#9fc3ec'; g.lineWidth = 4; g.stroke();
    g.save(); g.clip();
    for (let i = 0; i < 38; i++) {
      const a = i * 2.399, r = Math.sqrt(i / 38) * radius;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      g.strokeStyle = '#a9c9e333'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 8 + i % 7, .2, 2.3); g.stroke();
    }
    g.restore();
    for (const p of world?.players || []) {
      const fall = p.alive ? 0 : elapsed - p.fallenAt;
      if (!p.alive && (fall > .8 || reduced)) continue;
      g.save(); g.translate(p.x, p.y);
      if (!p.alive) {
        g.beginPath(); g.arc(0, 0, p.r + fall * 35, 0, 2 * Math.PI); g.strokeStyle = `rgba(190,225,255,${Math.max(0, .7 - fall)})`; g.stroke();
        const shrink = Math.max(.02, 1 - fall / .8); g.scale(shrink, shrink); g.rotate(fall * 3);
      }
      if (p.dashCd > 1.7 && !reduced) {
        g.save(); g.rotate(p.heading); const trail = g.createLinearGradient(-p.r - 60, 0, 0, 0); trail.addColorStop(0, '#eaf3ff00'); trail.addColorStop(1, '#eaf3ff99'); g.fillStyle = trail;
        g.beginPath(); g.moveTo(-p.r - 60, 0); g.lineTo(0, -p.r * .7); g.lineTo(0, p.r * .7); g.fill(); g.restore();
      }
      g.fillStyle = '#1a2c4c22'; g.beginPath(); g.ellipse(4, p.r * .65, p.r * 1.1, p.r * .6, 0, 0, 2 * Math.PI); g.fill();
      const ball = g.createRadialGradient(-p.r * .35, -p.r * .4, 1, 0, 0, p.r); ball.addColorStop(0, '#ffffff'); ball.addColorStop(1, '#c7dfef');
      g.fillStyle = ball; g.strokeStyle = p.color; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, p.r, 0, 2 * Math.PI); g.fill(); g.stroke();
      g.save(); g.rotate(reduced ? 0 : p.roll); g.beginPath(); g.arc(0, 0, p.r * .65, 0, Math.PI * 1.4); g.strokeStyle = '#86a9c655'; g.lineWidth = 2; g.stroke(); g.restore();
      g.fillStyle = '#223453'; g.font = `bold ${Math.max(13, p.r * .75)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.shape, 0, 1);
      g.restore();
      if (p.alive) {
        const name = p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name;
        g.font = 'bold 13px system-ui'; const tw = g.measureText(name).width;
        g.fillStyle = '#111b36ed'; g.beginPath(); g.roundRect(p.x - tw / 2 - 7, p.y - p.r - 27, tw + 14, 20, 8); g.fill();
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, p.x, p.y - p.r - 17);
      }
    }
    if (!reduced) {
      // 30 background flakes + at most 48 effect particles = fewer than 80.
      for (let i = 0; i < 30; i++) {
        const x = Math.sin(i * 87.21) * 340 + Math.sin(time * .4 + i) * 12, y = ((i * 59 + time * (8 + i % 9)) % 630) - 315;
        g.fillStyle = '#ffffff55'; g.beginPath(); g.arc(x, y, 1 + i % 2, 0, 2 * Math.PI); g.fill();
      }
      particles = particles.filter(p => (p.life -= dt) > 0);
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = p.color; g.globalAlpha = Math.min(1, p.life); g.fillRect(p.x, p.y, 4, 4); }
      g.globalAlpha = 1;
    } else particles = [];
    cheers = cheers.filter(p => (p.life -= dt) > 0);
    for (const p of cheers) { p.y -= dt * 65; g.font = '30px system-ui'; g.textAlign = 'center'; g.fillText(p.text, p.x, p.y); }
    g.restore();
  }
  return { draw, emit, cheer };
}
