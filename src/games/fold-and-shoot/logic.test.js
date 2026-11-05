import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, stamp, valid, mirror, aimError, FOLD_MS } from './logic.js';
const players = [{ uid: 'a', name: 'Bi' }, { uid: 'b', name: 'Na' }];
const game = () => newGame(players, 'match', () => .3);
const shot = (s, p) => ({ id: s.id, rev: s.rev, uid: s.players[s.turn].uid, ...p });

test('random placement is bounded, distinct and leaves every mirrored target reachable', () => {
  for (const rand of [() => 0, () => 1, () => .5, Math.random]) for (let n = 0; n < 40; n++) {
    const s = newGame(players, `${n}`, rand); assert.ok(valid(s));
    for (const u of s.units) {
      s.turn = 1 - u.side;
      assert.equal(aimError(s, mirror(u)), '');
      for (const other of s.units) if (u !== other && u.side === other.side) assert.ok(Math.hypot(u.x - other.x, u.y - other.y) > 32);
    }
  }
});
test('reflection hits exactly the intended enemy and does not mutate old state', () => {
  const s = game(), target = s.units.find(u => u.side === 1), p = mirror(target);
  const next = stamp(s, shot(s, p), 1000);
  assert.equal(next.units.filter(u => !u.alive).length, 1); assert.equal(next.shots[0].hits, 1); assert.equal(next.turn, 1);
  assert.ok(s.units.every(u => u.alive)); assert.equal(next.readyAt, 1000 + FOLD_MS);
});
test('rejects foreign half, own unit, nonfinite values, outsiders, stale revisions and repeated shots', () => {
  const s = game(), p = mirror(s.units.find(u => u.side === 1)), action = shot(s, p);
  for (const patch of [{ x: 700 }, { x: NaN }, { y: Infinity }, { y: -1 }, { uid: 'visitor' }, { rev: 1 }, { id: 'old' }, { ...s.units[0] }]) assert.equal(stamp(s, { ...action, ...patch }, 1000), undefined);
  const next = stamp(s, action, 1000); assert.equal(stamp(next, action, 1000), undefined);
  const enemy = next.units.find(u => u.side === 0);
  assert.equal(stamp(next, shot(next, mirror(enemy)), 1200), undefined);
});
test('win is resolved atomically and further shots are blocked', () => {
  let s = game(), now = 1000;
  // Make all but one red unit dead, then hit the final target.
  const red = s.units.filter(u => u.side === 1); red[0].alive = false; red[1].alive = false;
  s = stamp(s, shot(s, mirror(red[2])), now);
  assert.equal(s.winner, 0); assert.equal(s.rev, 1);
  assert.equal(stamp(s, shot(s, { x: 100, y: 100 }), now + 2000), undefined);
});
test('corrupt saved data is rejected before rendering', () => {
  assert.equal(valid({ ...game(), shots: [{ x: '<svg', y: 1, side: 0, n: 1, hits: 0 }] }), false);
  assert.equal(valid({ ...game(), units: [] }), false); assert.equal(valid(null), false);
});
