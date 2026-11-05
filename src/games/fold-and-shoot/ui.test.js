import test from 'node:test';
import assert from 'node:assert/strict';
import game from './index.js';

test('unit selection applies only to a new match and persists after reopening', async t => {
  const before = Object.getOwnPropertyDescriptor(globalThis, 'confirm');
  Object.defineProperty(globalThis, 'confirm', { value: () => true, configurable: true });
  t.after(() => { if (before) Object.defineProperty(globalThis, 'confirm', before); else delete globalThis.confirm; });
  const data = new Map(), store = { get: (key, fallback) => data.get(key) ?? fallback, set: (key, value) => data.set(key, structuredClone(value)) };
  function mount() {
    const nodes = new Map(), cleanup = [];
    const el = { innerHTML: '', querySelector(s) { if (!nodes.has(s)) nodes.set(s, { innerHTML: '', textContent: '' }); return nodes.get(s); } };
    game.mount(el, { room: null, me: null, names: ['Bi', 'Na'], store, onLeave: fn => cleanup.push(fn) });
    return {
      el, q: s => el.querySelector(s), leave: () => cleanup.splice(0).forEach(f => f()),
      select(n) { el.onchange({ target: { matches: () => true, value: String(n) } }); },
      start() { el.onclick({ target: { closest: s => s === '[data-a]' ? { dataset: { a: 'start' } } : null } }); },
    };
  }
  const first = mount();
  first.select(5); first.start();
  assert.equal(data.get('fold-and-shoot').count, 5); assert.equal(data.get('fold-and-shoot').units.length, 10);
  assert.match(first.q('.fold-content').innerHTML, /scale\(0.75\)/);
  first.select(3); assert.equal(data.get('fold-and-shoot').count, 5);
  first.leave();
  const reopened = mount(); t.after(() => reopened.leave());
  assert.match(reopened.q('.fold-options').innerHTML, /Ván này: 5 quân/);
  reopened.select(3); reopened.start();
  assert.equal(data.get('fold-and-shoot').count, 3); assert.equal(data.get('fold-and-shoot').units.length, 6);
  assert.match(reopened.q('.fold-content').innerHTML, /scale\(1\)/);
});
