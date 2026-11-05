import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, collide, ingest, vector, summary, MAX_RADIUS, DT, boardSnapshot, readBoard, interpolateBoard } from './logic.js';
import { claim, updateHost, startRound, finishRound, readyPlayers, readyRoster, validState } from './sync.js';
const players = [{ uid: 'a', name: 'Bi', token: 'ta' }, { uid: 'b', name: 'Na', token: 'tb' }];
const packet = (seq, dash = 0) => ({ id: 'match', round: 1, seq, dash, x: 1, y: 0 });
const start = () => claim(null, 'host', 'token', 'match', 0);

test('vector input is normalized, finite and diagonal speed cannot exceed straight speed', () => {
  assert.deepEqual(vector(NaN, Infinity), { x: 0, y: 0 }); assert.equal(Math.hypot(...Object.values(vector(1, 1))), 1);
});
test('other players updates do not refresh stale inputs, old sequences and rounds are ignored', () => {
  let map = ingest(new Map(), { a: { ta: packet(1) } }, players, 'match', 1, 100);
  map = ingest(map, { a: { ta: packet(1) }, b: { tb: packet(2) } }, players, 'match', 1, 1000);
  assert.equal(map.get('a').seen, 100); assert.equal(map.get('b').seen, 1000);
  map = ingest(map, { a: { ta: { ...packet(5), id: 'old' } } }, players, 'match', 1, 2000);
  assert.equal(map.get('a').seen, 100);
  assert.equal(ingest(new Map(), { a: { wrong: packet(1) } }, players, 'match', 1, 1).size, 0);
});
test('a short dash is consumed once; cooldown presses do not fire later', () => {
  const w = createWorld(players), p = w.players[0];
  let map = new Map([['a', { x: 0, y: 0, dash: 1, seen: 0 }]]);
  assert.ok(step(w, map, 0).some(e => e.type === 'dash')); assert.equal(p.lastDash, 1);
  map.set('a', { x: 0, y: 0, dash: 2, seen: 100 });
  assert.equal(step(w, map, 100).some(e => e.type === 'dash'), false); assert.equal(p.lastDash, 2);
  p.dashCd = 0;
  assert.equal(step(w, map, 200).some(e => e.type === 'dash'), false);
});
test('stale input stops acceleration, and disconnected players are eliminated after ten seconds', () => {
  const w = createWorld(players), map = new Map([['a', { x: 1, y: 0, dash: 0, seen: 0 }], ['b', { x: 0, y: 0, dash: 0, seen: 10001 }]]);
  step(w, map, 900); assert.equal(w.players[0].vx, 0);
  const events = step(w, map, 10001); assert.ok(events.some(e => e.uid === 'a' && e.type === 'fall' && e.offline));
  assert.equal(w.over, true); assert.equal(w.players[1].rank, 1);
});
test('exact overlap separates deterministically, and heavier balls move less', () => {
  const w = createWorld(players), [a, b] = w.players; a.x = b.x = a.y = b.y = 0; a.r = 28; b.r = 14;
  collide(a, b); assert.ok(Number.isFinite(a.x)); assert.ok(Math.abs(a.x) < Math.abs(b.x)); assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 42);
});
test('simultaneous falls tie, results are independent of player array order', () => {
  const w = createWorld(players); w.players.forEach(p => { p.x = 400; p.y = 0; }); step(w, new Map(), 0);
  assert.equal(w.over, true); assert.deepEqual(w.players.map(p => p.rank), [1, 1]); assert.deepEqual(w.players.map(p => p.points), [3, 3]);
});
test('simulation remains finite and bounded through full six-player rounds', () => {
  const roster = Array.from({ length: 6 }, (_, i) => ({ uid: String(i), name: String(i), token: String(i) }));
  for (let round = 1; round <= 3; round++) {
    const w = createWorld(roster, round);
    for (let frame = 0; frame < 2800 && !w.over; frame++) {
      const t = frame * 1000 * DT, input = new Map(w.players.map((p, i) => [p.uid, { ...vector(-p.x / 70 + Math.sin(frame / 80 + i), -p.y / 70 + Math.cos(frame / 90 + i)), dash: Math.floor(frame / 180), seen: t }]));
      step(w, input, t);
      for (const p of w.players) { assert.ok([p.x, p.y, p.vx, p.vy, p.r].every(Number.isFinite)); assert.ok(p.r <= MAX_RADIUS); }
    }
    assert.equal(w.over, true); assert.ok(w.players.every(p => p.rank >= 1 && p.rank <= 6));
  }
});
test('host claim, revision and token fence reject competing hosts and late writes', () => {
  const s = start(); assert.ok(validState(s)); assert.equal(claim(s, 'other', 't', 'new', 100), undefined);
  assert.ok(claim(s, 'other', 't', 'new', 16000));
  const next = updateHost(s, s, { reason: 'test' }, 100); assert.equal(next.rev, 1);
  assert.equal(updateHost(next, s, { phase: 'closed' }, 200), undefined);
  assert.equal(updateHost(s, { ...s, hostToken: 'other' }, {}, 200), undefined);
});
test('roster excludes stale/foreign sessions, limits rounds and scores results exactly once', () => {
  const peers = { a: { id: 'match', token: 'ta', name: 'Bi', at: 0 }, b: { id: 'old', token: 'tb', name: 'Na', at: 1 } };
  assert.equal(readyPlayers(peers, { a: { ta: { id: 'match', at: 1000 } }, b: { tb: { id: 'old', at: 1000 } } }, 'match', 1500).length, 1);
  assert.equal(readyPlayers(peers, { a: { ta: { id: 'match', at: 0 } } }, 'match', 5000).length, 0);
  let s = start(); assert.equal(startRound(s, players.slice(0, 1), 0), undefined);
  for (let round = 1; round <= 3; round++) {
    const patch = startRound(s, players, 0); s = updateHost(s, s, patch, 1); assert.ok(validState(s));
    s = updateHost(s, s, { phase: 'playing' }, 2);
    const w = createWorld(players); w.players[0].x = 400; step(w, new Map(), 0);
    const finished = finishRound(s, w, summary(w, 0)); s = updateHost(s, s, finished, 3);
    assert.equal(s.scores.b, round * 3); assert.equal(finishRound(s, w, summary(w, 0)), undefined);
  }
  assert.equal(s.phase, 'ended'); assert.equal(startRound(s, players, 0), undefined);
});
test('network summaries expose no physics and corrupt state is rejected', () => {
  const payload = summary(createWorld(players), 0);
  for (const p of Object.values(payload)) for (const key of ['x', 'y', 'vx', 'vy', 'r']) assert.equal(key in p, false);
  assert.equal(validState({ ...start(), phase: 'playing', players: [] }), false);
});
test('all devices decode the same board and interpolate positions without changing collision authority', () => {
  const s = { ...start(), ...startRound(start(), players, 0) }, world = createWorld(players);
  const frame = boardSnapshot(world, s, 1, 100), first = readBoard(frame, s);
  assert.ok(first); assert.equal(first.players.length, 2); assert.equal(first.players[0].uid, 'a');
  world.players[0].x += 40;
  const next = readBoard(boardSnapshot(world, s, 2, 200), s), middle = interpolateBoard(first, next, .5);
  assert.equal(middle.players[0].x, first.players[0].x + 20); assert.equal(next.players[0].x, first.players[0].x + 40);
  for (const patch of [{ id: 'old' }, { round: 2 }, { hostToken: 'other' }, { arena: NaN }, { balls: { a: { x: 'bad' } } }]) assert.equal(readBoard({ ...frame, ...patch }, s), null);
});
test('readiness requires two connected seats, every seat ready, and current round/connection tokens', () => {
  const s = start(), peers = {}, packets = {}, ready = {};
  for (let i = 0; i < 7; i++) {
    const uid = String(i), token = `t${i}`;
    peers[uid] = { id: s.id, name: uid, token, at: i };
    packets[uid] = { [token]: { id: s.id, at: 1000 } };
    ready[uid] = { id: s.id, round: 0, token };
  }
  assert.equal(readyRoster(s, peers, packets, ready, 1100).length, 6);
  delete ready['6']; assert.equal(readyRoster(s, peers, packets, ready, 1100).length, 6);
  ready['0'].token = 'old-tab'; assert.equal(readyRoster(s, peers, packets, ready, 1100).length, 0);
  ready['0'].token = 't0'; ready['0'].round = 1; assert.equal(readyRoster(s, peers, packets, ready, 1100).length, 0);
  assert.equal(readyRoster(s, peers, packets, ready, 10000).length, 0);
});
