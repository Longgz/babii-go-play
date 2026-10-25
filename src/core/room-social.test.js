import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_PATH, ACTIVITY_PATH, CHAT_LIMIT, ACTIVITY_LIMIT, entries, appendMessage, appendVisit, gameVisitors, unreadCount, publish } from './room-social.js';
import { mountRoomPanel, messagesHTML, activityHTML } from '../room-panel.js';

const a = { uid: 'a', name: 'An' }, b = { uid: 'b', name: 'Bình' };
const game = { id: 'may-bay', name: 'Bắn máy bay' }, otherGame = { id: 'bai4', name: 'Bài 4 màu' };
const message = (id, uid = 'a', text = 'Xin chào') => ({ id, uid, name: uid === 'a' ? a.name : b.name, at: 1000, text, game });
const visit = (id, uid = 'a', at = 1000) => ({ ...message(id, uid), at });
const copy = value => structuredClone(value);
function memoryRoom(code = 'ROOM') {
  const data = new Map(), watchers = new Map();
  const room = {
    code, calls: 0, players: () => [a, b],
    get: path => copy(data.get(path) ?? null),
    watch(path, fn) {
      if (!watchers.has(path)) watchers.set(path, new Set());
      watchers.get(path).add(fn); fn(room.get(path));
      return () => watchers.get(path).delete(fn);
    },
    async transact(path, update) {
      room.calls++;
      const next = update(room.get(path));
      if (next === undefined) return { committed: false, value: room.get(path) };
      data.set(path, copy(next)); watchers.get(path)?.forEach(fn => fn(room.get(path)));
      return { committed: true, value: room.get(path) };
    },
    subscribers: () => [...watchers.values()].reduce((n, set) => n + set.size, 0),
  };
  return room;
}

test('simultaneous messages preserve both senders and retries reuse the same message', async () => {
  const room = memoryRoom();
  await Promise.all([publish(room, CHAT_PATH, appendMessage, message('one')), publish(room, CHAT_PATH, appendMessage, message('two', 'b'))]);
  assert.deepEqual(entries(room.get(CHAT_PATH)).map(e => [e.uid, e.seq]), [['a', 1], ['b', 2]]);
  await publish(room, CHAT_PATH, appendMessage, message('one'));
  assert.equal(room.get(CHAT_PATH).seq, 2);
});

test('messages trim whitespace, reject invalid input and retain literal markup as text', () => {
  const state = appendMessage(null, message('m', 'a', '  <img src=x onerror=alert(1)>\nXin chào  '));
  assert.equal(entries(state)[0].text, '<img src=x onerror=alert(1)>\nXin chào');
  assert.match(messagesHTML(state, 'b'), /&lt;img/);
  assert.doesNotMatch(messagesHTML(state, 'b'), /<img/);
  for (const text of ['', ' \n ', 'x'.repeat(501), null]) assert.throws(() => appendMessage(state, message('bad', 'a', text)));
  for (const changes of [{ uid: 'a/b' }, { id: '' }, { name: '' }, { at: NaN }, { game: { id: '../x', name: 'X' } }]) assert.throws(() => appendMessage(null, { ...message('bad'), ...changes }));
  assert.equal(state.seq, 1);
});

test('chat retains a bounded ordered history and unread counts exclude own messages', () => {
  let state;
  for (let i = 1; i <= CHAT_LIMIT + 20; i++) state = appendMessage(state, message(`m-${i}`, i % 2 ? 'a' : 'b'));
  assert.equal(entries(state).length, CHAT_LIMIT);
  assert.equal(state.seq, CHAT_LIMIT + 20);
  assert.equal(entries(state)[0].seq, 21);
  assert.equal(unreadCount(state, 'a', state.seq - 2), 1);
  assert.equal(unreadCount(state, 'b', state.seq), 0);
});

test('activity groups unique players per game, refreshes names, and deduplicates quick re-entry', () => {
  let state = appendVisit(null, visit('a1'));
  state = appendVisit(state, visit('b1', 'b'));
  state = appendVisit(state, visit('a2', 'a', 2000));
  assert.equal(state.seq, 2);
  state = appendVisit(state, visit('a3', 'a', 62000));
  state = appendVisit(state, { ...visit('a4'), game: otherGame });
  assert.equal(state.seq, 4);
  assert.deepEqual(new Set(gameVisitors(state, game.id)), new Set(['An', 'Bình']));
  assert.deepEqual(gameVisitors(state, otherGame.id, [{ uid: 'a', name: 'Tên mới' }]), ['Tên mới']);
  assert.equal(appendVisit(state, { ...visit('a4'), game: otherGame }).seq, 4);
  assert.throws(() => appendVisit(state, { ...visit('bad'), game: null }));
});

test('trimming recent activity does not forget players who visited an older game', () => {
  let state = appendVisit(null, { ...visit('old', 'b'), game: otherGame });
  for (let i = 1; i <= ACTIVITY_LIMIT + 5; i++) state = appendVisit(state, visit(`v-${i}`, 'a', i * 61000));
  assert.equal(entries(state).length, ACTIVITY_LIMIT);
  assert.deepEqual(gameVisitors(state, otherGame.id), ['Bình']);
  assert.equal(unreadCount(null, 'a'), 0);
  assert.deepEqual(gameVisitors(null, 'none'), []);
});

test('activity escapes names/game titles and room data never crosses room boundaries', async () => {
  const one = memoryRoom('ONE'), two = memoryRoom('TWO');
  await publish(one, ACTIVITY_PATH, appendVisit, { ...visit('v'), name: '<script>x</script>', game: { id: 'may-bay', name: '<b>Bay</b>' } });
  assert.match(activityHTML(one.get(ACTIVITY_PATH)), /&lt;script&gt;/);
  assert.doesNotMatch(activityHTML(one.get(ACTIVITY_PATH)), /<script>/);
  assert.equal(two.get(ACTIVITY_PATH), null);
  await assert.rejects(publish(one, CHAT_PATH, appendMessage, message('bad', 'a', '')));
  assert.equal(one.get(CHAT_PATH), null);
});

function storage(t) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), data = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage; });
}
function mounted(room, me = a) {
  const slots = new Map();
  // Minimal DOM sinks verify real event/subscription behavior, not browser layout.
  const el = {
    innerHTML: '', contains: () => true,
    querySelector(selector) {
      if (!slots.has(selector)) {
        const data = {};
        for (const match of selector.matchAll(/\[data-(\w+)="([^"]+)"\]/g)) data[match[1]] = match[2];
        slots.set(selector, { innerHTML: '', textContent: '', dataset: data, attributes: {}, value: '', hidden: false, disabled: false,
          scrollHeight: 100, scrollTop: 0, clientHeight: 100, focus() {}, setAttribute(k, v) { this.attributes[k] = v; } });
      }
      return slots.get(selector);
    },
  };
  const panel = mountRoomPanel(el, { room, getMe: () => me }), q = selector => el.querySelector(selector);
  return { ...panel, el, q,
    type(text) { q('textarea').value = text; q('textarea').oninput(); },
    send: () => q('form').onsubmit({ preventDefault() {} }),
    click(selector) { el.onclick({ target: { closest: () => q(selector) } }); },
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('two room panels display concurrent messages without changing the game or losing drafts', async t => {
  storage(t);
  const room = memoryRoom(), first = mounted(room), second = mounted(room, b);
  t.after(() => { first.destroy(); second.destroy(); });
  first.setGame(game); second.setGame(otherGame);
  first.type('Chờ mình nhé'); second.type('Ok!');
  first.setGame(otherGame);
  assert.equal(first.q('textarea').value, 'Chờ mình nhé');
  await Promise.all([first.send(), second.send()]);
  for (const ui of [first, second]) {
    assert.match(ui.q('.room-messages').innerHTML, /Chờ mình nhé/);
    assert.match(ui.q('.room-messages').innerHTML, /Ok!/);
    assert.equal(ui.q('textarea').value, '');
  }
  assert.equal(entries(room.get(CHAT_PATH)).length, 2);
  assert.equal(first.q('.room-unread').textContent, '1');
  first.click('.room-launcher');
  assert.equal(first.q('.room-unread').hidden, true);
});

test('rapid submit locks once, failed delivery preserves draft, and retry does not duplicate an accepted message', async t => {
  storage(t);
  const room = memoryRoom(), original = room.transact, ui = mounted(room);
  t.after(() => ui.destroy());
  let fail = true;
  room.transact = async (...args) => {
    const result = await original(...args);
    if (fail) { fail = false; throw new Error('connection lost after commit'); }
    return result;
  };
  ui.type('Chơi tiếp thôi');
  await Promise.all([ui.send(), ui.send()]);
  assert.equal(room.calls, 1);
  assert.equal(ui.q('textarea').value, 'Chơi tiếp thôi');
  assert.match(ui.q('.room-chat-error').textContent, /Chưa gửi được/);
  await ui.send();
  assert.equal(entries(room.get(CHAT_PATH)).length, 1);
  assert.equal(ui.q('textarea').value, '');
});

test('draft and read position survive reopen but are isolated by room and user', async t => {
  storage(t);
  const room = memoryRoom(), ui = mounted(room);
  await publish(room, CHAT_PATH, appendMessage, message('m1', 'b'));
  ui.click('.room-launcher'); ui.type('Bản nháp'); ui.destroy();
  const reopened = mounted(room), elsewhere = mounted(memoryRoom('ELSEWHERE')), otherUser = mounted(room, b);
  t.after(() => { reopened.destroy(); elsewhere.destroy(); otherUser.destroy(); });
  assert.equal(reopened.q('textarea').value, 'Bản nháp');
  assert.equal(reopened.q('.room-unread').hidden, true);
  assert.equal(elsewhere.q('textarea').value, '');
  assert.equal(otherUser.q('textarea').value, '');
});

test('retry after reload reuses the message ID when the previous acknowledgement was lost', async t => {
  storage(t);
  const room = memoryRoom(), original = room.transact, first = mounted(room);
  room.transact = async (...args) => { await original(...args); throw new Error('lost acknowledgement'); };
  first.type('Một tin thôi'); await first.send(); first.destroy();
  room.transact = original;
  const reopened = mounted(room); t.after(() => reopened.destroy());
  assert.equal(reopened.q('textarea').value, 'Một tin thôi');
  await reopened.send();
  assert.equal(entries(room.get(CHAT_PATH)).length, 1);
  assert.equal(reopened.q('textarea').value, '');
});

test('reading older messages does not auto-scroll or mark incoming messages read', async t => {
  storage(t);
  const room = memoryRoom(), ui = mounted(room); t.after(() => ui.destroy());
  ui.click('.room-launcher');
  Object.assign(ui.q('.room-chat-scroll'), { scrollHeight: 800, scrollTop: 0, clientHeight: 100 });
  await publish(room, CHAT_PATH, appendMessage, message('new', 'b'));
  assert.equal(ui.q('.room-chat-scroll').scrollTop, 0);
  assert.equal(ui.q('.room-jump').hidden, false);
  assert.equal(ui.q('.room-unread').textContent, '1');
  ui.click('.room-jump');
  assert.equal(ui.q('.room-unread').hidden, true);
});

test('leaving the room unsubscribes and a late send acknowledgement never touches the next panel', async t => {
  storage(t);
  const room = memoryRoom(), ui = mounted(room), original = room.transact;
  let finish;
  room.transact = (...args) => new Promise(resolve => { finish = async () => resolve(await original(...args)); });
  ui.type('Đang gửi'); const sent = ui.send();
  ui.destroy(); assert.equal(room.subscribers(), 0);
  const other = mounted(memoryRoom('NEXT')); t.after(() => other.destroy());
  await finish(); await sent;
  assert.equal(ui.el.innerHTML, '');
  assert.equal(other.q('.room-messages').innerHTML, '');
  assert.equal(other.q('textarea').value, '');
});

test('game activity retry is idempotent and changing games records the new destination', async t => {
  storage(t);
  const room = memoryRoom(), ui = mounted(room), original = room.transact;
  t.after(() => ui.destroy());
  room.transact = async () => { throw new Error('offline'); };
  ui.setGame(game); await settle();
  assert.match(ui.q('.room-activity-error').textContent, /Chưa ghi được/);
  room.transact = original;
  ui.click('[data-retry="visit"]'); await settle();
  assert.equal(entries(room.get(ACTIVITY_PATH)).length, 1);
  ui.setGame(game); await settle();
  assert.equal(entries(room.get(ACTIVITY_PATH)).length, 1);
  ui.setGame(otherGame); await settle();
  assert.equal(entries(room.get(ACTIVITY_PATH)).length, 2);
  assert.match(ui.q('.room-activities').innerHTML, /Bài 4 màu/);
});
