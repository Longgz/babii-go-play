import test from 'node:test';
import assert from 'node:assert/strict';
import { act, canPlay, deal, deck, normalize, playable, take } from './logic.js';

const players = n => Array.from({ length: n }, (_, i) => ({ uid: `p${i}`, name: `P${i}` }));
function state(hands, extra = {}) {
  return { ...deal(hands.length).state, players: players(hands.length), counts: hands.map(h => h.length),
    top: { code: 'R5', col: 'R' }, pile: ['G2', 'B3', 'Y4', 'R8'], disc: [], revision: 0, history: [], ...extra };
}

test('deal: 2–5 players, numeric opening, all 130 cards conserved', () => {
  assert.equal(deck().length, 130);
  for (let n = 2; n <= 5; n++) {
    const d = deal(n);
    assert.ok(d.hands.every(h => h.length === 7));
    assert.match(d.state.top.code, /^[RYBG][0-9]$/);
    assert.deepEqual([...d.hands.flat(), ...d.state.pile, d.state.top.code].sort(), deck().sort());
  }
  for (const n of [0, 1, 6, 2.5]) assert.throws(() => deal(n));
});

test('stacking and shields distinguish Wild +4 from a colored shield', () => {
  const top = { code: 'F', col: 'G' };
  assert.equal(canPlay('RD', top, 6), true);
  assert.equal(canPlay('F', top, 6), true);
  assert.equal(canPlay('GF', top, 6), true);
  assert.equal(canPlay('RF', top, 6), false);
  assert.equal(canPlay('RF', { code: 'BF', col: 'B' }, 6), true);
  for (const c of ['W', 'GV', 'SW', 'WC', 'G2', 'ZZ', null]) assert.equal(canPlay(c, top, 6), false);
});

test('discard all includes duplicate action cards and never activates their effects', () => {
  const hands = [['RA', 'RA', 'RD', 'RS', 'RF', 'R3', 'G1'], ['B4']];
  const s = state(hands), original = structuredClone(s);
  const r = act(s, 0, hands[0], { type: 'play', index: 0 });
  assert.deepEqual(r.hand, ['G1']);
  assert.equal(r.state.counts[0], 1);
  assert.deepEqual(r.state.disc, ['R5', 'RA', 'RD', 'RS', 'RF', 'R3']);
  assert.equal(r.state.pend, 0); assert.equal(r.state.turn, 1);
  assert.match(r.state.log, /xả 6 lá/);
  assert.deepEqual(s, original);
  const win = act(state([hands[0].slice(0, 6), ['B4']]), 0, hands[0].slice(0, 6), { type: 'play', index: 0 });
  assert.equal(win.state.winner, 0); assert.equal(win.state.counts[0], 0);
});

test('gift subtracts both cards, targets any opponent, and resolves victory', () => {
  const hands = [['GV', 'GV', 'Y2'], ['R1'], ['B2'], ['G3']];
  const r = act(state(hands), 0, hands[0], { type: 'play', index: 0, col: 'B', target: 3, giftIndex: 1 });
  assert.deepEqual(r.hand, ['Y2']); assert.deepEqual(r.state.counts, [1, 1, 1, 2]);
  assert.deepEqual(r.deliveries, [{ to: 3, cards: ['GV'], mode: 'append' }]);
  assert.equal(r.state.dir, 1); assert.equal(r.state.turn, 1);
  const small = [['GV', 'Y2'], ['R1']];
  assert.equal(act(state(small), 0, small[0], { type: 'play', index: 0, col: 'B', target: 1, giftIndex: 1 }).state.winner, 0);
  assert.equal(act(state([['GV'], ['R1']]), 0, ['GV'], { type: 'play', index: 0, col: 'G' }).state.winner, 0);
  assert.throws(() => act(state(hands), 0, hands[0], { type: 'play', index: 0, col: 'B', target: 3, giftIndex: 0 }));
});

test('swap blocks other actions until receiver completes; last swap wins for recipient', () => {
  const hands = [['SW'], ['R1'], ['Y3', 'G3']];
  const begin = act(state(hands), 0, hands[0], { type: 'play', index: 0, col: 'Y', target: 2 });
  assert.equal(begin.state.winner, null); assert.equal(begin.state.counts[0], 0);
  assert.throws(() => act(begin.state, 1, hands[1], { type: 'call-uno' }));
  assert.throws(() => act(begin.state, 0, [], { type: 'draw' }));
  const end = act(begin.state, 2, hands[2], { type: 'finish-swap', incoming: [] });
  assert.equal(end.state.winner, 2); assert.equal(end.state.swap, null);
  assert.deepEqual(end.state.counts, [2, 1, 0]);
  assert.deepEqual(end.deliveries[0], { to: 0, cards: ['Y3', 'G3'], mode: 'replace' });
});

test('draw once, play only the actual drawn duplicate, pass only after drawing', () => {
  const hands = [['R1', 'G2'], ['B4']];
  const s = state(hands, { pile: ['R1'] });
  assert.throws(() => act(s, 0, hands[0], { type: 'pass' }));
  const r = act(s, 0, hands[0], { type: 'draw' });
  assert.equal(playable(r.state, 0, r.hand, 0), false);
  assert.equal(playable(r.state, 0, r.hand, 2), true);
  assert.throws(() => act(r.state, 0, r.hand, { type: 'draw' }));
  assert.throws(() => act(r.state, 0, r.hand, { type: 'play', index: 0 }));
  assert.equal(act(r.state, 0, r.hand, { type: 'play', index: 2 }).state.turn, 1);
  const p = act(r.state, 0, r.hand, { type: 'pass' });
  assert.equal(p.state.turn, 1); assert.equal(p.state.drawnIndex, null);
});

test('skip, reverse, stacking, deflection and penalty turn order for 2–5 players', () => {
  for (let n = 2; n <= 5; n++) {
    const hands = [['RS', 'RV', 'RD', 'RF', 'F'], ...Array.from({ length: n - 1 }, () => ['B1'])];
    const s = state(hands);
    assert.equal(act(s, 0, hands[0], { type: 'play', index: 0 }).state.turn, 2 % n);
    const reverse = act(s, 0, hands[0], { type: 'play', index: 1 }).state;
    assert.equal(reverse.dir, -1); assert.equal(reverse.turn, n === 2 ? 0 : n - 1);
    const stack = act({ ...s, pend: 4 }, 0, hands[0], { type: 'play', index: 2 }).state;
    assert.equal(stack.pend, 6); assert.equal(stack.turn, 1);
    const shield = act({ ...s, pend: 4 }, 0, hands[0], { type: 'play', index: 3 }).state;
    assert.equal(shield.pend, 4); assert.equal(shield.dir, -1); assert.equal(shield.turn, n - 1);
    const penalty = act({ ...s, pend: 6 }, 0, hands[0], { type: 'penalty' });
    assert.equal(penalty.state.pend, 0); assert.equal(penalty.state.turn, 1);
    assert.match(penalty.state.log, /4\/6/);
  }
});

test('roulette has no arbitrary 30-card cutoff and reports exhausted stock truthfully', () => {
  const hands = [['B1'], ['Y1']];
  const s = state(hands, { roulette: 'G', pile: [...Array(35).fill('W'), 'G2', 'R1'] });
  assert.throws(() => act(s, 0, hands[0], { type: 'draw' }));
  assert.throws(() => act(s, 0, hands[0], { type: 'play', index: 0 }));
  const r = act(s, 0, hands[0], { type: 'roulette' });
  assert.equal(r.hand.length, 37); assert.equal(r.state.turn, 1); assert.equal(r.state.roulette, null);
  const exhausted = act({ ...s, pile: ['W', 'F'], disc: ['R1'] }, 0, hands[0], { type: 'roulette' });
  assert.equal(exhausted.hand.length, 4); assert.match(exhausted.state.log, /chưa gặp màu/);
});

test('UNO validates eligibility, resets safety, and closes catch window on next move', () => {
  const hands = [['R1', 'G2'], ['R2', 'Y1']];
  const s = state(hands, { unoSafe: [true, false] });
  assert.throws(() => act(s, 0, hands[0], { type: 'call-uno' }));
  const r = act(s, 0, hands[0], { type: 'play', index: 0 });
  assert.equal(r.state.unoSafe[0], false); assert.deepEqual(r.state.unoPending, [0]);
  const safe = act(r.state, 0, r.hand, { type: 'call-uno' });
  assert.throws(() => act(safe.state, 1, hands[1], { type: 'catch-uno', target: 0 }));
  const caught = act(r.state, 1, hands[1], { type: 'catch-uno', target: 0 });
  assert.equal(caught.state.counts[0], 3);
  assert.throws(() => act(caught.state, 1, hands[1], { type: 'catch-uno', target: 0 }));
  const next = act(r.state, 1, hands[1], { type: 'draw' });
  assert.throws(() => act(next.state, 1, next.hand, { type: 'catch-uno', target: 0 }));
});

test('recycling never consumes top card; empty draw permits a pass', () => {
  const t = take([], ['R1', 'G2'], 4);
  assert.deepEqual(t.got.sort(), ['G2', 'R1']); assert.deepEqual(t.disc, []);
  const hands = [['B1'], ['Y1']];
  const r = act(state(hands, { pile: [], disc: [] }), 0, hands[0], { type: 'draw' });
  assert.equal(r.state.drawnIndex, null); assert.equal(r.state.drew, true);
  assert.equal(act(r.state, 0, r.hand, { type: 'pass' }).state.turn, 1);
});

test('rejects wrong seat, absent card, invalid wild color, stale count, and all post-win actions', () => {
  const hands = [['W', 'R1'], ['Y1']];
  const s = state(hands);
  for (const action of [{ type: 'play', index: -1 }, { type: 'play', index: 7 }, { type: 'play', index: 0, col: 'X' }, { type: 'penalty' }]) {
    assert.throws(() => act(s, 0, hands[0], action));
  }
  assert.throws(() => act(s, 1, hands[1], { type: 'draw' }));
  assert.throws(() => act(s, -1, [], { type: 'draw' }));
  assert.throws(() => act(s, 0, ['W'], { type: 'draw' }));
  for (const type of ['play', 'draw', 'pass', 'call-uno', 'catch-uno', 'roulette', 'finish-swap']) {
    assert.throws(() => act({ ...s, winner: 1 }, 0, hands[0], { type }));
  }
});

test('80 seeded full games preserve each card, exact hand counts and legal turns', () => {
  let seed = 0x4bab11;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const choose = a => a[Math.floor(random() * a.length)];
  const originalRandom = Math.random; Math.random = random;
  try {
    for (let n = 2; n <= 5; n++) for (let game = 0; game < 20; game++) {
      const d = deal(n), hands = d.hands;
      let s = normalize({ ...d.state, players: players(n) }), swapCards = null, steps = 0;
      while (s.winner == null && steps++ < 2000) {
        let actor = s.swap?.to ?? s.turn, action;
        if (s.swap) action = { type: 'finish-swap', incoming: swapCards };
        else if (s.unoPending.length && random() < .35) {
          const t = s.unoPending[0];
          if (random() < .5) { actor = t; action = { type: 'call-uno' }; }
          else { actor = (t + 1) % n; action = { type: 'catch-uno', target: t }; }
        } else if (s.roulette) action = { type: 'roulette' };
        else {
          const valid = hands[actor].map((_, i) => i).filter(i => playable(s, actor, hands[actor], i));
          if (valid.length && random() < .9) {
            const index = choose(valid), target = choose(Array.from({ length: n }, (_, i) => i).filter(i => i !== actor));
            action = { type: 'play', index, col: choose(['R', 'Y', 'B', 'G']), target,
              giftIndex: choose(hands[actor].map((_, i) => i).filter(i => i !== index)) };
          } else action = { type: s.pend ? 'penalty' : s.drew ? 'pass' : 'draw' };
        }
        const r = act(s, actor, hands[actor], action); s = r.state; hands[actor] = r.hand;
        for (const delivery of r.deliveries) {
          if (delivery.mode === 'swap') swapCards = delivery.cards;
          else if (delivery.mode === 'replace') hands[delivery.to] = delivery.cards;
          else hands[delivery.to].push(...delivery.cards);
        }
        assert.deepEqual(s.counts, hands.map(h => h.length));
        assert.deepEqual([...hands.flat(), ...s.pile, ...s.disc, s.top.code].sort(), deck().sort());
        assert.ok(s.turn >= 0 && s.turn < n); assert.ok(s.history.length <= 30);
        assert.ok(s.pend >= 0); assert.ok(s.dir === 1 || s.dir === -1);
      }
      assert.notEqual(s.winner, null, `n=${n}, game=${game} did not finish`);
      assert.equal(hands[s.winner].length, 0);
    }
  } finally { Math.random = originalRandom; }
});
