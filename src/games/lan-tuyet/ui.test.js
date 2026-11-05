import test from 'node:test';
import assert from 'node:assert/strict';
import game from './index.js';

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function environment(t) {
  let time = 100000, perf = performance.now(), count = 0;
  const frames = new Map(), timers = new Map(), listeners = new Map(), storage = new Map(), restorers = [], cleanup = [];
  t.after(() => { cleanup.forEach(fn => fn()); restorers.forEach(fn => fn()); });
  const setGlobal = (key, value) => {
    const before = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    restorers.push(() => { if (before) Object.defineProperty(globalThis, key, before); else delete globalThis[key]; });
  };
  const listen = (k, cb) => { if (!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k).add(cb); };
  const unlisten = (k, cb) => listeners.get(k)?.delete(cb);
  const document = { hidden: false, addEventListener: listen, removeEventListener: unlisten };
  setGlobal('document', document); setGlobal('addEventListener', listen); setGlobal('removeEventListener', unlisten);
  setGlobal('matchMedia', () => ({ matches: false })); setGlobal('confirm', () => true);
  setGlobal('sessionStorage', { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) });
  setGlobal('requestAnimationFrame', fn => { frames.set(++count, fn); return count; });
  setGlobal('cancelAnimationFrame', id => frames.delete(id));
  setGlobal('setInterval', (fn, ms) => { timers.set(++count, { fn, ms, next: time + ms }); return count; });
  setGlobal('clearInterval', id => timers.delete(id));
  return {
    now: () => time, frames, timers, listeners, document, dispose: fn => cleanup.push(fn),
    async advance(ms) {
      for (let left = ms; left > 0;) {
        const dt = Math.min(16.667, left); left -= dt; time += dt; perf += dt;
        for (const timer of timers.values()) if (time >= timer.next) { timer.next = time + timer.ms; timer.fn(); }
        const todo = [...frames.values()]; frames.clear(); todo.forEach(fn => fn(perf)); await settle();
      }
    },
    emit: k => [...(listeners.get(k) || [])].forEach(fn => fn()),
  };
}
function server(env) {
  const data = {}, watchers = new Set(), copy = v => structuredClone(v);
  const get = p => p.split('/').reduce((o, k) => o?.[k], data) ?? null;
  const set = (p, v) => {
    const parts = p.split('/'), last = parts.pop(); let o = data;
    for (const k of parts) o = o[k] ??= {};
    if (v == null) delete o[last]; else o[last] = copy(v);
    for (const s of watchers) {
      const next = JSON.stringify(get(s.p)); if (next !== s.last) { s.last = next; s.fn(copy(get(s.p))); }
    }
  };
  return { get, watchers, client() {
    let online = true, connection, denied = false;
    return {
      code: 'ABCDEF', now: env.now, players: () => [],
      watch(p, fn, fail) {
        if (denied) { fail?.(Object.assign(new Error('permission_denied at /snow/frame'), { code: 'PERMISSION_DENIED' })); return () => {}; }
        const sub = { p, fn, last: JSON.stringify(get(p)) }; watchers.add(sub); fn(copy(get(p))); return () => watchers.delete(sub);
      },
      deny(v) { denied = v; },
      connection(fn) { connection = fn; fn(online); return () => { connection = null; }; },
      async onDisconnect() { return async () => {}; },
      connected(v) { online = v; connection?.(v); },
      async set(p, v) { if (!online) throw new Error('offline'); set(p, v); },
      async transact(p, fn) {
        if (!online) throw new Error('offline');
        const next = fn(copy(get(p))); if (next !== undefined) set(p, next);
        return { committed: next !== undefined, value: copy(get(p)) };
      },
    };
  } };
}
function mount(room, uid) {
  const slots = new Map(), cleanup = [];
  const el = { innerHTML: '', querySelector(selector) {
    if (!slots.has(selector)) slots.set(selector, {
      innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, dataset: {},
      style: { setProperty() {} }, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {},
      getContext: () => null, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 230 })
    });
    return slots.get(selector);
  } };
  game.mount(el, { room, me: { uid, name: uid }, store: { get: (k, fallback) => fallback, set() {} }, onLeave: fn => cleanup.push(fn), toast() {} });
  const q = s => el.querySelector(s);
  return {
    el, q, room,
    async click(a) { el.onclick({ target: { closest: () => ({ dataset: { a }, disabled: false, setAttribute() {} }) } }); await settle(); },
    leave() { cleanup.splice(0).forEach(fn => fn()); },
  };
}
async function group(t) {
  const env = environment(t), srv = server(env), a = mount(srv.client(), 'a'), b = mount(srv.client(), 'b');
  env.dispose(() => { a.leave(); b.leave(); });
  await settle(); await env.advance(1100);
  return { env, srv, host: a, a, b };
}

test('two players automatically enter, ready up and complete three rounds on their own screens', async t => {
  const { env, srv, host, a, b } = await group(t);
  assert.match(a.q('.snow-message').textContent, /2\/6/);
  assert.doesNotMatch(a.el.innerHTML, /Mở màn hình chung|Dùng làm tay cầm|Xoay ngang/);
  for (let round = 1; round <= 3; round++) {
    await a.click('ready'); assert.notEqual(srv.get('snow/state').phase, 'countdown');
    await b.click('ready'); await env.advance(550); assert.equal(srv.get('snow/state').phase, 'countdown');
    await env.advance(4000); assert.equal(srv.get('snow/state').phase, 'playing');
    assert.equal(srv.get('snow/state').round, round);
    assert.equal(a.q('.snow-dash').disabled, false); assert.equal(b.q('.snow-dash').disabled, false);
    const snapshot = srv.get('snow/frame'); assert.deepEqual(Object.keys(snapshot.balls).sort(), ['a', 'b']);
    assert.ok(Number.isFinite(snapshot.balls.a.x)); assert.equal(b.q('.snow-stage').hidden, false);
    await env.advance(46000);
    const s = srv.get('snow/state'); assert.equal(s.phase, round < 3 ? 'results' : 'ended');
    assert.equal(a.q('.snow-results').innerHTML, b.q('.snow-results').innerHTML);
    assert.equal(s.scores.a, round * 3); assert.equal(s.scores.b, round * 3);
  }
  assert.match(host.q('.snow-results').innerHTML, /đồng thắng/);
  const oldId = srv.get('snow/state').id;
  await a.click('ready'); await b.click('ready'); await env.advance(600);
  assert.notEqual(srv.get('snow/state').id, oldId); assert.equal(srv.get('snow/state').phase, 'countdown');
  assert.equal(srv.get('snow/state').round, 1);
});
test('touch movement, simultaneous dash, pointer cancellation and cooldown remain synchronized', async t => {
  const { env, srv, a, b } = await group(t);
  await a.click('ready'); await b.click('ready'); await env.advance(4500);
  const pad = a.q('.snow-pad'), e = { pointerId: 1, clientX: 150, clientY: 105, button: 0, preventDefault() {} };
  pad.onpointerdown(e); pad.onpointermove({ ...e, clientX: 195 });
  a.q('.snow-dash').onpointerdown(e); await env.advance(150);
  const p = srv.get('snow/state').players.find(p => p.uid === 'a'), packet = srv.get(`snow/inputs/a/${p.token}`);
  assert.ok(packet.x > .8); assert.equal(packet.dash, 1);
  assert.ok(srv.get('snow/state').status.a.dashUntil > env.now());
  a.q('.snow-dash').onpointerdown(e); await env.advance(100); assert.equal(srv.get(`snow/inputs/a/${p.token}`).dash, 1);
  pad.onpointercancel(e); await env.advance(100); assert.equal(srv.get(`snow/inputs/a/${p.token}`).x, 0);
  await env.advance(2200); assert.equal(a.q('.snow-dash').disabled, false);
});
test('late joiners see the board and wait; connection recovery resets the lobby without choosing a host', async t => {
  const { env, srv, host, a, b } = await group(t);
  await a.click('ready'); await b.click('ready'); await env.advance(4500);
  const visitor = mount(srv.client(), 'visitor'); env.dispose(() => visitor.leave());
  await env.advance(600); assert.equal(srv.get('snow/state').players.length, 2);
  assert.match(visitor.q('.snow-control-status').textContent, /Đang xem/); assert.equal(visitor.q('.snow-stage').hidden, false);
  const oldId = srv.get('snow/state').id;
  host.room.connected(false); await env.advance(1000); host.room.connected(true); await env.advance(1500);
  assert.equal(srv.get('snow/state').phase, 'lobby'); assert.notEqual(srv.get('snow/state').id, oldId);
  assert.equal(a.q('.snow-dash').disabled, true); assert.match(a.q('.snow-ready').innerHTML, /Sẵn sàng/);
});
test('hidden host stops the round and unmount removes every subscription, frame and interval', async t => {
  const { env, srv, host, a, b } = await group(t);
  await a.click('ready'); await b.click('ready'); await env.advance(4500);
  env.document.hidden = true; env.emit('visibilitychange'); await settle();
  assert.equal(srv.get('snow/state').phase, 'closed');
  host.leave(); a.leave(); b.leave(); await settle();
  assert.equal(srv.watchers.size, 0); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  assert.ok([...env.listeners.values()].every(s => s.size === 0));
});
test('one player cannot start alone and cancelling readiness keeps the lobby waiting', async t => {
  const env = environment(t), srv = server(env), a = mount(srv.client(), 'a'); env.dispose(() => a.leave());
  await settle(); await env.advance(1100); await a.click('ready'); await env.advance(1100);
  assert.equal(srv.get('snow/state').phase, 'lobby');
  await a.click('ready');
  const b = mount(srv.client(), 'b'); env.dispose(() => b.leave()); await env.advance(1100);
  await b.click('ready'); await env.advance(600); assert.equal(srv.get('snow/state').phase, 'lobby');
  await a.click('ready'); await env.advance(600); assert.equal(srv.get('snow/state').phase, 'countdown');
});
test('reopening a participant restores the same ball and dash counter during an active round', async t => {
  const { env, srv, a, b } = await group(t);
  await a.click('ready'); await b.click('ready'); await env.advance(4500);
  b.q('.snow-dash').onpointerdown({ preventDefault() {} }); await env.advance(150);
  const before = srv.get('snow/state'), seat = before.players.find(p => p.uid === 'b');
  assert.equal(srv.get(`snow/inputs/b/${seat.token}`).dash, 1);
  b.leave(); await settle();
  const reopened = mount(srv.client(), 'b'); env.dispose(() => reopened.leave()); await env.advance(2300);
  assert.equal(srv.get('snow/state').id, before.id); assert.equal(srv.get('snow/peers/b').token, seat.token);
  assert.equal(reopened.q('.snow-dash').disabled, false);
  reopened.q('.snow-dash').onpointerdown({ preventDefault() {} }); await env.advance(150);
  assert.equal(srv.get(`snow/inputs/b/${seat.token}`).dash, 2);
});
test('denied access shows a stopped state and retry resubscribes after rules are fixed', async t => {
  const env = environment(t), srv = server(env), room = srv.client(); room.deny(true);
  const a = mount(room, 'a'); env.dispose(() => a.leave()); await env.advance(1200);
  assert.match(a.q('.snow-error').textContent, /quyền truy cập/);
  assert.equal(a.q('.snow-retry').hidden, false); assert.equal(a.q('.snow-overlay').textContent, 'Chưa mở được ván');
  assert.equal(srv.get('snow/state'), null);
  room.deny(false); await a.click('retry'); await env.advance(1200);
  assert.equal(a.q('.snow-retry').hidden, true); assert.equal(a.q('.snow-error').textContent, '');
  assert.equal(srv.get('snow/state').phase, 'lobby'); assert.match(a.q('.snow-ready').innerHTML, /Sẵn sàng/);
});
