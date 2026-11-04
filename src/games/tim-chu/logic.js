import { buildCrossword } from './crossword.js';

export const PATH = 'g/wf', SOLO_KEY = 'wordfinder-solo-v2';
export const SCHEMA = 3, CATALOG = 'everyday-60-v1', BONUS_LIMIT = 2;
const values = value => Object.values(value || {}).filter(Boolean);
export function canSpell(letters, word) {
  const pool = [...letters.toLowerCase()];
  for (const ch of word) { const i = pool.indexOf(ch); if (i < 0) return false; pool.splice(i, 1); }
  return true;
}
export function prepareLevels(raw) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('Không có bộ từ hợp lệ.');
  return raw.map(level => {
    const l = String(level.l || '').toUpperCase();
    if (!/^[A-Z]{4,6}$/.test(l)) throw new Error('Bộ chữ cần 4–6 chữ cái.');
    const w = [...new Set(values(level.w))], t = values(level.t), h = level.h || {};
    if (w.some(word => typeof word !== 'string' || !/^[a-z]{3,6}$/.test(word) || !canSpell(l, word))) throw new Error('Bộ từ không hợp lệ.');
    if (t.length < 4 || t.length > 6 || new Set(t).size !== t.length || t.some(word => !w.includes(word) || typeof h[word] !== 'string' || !h[word].trim())) throw new Error('Cần 4–6 từ mục tiêu kèm gợi ý.');
    if (w.length - t.length > BONUS_LIMIT || !buildCrossword(t)) throw new Error('Bộ từ không vừa bảng 9×9 hoặc có quá nhiều từ thưởng.');
    return { l, w, t, h };
  });
}
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// Recreate the generator on transaction retries to keep this request's choices stable.
export function seeded(seed) {
  let n = seed >>> 0;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
}
export function drawPuzzle(levels, previous = null, random = Math.random) {
  let used = [...new Set(Object.values(previous?.used || {}).filter(i => Number.isInteger(i) && i >= 0 && i < levels.length))];
  const all = levels.map((_, i) => i);
  let choices = all.filter(i => !used.includes(i));
  if (!choices.length) { used = []; choices = all.filter(i => levels.length === 1 || i !== previous?.level); }
  const level = choices[Math.floor(random() * choices.length)], L = levels[level];
  // Only vetted words that all fit in the crossword may become required answers.
  const targets = [...L.t];
  return { level, targets, used: [...used, level] };
}
export function normalize(raw) {
  if (!raw) return null;
  return { ...raw, players: values(raw.players), targets: values(raw.targets), used: Object.values(raw.used || {}), found: values(raw.found), scores: raw.scores || {} };
}
export const completed = state => !!state?.targets?.length && state.targets.every(word => state.found.some(f => f.word === word));
export const currentPlayer = state => state?.players?.[state.found.length % state.players.length];
export function newGame(levels, players, id, random = Math.random, legacy = null) {
  if (!id || !players.length || players.length > 5 || new Set(players.map(p => p.uid)).size !== players.length) throw new Error('Cần từ 1 đến 5 người chơi khác nhau.');
  const state = { schema: SCHEMA, catalog: CATALOG, id, revision: 0, round: 1, players: players.map(({ uid, name }) => ({ uid, name })), found: [], scores: {}, ...drawPuzzle(levels, null, random) };
  if (legacy) {
    const round = legacy.round || legacy.lv;
    state.round = Number.isInteger(round) && round > 0 ? round + 1 : 1;
    state.upgraded = true;
    if (legacy.scores) {
      for (const [uid, score] of Object.entries(legacy.scores)) if (Number.isFinite(score) && score >= 0) state.scores[uid] = score;
    } else for (const list of values(legacy.f)) for (const f of values(list)) if (!f.skip && Number.isFinite(f.p) && f.p >= 0) state.scores[f.uid] = (state.scores[f.uid] || 0) + f.p;
  }
  return state;
}
export function validState(raw, levels) {
  const s = normalize(raw);
  return !!(s?.schema === SCHEMA && s.catalog === CATALOG && typeof s.id === 'string' && Number.isInteger(s.revision) && s.revision >= 0 && Number.isInteger(s.round) && s.round > 0 && Number.isInteger(s.level) && levels?.[s.level] && s.players.length >= 1 && s.players.length <= 5 && s.players.every(p => typeof p.uid === 'string' && typeof p.name === 'string') && new Set(s.players.map(p => p.uid)).size === s.players.length && s.targets.length === levels[s.level].t.length && new Set(s.targets).size === s.targets.length && s.targets.every(w => levels[s.level].t.includes(w)));
}
export function move(raw, uid, snapshot, action, levels, random = Math.random) {
  const s = normalize(raw);
  if (!validState(s, levels) || s.id !== snapshot.id || s.revision !== snapshot.revision) throw new Error('Ván vừa thay đổi. Hãy thử lại với trạng thái mới.');
  if (!s.players.some(p => p.uid === uid)) throw new Error('Bạn đang xem ván này.');
  if (action.type === 'next') {
    if (!action.replace && !completed(s)) throw new Error('Hãy tìm đủ các từ trên ô chữ trước.');
    return { ...s, ...drawPuzzle(levels, s, random), round: s.round + 1, revision: s.revision + 1, found: [], upgraded: false };
  }
  if (completed(s)) throw new Error('Đã hoàn thành ván. Hãy mở ván tiếp.');
  if (currentPlayer(s)?.uid !== uid) throw new Error('Chưa đến lượt bạn.');
  if (action.type === 'skip') {
    if (s.players.length === 1) throw new Error('Chơi một mình không cần bỏ lượt.');
    return { ...s, revision: s.revision + 1, found: [...s.found, { uid, skip: 1 }] };
  }
  if (action.type !== 'word') throw new Error('Thao tác không hợp lệ.');
  const word = String(action.word || '').trim().toLowerCase(), L = levels[s.level];
  if (word.length < 3) throw new Error('Từ cần ít nhất 3 chữ cái.');
  if (!canSpell(L.l, word) || !L.w.includes(word)) throw new Error(`Từ này không thuộc bộ từ của ván. Hãy xem gợi ý ${s.targets.length} từ cần tìm.`);
  if (s.found.some(f => f.word === word)) throw new Error('Từ này đã được tìm rồi!');
  if (!s.targets.includes(word) && s.found.filter(f => f.word && !s.targets.includes(f.word)).length >= BONUS_LIMIT) throw new Error('Đã đủ 2 từ thưởng. Hãy tìm các từ còn lại trên ô chữ.');
  const p = Math.max(1, word.length - 2) + (word.length === L.l.length ? 3 : 0);
  return { ...s, revision: s.revision + 1, found: [...s.found, { uid, word, p }], scores: { ...s.scores, [uid]: (s.scores[uid] || 0) + p } };
}
export async function commitMove(room, snapshot, uid, action, levels) {
  const seed = Math.floor(Math.random() * 4294967296);
  let error;
  const result = await room.transact(PATH, raw => {
    try { const next = move(raw, uid, snapshot, action, levels, seeded(seed)); error = null; return next; }
    catch (err) { error = err; return undefined; }
  });
  if (!result.committed) throw error || new Error('Chưa lưu được thao tác. Hãy thử lại.');
  return normalize(result.value);
}
