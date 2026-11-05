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
      click(a) { el.onclick({ target: { closest: s => s === '[data-a]' ? { dataset: { a } } : null } }); },
      start() { this.click('start'); },
    };
  }
  const first = mount();
  first.select(5); first.click('difficulty'); first.start();
  assert.equal(data.get('fold-and-shoot').count, 5); assert.equal(data.get('fold-and-shoot').units.length, 10);
  assert.equal(data.get('fold-and-shoot').hitMode, 'hard');
  assert.match(first.q('.fold-content').innerHTML, /fold-hit-zone/);
  assert.match(first.q('.fold-content').innerHTML, /scale\(0.75\)/);
  first.select(3); assert.equal(data.get('fold-and-shoot').count, 5);
  first.leave();
  const reopened = mount(); t.after(() => reopened.leave());
  assert.match(reopened.q('.fold-options').innerHTML, /Ván này: 5 quân/);
  assert.match(reopened.q('.fold-options').innerHTML, /Vùng trúng: Nhỏ/);
  reopened.select(3); reopened.click('difficulty');
  assert.equal(data.get('fold-and-shoot').hitMode, 'hard');
  reopened.start();
  assert.equal(data.get('fold-and-shoot').count, 3); assert.equal(data.get('fold-and-shoot').units.length, 6);
  assert.equal(data.get('fold-and-shoot').hitMode, 'easy');
  assert.match(reopened.q('.fold-content').innerHTML, /scale\(1\)/);
});
