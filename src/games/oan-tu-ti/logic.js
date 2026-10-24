export const CHOICES = { bua: ['✊', 'Búa'], bao: ['✋', 'Bao'], keo: ['✌️', 'Kéo'] };
const validChoice = c => Object.hasOwn(CHOICES, c);
const beats = { bua: 'keo', keo: 'bao', bao: 'bua' };
export const roundNumber = state => Number.isSafeInteger(state?.round) && state.round > 0 ? state.round : 1;
export const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');

export function participants(round, players) {
  if (round?.players) return Object.values(round.players);
  // Legacy rounds have no roster. When two or more people already committed,
  // those commitments are the best available record of who was in that round.
  const ids = Object.keys(round?.commit || {});
  if (ids.length >= 2) return ids.map(uid => ({ uid, name: players.find(p => p.uid === uid)?.name || 'Người chơi' }));
  return players.slice(0, 5).map(({ uid, name }) => ({ uid, name }));
}

export const allCommitted = (round, players) => {
  const roster = participants(round, players);
  return roster.length >= 2 && roster.length <= 5 && roster.every(p => typeof round?.commit?.[p.uid] === 'string');
};

export function judge(choices) {
  const kinds = [...new Set(Object.values(choices))];
  if (kinds.length !== 2 || !kinds.every(validChoice)) return [];
  const winner = beats[kinds[0]] === kinds[1] ? kinds[0] : kinds[1];
  return Object.keys(choices).filter(uid => choices[uid] === winner);
}

export async function evaluateRound(round, players) {
  const roster = participants(round, players), choices = {}, invalid = [];
  if (round?.cancelled || !allCommitted(round, players)) return { complete: false, choices, invalid, winners: [] };
  await Promise.all(roster.map(async ({ uid }) => {
    const reveal = round.reveal?.[uid];
    if (!reveal) return;
    if (!validChoice(reveal.c) || typeof reveal.s !== 'string' || !reveal.s || await sha(`${reveal.c}:${reveal.s}`) !== round.commit[uid]) invalid.push(uid);
    else choices[uid] = reveal.c;
  }));
  const complete = !invalid.length && roster.every(p => validChoice(choices[p.uid]));
  return { complete, choices: complete ? choices : {}, invalid, winners: complete ? judge(choices) : [] };
}

export async function tally(state, players) {
  const score = {}, results = {};
  await Promise.all(Object.entries(state?.r || {}).map(async ([number, round]) => {
    const result = await evaluateRound(round, players);
    results[number] = result;
    if (result.complete) result.winners.forEach(uid => { score[uid] = (score[uid] || 0) + 1; });
  }));
  return { score, results };
}

export function commitChoice(state, number, uid, hash, players) {
  if (roundNumber(state) !== number || !/^[a-f0-9]{64}$/.test(hash)) return undefined;
  const old = state?.r?.[number] || {}, roster = participants(old, players);
  if (old.cancelled || roster.length < 2 || roster.length > 5 || !roster.some(p => p.uid === uid)) return undefined;
  if (old.commit?.[uid] && old.commit[uid] !== hash) return undefined;
  return { ...state, round: number, r: { ...state?.r, [number]: { ...old, players: roster, commit: { ...old.commit, [uid]: hash } } } };
}

const secretPath = (uid, number, hash) => `private/${uid}/oan/${number}/${hash}`;

export async function submitChoice(room, number, uid, choice, players) {
  if (!validChoice(choice)) throw new Error('Lựa chọn không hợp lệ.');
  const secret = { c: choice, s: crypto.randomUUID() };
  const hash = await sha(`${secret.c}:${secret.s}`);
  // Immutable secret per hash survives reloads and competing tabs. Never publish
  // the commitment until its recoverable private secret has been saved.
  await room.set(secretPath(uid, number, hash), secret);
  const result = await room.transact('g/oan', raw => commitChoice(raw, number, uid, hash, players));
  if (!result.committed) throw new Error('Ván đã thay đổi hoặc bạn đã khóa lựa chọn. Bấm Đồng bộ lại.');
  return result.value;
}

export async function revealChoice(room, snapshot, uid, players) {
  const number = roundNumber(snapshot), round = snapshot.r?.[number];
  if (!allCommitted(round, players) || !participants(round, players).some(p => p.uid === uid) || round.reveal?.[uid]) return;
  const hash = round.commit[uid], secret = await room.get(secretPath(uid, number, hash));
  if (!secret || !validChoice(secret.c) || typeof secret.s !== 'string' || await sha(`${secret.c}:${secret.s}`) !== hash) {
    throw new Error('Không khôi phục được lựa chọn đã khóa của bạn. Nếu đây là ván cũ, hãy bắt đầu lại ván.');
  }
  await room.transact('g/oan', raw => {
    const current = raw?.r?.[number];
    if (roundNumber(raw) !== number || current?.cancelled || current?.commit?.[uid] !== hash || !allCommitted(current, players)) return undefined;
    if (current.reveal?.[uid]) return undefined;
    return { ...raw, r: { ...raw.r, [number]: { ...current, players: participants(current, players), reveal: { ...current.reveal, [uid]: secret } } } };
  });
}

export async function advanceRound(room, snapshot, uid, players, restart = false) {
  const number = roundNumber(snapshot), round = snapshot.r?.[number];
  if (!round || !participants(round, players).some(p => p.uid === uid)) throw new Error('Bạn đang xem ván này.');
  const result = await evaluateRound(round, players);
  if (!restart && !result.complete) throw new Error('Chưa có kết quả; không thể chuyển ván.');
  if (restart && result.complete) throw new Error('Ván đã có kết quả. Hãy bấm Ván tiếp.');
  const fingerprint = JSON.stringify(round);
  const saved = await room.transact('g/oan', raw => {
    if (roundNumber(raw) !== number || JSON.stringify(raw?.r?.[number]) !== fingerprint) return undefined;
    return { ...raw, round: number + 1, ...(restart ? { r: { ...raw.r, [number]: { ...round, cancelled: true } } } : {}) };
  });
  if (!saved.committed) throw new Error('Ván vừa cập nhật. Bấm Đồng bộ lại để xem trạng thái mới.');
}

// A slow verification from an older snapshot must never overwrite a newer UI.
export function latestOnly() {
  let generation = 0, stopped = false;
  return {
    async run(work, apply, fail) {
      const own = ++generation;
      try { const value = await work(); if (!stopped && own === generation) apply(value); }
      catch (error) { if (!stopped && own === generation) fail(error); }
    },
    stop() { stopped = true; generation++; },
  };
}
