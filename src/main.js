import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-800.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import './styles/base.css';
import './styles/games.css';
import './styles/room.css';
import { games } from './games/registry.js';
import { renderHub } from './hub.js';
import { mountAvatar } from './avatar-editor.js';
import { names } from './core/players.js';
import { store } from './core/store.js';
import { session, init, ping, onChange } from './core/room.js';
import { mountRoomPanel } from './room-panel.js';

const app = document.getElementById('app');
let leave = [], th;
const roomPanelHost = document.createElement('div');
document.body.append(roomPanelHost);
let panelRoom = null, roomPanel = null, currentGame = null;
function syncRoomPanel() {
  if (session.room !== panelRoom) {
    roomPanel?.destroy(); panelRoom = session.room;
    roomPanel = panelRoom ? mountRoomPanel(roomPanelHost, { room: panelRoom, getMe: () => session.me }) : null;
    document.body.classList.toggle('has-room', !!panelRoom);
  }
  roomPanel?.setGame(currentGame);
}
onChange(syncRoomPanel);

// Thứ mọi game dùng chung: tên, lưu cục bộ, phòng hiện tại (null nếu chưa vào), người dùng, dọn dẹp khi rời game
const ctx = {
  names, store,
  get room() { return session.room; },
  get me() { return session.me; },
  onLeave: f => leave.push(f),
  ping,
  toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(th); th = setTimeout(() => t.hidden = true, 2400); }
};

function route() {
  leave.splice(0).forEach(f => f());
  const id = location.hash.replace(/^#\/?/, '');
  if (id === 'avatar') { currentGame = null; syncRoomPanel(); app.innerHTML = ''; mountAvatar(app, ctx); window.scrollTo(0, 0); return; }
  const g = games.find(x => x.id === id && x.ready && (!x.room || ctx.room));
  app.innerHTML = '';
  g ? g.mount(app, ctx) : renderHub(app, ctx);
  currentGame = g || null; syncRoomPanel();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);
app.textContent = 'Đang kết nối…';
init().catch(e => console.warn(e)).finally(route);

// PWA: cài lên màn hình chính, mở lại được khi mạng chập chờn
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
