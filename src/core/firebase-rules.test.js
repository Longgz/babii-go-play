import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorld, boardSnapshot } from '../games/lan-tuyet/logic.js';
import { claim, startRound } from '../games/lan-tuyet/sync.js';

const rules = JSON.parse(readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8')).rules;
const snow = rules.rooms.$code.snow;
// Expression-level regression checks, not a replacement for the Firebase emulator.
// Deliberately expose only RuleDataSnapshot methods, not client SDK methods.
const snapshot = value => ({
  val: () => value != null && typeof value === 'object' ? Symbol.for('children') : value ?? null,
  child: path => { if (typeof path !== 'string') throw new Error('child requires a string'); return snapshot(path.split('/').reduce((v, k) => v?.[k], value)); },
  exists: () => value != null && (typeof value !== 'object' || Object.keys(value).length > 0),
  hasChild(path) { return this.child(path).exists(); },
  hasChildren(keys) { return keys ? keys.every(k => this.child(k).exists()) : value != null && typeof value === 'object' && Object.keys(value).length > 0; },
  isString: () => typeof value === 'string', isNumber: () => Number.isFinite(value), isBoolean: () => typeof value === 'boolean',
});
function evaluate(expression, document, next, old = null, vars = {}) {
  if (typeof expression === 'boolean') return expression;
  const scope = { auth: { uid: 'a' }, root: snapshot(document), data: snapshot(old), newData: snapshot(next), now: 1000, $code: 'ABCDEF', ...vars };
  return Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope));
}
function validate(rule, document, next, old = null, vars = {}) {
  if (next == null) return true;
  if ('.validate' in rule && !evaluate(rule['.validate'], document, next, old, vars)) return false;
  if (typeof next !== 'object') return true;
  for (const [key, value] of Object.entries(next)) {
    const wildcard = Object.keys(rule).find(k => k.startsWith('$'));
    const child = rule[key] || (wildcard && rule[wildcard]);
    if (child && !validate(child, document, value, old?.[key], rule[key] ? vars : { ...vars, [wildcard]: key })) return false;
  }
  return true;
}
function fixture(n = 2) {
  const players = Array.from({ length: n }, (_, i) => ({ uid: String.fromCharCode(97 + i), name: `P${i}`, token: `control${i}` }));
  const lobby = claim(null, 'a', 'leader', 'match', 1000), state = { ...lobby, ...startRound(lobby, players, 1000) };
  const document = { rooms: { ABCDEF: { members: Object.fromEntries(players.map(p => [p.uid, { name: p.name }])), snow: { state, peers: Object.fromEntries(players.map(p => [p.uid, { ...p, id: state.id, at: 1000 }])) } } } };
  return { document, state, frame: boardSnapshot(createWorld(players), state, 1, 1000) };
}

test('database rules use supported RuleDataSnapshot methods, not SDK-only numChildren', () => {
  const supported = new Set(['val', 'child', 'parent', 'hasChild', 'hasChildren', 'exists', 'getPriority', 'isNumber', 'isString', 'isBoolean']);
  const visit = node => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('.') && typeof value === 'string') for (const m of value.matchAll(/\.([A-Za-z]+)\(/g)) assert.ok(supported.has(m[1]), `Unsupported rules method: ${m[1]}`);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(rules);
});
test('members can read snow including frame; anonymous users and outsiders cannot', () => {
  const { document } = fixture();
  assert.equal(evaluate(snow['.read'], document, null), true);
  assert.equal(evaluate(snow['.read'], document, null, null, { auth: { uid: 'b' } }), true);
  assert.equal(evaluate(snow['.read'], document, null, null, { auth: { uid: 'outsider' } }), false);
  assert.equal(evaluate(snow['.read'], document, null, null, { auth: null }), false);
});
test('valid two-to-six-player boards pass rules; extra or missing balls are rejected', () => {
  for (const n of [2, 3, 4, 5, 6]) {
    const { document, state, frame } = fixture(n);
    assert.ok(validate(snow.state, document, state));
    assert.ok(evaluate(snow.frame['.write'], document, frame)); assert.ok(validate(snow.frame, document, frame));
    const missing = structuredClone(frame); delete missing.balls.a; assert.equal(validate(snow.frame, document, missing), false);
    const extra = structuredClone(frame); extra.balls.intruder = extra.balls.a; assert.equal(validate(snow.frame, document, extra), false);
    assert.equal(evaluate(snow.frame['.write'], document, frame, null, { auth: { uid: 'b' } }), false);
    assert.equal(evaluate(snow.frame['.write'], document, { ...frame, hostToken: 'old' }), false);
    assert.equal(validate(snow.frame, document, frame, frame), false);
  }
});
test('input and readiness belong to the sender, current connection and current round', () => {
  const { document, state } = fixture(), input = { id: state.id, round: 1, seq: 1, x: .5, y: 0, dash: 1, at: 1000 };
  const scope = { $uid: 'a', $token: 'control0' }, rule = snow.inputs.$uid.$token;
  assert.ok(evaluate(rule['.write'], document, input, null, scope)); assert.ok(validate(rule, document, input, null, scope));
  assert.equal(evaluate(rule['.write'], document, input, null, { ...scope, auth: { uid: 'b' } }), false);
  assert.equal(validate(rule, document, { ...input, x: 9 }, null, scope), false);
  assert.equal(validate(rule, document, input, input, scope), false);
  assert.ok(validate(snow.ready.$uid, document, { id: state.id, round: state.round, token: 'control0' }, null, scope));
  assert.equal(validate(snow.ready.$uid, document, { id: state.id, round: state.round, token: 'old' }, null, scope), false);
});
