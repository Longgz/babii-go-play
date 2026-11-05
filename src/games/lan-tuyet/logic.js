// Physics lives only on the screen hosting the match. Network packets contain
// intentions and summaries, never positions, velocities or ball radii.
export const COLORS = ['#ff5d73', '#ffc93c', '#3ddc97', '#4da3ff', '#b57bff', '#ff9340'];
export const SHAPES = ['●', '▲', '■', '◆', '★', '✚'];
export const DT = 1 / 60, DURATION = 45, ROUND_COUNT = 3, COOLDOWN = 2;
export const ARENA = 240, MIN_ARENA = 105, RADIUS = 14, MAX_RADIUS = 32;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function vector(x, y) {
  x = Number.isFinite(x) ? clamp(x, -1, 1) : 0; y = Number.isFinite(y) ? clamp(y, -1, 1) : 0;
  const d = Math.max(1, Math.hypot(x, y)); return { x: x / d, y: y / d };
}
export function createWorld(players, round = 1) {
  if (players.length < 2 || players.length > 6 || new Set(players.map(p => p.uid)).size !== players.length) throw new Error('Cần từ 2 đến 6 người chơi khác nhau.');
  return { elapsed: 0, arena: ARENA, over: false, events: [], players: players.map((p, i) => {
    const a = i * 2 * Math.PI / players.length - Math.PI / 2 + (round - 1) * .65;
    return { uid: p.uid, name: p.name, color: COLORS[i], shape: SHAPES[i], x: Math.cos(a) * 145, y: Math.sin(a) * 145, vx: 0, vy: 0, r: RADIUS, alive: true, rank: 0, points: 0, dashCd: 0, lastDash: 0, heading: a + Math.PI, roll: 0, fallenAt: -1, lastSeen: 0 };
  }) };
}
// Only a NEW sequence refreshes this player's liveness. An unrelated player's
// update to the shared Firebase parent must not keep stale inputs alive.
export function ingest(inputs, packets, players, id, round, now) {
  const accepted = new Map(inputs);
  for (const p of players) {
    const v = packets?.[p.uid]?.[p.token];
    if (!v || v.id !== id || v.round !== round || !Number.isSafeInteger(v.seq) || v.seq < 0 || !Number.isSafeInteger(v.dash) || v.dash < 0 || !Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
    const prev = accepted.get(p.uid);
    if (prev && v.seq <= prev.seq) continue;
    accepted.set(p.uid, { ...vector(v.x, v.y), seq: v.seq, dash: Math.max(prev?.dash || 0, v.dash), seen: now });
  }
  return accepted;
}
export function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), sum = a.r + b.r;
  if (d >= sum) return false;
  const nx = d > .000001 ? dx / d : 1, ny = d > .000001 ? dy / d : 0;
  const ma = a.r * a.r, mb = b.r * b.r, overlap = sum - d;
  a.x -= nx * overlap * mb / (ma + mb); a.y -= ny * overlap * mb / (ma + mb);
  b.x += nx * overlap * ma / (ma + mb); b.y += ny * overlap * ma / (ma + mb);
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative < 0) {
    const j = -1.72 * relative / (1 / ma + 1 / mb);
    a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny;
  }
  return relative < -15;
}
export function step(world, inputs, now, dt = DT) {
  if (world.over) return [];
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(now)) return [];
  dt = Math.min(dt, DT); world.elapsed += dt;
  const events = [], living = world.players.filter(p => p.alive);
  for (const p of living) {
    const input = inputs.get(p.uid), fresh = input && now - input.seen < 800;
    if (input) p.lastSeen = input.seen;
    const v = fresh ? vector(input.x, input.y) : { x: 0, y: 0 };
    const mass = (p.r / RADIUS) ** 2, speed = Math.hypot(v.x, v.y);
    if (speed > .05) p.heading = Math.atan2(v.y, v.x);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.vx += v.x * 330 / mass * dt; p.vy += v.y * 330 / mass * dt;
    if (input && input.dash > p.lastDash) {
      // Consume even during cooldown/stale input. It must never fire later.
      p.lastDash = input.dash;
      if (fresh && p.dashCd <= 0) {
        p.vx += Math.cos(p.heading) * 195 / Math.sqrt(mass); p.vy += Math.sin(p.heading) * 195 / Math.sqrt(mass);
        p.dashCd = COOLDOWN; events.push({ type: 'dash', uid: p.uid, x: p.x, y: p.y });
      }
    }
    p.vx *= Math.exp(-2.1 * dt); p.vy *= Math.exp(-2.1 * dt);
    const velocity = Math.hypot(p.vx, p.vy), cap = Math.min(1, 330 / Math.max(1, velocity));
    p.vx *= cap; p.vy *= cap;
    const traveled = Math.hypot(p.vx, p.vy) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.roll += traveled / p.r;
    p.r = Math.min(MAX_RADIUS, p.r + .015 * traveled);
  }
  for (let i = 0; i < living.length; i++) for (let j = i + 1; j < living.length; j++) {
    if (collide(living[i], living[j])) events.push({ type: 'bump', x: (living[i].x + living[j].x) / 2, y: (living[i].y + living[j].y) / 2 });
  }
  world.arena = Math.max(MIN_ARENA, ARENA - (ARENA - MIN_ARENA) * world.elapsed / DURATION);
  const fallen = living.filter(p => Math.hypot(p.x, p.y) > world.arena + p.r * .5 || now - p.lastSeen > 10000);
  // Simultaneous eliminations share a rank, independent of array order.
  const rank = living.length - fallen.length + 1;
  for (const p of fallen) {
    p.alive = false; p.rank = rank; p.fallenAt = world.elapsed;
    events.push({ type: 'fall', uid: p.uid, x: p.x, y: p.y, offline: now - p.lastSeen > 10000 });
  }
  const remaining = world.players.filter(p => p.alive);
  if (remaining.length <= 1 || world.elapsed >= DURATION) {
    world.over = true;
    // Survivors at the time limit tie for first; no arbitrary tiebreaker.
    remaining.forEach(p => { p.rank = 1; });
    world.players.forEach(p => { p.points = Math.max(0, 4 - p.rank); });
    events.push({ type: 'end' });
  }
  world.events = events; return events;
}
export function summary(world, now) {
  return Object.fromEntries(world.players.map(p => [p.uid, {
    alive: p.alive, rank: p.rank, points: p.points, dashUntil: now + p.dashCd * 1000,
    connected: now - p.lastSeen < 800, offline: now - p.lastSeen > 10000
  }]));
}
