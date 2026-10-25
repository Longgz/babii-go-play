import { esc } from '../../core/ui.js';
import { fanfare, tone } from '../../core/sound.js';
import { onChange } from '../../core/room.js';
import { store } from '../../core/store.js';
import { N, PLANES, cells, fits, canPlace, validBoard, atHead, headCell, coord, randomBoard, kills, normalize, newMatch, readyToPlay, commitMove } from './logic.js';

const ARROW = ['↑', '→', '↓', '←'], DIRECTION = ['lên', 'phải', 'xuống', 'trái'];
const COLORS = ['#5eead4', '#c4b5fd', '#fcd34d'];
const MARK = { k: '✹', h: '●', m: '×' };
const RESULT = { k: 'hạ một máy bay', h: 'trúng thân', m: 'trượt' };
const ROTATION = ['', 'translate(4 0) rotate(90)', 'translate(5 4) rotate(180)', 'translate(0 5) rotate(270)'];

function planeSVG(plane, index, preview = false, valid = true) {
  const [x, y, d] = plane, color = valid ? COLORS[index % COLORS.length] : '#fb7185';
  return `<g transform="translate(${x} ${y})"><g transform="${ROTATION[d]}">
    <path d="M2 0 H3 V1 H5 V2 H3 V3 H4 V4 H1 V3 H2 V2 H0 V1 H2 Z" fill="${color}" fill-opacity="${preview ? '.25' : '.32'}" stroke="${color}" stroke-width=".065" ${preview ? 'stroke-dasharray=".17 .1"' : ''}/>
    <path d="M2.5 .2 L2.22 .7 H2.78Z" fill="${color}"/>
    <path d="M2.5 1 V3.6 M.45 1.5 H4.55 M1.4 3.5 H3.6" stroke="${color}" stroke-opacity=".7" stroke-width=".06" fill="none"/>
  </g></g>`;
}

export default {
  id: 'may-bay', name: 'Bắn máy bay', icon: '✈️', desc: 'Giấu 3 máy bay, bắn trúng đầu để hạ gục', min: 2, max: 2, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = null, loaded = false, alive = true, busy = false, initializing = false, currentMatch = null;
    let draft = [], rot = 0, selected = null, editing = null, history = [], error = '', won = null, version = 0;
    const q = selector => el.querySelector(selector);
    const players = () => st?.schema === 2 ? st.players : room.players().slice(0, 2);
    const seat = () => players().findIndex(p => p.uid === me.uid);
    const draftKey = () => `plane-draft:${room.code}:${me.uid}:${currentMatch}`;
    const saveDraft = () => { if (currentMatch) store.set(draftKey(), { board: draft, rot }); };
    const clearSelection = () => { selected = null; editing = null; };
    const updateDraft = board => {
      history = [...history, draft.map(p => [...p])].slice(-20);
      draft = board.map(p => [...p]); clearSelection(); saveDraft(); render();
    };

    el.innerHTML = `<section class="plane-game"><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <div class="panel main"></div><div class="plane-errors" role="alert"></div>
      <details class="rules-panel"><summary>📖 Cách đặt &amp; luật chơi</summary><div class="rules-content"><p>Chọn ô đặt <b>đầu máy bay</b>, xoay để xem trước, rồi bấm <b>Đặt máy bay</b>. Vị trí không tự dời khi chạm mép lưới. Máy bay phải nằm trọn trong bảng, không chồng lên nhau.</p>
      <p>Mỗi bên có 3 máy bay, mỗi chiếc chiếm 10 ô. Chọn một chiếc trong danh sách để di chuyển, xoay hoặc xóa. Khi đủ 3 chiếc, bấm <b>Sẵn sàng</b>. Bạn có thể sửa lại khi đối phương chưa sẵn sàng; khi cả hai đã xác nhận thì đội hình được khóa.</p>
      <p>Hai người luân phiên bắn, mỗi lượt một ô. Trúng thân chưa hạ máy bay; trúng đầu mới hạ được một chiếc. Ai hạ đủ 3 chiếc trước thì thắng. Người vào sau chỉ xem ván đang chơi.</p>
      <small>Đây là chế độ chơi theo danh dự giữa bạn bè: vị trí máy bay được lưu trong phòng.</small></div></details></section>`;

    function boardHTML({ board = [], shots = new Map(), action = '', ghost = null, ghostValid = true, compact = false, last = null }) {
      const occupied = new Map();
      board.forEach((plane, index) => cells(...plane).c.forEach(([x, y], j) => occupied.set(y * N + x, { index, head: j === 0 })));
      const ghostCells = new Set(ghost ? cells(...ghost).c.filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N).map(([x, y]) => y * N + x) : []);
      return `<div class="plane-chart ${compact ? 'compact' : ''}"><span></span><div class="plane-columns" aria-hidden="true">${Array.from({ length: N }, (_, i) => `<span>${String.fromCharCode(65 + i)}</span>`).join('')}</div>
        <div class="plane-rows" aria-hidden="true">${Array.from({ length: N }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>
        <div class="plane-grid" role="group" aria-label="${action === 'place' ? 'Bảng đặt máy bay' : action === 'shoot' ? 'Bảng bắn đối phương' : 'Vị trí máy bay'}">
          <svg class="plane-overlay" viewBox="0 0 10 10" aria-hidden="true">${board.map((plane, i) => planeSVG(plane, i)).join('')}${ghost ? planeSVG(ghost, editing ?? draft.length, true, ghostValid) : ''}</svg>
          ${Array.from({ length: N * N }, (_, cell) => {
            const hit = shots.get(cell), own = occupied.get(cell), interactive = !!action;
            const label = `${coord(cell)}${own ? `, máy bay ${own.index + 1}${own.head ? ', đầu máy bay' : ''}` : ''}${hit ? `, ${RESULT[hit]}` : ''}`;
            const classes = `plane-cell ${hit || ''} ${ghostCells.has(cell) ? ghostValid ? 'preview-ok' : 'preview-bad' : ''} ${last === cell ? 'last-shot' : ''}`;
            const symbol = hit ? MARK[hit] : own?.head ? String(own.index + 1) : '';
            return interactive ? `<button class="${classes}" data-${action}="${cell}" aria-label="${action === 'shoot' ? 'Bắn ' : 'Chọn đầu tại '}${esc(label)}" ${busy || action === 'shoot' && hit ? 'disabled' : ''}>${symbol}</button>`
              : `<span class="${classes}" role="img" aria-label="${esc(label)}">${symbol}</span>`;
          }).join('')}
        </div></div>`;
    }

    function placement() {
      const candidate = selected == null ? null : atHead(selected, rot);
      const others = draft.filter((_, i) => i !== editing);
      const valid = candidate && canPlace(others, ...candidate);
      const problem = !candidate ? 'Chạm một ô trên lưới để chọn vị trí đầu máy bay.'
        : !fits(...candidate) ? 'Máy bay vượt mép lưới. Chọn ô đầu khác hoặc xoay lại.'
        : draft.length === PLANES && editing == null ? 'Đã đủ 3 chiếc. Chọn một chiếc bên dưới để sửa.'
        : !valid ? 'Máy bay đang chồng lên chiếc khác. Hãy đổi vị trí.'
        : `${editing == null ? 'Máy bay mới' : `Đang sửa máy bay ${editing + 1}`} · đầu ${coord(selected)} · hướng ${ARROW[rot]} ${DIRECTION[rot]}.`;
      q('.main').innerHTML = `<div class="plane-heading"><div><span class="plane-eyebrow">CHUẨN BỊ ĐỘI HÌNH</span><h2>Giấu máy bay của bạn</h2></div><b class="plane-count">${draft.length}/${PLANES}</b></div>
        <p class="plane-help">① Chọn ô đầu &nbsp; ② Xoay xem trước &nbsp; ③ Đặt máy bay</p>
        ${boardHTML({ board: draft, action: 'place', ghost: candidate, ghostValid: !!valid })}
        <p class="plane-placement-status ${candidate && !valid ? 'invalid' : ''}" role="status" aria-live="polite">${problem}</p>
        <div class="row plane-tools"><button class="btn" data-a="rotate" ${busy ? 'disabled' : ''}>↻ Xoay ${ARROW[rot]}</button><button class="btn pri" data-a="place" ${valid && !busy ? '' : 'disabled'}>${editing == null ? 'Đặt máy bay' : 'Lưu vị trí'}</button>${selected != null ? `<button class="btn" data-a="cancel" ${busy ? 'disabled' : ''}>Hủy chọn</button>` : ''}</div>
        <div class="plane-fleet">${Array.from({ length: PLANES }, (_, i) => draft[i] ? `<div class="plane-fleet-item ${editing === i ? 'selected' : ''}" style="--plane-color:${COLORS[i]}"><button data-edit="${i}" ${busy ? 'disabled' : ''}><b>✈ ${i + 1}</b><span>Đầu ${coord(headCell(draft[i]))} ${ARROW[draft[i][2]]}<small>Chạm để sửa</small></span></button><button data-remove="${i}" aria-label="Xóa máy bay ${i + 1}" ${busy ? 'disabled' : ''}>×</button></div>` : `<div class="plane-fleet-empty">✈ ${i + 1}<small>Chưa đặt</small></div>`).join('')}</div>
        <div class="row plane-tools"><button class="btn" data-a="undo" ${history.length && !busy ? '' : 'disabled'}>↶ Hoàn tác</button><button class="btn" data-a="random" ${busy ? 'disabled' : ''}>🎲 Xếp ngẫu nhiên</button></div>
        <button class="btn pri plane-ready" data-a="ready" ${validBoard(draft, true) && selected == null && !busy ? '' : 'disabled'}>${busy ? 'Đang xác nhận…' : `Sẵn sàng · ${draft.length}/${PLANES} máy bay`}</button>
        ${selected != null && draft.length === PLANES ? '<small class="plane-help">Lưu vị trí hoặc hủy lựa chọn xem trước rồi bấm Sẵn sàng.</small>' : ''}`;
    }

    function render() {
      if (!alive) return;
      q('.plane-errors').innerHTML = error ? `${esc(error)} <button class="btn" data-a="sync" ${busy ? 'disabled' : ''}>Đồng bộ lại</button>` : '';
      const P = players(), mi = seat(), main = q('.main');
      if (!loaded || initializing) { q('.turn').textContent = 'Đang mở ván…'; main.innerHTML = '<p>Đang đồng bộ bảng máy bay…</p>'; return; }
      if (!st || st.schema !== 2) {
        q('.turn').textContent = 'Chuẩn bị ván';
        main.innerHTML = `<p>${st ? 'Ván cũ chưa hỗ trợ cách đặt máy bay mới. Bắt đầu ván mới để sử dụng bản cập nhật.' : P.length < 2 ? 'Chờ người thứ hai vào phòng.' : 'Sẵn sàng mở bảng đặt máy bay.'}</p>${P.length === 2 && mi >= 0 ? `<button class="btn pri" data-a="new" ${busy ? 'disabled' : ''}>Bắt đầu ván mới</button>` : ''}`; return;
      }
      if (mi < 0) { q('.turn').textContent = 'Đang xem'; main.innerHTML = '<p>Ván này dành cho hai người đã bắt đầu. Bạn có thể tham gia từ ván sau.</p>'; return; }
      const opponent = P[1 - mi];
      if (Object.values(st.b).some(board => !validBoard(board, true))) {
        q('.turn').textContent = 'Đội hình không hợp lệ';
        main.innerHTML = '<p>Dữ liệu đội hình không hợp lệ. Hãy bắt đầu ván mới để đặt lại.</p><button class="btn" data-a="new">Bắt đầu ván mới</button>'; return;
      }
      if (!st.b[me.uid]) { q('.turn').textContent = 'Đặt máy bay'; placement(); return; }
      if (!readyToPlay(st)) {
        q('.turn').textContent = 'Đã sẵn sàng';
        main.innerHTML = `<div class="plane-heading"><h2>Đội hình đã lưu</h2><b class="plane-count">3/3</b></div><p>Chờ ${esc(opponent.name)} xác nhận đội hình…</p>${boardHTML({ board: st.b[me.uid] })}<div class="row plane-tools"><button class="btn" data-a="unready" ${busy ? 'disabled' : ''}>Sửa đội hình</button><button class="btn" data-a="new" ${busy ? 'disabled' : ''}>Ván mới</button></div>`; return;
      }
      const mine = new Map(), theirs = new Map();
      st.s.forEach(shot => (shot.by === me.uid ? mine : theirs).set(shot.c, shot.r));
      const cur = P[st.s.length % 2], canShoot = st.winner == null && cur.uid === me.uid, last = st.s.at(-1);
      const name = uid => P.find(p => p.uid === uid)?.name || 'Người chơi';
      q('.turn').textContent = st.winner ? `🏆 ${name(st.winner)} thắng!` : canShoot ? 'Đến lượt bạn bắn' : `Lượt của ${cur.name}`;
      main.innerHTML = `<div class="plane-score"><span>Bạn hạ <b>${kills(st.s, me.uid)}/3</b></span><span>${esc(opponent.name)} hạ <b>${kills(st.s, opponent.uid)}/3</b></span></div>
        <p class="plane-last" role="status">${last ? `${esc(name(last.by))} bắn ${coord(last.c)}: ${RESULT[last.r]}.` : 'Hai bên đã sẵn sàng. Bắn vào ô đầu để hạ máy bay.'}</p>
        <h3>Bầu trời của ${esc(opponent.name)}</h3>
        ${boardHTML({ board: st.winner ? st.b[opponent.uid] : [], shots: mine, action: canShoot ? 'shoot' : '', last: last?.by === me.uid ? last.c : null })}
        <div class="plane-legend"><span>× Trượt</span><span>● Trúng thân</span><span>✹ Trúng đầu</span></div>
        <details class="plane-own"><summary>Đội hình của bạn · ${kills(st.s, opponent.uid)} chiếc bị hạ</summary>${boardHTML({ board: st.b[me.uid], shots: theirs, compact: true, last: last?.by === opponent.uid ? last.c : null })}</details>
        <div class="row plane-tools"><button class="btn" data-a="new" ${busy ? 'disabled' : ''}>Ván mới</button></div>`;
      if (st.winner === me.uid && won !== st.id) { won = st.id; fanfare(); }
    }

    function receive(raw) {
      if (!alive) return;
      version++; loaded = true; st = normalize(raw);
      if (st?.schema === 2 && currentMatch !== st.id) {
        currentMatch = st.id; history = []; clearSelection(); error = '';
        const saved = store.get(draftKey(), null);
        draft = validBoard(st.b[me.uid], true) ? st.b[me.uid].map(p => [...p]) : validBoard(saved?.board) ? saved.board : [];
        rot = Number.isInteger(saved?.rot) && saved.rot >= 0 && saved.rot < 4 ? saved.rot : 0;
      }
      // Another tab belonging to this player may have confirmed a different draft.
      if (validBoard(st?.b?.[me.uid], true)) {
        draft = st.b[me.uid].map(p => [...p]); clearSelection(); saveDraft();
      }
      render(); if (!raw) void initialize();
    }

    async function initialize() {
      const P = room.players().slice(0, 2);
      if (!alive || initializing || st || P.length !== 2 || !P.some(p => p.uid === me.uid)) return;
      initializing = true; render();
      try {
        const fresh = newMatch(P, crypto.randomUUID());
        const before = version;
        const result = await room.transact('g/bm', raw => raw ? undefined : fresh);
        if (alive && before === version && result.value) receive(result.value);
      } catch (err) { error = `Chưa mở được ván. ${err.message}`; }
      finally { initializing = false; render(); }
    }

    async function refresh() {
      const before = version;
      try { const raw = await room.get('g/bm'); if (alive && before === version) receive(raw); }
      catch (err) { error = `Chưa đồng bộ được. ${err.message}`; render(); }
    }

    async function send(action) {
      if (busy || !st || st.schema !== 2 || seat() < 0) return;
      const snapshot = st, before = version; busy = true; error = ''; render();
      try {
        const next = await commitMove(room, snapshot, me.uid, action);
        if (!alive) return;
        if (before === version) receive(next);
        if (action.type === 'shoot') {
          const shot = next.s.at(-1);
          tone(shot.r === 'k' ? 330 : shot.r === 'h' ? 440 : 200, .15, .12);
          ctx.ping(next.players.filter(p => p.uid !== me.uid).map(p => p.uid), next.winner ? 'Ván bắn máy bay đã kết thúc' : 'Đến lượt bạn bắn máy bay');
        } else if (action.type === 'ready') ctx.ping(next.players.filter(p => p.uid !== me.uid).map(p => p.uid), `${me.name} đã đặt xong máy bay`);
      } catch (err) { await refresh(); error = err.message; }
      finally { busy = false; render(); }
    }

    async function restart() {
      if (busy || seat() < 0) return;
      if (st && !st.winner && !confirm('Bắt đầu ván mới? Đội hình và lượt bắn của ván hiện tại sẽ được thay thế.')) return;
      const expected = st, before = version;
      busy = true; error = ''; render();
      try {
        const fresh = newMatch(room.players().slice(0, 2), crypto.randomUUID());
        const result = await room.transact('g/bm', raw => {
          if ((raw?.id ?? null) !== (expected?.id ?? null) || (raw?.revision || 0) !== (expected?.revision || 0)) return undefined;
          return fresh;
        });
        if (!result.committed) throw new Error('Ván vừa thay đổi. Hãy kiểm tra lại trước khi bắt đầu ván mới.');
        if (alive && before === version) receive(result.value);
      } catch (err) { await refresh(); error = err.message; }
      finally { busy = false; render(); }
    }

    el.onclick = e => {
      const button = e.target.closest('button');
      if (!button || !el.contains(button) || button.disabled || busy || !alive) return;
      const { a, place, shoot, edit, remove } = button.dataset;
      if (a === 'sync') { error = ''; void refresh(); return; }
      if (a === 'new') { void restart(); return; }
      if (!st || st.schema !== 2 || seat() < 0) return;
      if (shoot != null) { void send({ type: 'shoot', cell: Number(shoot) }); return; }
      if (a === 'unready') { void send({ type: 'unready' }); return; }
      if (st.b[me.uid]) return;
      if (place != null) { selected = Number(place); render(); return; }
      if (edit != null && draft[Number(edit)]) { editing = Number(edit); rot = draft[editing][2]; selected = headCell(draft[editing]); render(); return; }
      if (remove != null && draft[Number(remove)]) { updateDraft(draft.filter((_, i) => i !== Number(remove))); return; }
      if (a === 'rotate') { rot = (rot + 1) % 4; saveDraft(); render(); return; }
      if (a === 'cancel') { clearSelection(); render(); return; }
      if (a === 'random') { updateDraft(randomBoard()); return; }
      if (a === 'undo' && history.length) { draft = history.pop(); clearSelection(); saveDraft(); render(); return; }
      if (a === 'place' && selected != null) {
        const plane = atHead(selected, rot);
        if (!canPlace(draft.filter((_, i) => i !== editing), ...plane)) return;
        updateDraft(editing == null ? [...draft, plane] : draft.map((p, i) => i === editing ? plane : p)); return;
      }
      if (a === 'ready' && selected == null && validBoard(draft, true)) void send({ type: 'ready', board: draft.map(p => [...p]) });
    };
    ctx.onLeave(() => { alive = false; saveDraft(); el.onclick = null; });
    ctx.onLeave(onChange(() => { render(); if (loaded && !st) void initialize(); }));
    ctx.onLeave(room.watch('g/bm', receive));
  },
};
