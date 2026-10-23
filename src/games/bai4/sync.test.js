import test from 'node:test';
import assert from 'node:assert/strict';
import { readHand, startGame, submitAction } from './sync.js';

// Reproduce RTDB's omission of empty arrays/null without using live room data.
function firebaseValue(value) {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.length ? value.map(v => firebaseValue(v) ?? null) : undefined;
  if (typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([k, v]) => [k, firebaseValue(v)]).filter(([, v]) => v !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}
function memoryRoom() {
  const data = new Map();
  return {
    data,
    get: async p => structuredClone(data.get(p) ?? null),
    update: async patches => {
      for (const [p, v] of Object.entries(patches)) {
        if (v === null) {
          for (const k of data.keys()) if (k === p || k.startsWith(p + '/')) data.delete(k);
        } else data.set(p, firebaseValue(v));
      }
    },
    transact: async (p, fn) => {
      const value = fn(structuredClone(data.get(p) ?? null));
      if (value === undefined) return { committed: false, value: data.get(p) ?? null };
      data.set(p, firebaseValue(value));
      return { committed: true, value: structuredClone(data.get(p)) };
    },
  };
}
const players = Array.from({ length: 4 }, (_, i) => ({ uid: `p${i}`, name: `P${i}` }));
async function fixture(hands, extras = {}) {
  const room = memoryRoom();
  const s = await startGame(room, null, players.slice(0, hands.length));
  s.counts = hands.map(h => h.length); s.top = { code: 'R5', col: 'R' };
  Object.assign(s, extras);
  for (let i = 0; i < hands.length; i++) room.data.set(`private/p${i}/b4/${s.id}/${s.refs[i].base}`, firebaseValue({ cards: hands[i], empty: !hands[i].length }));
  room.data.set('g/b4', firebaseValue(s));
  return { room, s };
}

test('simultaneous deals accept one version and leave the winning hands readable', async () => {
  const room = memoryRoom();
  const results = await Promise.allSettled([startGame(room, null, players), startGame(room, null, players)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const s = await room.get('g/b4');
  for (const p of players) assert.equal((await readHand(room, s, p.uid)).hand.length, 7);
});

test('two rapid plays commit once; abandoned private packets never affect visible hand', async () => {
  const hand = ['R1', 'R2', 'G2'];
  const { room, s } = await fixture([hand, ['B1']]);
  const results = await Promise.allSettled([0, 1].map(index => submitAction(room, s, 0, hand, { type: 'play', index })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const current = await room.get('g/b4'), loaded = await readHand(room, current, 'p0');
  assert.equal(current.revision, s.revision + 1); assert.equal(loaded.hand.length, 2);
  assert.equal(current.counts[0], loaded.hand.length);
});

test('UNO call and catch race commits exactly one outcome', async () => {
  const { room, s } = await fixture([['G1'], ['B1']], { unoPending: [0], pile: ['R1', 'Y2'] });
  const results = await Promise.allSettled([
    submitAction(room, s, 0, ['G1'], { type: 'call-uno' }),
    submitAction(room, s, 1, ['B1'], { type: 'catch-uno', target: 0 }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const current = await room.get('g/b4'), loaded = await readHand(room, current, 'p0');
  assert.equal(loaded.hand.length, current.counts[0]);
  assert.ok(loaded.hand.length === 1 || loaded.hand.length === 3);
});

test('gift received while offline is applied once after reconnect and survives next action', async () => {
  const { room, s } = await fixture([['GV', 'Y2', 'R4'], ['B1']]);
  const n = await submitAction(room, s, 0, ['GV', 'Y2', 'R4'], { type: 'play', index: 0, col: 'B', target: 1, giftIndex: 1 });
  for (let i = 0; i < 3; i++) assert.deepEqual((await readHand(room, n, 'p1')).hand, ['B1', 'Y2']);
  const after = await submitAction(room, n, 1, ['B1', 'Y2'], { type: 'play', index: 0 });
  assert.deepEqual((await readHand(room, after, 'p1')).hand, ['Y2']);
  assert.equal(after.counts[1], 1);
});

test('swap to fourth player keeps cards private, survives reload and finishes once', async () => {
  const hands = [['SW', 'R1'], ['B1'], ['Y2'], ['G2', 'G3']];
  const { room, s } = await fixture(hands);
  const pending = await submitAction(room, s, 0, hands[0], { type: 'play', index: 0, col: 'G', target: 3 });
  assert.deepEqual(Object.keys(pending.swap).sort(), ['from', 'packet', 'to']);
  const loaded = await readHand(room, pending, 'p3');
  assert.deepEqual(loaded.incoming, ['R1']);
  const actions = await Promise.allSettled([1, 2].map(() => submitAction(room, pending, 3, loaded.hand, { type: 'finish-swap', incoming: loaded.incoming })));
  assert.equal(actions.filter(r => r.status === 'fulfilled').length, 1);
  const current = await room.get('g/b4');
  assert.deepEqual((await readHand(room, current, 'p0')).hand, ['G2', 'G3']);
  assert.deepEqual((await readHand(room, current, 'p3')).hand, ['R1']);
});

test('Firebase empty hands survive last-card swap and ordinary wins', async () => {
  const { room, s } = await fixture([['SW'], ['B1']]);
  const pending = await submitAction(room, s, 0, ['SW'], { type: 'play', index: 0, col: 'B', target: 1 });
  assert.deepEqual((await readHand(room, pending, 'p0')).hand, []);
  const recipient = await readHand(room, pending, 'p1');
  assert.deepEqual(recipient.incoming, []);
  const end = await submitAction(room, pending, 1, recipient.hand, { type: 'finish-swap', incoming: recipient.incoming });
  assert.equal(end.winner, 1);
  assert.deepEqual((await readHand(room, end, 'p1')).hand, []);
});

test('write failure never publishes counts; new round rejects stale actions', async () => {
  const { room, s } = await fixture([['R1', 'G2'], ['B1']]);
  const failing = { ...room, update: async () => { throw new Error('offline'); } };
  await assert.rejects(submitAction(failing, s, 0, ['R1', 'G2'], { type: 'play', index: 0 }), /offline/);
  assert.deepEqual((await readHand(room, await room.get('g/b4'), 'p0')).hand, ['R1', 'G2']);
  const fresh = await startGame(room, s, players.slice(0, 2));
  assert.equal([...room.data.keys()].some(p => p.includes(`/b4/${s.id}/`)), false);
  await assert.rejects(submitAction(room, s, 0, ['R1', 'G2'], { type: 'play', index: 0 }), /Ván vừa thay đổi/);
  assert.equal((await room.get('g/b4')).id, fresh.id);
});

test('late joiner is a spectator and missing packets produce a recoverable error', async () => {
  const { room, s } = await fixture([['R1'], ['B1']]);
  assert.deepEqual(await readHand(room, s, 'new-person'), { hand: [], incoming: null });
  await assert.rejects(submitAction(room, s, -1, [], { type: 'draw' }), /đang xem/);
  room.data.delete(`private/p0/b4/${s.id}/${s.refs[0].base}`);
  await assert.rejects(readHand(room, s, 'p0'), /Chưa tải đủ bài/);
});
