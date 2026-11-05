import test from 'node:test';
import assert from 'node:assert/strict';
import game from './index.js';

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function environment(t) {
  let time = 100000, perf = performance.now(), count = 0;
  const frames = new Map(), timers = new Map(), listeners = new Map(), storage = new Map();
  const setGlobal = (key, value) => {
    const before = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    t.after(() => { if (before) Object.defineProperty(globalThis, key, before); else delete globalThis[key]; });
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
    now: () => time, frames, timers, listeners, document,
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
    let online = true, connection;
    return {
      code: 'ABCDEF', now: env.now, players: () => [],
      watch(p, fn) { const sub = { p, fn, last: JSON.stringify(get(p)) }; watchers.add(sub); fn(copy(get(p))); return () => watchers.delete(sub); },
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
  const env = environment(t), srv = server(env), host = mount(srv.client(), 'host'), a = mount(srv.client(), 'a'), b = mount(srv.client(), 'b');
  t.after(() => { host.leave(); a.leave(); b.leave(); });
  await host.click('host'); await a.click('join'); await b.click('join'); await env.advance(1100);
  return { env, srv, host, a, b };
}

test('a screen and two mounted controllers complete all three rounds with the same scores', async t => {
  const { env, srv, host, a, b } = await group(t);
  assert.match(host.q('.snow-host-actions').innerHTML, /2\/6/);
  for (let round = 1; round <= 3; round++) {
    await host.click('start'); assert.equal(srv.get('snow/state').phase, 'countdown');
    await env.advance(4000); assert.equal(srv.get('snow/state').phase, 'playing');
    assert.equal(srv.get('snow/state').round, round);
    assert.equal(a.q('.snow-dash').disabled, false); assert.equal(b.q('.snow-dash').disabled, false);
    await env.advance(46000);
    const s = srv.get('snow/state'); assert.equal(s.phase, round < 3 ? 'results' : 'ended');
    assert.equal(a.q('.snow-results').innerHTML, b.q('.snow-results').innerHTML);
    assert.equal(s.scores.a, round * 3); assert.equal(s.scores.b, round * 3);
    if (round < 3) { await a.click('ready'); assert.match(host.q('.snow-players').innerHTML, /Sẵn sàng/); }
  }
  assert.match(host.q('.snow-results').innerHTML, /đồng thắng/);
});
test('touch movement, simultaneous dash, pointer cancellation and cooldown remain synchronized', async t => {
  const { env, srv, host, a } = await group(t);
  await host.click('start'); await env.advance(4000);
  const pad = a.q('.snow-pad'), e = { pointerId: 1, clientX: 100, clientY: 100, button: 0, preventDefault() {} };
  pad.onpointerdown(e); pad.onpointermove({ ...e, clientX: 145 });
  a.q('.snow-dash').onpointerdown(e); await env.advance(150);
  const p = srv.get('snow/state').players.find(p => p.uid === 'a'), packet = srv.get(`snow/inputs/a/${p.token}`);
  assert.ok(packet.x > .8); assert.equal(packet.dash, 1);
  assert.ok(srv.get('snow/state').status.a.dashUntil > env.now());
  a.q('.snow-dash').onpointerdown(e); await env.advance(100); assert.equal(srv.get(`snow/inputs/a/${p.token}`).dash, 1);
  pad.onpointercancel(e); await env.advance(100); assert.equal(srv.get(`snow/inputs/a/${p.token}`).x, 0);
  await env.advance(2200); assert.equal(a.q('.snow-dash').disabled, false);
});
test('late joiners spectate, host disconnect closes the round, and returning cannot resume stale physics', async t => {
  const { env, srv, host, a } = await group(t);
  await host.click('start'); await env.advance(4000);
  const visitor = mount(srv.client(), 'visitor'); t.after(() => visitor.leave());
  await visitor.click('join'); assert.equal(srv.get('snow/state').players.length, 2);
  assert.match(visitor.q('.snow-control-status').textContent, /cổ vũ/);
  host.room.connected(false); await env.advance(1000); host.room.connected(true); await env.advance(100);
  assert.equal(srv.get('snow/state').phase, 'closed'); assert.equal(a.q('.snow-dash').disabled, true);
  await host.click('new'); assert.equal(srv.get('snow/state').phase, 'lobby'); assert.equal(a.q('.snow-welcome').hidden, false);
});
test('hidden host stops the round and unmount removes every subscription, frame and interval', async t => {
  const { env, srv, host, a, b } = await group(t);
  await host.click('start'); await env.advance(4000);
  env.document.hidden = true; env.emit('visibilitychange'); await settle();
  assert.equal(srv.get('snow/state').phase, 'closed');
  host.leave(); a.leave(); b.leave(); await settle();
  assert.equal(srv.watchers.size, 0); assert.equal(env.frames.size, 0); assert.equal(env.timers.size, 0);
  assert.ok([...env.listeners.values()].every(s => s.size === 0));
});
