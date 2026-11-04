import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../../core/store.js';
import { PATH, SOLO_KEY, SCHEMA, CATALOG, prepareLevels, canSpell, seeded, drawPuzzle, normalize, newGame, completed, currentPlayer, move, commitMove } from './logic.js';
import { buildCrossword, MAX_GRID } from './crossword.js';
import { PACKS } from './packs.js';
import game from './index.js';

const source = PACKS;
const levels = prepareLevels(source);
const players = [{ uid: 'a', name: 'An' }, { uid: 'b', name: 'Bình' }];
const fresh = (roster = players) => newGame(levels, roster, 'match', seeded(8327382));
const act = (s, uid, action) => move(s, uid, s, action, levels, seeded(89238));
const copy = value => structuredClone(value);
function memoryRoom(initial = null) {
  let state = copy(initial), calls = 0;
  const watchers = new Set();
  return {
    players: () => players, code: 'TEST', calls: () => calls,
    watch(path, fn) { assert.equal(path, PATH); watchers.add(fn); fn(copy(state)); return () => watchers.delete(fn); },
    get: async () => copy(state),
    async transact(path, reducer) {
      assert.equal(path, PATH); calls++;
      const next = reducer(copy(state));
      if (next === undefined) return { committed: false, value: copy(state) };
      state = copy(next); watchers.forEach(fn => fn(copy(state)));
      return { committed: true, value: copy(state) };
    },
  };
}

test('every cycle uses all 60 sets once and its boundary never repeats the previous set', () => {
  const random = seeded(27182818); let state = null, last = null;
  for (let cycle = 0; cycle < 3; cycle++) {
    const picked = [];
    for (let i = 0; i < levels.length; i++) {
      state = drawPuzzle(levels, state, random);
      assert.notEqual(state.level, last); last = state.level; picked.push(state.level);
    }
    assert.equal(new Set(picked).size, levels.length);
    assert.notDeepEqual(picked, levels.map((_, i) => i));
  }
});

test('fresh games vary the letter set and target words while all crossword words remain playable', () => {
  const starts = new Set(), targetSets = new Set();
  for (let i = 0; i < 100; i++) {
    const puzzle = drawPuzzle(levels, null, seeded(i * 79821871));
    starts.add(puzzle.level);
    const L = levels[puzzle.level], cw = buildCrossword(puzzle.targets);
    assert.equal(new Set(puzzle.targets).size, puzzle.targets.length);
    assert.ok(puzzle.targets.length >= 4 && puzzle.targets.length <= 6);
    assert.ok(puzzle.targets.every(w => L.w.includes(w) && canSpell(L.l, w)));
    assert.deepEqual(new Set(cw.placed.map(p => p.word)), new Set(puzzle.targets));
    targetSets.add([...puzzle.targets].sort().join('|'));
  }
  assert.ok(starts.size > 30);
  assert.ok(targetSets.size > 20);
  assert.equal(drawPuzzle([levels[0]], { used: [0], level: 0 }).level, 0);
});

test('letter multiplicity and malformed dictionary entries cannot create impossible targets', () => {
  assert.equal(canSpell('AABC', 'aaa'), false);
  assert.equal(canSpell('AABC', 'aba'), true);
  assert.throws(() => prepareLevels([{ ...source[0], w: [...source[0].w, 'tact'] }]));
  assert.throws(() => prepareLevels([{ ...source[0], t: ['plant'] }]));
  assert.throws(() => prepareLevels([{ ...source[0], h: {} }]));
  assert.throws(() => prepareLevels([{ ...source[0], w: [...source[0].w, 'tan'] }]));
  assert.throws(() => prepareLevels([]));
});

test('solo can solve consecutive words, finish a round, and continue without a room or skips', () => {
  let s = fresh([{ uid: 'solo', name: 'Bạn' }]);
  const previous = s.level;
  for (const word of s.targets) {
    assert.equal(currentPlayer(s).uid, 'solo');
    s = act(s, 'solo', { type: 'word', word });
  }
  assert.equal(completed(s), true);
  const points = s.scores.solo;
  assert.ok(points > 0);
  const next = act(s, 'solo', { type: 'next' });
  assert.notEqual(next.level, previous);
  assert.equal(next.round, 2);
  assert.equal(next.scores.solo, points);
  assert.deepEqual(next.found, []);
  assert.throws(() => act(next, 'solo', { type: 'skip' }), /không cần bỏ lượt/);
});

test('room validates turns, duplicate words, spectators and incomplete next-round requests', () => {
  let s = fresh(); const word = s.targets[0];
  assert.throws(() => act(s, 'b', { type: 'word', word }), /Chưa đến lượt/);
  assert.throws(() => act(s, 'spectator', { type: 'next', replace: true }), /đang xem/);
  assert.throws(() => act(s, 'a', { type: 'next' }), /tìm đủ/);
  assert.throws(() => act(s, 'a', { type: 'word', word: 'zzzzzz' }), /không thuộc bộ từ/);
  s = act(s, 'a', { type: 'word', word });
  assert.equal(currentPlayer(s).uid, 'b');
  assert.throws(() => act(s, 'b', { type: 'word', word }), /đã được tìm/);
  s = act(s, 'b', { type: 'skip' });
  assert.equal(currentPlayer(s).uid, 'a');
  assert.equal(s.scores.b, undefined);
});

test('concurrent next-round requests commit one shared random puzzle and reject stale answers', async () => {
  const s = fresh(), room = memoryRoom(s);
  const results = await Promise.allSettled(players.map(p => commitMove(room, s, p.uid, { type: 'next', replace: true }, levels)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const next = await room.get();
  assert.equal(next.round, 2); assert.notEqual(next.level, s.level);
  await assert.rejects(commitMove(room, s, 'a', { type: 'word', word: s.targets[0] }, levels), /vừa thay đổi/);
  assert.deepEqual(await room.get(), next);
});

test('rapid word submissions score once and transaction retry choices stay deterministic', async () => {
  const s = fresh(), room = memoryRoom(s);
  const results = await Promise.allSettled([0, 1].map(() => commitMove(room, s, 'a', { type: 'word', word: s.targets[0] }, levels)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await room.get()).found.length, 1);
  const retrying = { transact: async (path, fn) => {
    const one = fn(copy(s)), two = fn(copy(s)); assert.deepEqual(one, two);
    return { committed: true, value: two };
  } };
  await commitMove(retrying, s, 'a', { type: 'next', replace: true }, levels);
});

test('legacy room scores survive while the obsolete oversized puzzle is replaced', () => {
  const old = { lv: 3, f: { 1: { 0: { uid: 'a', word: 'ant', p: 2 } }, 3: { 0: { uid: 'b', word: 'resids', p: 1 } } } };
  const s = newGame(levels, players, 'migrated', seeded(42), old);
  assert.equal(s.round, 4);
  assert.equal(s.schema, SCHEMA); assert.equal(s.catalog, CATALOG);
  assert.deepEqual(s.targets, levels[s.level].t);
  assert.deepEqual(s.scores, { a: 2, b: 1 });
  assert.deepEqual(s.found, []); assert.equal(s.upgraded, true);
  const next = act(s, 'a', { type: 'next', replace: true });
  assert.notEqual(next.level, s.level);
  assert.deepEqual(next.scores, s.scores);
});

test('Firebase object arrays keep level zero in used sets and preserve the shared puzzle', () => {
  const obj = a => Object.fromEntries(a.map((v, i) => [i, v]));
  const s = fresh(); s.used = [0, s.level];
  const raw = { ...s, players: obj(s.players), targets: obj(s.targets), used: obj(s.used), found: null };
  assert.deepEqual(normalize(raw), s);
  assert.ok(normalize(raw).used.includes(0));
  assert.notEqual(act(raw, 'a', { type: 'next', replace: true }).level, 0);
});

function fixtures(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; });
}
function mounted(room = null, me = players[0]) {
  const slots = new Map(), cleanup = [];
  const el = { innerHTML: '', contains: () => true, querySelector(selector) {
    if (!slots.has(selector)) slots.set(selector, { innerHTML: '', textContent: '' });
    return slots.get(selector);
  } };
  game.mount(el, { room, me, names: ['An'], onLeave: fn => cleanup.push(fn), toast() {}, ping() {} });
  return {
    main: () => el.querySelector('.main').innerHTML,
    turn: () => el.querySelector('.turn').textContent,
    click(dataset) { el.onclick({ target: { closest: () => ({ dataset, disabled: false }) } }); },
    choose(word, letters) {
      const used = new Set();
      for (const letter of word.toUpperCase()) { const i = [...letters].findIndex((v, i) => v === letter && !used.has(i)); used.add(i); this.click({ i: String(i) }); }
      this.click({ a: 'go' });
    },
    leave() { cleanup.splice(0).forEach(fn => fn()); },
  };
}
async function until(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate()) { if (Date.now() > deadline) assert.fail('UI did not reach expected state'); await new Promise(resolve => setImmediate(resolve)); }
}

test('solo mounts without a room, saves a word and restores progress after reopening', async t => {
  fixtures(t); assert.equal(game.room, false); assert.equal(game.min, 1);
  const first = mounted();
  await until(() => first.main().includes('data-a="go"'));
  const initial = store.get(SOLO_KEY);
  first.choose(initial.targets[0], levels[initial.level].l);
  assert.equal(store.get(SOLO_KEY).found.length, 1);
  assert.doesNotMatch(first.main(), /data-a="skip"/);
  first.leave();
  const reopened = mounted(); t.after(() => reopened.leave());
  await until(() => reopened.main().includes('data-a="go"'));
  assert.equal(store.get(SOLO_KEY).id, initial.id);
  assert.match(reopened.main(), /Đã tìm 1\//);
});

test('switching between solo and room keeps both games independent', async t => {
  fixtures(t);
  const initial = fresh(), room = memoryRoom(initial), ui = mounted(room); t.after(() => ui.leave());
  await until(() => ui.main().includes('data-a="go"'));
  ui.click({ a: 'solo' });
  assert.match(ui.turn(), /Chơi một mình/);
  const solo = store.get(SOLO_KEY);
  ui.choose(solo.targets[0], levels[solo.level].l);
  assert.deepEqual(await room.get(), initial);
  ui.click({ a: 'room' });
  assert.match(ui.turn(), /Lượt của An/);
  assert.match(ui.main(), /Đã tìm 0\//);
  ui.click({ a: 'solo' });
  assert.match(ui.main(), /Đã tìm 1\//);
  assert.equal(room.calls(), 0);
});

test('two clients opening an empty room share one randomly generated puzzle', async t => {
  fixtures(t);
  const room = memoryRoom(), a = mounted(room), b = mounted(room, players[1]);
  t.after(() => { a.leave(); b.leave(); });
  await until(() => a.main().includes('data-a="go"') && b.main().includes('data-a="go"'));
  const s = await room.get();
  assert.equal(s.round, 1);
  const grid = ui => ui.main().match(/<div class="crossword-board"[\s\S]*?<div class="cur"/)[0];
  assert.equal(grid(a), grid(b));
  assert.match(a.turn(), /Lượt của An/); assert.match(b.turn(), /Lượt của An/);
});

test('the curated catalog loads offline without requesting an external dictionary', t => {
  fixtures(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('offline'); });
  const ui = mounted(); t.after(() => ui.leave());
  assert.match(ui.main(), /Gợi ý 5 từ|Gợi ý 4 từ/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('every curated grid is compact, connected, and gives each target a distinct visible word', () => {
  assert.equal(levels.length, 60);
  assert.equal(new Set(levels.map(L => [...L.l].sort().join(''))).size, 60);
  for (const L of levels) {
    const cw = buildCrossword(L.t);
    assert.ok(cw.rows <= MAX_GRID && cw.cols <= MAX_GRID, L.l);
    assert.ok(L.w.length - L.t.length <= 2);
    assert.equal(cw.placed.length, L.t.length);
    const occupied = new Map();
    for (const p of cw.placed) {
      assert.ok(L.h[p.word]); assert.ok(p.word.length <= 6); assert.ok(p.number >= 1);
      for (let i = 0; i < p.word.length; i++) {
        const r = p.r + (p.dir === 'V' ? i : 0), c = p.c + (p.dir === 'H' ? i : 0), k = `${r},${c}`;
        const cell = cw.cells.find(cell => cell.r === r && cell.c === c);
        assert.equal(cell.letter, p.word[i]);
        const previous = occupied.get(k) || [];
        assert.ok(!previous.includes(p.dir), `Overlapping same-direction words in ${L.l}`);
        occupied.set(k, [...previous, p.dir]);
        const beforeR = r + (p.dir === 'H' ? -1 : 0), beforeC = c + (p.dir === 'V' ? -1 : 0);
        const afterR = r + (p.dir === 'H' ? 1 : 0), afterC = c + (p.dir === 'V' ? 1 : 0);
        if (cell.words.length === 1) for (const [nr, nc] of [[beforeR, beforeC], [afterR, afterC]]) {
          assert.ok(!cw.cells.some(other => other.r === nr && other.c === nc), `Unintended adjacent word in ${L.l}`);
        }
      }
    }
    const reached = new Set([cw.placed[0].word]);
    for (let i = 0; i < cw.placed.length; i++) for (const cell of cw.cells) if (cell.words.some(w => reached.has(w))) cell.words.forEach(w => reached.add(w));
    assert.equal(reached.size, L.t.length);
    assert.deepEqual(buildCrossword([...L.t].reverse()), cw);
  }
  assert.equal(buildCrossword(['abcdefgh']), null);
  assert.equal(buildCrossword(['cat', 'dog']), null);
});

test('a bounded bonus list never substitutes for targets, and all target answers always finish the round', () => {
  for (let level = 0; level < levels.length; level++) {
    const L = levels[level];
    let s = { ...fresh([{ uid: 'solo', name: 'Bạn' }]), level, targets: [...L.t], used: [level] };
    for (const word of L.w.filter(w => !L.t.includes(w))) s = act(s, 'solo', { type: 'word', word });
    assert.ok(s.found.length <= 2); assert.equal(completed(s), false);
    assert.equal(s.targets.filter(w => s.found.some(f => f.word === w)).length, 0);
    for (const word of L.t) s = act(s, 'solo', { type: 'word', word });
    assert.equal(completed(s), true, L.l);
    assert.ok(s.found.length <= 8);
  }
});

test('saved version-two solo and room games upgrade once and retain earned points', async t => {
  fixtures(t);
  const old = { ...fresh(), schema: 2, catalog: undefined, round: 7, targets: ['anenst'], scores: { a: 30, b: 21 } };
  store.set(SOLO_KEY, { ...old, players: [{ uid: 'solo', name: 'An' }], scores: { solo: 42 } });
  const solo = mounted(); t.after(() => solo.leave());
  assert.equal(store.get(SOLO_KEY).scores.solo, 42);
  assert.equal(store.get(SOLO_KEY).round, 8);
  assert.match(solo.main(), /Điểm đã kiếm vẫn được giữ/);
  const room = memoryRoom(old), a = mounted(room), b = mounted(room, players[1]);
  t.after(() => { a.leave(); b.leave(); });
  await until(() => !a.main().includes('Đang mở ván') && !b.main().includes('Đang mở ván'));
  const saved = await room.get();
  assert.deepEqual(saved.scores, { a: 30, b: 21 });
  assert.equal(saved.schema, SCHEMA); assert.equal(saved.round, 8);
  assert.equal(saved.targets.includes('anenst'), false);
});
