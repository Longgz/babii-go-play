import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, stamp, valid, mirror, aimError, FOLD_MS, unitRadius, hitMode, hitRadius, inkRadius } from './logic.js';
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
test('three to five units use matching hitboxes, reachable targets, and a stable shared configuration', () => {
  for (const count of [3, 4, 5]) for (let i = 0; i < 40; i++) {
    const s = newGame(players, 'size', Math.random, count);
    assert.ok(valid(s)); assert.equal(s.units.length, count * 2); assert.equal(unitRadius(s), 22 - count * 2);
    for (const u of s.units) { s.turn = 1 - u.side; assert.equal(aimError(s, mirror(u)), ''); }
    s.turn = 0;
    const red = s.units.filter(u => u.side === 1); red.slice(0, -1).forEach(u => { u.alive = false; });
    const next = stamp(s, shot(s, mirror(red.at(-1))), 1000); assert.equal(next.winner, 0); assert.equal(next.count, count);
  }
  for (const count of [2, 6, 3.5, NaN]) assert.throws(() => newGame(players, 'bad', Math.random, count));
  const legacy = game(); delete legacy.count; legacy.v = 1; assert.ok(valid(legacy)); assert.equal(unitRadius(legacy), 16);
});
test('a near miss uses the smaller five-unit hitbox while three-unit rules stay unchanged', () => {
  for (const count of [3, 5]) {
    const s = newGame(players, 'radius', Math.random, count, 'easy');
    s.units = [0, 1].flatMap(side => Array.from({ length: count }, (_, i) => ({ side, x: side ? 600 : 60, y: 100 + i * 80, alive: true })));
    const next = stamp(s, shot(s, mirror({ x: 628, y: 100 })), 1000);
    assert.equal(next.shots[0].hits, count === 3 ? 1 : 0);
  }
});
test('difficulty scales actual hitbox and ink together, while saved older games keep broad hits', () => {
  const distances = { easy: 30, normal: 19.5, hard: 12 };
  for (const mode of Object.keys(distances)) {
    const s = newGame(players, 'mode', Math.random, 3, mode);
    s.units = [0, 1].flatMap(side => Array.from({ length: 3 }, (_, i) => ({ side, x: side ? 600 : 60, y: 100 + i * 120, alive: true })));
    assert.equal(hitRadius(s) + inkRadius(s), distances[mode]);
    assert.equal(stamp(s, shot(s, mirror({ x: 600 + distances[mode] - .01, y: 100 })), 1000).shots[0].hits, 1);
    assert.equal(stamp(s, shot(s, mirror({ x: 600 + distances[mode] + .01, y: 100 })), 1000).shots[0].hits, 0);
  }
  const old = game(); old.v = 2; delete old.hitMode;
  assert.ok(valid(old)); assert.equal(hitMode(old), 'easy'); assert.equal(hitRadius(old) + inkRadius(old), 30);
  assert.throws(() => newGame(players, 'bad', Math.random, 3, 'invalid'));
  assert.equal(valid({ ...old, hitMode: 'toString' }), false);
});
