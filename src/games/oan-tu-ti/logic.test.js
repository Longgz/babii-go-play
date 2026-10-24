import test from 'node:test';
import assert from 'node:assert/strict';
import { sha, participants, judge, tally, evaluateRound, submitChoice, revealChoice, advanceRound, commitChoice, latestOnly } from './logic.js';
import game from './index.js';

const players = ['a', 'b', 'c', 'd', 'e'].map(uid => ({ uid, name: uid.toUpperCase() }));
const copy = value => structuredClone(value);
function memoryRoom() {
  const data = new Map(), watchers = new Map();
  const emit = path => watchers.get(path)?.forEach(fn => fn(copy(data.get(path) ?? null)));
  return {
    data,
    players: () => players.slice(0, 2),
    watch(path, fn) {
      if (!watchers.has(path)) watchers.set(path, new Set());
      watchers.get(path).add(fn); fn(copy(data.get(path) ?? null));
      return () => watchers.get(path).delete(fn);
    },
    get: async path => copy(data.get(path) ?? null),
    set: async (path, value) => { data.set(path, copy(value)); emit(path); },
    transact: async (path, update) => {
      const next = update(copy(data.get(path) ?? null));
      if (next === undefined) return { committed: false, value: copy(data.get(path) ?? null) };
      data.set(path, copy(next));
      emit(path);
      return { committed: true, value: copy(next) };
    },
  };
}
async function finished(choices) {
  const room = memoryRoom(), roster = players.slice(0, choices.length);
  await Promise.all(choices.map((choice, i) => submitChoice(room, 1, roster[i].uid, choice, roster)));
  const locked = await room.get('g/oan');
  await Promise.all(roster.map(p => revealChoice(room, locked, p.uid, roster)));
  return { room, state: await room.get('g/oan'), roster };
}

test('all 9 two-player combinations resolve after simultaneous commit and reveal', async () => {
  const expected = { bua: { bua: [], bao: ['b'], keo: ['a'] }, bao: { bua: ['a'], bao: [], keo: ['b'] }, keo: { bua: ['b'], bao: ['a'], keo: [] } };
  for (const a of ['bua', 'bao', 'keo']) for (const b of ['bua', 'bao', 'keo']) {
    const { state, roster } = await finished([a, b]);
    const result = await evaluateRound(state.r[1], roster);
    assert.equal(result.complete, true, `${a}/${b}`);
    assert.deepEqual(result.choices, { a, b });
    assert.deepEqual(result.winners, expected[a][b]);
  }
});

test('locked choice restores from private storage after reload without local memory', async () => {
  const room = memoryRoom(), roster = players.slice(0, 2);
  await submitChoice(room, 1, 'a', 'bua', roster);
  const one = await room.get('g/oan');
  await revealChoice(room, one, 'a', roster);
  assert.equal((await room.get('g/oan')).r[1].reveal, undefined);
  await submitChoice(room, 1, 'b', 'keo', roster);
  // Fresh room state, no original choice or nonce passed to the reconnected client.
  await revealChoice(room, await room.get('g/oan'), 'a', roster);
  await revealChoice(room, await room.get('g/oan'), 'b', roster);
  assert.equal((await evaluateRound((await room.get('g/oan')).r[1], roster)).complete, true);
});

test('two rapid choices from the same user cannot overwrite the winning secret', async () => {
  const room = memoryRoom(), roster = players.slice(0, 2);
  const picks = await Promise.allSettled(['bua', 'bao'].map(c => submitChoice(room, 1, 'a', c, roster)));
  assert.equal(picks.filter(r => r.status === 'fulfilled').length, 1);
  await submitChoice(room, 1, 'b', 'keo', roster);
  const locked = await room.get('g/oan');
  await Promise.all(roster.map(p => revealChoice(room, locked, p.uid, roster)));
  const result = await evaluateRound((await room.get('g/oan')).r[1], roster);
  assert.equal(result.complete, true);
  assert.ok(['bua', 'bao'].includes(result.choices.a));
});

test('late joiners do not delay results or change historical scores', async () => {
  const room = memoryRoom(), roster = players.slice(0, 2);
  await submitChoice(room, 1, 'a', 'bua', roster);
  await submitChoice(room, 1, 'b', 'keo', players);
  const state = await room.get('g/oan');
  assert.deepEqual(participants(state.r[1], players), roster);
  await assert.rejects(submitChoice(room, 1, 'c', 'bao', players), /Ván đã thay đổi/);
  await Promise.all(roster.map(p => revealChoice(room, state, p.uid, players)));
  assert.deepEqual((await tally(await room.get('g/oan'), players)).score, { a: 1 });
});

test('3–5 players resolve multi-winner and three-symbol draw rules', async () => {
  for (let n = 3; n <= 5; n++) {
    const wins = await finished(['bua', ...Array(n - 1).fill('keo')]);
    assert.deepEqual((await evaluateRound(wins.state.r[1], wins.roster)).winners, ['a']);
    const draw = await finished(['bua', 'bao', ...Array(n - 2).fill('keo')]);
    const result = await evaluateRound(draw.state.r[1], draw.roster);
    assert.equal(result.complete, true); assert.deepEqual(result.winners, []);
  }
  assert.deepEqual(judge({ a: 'bua', b: 'bua', c: 'keo' }), ['a', 'b']);
});

test('bad reveal and forged extra users cannot produce a result or score', async () => {
  const { state, roster } = await finished(['bua', 'keo']);
  state.r[1].reveal.b.c = 'bao';
  state.r[1].reveal.c = { c: 'bua', s: 'other' };
  state.r[1].commit.c = await sha('bua:other');
  const result = await evaluateRound(state.r[1], roster);
  assert.equal(result.complete, false); assert.deepEqual(result.invalid, ['b']);
  assert.deepEqual(result.choices, {});
  assert.deepEqual((await tally(state, roster)).score, {});
  state.r[1].reveal.b = { c: 'unknown', s: 'x' };
  state.r[1].commit.b = await sha('unknown:x');
  assert.equal((await evaluateRound(state.r[1], roster)).complete, false);
});

test('missing legacy secret produces a recoverable error and restart keeps prior scores', async () => {
  const { room, state, roster } = await finished(['bua', 'keo']);
  await advanceRound(room, state, 'a', roster);
  const current = await room.get('g/oan');
  current.r[2] = { commit: { a: await sha('bao:lost'), b: await sha('bua:lost') } };
  await room.set('g/oan', current);
  await assert.rejects(revealChoice(room, current, 'a', roster), /Không khôi phục/);
  await advanceRound(room, current, 'a', roster, true);
  const recovered = await room.get('g/oan');
  assert.equal(recovered.round, 3); assert.equal(recovered.r[2].cancelled, true);
  assert.deepEqual((await tally(recovered, players)).score, { a: 1 });
});

test('next-round race advances once; stale picks and premature next are rejected', async () => {
  const { room, state, roster } = await finished(['bua', 'keo']);
  const advances = await Promise.allSettled(roster.map(p => advanceRound(room, state, p.uid, roster)));
  assert.equal(advances.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await room.get('g/oan')).round, 2);
  await assert.rejects(submitChoice(room, 1, 'a', 'bao', roster));
  await submitChoice(room, 2, 'a', 'bao', roster);
  await assert.rejects(advanceRound(room, await room.get('g/oan'), 'a', roster), /Chưa có kết quả/);
});

test('private write failure never publishes an unrecoverable commitment', async () => {
  const room = memoryRoom();
  const offline = { ...room, set: async () => { throw new Error('offline'); } };
  await assert.rejects(submitChoice(offline, 1, 'a', 'bua', players.slice(0, 2)), /offline/);
  assert.equal(await room.get('g/oan'), null);
  assert.equal(commitChoice(null, 1, 'a', 'invalid', players), undefined);
  assert.equal(commitChoice(null, 1, 'outsider', 'a'.repeat(64), players), undefined);
});

test('slow old render never overwrites newer completed result or newer errors', async () => {
  const gate = latestOnly(), displayed = [];
  let finishOld, failOld;
  const old = gate.run(() => new Promise(resolve => { finishOld = resolve; }), x => displayed.push(x), e => displayed.push(e.message));
  await gate.run(async () => 'result', x => displayed.push(x), () => {});
  finishOld('waiting'); await old;
  assert.deepEqual(displayed, ['result']);
  const failed = gate.run(() => new Promise((_, reject) => { failOld = reject; }), () => {}, e => displayed.push(e.message));
  await gate.run(async () => 'round2', x => displayed.push(x), () => {});
  failOld(new Error('stale error')); await failed;
  assert.deepEqual(displayed, ['result', 'round2']);
});

test('leaving the page prevents async verification from touching the next game', async () => {
  const gate = latestOnly(); let resolve, rendered = false;
  const task = gate.run(() => new Promise(r => { resolve = r; }), () => { rendered = true; }, () => {});
  gate.stop(); resolve('done'); await task;
  assert.equal(rendered, false);
});

function mounted(room, me) {
  const slots = new Map(), cleanup = [];
  // Minimal DOM sinks exercise the actual mount/watch/click orchestration;
  // browser layout is not asserted here.
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
    click(a, c) { return el.onclick({ target: { closest: () => ({ dataset: { a, c }, disabled: false }) } }); },
    leave() { cleanup.splice(0).forEach(fn => fn()); },
  };
}
async function until(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('UI did not publish the expected result');
    await new Promise(resolve => setImmediate(resolve));
  }
}

test('two mounted clients automatically show results after simultaneous clicks, without manual refresh', async t => {
  const room = memoryRoom(), a = mounted(room, players[0]), b = mounted(room, players[1]);
  t.after(() => { a.leave(); b.leave(); });
  await Promise.all([a.click('pick', 'bua'), b.click('pick', 'keo')]);
  await until(() => a.main().includes('Thắng: A') && b.main().includes('Thắng: A'));
  assert.ok(a.main().includes('Ván tiếp')); assert.ok(b.main().includes('Ván tiếp'));
});

test('reopened client auto-recovers its committed secret and unblocks both result panels', async t => {
  const room = memoryRoom(), first = mounted(room, players[0]);
  await first.click('pick', 'bao'); first.leave();
  const b = mounted(room, players[1]);
  await b.click('pick', 'bua');
  const reopened = mounted(room, players[0]);
  t.after(() => { b.leave(); reopened.leave(); });
  await until(() => reopened.main().includes('Thắng: A') && b.main().includes('Thắng: A'));
});
