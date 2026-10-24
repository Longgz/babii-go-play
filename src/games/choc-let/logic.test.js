import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_PARTS, partOf, stateOf, eventsOf, addPoke, enterVisit, acknowledge, historyFor, reactionQueue } from './logic.js';

const event = (id, partId = 'head', extra = {}) => ({ id, from: 'a', to: 'b', fromName: 'An', toName: 'Bình', partId, at: 100, ...extra });
function timers() {
  let id = 0;
  const tasks = new Map();
  return {
    schedule(fn) { tasks.set(++id, fn); return id; },
    cancel(key) { tasks.delete(key); },
    tick() { const [key, fn] = tasks.entries().next().value || []; if (fn) { tasks.delete(key); fn(); } },
    get size() { return tasks.size; },
  };
}

test('each position has a separate action and the old positions still resolve', () => {
  assert.equal(new Set(BODY_PARTS.map(p => p.id)).size, BODY_PARTS.length);
  for (const id of ['head', 'cheek', 'nose', 'armpit', 'waist', 'belly', 'chest', 'butt', 'thigh']) assert.ok(partOf(id));
  assert.equal(partOf('neck').id, 'armpit');
  assert.equal(partOf('cheek_r').id, 'cheek');
  assert.equal(partOf('hip').id, 'butt');
});

test('same-millisecond events retain every position and increase counters once', () => {
  let state;
  for (const part of BODY_PARTS) state = addPoke(state, event(part.id, part.id));
  assert.equal(eventsOf(state).length, BODY_PARTS.length);
  assert.equal(state.count.a, BODY_PARTS.length);
  assert.deepEqual(eventsOf(state).map(e => e.seq), BODY_PARTS.map((_, i) => i + 1));
  const repeated = addPoke(state, event('head'));
  assert.deepEqual(repeated, state);
  assert.equal(state.stats.b.head, 1);
});

test('transaction reducer reapplies against latest state without losing other senders', () => {
  const initial = stateOf(null);
  const first = addPoke(initial, event('first'));
  const second = addPoke(first, event('second', 'waist', { from: 'c' }));
  assert.equal(second.seq, 2); assert.equal(second.count.a, 1); assert.equal(second.count.c, 1);
  assert.equal(second.stats.b.head, 1); assert.equal(second.stats.b.waist, 1);
  assert.deepEqual(initial.events, {});
  assert.throws(() => addPoke(second, event('bad', 'unknown')));
  assert.throws(() => addPoke(second, event('self', 'head', { to: 'a' })));
});

test('migration preserves the single legacy event, old counts, and no duplicates', () => {
  const old = { last: event('old', 'neck'), count: { a: 8 }, stats: { b: { neck: 3 } } };
  const migrated = stateOf(old);
  assert.equal(eventsOf(migrated).length, 1);
  assert.equal(eventsOf(migrated)[0].partId, 'armpit');
  assert.equal(migrated.count.a, 8);
  assert.equal(migrated.last, undefined);
  assert.deepEqual(stateOf(migrated), migrated);
});

test('queue replays all offline positions, deduplicates snapshots, and never cuts off current reaction', () => {
  const timer = timers(), started = [], completed = [];
  const queue = reactionQueue({ start: e => started.push(e.id), complete: e => completed.push(e.id), schedule: timer.schedule, cancel: timer.cancel });
  const events = BODY_PARTS.map((p, i) => ({ ...event(p.id, p.id), seq: i + 1 }));
  queue.add(events.slice(0, 3));
  queue.add(events); queue.add(events);
  assert.deepEqual(started, ['head']); assert.equal(timer.size, 1);
  assert.equal(queue.remaining, events.length);
  for (const e of events) timer.tick();
  assert.deepEqual(started, events.map(e => e.id));
  assert.deepEqual(completed, started);
  assert.equal(queue.remaining, 0); assert.equal(timer.size, 0);
  queue.add(events); assert.equal(timer.size, 0);
});

test('leaving mid-reaction cancels timers without acknowledging unplayed events', () => {
  let state = addPoke(addPoke(null, event('one')), event('two', 'nose'));
  const timer = timers(), completed = [];
  const queue = reactionQueue({ start() {}, complete(e) { completed.push(e.id); state = acknowledge(state, 'b', e.seq); }, schedule: timer.schedule, cancel: timer.cancel });
  queue.add(eventsOf(state)); timer.tick(); queue.stop(); timer.tick();
  assert.deepEqual(completed, ['one']); assert.equal(timer.size, 0);
  const unread = eventsOf(state).filter(e => e.to === 'b' && e.seq > state.receipts.b);
  assert.deepEqual(unread.map(e => e.id), ['two']);
  queue.add(unread); assert.equal(timer.size, 0);
});

test('receipt is monotonic and a reconnect does not replay completed reactions', () => {
  let state = addPoke(addPoke(null, event('one')), event('two'));
  state = acknowledge(state, 'b', 2);
  state = acknowledge(state, 'b', 1);
  assert.equal(state.receipts.b, 2);
  state = addPoke(state, event('three', 'belly'));
  assert.deepEqual(eventsOf(state).filter(e => e.seq > state.receipts.b).map(e => e.id), ['three']);
});

test('history uses previous entry sequence, includes sent/received, excludes other players', () => {
  let state = addPoke(null, event('before'));
  state = enterVisit(state, 'b', 'visit1', 1000);
  state = acknowledge(state, 'b', 1);
  state = addPoke(state, event('received'));
  state = addPoke(state, event('sent', 'head', { from: 'b', to: 'a' }));
  state = addPoke(state, event('unrelated', 'head', { from: 'c', to: 'a' }));
  state = enterVisit(state, 'b', 'visit2', 2000);
  assert.equal(state.visits.b.previousSeq, 1);
  assert.equal(state.visits.b.previousAt, 1000);
  assert.deepEqual(historyFor(state, 'b', state.visits.b.previousSeq, 1).map(e => e.id), ['received', 'sent']);
  const retry = enterVisit(state, 'b', 'visit2', 3000);
  assert.deepEqual(retry.visits.b, state.visits.b);
});

test('older unfinished reactions remain in history even across multiple short visits', () => {
  let state = addPoke(null, event('unseen'));
  state = enterVisit(state, 'b', 'visit1', 1000);
  state = enterVisit(state, 'b', 'visit2', 2000);
  assert.deepEqual(historyFor(state, 'b', state.visits.b.previousSeq, 0).map(e => e.id), ['unseen']);
});
