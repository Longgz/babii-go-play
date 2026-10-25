// Room-wide chat and game visits live apart from individual game state.
export const CHAT_PATH = 'g/social/chat', ACTIVITY_PATH = 'g/social/activity';
export const MESSAGE_LIMIT = 500, CHAT_LIMIT = 150, ACTIVITY_LIMIT = 100;
const validKey = key => typeof key === 'string' && /^[\w-]{1,128}$/.test(key);
export const entries = state => Object.values(state?.items || {}).filter(e => e && Number.isSafeInteger(e.seq)).sort((a, b) => a.seq - b.seq);

function append(raw, event, limit) {
  const state = raw || {};
  if (state.items?.[event.id]) return state; // Retrying an acknowledged write must not duplicate it.
  const seq = (Number.isSafeInteger(state.seq) ? state.seq : 0) + 1;
  const items = [...entries(state), { ...event, seq }].slice(-limit);
  return { ...state, seq, items: Object.fromEntries(items.map(e => [e.id, e])) };
}
function validateEvent(event) {
  if (!event || !validKey(event.id) || !validKey(event.uid) || typeof event.name !== 'string' || !event.name.trim() || event.name.length > 80 || !Number.isSafeInteger(event.at) || event.at < 0) throw new Error('Thông tin người gửi không hợp lệ.');
  if (event.game && (!validKey(event.game.id) || typeof event.game.name !== 'string' || event.game.name.length > 80)) throw new Error('Thông tin trò chơi không hợp lệ.');
}
export function appendMessage(raw, event) {
  validateEvent(event);
  if (typeof event.text !== 'string' || !event.text.trim() || event.text.trim().length > MESSAGE_LIMIT) throw new Error(`Tin nhắn cần từ 1 đến ${MESSAGE_LIMIT} ký tự.`);
  return append(raw, { id: event.id, uid: event.uid, name: event.name, at: event.at, text: event.text.trim(), game: event.game || null }, CHAT_LIMIT);
}
export function appendVisit(raw, event) {
  validateEvent(event);
  if (!event.game) throw new Error('Chưa chọn trò chơi.');
  const state = raw || {}, previous = state.games?.[event.game.id]?.[event.uid];
  if (state.items?.[event.id] || previous?.id === event.id) return state;
  // Reopening the same game quickly should not fill the activity log.
  if (previous && event.at >= previous.at && event.at - previous.at < 60000) return state;
  const next = append(state, { id: event.id, uid: event.uid, name: event.name, at: event.at, game: event.game }, ACTIVITY_LIMIT);
  return { ...next, games: { ...state.games, [event.game.id]: { ...state.games?.[event.game.id], [event.uid]: { id: event.id, name: event.name, at: event.at, seq: next.seq } } } };
}
export function gameVisitors(state, gameId, members = []) {
  const names = new Map(members.map(p => [p.uid, p.name]));
  return Object.entries(state?.games?.[gameId] || {}).sort((a, b) => a[1].seq - b[1].seq).map(([uid, visit]) => names.get(uid) || visit.name);
}
export function unreadCount(state, uid, seen = 0) {
  return entries(state).filter(e => e.uid !== uid && e.seq > seen).length;
}
export function makeEvent(me, game = null) {
  return { id: crypto.randomUUID(), uid: me.uid, name: me.name, at: Date.now(), game: game ? { id: game.id, name: game.name } : null };
}
export async function publish(room, path, reducer, event) {
  let failure;
  const result = await room.transact(path, raw => {
    try { const next = reducer(raw, event); failure = null; return next; }
    catch (error) { failure = error; return undefined; }
  });
  if (!result.committed) throw failure || new Error('Chưa gửi được. Hãy thử lại.');
  return result.value;
}
