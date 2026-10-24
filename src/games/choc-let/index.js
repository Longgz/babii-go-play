import { esc } from '../../core/ui.js';
import { tone } from '../../core/sound.js';
import { avatarSVG } from '../../core/avatar.js';
import { onChange } from '../../core/room.js';
import { BODY_PARTS, partOf, stateOf, eventsOf, addPoke, enterVisit, acknowledge, historyFor, reactionQueue } from './logic.js';

const clock = at => at ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(at) : 'trước đây';

export default {
  id: 'choc-let', name: 'Chọc lét', icon: '👉',
  desc: 'Xoa đầu, véo má, chọc lét và xem từng phản ứng của bạn bè',
  min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx, visitId = crypto.randomUUID(), enteredAt = Date.now();
    let st = stateOf(null), alive = true, ready = false, initializing = false, stopWatch = () => {};
    let targetUid = null, reaction = null, outgoing = null, sending = false, failedDraft = null;
    let since = 0, previousAt = 0, receivedAtEntry = 0, entrySeq = 0, completedThrough = 0;
    let savingReceipt = false, receiptError = '', sendError = '', initError = '', limit = 50;
    let myKey = '', targetKey = '';
    const q = s => el.querySelector(s), ps = () => room.players();
    const nameOf = uid => ps().find(p => p.uid === uid)?.name || 'Người chơi';
    const avatarOf = uid => ps().find(p => p.uid === uid)?.avatar || {};
    const fromName = e => e.fromName || nameOf(e.from);
    const toName = e => e.toName || nameOf(e.to);

    el.innerHTML = `<section class="choc-game">
      <div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn">Chọc Lét</div></div>
      <p class="poke-intro">Chọn một người bạn và vị trí tương tác. Mỗi lần chọc có một phản ứng riêng, kể cả lúc bạn vắng mặt.</p>
      <div class="poke-errors" role="alert"></div>
      <div class="poke-roster row"></div>
      <div class="poke-arena"><div class="poke-stage poke-me"></div><div class="poke-stage poke-target"></div></div>
      <p class="poke-queue-status" role="status" aria-live="polite"></p>
      <div class="panel poke-history"></div>
      <div class="panel poke-ranking"></div>
    </section>`;

    function sound(part) {
      tone(part.soundTone, .08, .12, 'triangle');
      tone(part.soundTone * 1.25, .09, .12, 'sine', .09);
      tone(part.soundTone * 1.5, .12, .12, 'triangle', .19);
    }
    const incomingQueue = reactionQueue({
      start(event) {
        if (!alive) return;
        reaction = event; const part = partOf(event.partId);
        sound(part); try { navigator.vibrate?.([40, 30, 60]); } catch {}
        render();
      },
      complete(event) {
        completedThrough = Math.max(completedThrough, event.seq);
        reaction = null; void flushReceipt();
      },
      idle() { reaction = null; render(); },
    });
    const outgoingQueue = reactionQueue({
      duration: 900,
      start(event) { outgoing = event; sound(partOf(event.partId)); render(); },
      idle() { outgoing = null; render(); },
    });

    async function flushReceipt() {
      if (savingReceipt || !alive || completedThrough <= (st.receipts[me.uid] || 0)) return;
      savingReceipt = true;
      const through = completedThrough;
      try {
        const result = await room.transact('g/choc', raw => acknowledge(raw, me.uid, through));
        if (!result.committed) throw new Error('Chưa lưu được trạng thái đã xem.');
        // Do not depend on listener delivery order for receipt progress.
        st.receipts[me.uid] = Math.max(st.receipts[me.uid] || 0, through);
        receiptError = '';
      } catch { receiptError = 'Chưa lưu được phản ứng đã xem. Thử lưu lại để tránh phát lại khi vào lần sau.'; }
      finally {
        savingReceipt = false; render();
        if (!receiptError && completedThrough > through) void flushReceipt();
      }
    }

    async function sendPoke(draft) {
      if (!ready || sending || !alive) return;
      if (!ps().some(p => p.uid === draft.to && p.uid !== me.uid)) {
        failedDraft = null; sendError = 'Người nhận không còn trong phòng.'; render(); return;
      }
      sending = true; sendError = ''; render();
      try {
        const result = await room.transact('g/choc', raw => addPoke(raw, draft));
        if (!result.committed) throw new Error('Thao tác chưa được xác nhận.');
        failedDraft = null;
        if (alive) {
          ctx.toast(`Đã ${partOf(draft.partId).name.toLowerCase()} ${draft.toName}.`);
          ctx.ping([draft.to], `${me.name} vừa tương tác với bạn trong Chọc Lét.`);
        }
      } catch {
        failedDraft = draft;
        sendError = 'Chưa xác nhận được thao tác. Bấm Gửi lại để thử lại đúng thao tác này, không cộng trùng.';
      } finally { sending = false; render(); }
    }

    function reactionHTML(event, avatar) {
      const part = event && partOf(event.partId);
      return `<div class="poke-char-wrap ${part ? `poke-motion-${part.motion}` : ''}">
        ${avatarSVG(avatar, 164, { crop: 'full', overrideFace: part?.face })}
        ${part ? `<div class="poke-bubble">${esc(part.quote)}</div><div class="poke-ripple" style="left:${part.x}%;top:${part.y}%"></div><div class="poke-finger" style="left:${part.x}%;top:${part.y}%">${part.icon}</div>` : ''}
      </div>`;
    }

    function render() {
      if (!alive) return;
      const players = ps(), opponents = players.filter(p => p.uid !== me.uid);
      if (!opponents.some(p => p.uid === targetUid)) targetUid = opponents[0]?.uid || null;
      const target = opponents.find(p => p.uid === targetUid);
      q('.poke-errors').innerHTML = `${initError ? `<p>${esc(initError)} <button class="btn" data-a="retry-init">Kết nối lại</button></p>` : ''}
        ${sendError ? `<p>${esc(sendError)}${failedDraft ? ` <button class="btn" data-a="retry-send" ${sending ? 'disabled' : ''}>Gửi lại</button><button class="btn" data-a="dismiss-send" ${sending ? 'disabled' : ''}>Đóng</button>` : ''}</p>` : ''}
        ${receiptError ? `<p>${esc(receiptError)} <button class="btn" data-a="retry-receipt" ${savingReceipt ? 'disabled' : ''}>Lưu lại</button></p>` : ''}`;
      q('.poke-roster').innerHTML = opponents.length > 1 ? `<span>Tương tác với:</span>${opponents.map(p => `<button class="btn ${targetUid === p.uid ? 'pri' : ''}" data-target="${esc(p.uid)}">${esc(p.name)}</button>`).join('')}` : '';

      const stats = st.stats[me.uid] || {};
      const totals = BODY_PARTS.map(p => ({ part: p, count: Object.entries(stats).filter(([id]) => partOf(id)?.id === p.id).reduce((sum, [, n]) => sum + (Number(n) || 0), 0) }));
      const most = totals.sort((a, b) => b.count - a.count)[0];
      const nextMyKey = JSON.stringify([reaction?.id, avatarOf(me.uid), me.name, !reaction && stats]);
      if (nextMyKey !== myKey) {
        myKey = nextMyKey;
        q('.poke-me').innerHTML = `<div class="poke-stage-title">Bạn · ${esc(me.name)}</div>
          ${reactionHTML(reaction, avatarOf(me.uid))}
          <p class="poke-reaction-caption" role="status" aria-live="polite">${reaction ? `${esc(fromName(reaction))} → ${esc(partOf(reaction.partId).name)} · ${clock(reaction.at)}` : most?.count ? `Hay bị ${esc(most.part.name.toLowerCase())} nhất · ${most.count} lần` : 'Chưa có ai chọc bạn.'}</p>`;
      }
      const targetReaction = outgoing?.to === targetUid ? outgoing : null;
      const nextTargetKey = JSON.stringify([target, avatarOf(targetUid), targetReaction?.id, ready, sending, failedDraft?.id]);
      if (nextTargetKey !== targetKey) {
        targetKey = nextTargetKey;
        q('.poke-target').innerHTML = !target ? `<p>Chờ bạn bè vào phòng.</p><p>Mã phòng: <b>${esc(room.code)}</b></p>` : `
          <div class="poke-stage-title">${esc(target.name)} · Chạm để tương tác</div>
          <div class="poke-char-wrap">
            ${avatarSVG(avatarOf(targetUid), 164, { crop: 'full', overrideFace: targetReaction ? partOf(targetReaction.partId).face : undefined })}
            ${BODY_PARTS.map(part => `<button class="poke-hotspot" data-part="${part.id}" style="left:${part.x}%;top:${part.y}%" aria-label="${part.name}" title="${part.name}${part.id === 'butt' ? ' (phía sau)' : ''}" ${!ready || sending || failedDraft ? 'disabled' : ''}>${part.icon}</button>`).join('')}
            ${targetReaction ? `<div class="poke-bubble">${esc(partOf(targetReaction.partId).quote)}</div><div class="poke-finger" style="left:${partOf(targetReaction.partId).x}%;top:${partOf(targetReaction.partId).y}%">${partOf(targetReaction.partId).icon}</div>` : ''}
          </div>
          <p class="poke-help">Chạm điểm trên avatar hoặc chọn nút bên dưới. Điểm mông biểu thị phía sau.</p>
          <div class="poke-part-grid">${BODY_PARTS.map(part => `<button class="btn-poke-part" data-part="${part.id}" ${!ready || sending || failedDraft ? 'disabled' : ''}><span>${part.icon}</span><b>${part.name}</b></button>`).join('')}</div>`;
      }
      q('.poke-queue-status').textContent = !ready ? 'Đang tải các tương tác chưa xem…'
        : incomingQueue.remaining ? `Đang phản ứng: ${reaction ? partOf(reaction.partId).name : ''} · Còn ${Math.max(0, incomingQueue.remaining - 1)} lượt tiếp theo. Mỗi thao tác được phát lần lượt.`
        : 'Đã phát xong các phản ứng nhận được. Bạn có thể xem lại từng thao tác trong lịch sử.';

      const history = historyFor(st, me.uid, since, receivedAtEntry).reverse();
      q('.poke-history').innerHTML = `<h3>Lịch sử tương tác · ${history.length}</h3>
        <p class="poke-help">${previousAt ? `Từ lần bạn vào trước: ${clock(previousAt)}.` : 'Lần đầu vào: hiển thị các tương tác của bạn đã được lưu.'} Bao gồm gửi và nhận; các lượt chưa xem từ trước vẫn được giữ.</p>
        ${history.length ? `<ol class="poke-history-list">${history.slice(0, limit).map(e => `<li><span class="poke-history-icon">${partOf(e.partId).icon}</span><div><b>${esc(fromName(e))}</b> ${esc(partOf(e.partId).name.toLowerCase())} <b>${e.to === me.uid ? 'bạn' : esc(toName(e))}</b><small>${clock(e.at)} · #${e.seq}${e.to === me.uid ? e.seq <= Math.max(st.receipts[me.uid] || 0, completedThrough) ? ' · Đã phản ứng' : reaction?.id === e.id ? ' · Đang phản ứng' : ' · Chờ phản ứng' : ' · Đã gửi'}</small></div></li>`).join('')}</ol>` : '<p>Chưa có tương tác trong khoảng này.</p>'}
        ${history.length > limit ? `<button class="btn" data-a="more">Xem thêm ${Math.min(50, history.length - limit)} thao tác</button>` : ''}`;
      q('.poke-ranking').innerHTML = `<h3>Số lần tương tác trong phòng</h3><ul class="tally">${players.map(p => `<li><span>${avatarSVG(p.avatar, 24)} ${esc(p.name)}</span><b>${Number(st.count[p.uid]) || 0}</b></li>`).join('')}</ul>`;
    }

    async function initialize() {
      if (initializing || !alive) return;
      initializing = true; initError = ''; render();
      try {
        const result = await room.transact('g/choc', raw => enterVisit(raw, me.uid, visitId, enteredAt));
        if (!result.committed) throw new Error('Không thể mở phiên chơi.');
        if (!alive) return;
        st = stateOf(result.value);
        const visit = st.visits[me.uid];
        since = visit.previousSeq; previousAt = visit.previousAt; entrySeq = visit.seq;
        receivedAtEntry = st.receipts[me.uid] || 0; completedThrough = receivedAtEntry;
        ready = true;
        stopWatch = room.watch('g/choc', raw => {
          if (!alive) return;
          st = stateOf(raw);
          const events = eventsOf(st);
          incomingQueue.add(events.filter(e => e.to === me.uid && e.seq > Math.max(st.receipts[me.uid] || 0, completedThrough)));
          outgoingQueue.add(events.filter(e => e.from === me.uid && e.seq > entrySeq));
          render();
        });
      } catch (err) { initError = `Chưa tải được lịch sử. ${err.message}`; }
      finally { initializing = false; render(); }
    }

    el.onclick = e => {
      const button = e.target.closest('button');
      if (!button || !el.contains(button) || button.disabled || !alive) return;
      const { a, target, part } = button.dataset;
      if (a === 'retry-init') return void initialize();
      if (a === 'retry-receipt') return void flushReceipt();
      if (a === 'retry-send' && failedDraft) return void sendPoke(failedDraft);
      if (a === 'dismiss-send') { failedDraft = null; sendError = ''; render(); return; }
      if (a === 'more') { limit += 50; render(); return; }
      if (target) { targetUid = target; render(); return; }
      if (part && partOf(part) && targetUid && ready && !sending && !failedDraft) {
        void sendPoke({ id: crypto.randomUUID(), from: me.uid, fromName: me.name, to: targetUid, toName: nameOf(targetUid), partId: part, at: Date.now() });
      }
    };
    ctx.onLeave(() => { alive = false; stopWatch(); incomingQueue.stop(); outgoingQueue.stop(); el.onclick = null; });
    ctx.onLeave(onChange(render));
    render(); void initialize();
  },
};
