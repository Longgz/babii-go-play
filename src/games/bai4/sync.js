import { act, deal, normalize, values } from './logic.js';

const key = () => crypto.randomUUID();
const path = (uid, game, packet) => `private/${uid}/b4/${game}/${packet}`;
const sameVersion = (a, b) => (a?.id ?? null) === (b?.id ?? null)
  && (a?.revision ?? 0) === (b?.revision ?? 0);

async function publish(room, expected, state, packets) {
  // Stage immutable private packets BEFORE publishing their references. A losing
  // transaction leaves only unreachable packets, never a partially applied move.
  await room.update(packets);
  const result = await room.transact('g/b4', current => sameVersion(current, expected) ? state : undefined);
  if (!result.committed) {
    // These unique packets were never referenced by a committed public state.
    await room.update(Object.fromEntries(Object.keys(packets).map(p => [p, null]))).catch(() => {});
    throw new Error('Ván vừa thay đổi. Đã tải lượt mới; hãy thực hiện lại thao tác.');
  }
  return normalize(result.value);
}

export async function startGame(room, expected, players) {
  const { hands, state } = deal(players.length), id = key(), packets = {};
  const roster = players.map(p => ({ uid: p.uid, name: p.name, avatar: p.avatar || null }));
  const n = {
    ...state, schema: 2, id, revision: 1, players: roster,
    refs: roster.map((p, i) => {
      const base = key(); packets[path(p.uid, id, base)] = { cards: hands[i] };
      return { base, adds: [] };
    }),
    history: [{ seq: 1, actor: null, type: 'deal', text: `🃏 Chia 7 lá cho ${players.length} người. ${roster[0].name} đi trước.`, card: null }],
  };
  n.log = n.history[0].text;
  const committed = await publish(room, expected, n, packets);
  // The old round can no longer accept actions. Keep storage bounded across rounds.
  if (expected?.schema === 2 && expected.id && expected.id !== id) {
    const cleanup = Object.fromEntries(values(expected.players).map(p => [`private/${p.uid}/b4/${expected.id}`, null]));
    await room.update(cleanup).catch(() => {});
  }
  return committed;
}

export async function readHand(room, raw, uid) {
  const s = normalize(raw), seat = s.players.findIndex(p => p.uid === uid);
  if (seat < 0) return { hand: [], incoming: null };
  const ref = s.refs[seat];
  if (!ref?.base) throw new Error('Thiếu dữ liệu bài của ván.');
  const ids = [ref.base, ...values(ref.adds)];
  if (s.swap?.to === seat) ids.push(s.swap.packet);
  const packets = await Promise.all(ids.map(id => room.get(path(uid, s.id, id))));
  if (packets.some(p => !p || (!Object.hasOwn(p, 'cards') && p.empty !== true))) {
    throw new Error('Chưa tải đủ bài. Bấm Đồng bộ lại để thử lại.');
  }
  const incoming = s.swap?.to === seat ? values(packets.pop().cards) : null;
  const hand = packets.flatMap(p => values(p.cards));
  if (hand.length !== s.counts[seat]) throw new Error('Số bài chưa khớp. Bấm Đồng bộ lại để thử lại.');
  return { hand, incoming };
}

export async function submitAction(room, raw, seat, hand, action) {
  const s = normalize(raw), result = act(s, seat, hand, action), n = result.state;
  const packets = {}, base = key();
  n.refs = s.refs.map(r => ({ base: r.base, adds: values(r.adds) }));
  n.refs[seat] = { base, adds: [] };
  packets[path(s.players[seat].uid, s.id, base)] = { cards: result.hand, empty: result.hand.length === 0 };
  for (const delivery of result.deliveries) {
    const packet = key(), uid = s.players[delivery.to].uid;
    packets[path(uid, s.id, packet)] = { cards: delivery.cards, empty: delivery.cards.length === 0 };
    if (delivery.mode === 'append') n.refs[delivery.to].adds.push(packet);
    else if (delivery.mode === 'replace') n.refs[delivery.to] = { base: packet, adds: [] };
    else n.swap = { ...n.swap, packet };
  }
  return publish(room, s, n, packets);
}
