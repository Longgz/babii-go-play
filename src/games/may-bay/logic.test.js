import test from 'node:test';
import assert from 'node:assert/strict';
import { N, shape, cells, fits, validBoard, atHead, headCell, canPlace, randomBoard, shotResult, kills, normalize, newMatch, readyToPlay, move, commitMove } from './logic.js';
import game from './index.js';

const players = [{ uid: 'a', name: 'An' }, { uid: 'b', name: 'Bình' }];
const board = [[0, 0, 0], [5, 0, 0], [0, 5, 0]];
const copy = value => structuredClone(value);
const fresh = () => newMatch(players, 'match-1');
const act = (s, uid, action) => move(s, uid, s.id, s.revision, action);
function battle() {
  let s = fresh();
  for (const p of players) s = act(s, p.uid, { type: 'ready', board });
  return s;
}

function memoryRoom(initial = null, emitUpdates = true) {
  let state = copy(initial);
  const watchers = new Set();
  return {
    code: 'TEST', players: () => players,
    get: async () => copy(state),
    watch(path, fn) { assert.equal(path, 'g/bm'); watchers.add(fn); fn(copy(state)); return () => watchers.delete(fn); },
    async transact(path, update) {
      assert.equal(path, 'g/bm');
      const next = update(copy(state));
      if (next === undefined) return { committed: false, value: copy(state) };
      state = copy(next);
      if (emitUpdates) watchers.forEach(fn => fn(copy(state)));
      return { committed: true, value: copy(state) };
    },
  };
}

test('all four orientations preserve ten cells and the selected head, including every edge', () => {
  for (let d = 0; d < 4; d++) {
    const s = shape(d);
    assert.equal(s.s.length, 10);
    assert.equal(new Set(s.s.map(p => p.join(','))).size, 10);
    assert.deepEqual([s.w, s.h], d % 2 ? [4, 5] : [5, 4]);
    for (let c = 0; c < N * N; c++) {
      const plane = atHead(c, d), occupied = cells(...plane).c;
      assert.deepEqual(occupied[0], [c % N, Math.floor(c / N)]);
      assert.equal(headCell(plane), c);
      const inside = occupied.every(([x, y]) => x >= 0 && y >= 0 && x < N && y < N);
      assert.equal(fits(...plane), inside);
      assert.equal(canPlace([], ...plane), inside);
    }
  }
  assert.deepEqual(atHead(0, 0), [-2, 0, 0]); // Must not silently shift away from A1.
  for (const d of [-1, 4, 1.5, '0', NaN]) assert.throws(() => shape(d));
  for (const c of [-1, 100, 2.5, '2', NaN]) assert.throws(() => atHead(c, 0));
});

test('boards reject overlaps, overflow, fractional coordinates and wrong plane counts', () => {
  assert.equal(validBoard(board, true), true);
  assert.equal(validBoard([], false), true);
  for (const bad of [null, {}, [], board.slice(0, 2), [...board, [5, 5, 0]], [[0, 0, 0], [0, 0, 1], [0, 5, 0]], [[-1, 0, 0], ...board.slice(1)], [[0, 0, 4], ...board.slice(1)], [[0.5, 0, 0], ...board.slice(1)], [[0, 0], ...board.slice(1)]]) {
    assert.equal(validBoard(bad, true), false, JSON.stringify(bad));
  }
  assert.equal(canPlace(board, 5, 5, 0), false);
  assert.equal(canPlace(board.slice(1), ...board[0]), true); // Editing excludes the original plane.
  assert.equal(canPlace(board.slice(1), ...board[1]), false);
});

test('random placement always terminates with three non-overlapping planes, even with constant randomness', t => {
  for (let i = 0; i < 100; i++) assert.equal(validBoard(randomBoard(), true), true);
  const random = t.mock.method(Math, 'random', () => 0);
  assert.equal(validBoard(randomBoard(), true), true);
  random.mock.mockImplementation(() => 0.999999);
  assert.equal(validBoard(randomBoard(), true), true);
});

test('every cell has the correct head/body/miss result; repeated head records count once', () => {
  const results = Array.from({ length: 100 }, (_, c) => shotResult(board, c));
  assert.equal(results.filter(r => r === 'k').length, 3);
  assert.equal(results.filter(r => r === 'h').length, 27);
  assert.equal(results.filter(r => r === 'm').length, 70);
  assert.deepEqual(board.map(headCell).map(c => shotResult(board, c)), ['k', 'k', 'k']);
  assert.equal(kills([{ by: 'a', c: 2, r: 'k' }, { by: 'a', c: 2, r: 'k' }, { by: 'b', c: 7, r: 'k' }], 'a'), 1);
  assert.throws(() => shotResult(board, 100));
  assert.throws(() => shotResult([], 2));
});

test('Firebase numeric-key objects and missing empty arrays normalize for play', () => {
  const asObject = xs => Object.fromEntries(xs.map((x, i) => [i, x]));
  const s = normalize({ schema: 2, id: 'firebase', players: asObject(players), b: { a: asObject(board.map(asObject)), b: asObject(board.map(asObject)) } });
  assert.equal(readyToPlay(s), true);
  assert.deepEqual(s.b.a, board);
  assert.deepEqual(s.s, []);
  assert.equal(act(s, 'a', { type: 'shoot', cell: 2 }).s[0].r, 'k');
  for (const roster of [[], [players[0]], [players[0], players[0]], [null, players[1]], [{ name: 'X' }, players[1]]]) assert.throws(() => newMatch(roster, 'x'));
});

test('simultaneous ready transactions merge both boards; duplicate readiness is idempotent', async () => {
  const initial = fresh(), room = memoryRoom(initial);
  await Promise.all(players.map(p => commitMove(room, initial, p.uid, { type: 'ready', board })));
  const s = await room.get();
  assert.equal(readyToPlay(s), true);
  assert.equal(s.revision, 2);
  assert.deepEqual(await commitMove(room, initial, 'a', { type: 'ready', board }), s);
  const changed = [...board.slice(0, 2), [5, 5, 0]];
  await assert.rejects(commitMove(room, s, 'a', { type: 'ready', board: changed }), /đã khóa/);
});

test('readiness rejects invalid drafts, spectators, obsolete matches and shooting too early', async () => {
  const s = fresh(), room = memoryRoom(s);
  await assert.rejects(commitMove(room, s, 'a', { type: 'ready', board: [board[0], board[0], board[2]] }));
  await assert.rejects(commitMove(room, s, 'viewer', { type: 'ready', board }));
  await assert.rejects(commitMove(room, { ...s, id: 'old' }, 'a', { type: 'ready', board }));
  await assert.rejects(commitMove(room, s, 'a', { type: 'shoot', cell: 2 }));
  assert.deepEqual(await room.get(), s);
});

test('unready races with opponent readiness never change a locked battle', async () => {
  const initial = act(fresh(), 'a', { type: 'ready', board });
  for (const first of ['ready', 'unready']) {
    const room = memoryRoom(initial);
    const ready = () => commitMove(room, initial, 'b', { type: 'ready', board });
    const unready = () => commitMove(room, initial, 'a', { type: 'unready' });
    const results = await Promise.allSettled(first === 'ready' ? [ready(), unready()] : [unready(), ready()]);
    const s = await room.get();
    assert.deepEqual(s.b.b, board);
    if (first === 'ready') {
      assert.equal(results[1].status, 'rejected');
      assert.equal(readyToPlay(s), true);
    } else {
      assert.equal(s.b.a, undefined);
      assert.equal(readyToPlay(s), false);
      await commitMove(room, s, 'a', { type: 'ready', board });
      assert.equal(readyToPlay(await room.get()), true);
    }
  }
});

test('rapid double shots commit only once and stale/opponent/repeated shots cannot consume turns', async () => {
  const s = battle(), room = memoryRoom(s);
  await assert.rejects(commitMove(room, s, 'b', { type: 'shoot', cell: 2 }), /Chưa đến lượt/);
  const results = await Promise.allSettled([2, 7].map(cell => commitMove(room, s, 'a', { type: 'shoot', cell })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  let next = await room.get();
  assert.deepEqual(next.s, [{ by: 'a', c: 2, r: 'k' }]);
  await assert.rejects(commitMove(room, s, 'b', { type: 'shoot', cell: 99 }), /vừa thay đổi/);
  await commitMove(room, next, 'b', { type: 'shoot', cell: 99 });
  next = await room.get();
  await assert.rejects(commitMove(room, next, 'a', { type: 'shoot', cell: 2 }), /đã bắn/);
  for (const cell of [-1, 100, 0.5, '7']) await assert.rejects(commitMove(room, next, 'a', { type: 'shoot', cell }));
  assert.deepEqual(await room.get(), next);
});

test('third distinct head ends the match atomically and blocks further moves', () => {
  let s = battle();
  for (const [i, cell] of board.map(headCell).entries()) {
    s = act(s, 'a', { type: 'shoot', cell });
    if (i < 2) {
      assert.equal(s.winner, null);
      s = act(s, 'b', { type: 'shoot', cell: 99 - i });
    }
  }
  assert.equal(s.winner, 'a');
  assert.equal(s.s.length, 5);
  assert.throws(() => act(s, 'b', { type: 'shoot', cell: 97 }), /kết thúc/);
  assert.throws(() => act(s, 'a', { type: 'unready' }), /kết thúc/);
});

function mounted(room, me = players[0]) {
  const slots = new Map(), cleanup = [];
  // Exercise the real mount/watch/click flow; these sinks do not emulate browser layout.
  const el = {
    innerHTML: '', onclick: null, contains: () => true,
    querySelector(selector) {
      if (!slots.has(selector)) slots.set(selector, { innerHTML: '', textContent: '' });
      return slots.get(selector);
    },
  };
  game.mount(el, { room, me, ping() {}, onLeave: fn => cleanup.push(fn) });
  return {
    main: () => el.querySelector('.main').innerHTML,
    turn: () => el.querySelector('.turn').textContent,
    error: () => el.querySelector('.plane-errors').innerHTML,
    click(dataset) { el.onclick({ target: { closest: () => ({ dataset, disabled: false }) } }); },
    leave() { cleanup.splice(0).forEach(fn => fn()); },
  };
}
async function until(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('UI did not reach the expected state');
    await new Promise(resolve => setImmediate(resolve));
  }
}
function draftStorage(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; });
  return data;
}

test('placement UI keeps invalid previews out of the board, supports edit/remove/undo, and restores drafts', t => {
  draftStorage(t);
  const room = memoryRoom(fresh()), ui = mounted(room);
  t.after(() => ui.leave());
  ui.click({ place: '0' });
  assert.match(ui.main(), /vượt mép/);
  ui.click({ a: 'place' });
  assert.match(ui.main(), /plane-count">0\/3/);
  ui.click({ place: '2' }); ui.click({ a: 'place' });
  assert.match(ui.main(), /plane-count">1\/3/);
  ui.click({ place: '2' });
  assert.match(ui.main(), /chồng lên/);
  ui.click({ a: 'place' });
  assert.match(ui.main(), /plane-count">1\/3/);
  ui.click({ a: 'cancel' }); ui.click({ edit: '0' }); ui.click({ a: 'rotate' });
  assert.match(ui.main(), /vượt mép/);
  ui.click({ a: 'place' }); ui.click({ a: 'cancel' });
  assert.match(ui.main(), /Đầu C1 ↑/); // Invalid edit must preserve the old plane.
  ui.click({ edit: '0' }); ui.click({ place: '52' }); ui.click({ a: 'place' });
  assert.match(ui.main(), /Đầu C6 ↑/);
  ui.click({ remove: '0' });
  assert.match(ui.main(), /plane-count">0\/3/);
  ui.click({ a: 'undo' });
  assert.match(ui.main(), /Đầu C6 ↑/);
  ui.leave();
  const reopened = mounted(room); t.after(() => reopened.leave());
  assert.match(reopened.main(), /Đầu C6 ↑/);
});

test('two mounted clients confirm together and immediately display the same shot and next turn', async t => {
  draftStorage(t);
  const room = memoryRoom(), a = mounted(room), b = mounted(room, players[1]);
  t.after(() => { a.leave(); b.leave(); });
  await until(() => a.main().includes('Giấu máy bay') && b.main().includes('Giấu máy bay'));
  for (const ui of [a, b]) { ui.click({ a: 'random' }); ui.click({ a: 'ready' }); }
  await until(() => a.main().includes('data-shoot="99"') && !/data-shoot="99"[^>]*disabled/.test(a.main()));
  assert.match(b.turn(), /Lượt của An/);
  a.click({ shoot: '99' }); a.click({ shoot: '98' });
  await until(() => b.main().includes('data-shoot'));
  assert.match(a.main(), /An bắn J10:/);
  assert.match(b.main(), /An bắn J10:/);
  assert.equal((await room.get()).s.length, 1);
});

test('transaction result updates the UI when the realtime listener is delayed', async t => {
  draftStorage(t);
  const room = memoryRoom(null, false), ui = mounted(room); t.after(() => ui.leave());
  await until(() => ui.main().includes('Giấu máy bay'));
  ui.click({ a: 'random' }); ui.click({ a: 'ready' });
  await until(() => ui.main().includes('Đội hình đã lưu'));
  ui.click({ a: 'unready' });
  await until(() => ui.main().includes('Giấu máy bay'));
  assert.match(ui.main(), /plane-count">3\/3/);
});

test('a confirmed formation from another tab replaces a stale local draft before editing', async t => {
  draftStorage(t);
  const room = memoryRoom(fresh()), ui = mounted(room); t.after(() => ui.leave());
  ui.click({ place: '32' }); ui.click({ a: 'place' });
  await commitMove(room, await room.get(), 'a', { type: 'ready', board });
  ui.click({ a: 'unready' });
  await until(() => ui.main().includes('Giấu máy bay'));
  assert.match(ui.main(), /plane-count">3\/3/);
  assert.match(ui.main(), /Đầu C1 ↑/);
});

test('failed confirmation preserves the draft and offers retry; leaving prevents late rendering', async t => {
  draftStorage(t);
  const room = memoryRoom(fresh()), original = room.transact;
  room.transact = async () => { throw new Error('offline'); };
  const ui = mounted(room); t.after(() => ui.leave());
  ui.click({ a: 'random' }); ui.click({ a: 'ready' });
  await until(() => ui.error().includes('offline'));
  assert.match(ui.main(), /plane-count">3\/3/);
  room.transact = original;
  ui.click({ a: 'ready' });
  ui.leave();
  const html = ui.main();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(ui.main(), html);
  assert.equal(validBoard((await room.get()).b.a, true), true);
});
