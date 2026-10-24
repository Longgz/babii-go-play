import { esc } from '../../core/ui.js';
import { clack, fanfare } from '../../core/sound.js';
import { onChange } from '../../core/room.js';
import { CHOICES, roundNumber, participants, allCommitted, tally, submitChoice, revealChoice, advanceRound, latestOnly } from './logic.js';

export default {
  id: 'oan-tu-ti', name: 'Oẳn tù tì', icon: '✌️', desc: 'Cùng chọn, cùng mở', min: 2, max: 5, ready: true, room: true,
  mount(el, ctx) {
    const { room, me } = ctx;
    let st = {}, loaded = false, alive = true, busy = false, verifying = false, shown = 0;
    let evaluation = { score: {}, results: {} }, error = '', revealError = '', revealErrorKey = null, opening = null;
    let version = 0, waitKey = '', waitTimer = null, stalled = false;
    const verification = latestOnly(), ps = () => room.players(), q = s => el.querySelector(s);
    el.innerHTML = `<section class="oan-game"><div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div></div>
      <h2>Oẳn tù tì</h2><div class="panel main"></div><div class="oan-errors" role="alert"></div><ul class="tally"></ul></section>`;

    function render() {
      if (!alive) return;
      const number = roundNumber(st), round = st.r?.[number] || {}, roster = participants(round, ps());
      const seated = roster.some(p => p.uid === me.uid), commit = round.commit || {};
      const result = evaluation.results[number], name = uid => roster.find(p => p.uid === uid)?.name || 'Người chơi';
      const disabled = busy || !loaded;
      q('.turn').textContent = `Ván ${number}`;
      let html;
      if (!loaded) html = '<p>Đang tải ván…</p>';
      else if (result?.complete) {
        html = `<div class="picks">${roster.map(p => `<div class="pick">${CHOICES[result.choices[p.uid]][0]}<br><small>${esc(p.name)}</small></div>`).join('')}</div>
          <p class="msg" role="status">${result.winners.length ? 'Thắng: ' + result.winners.map(name).map(esc).join(', ') : 'Hòa!'}</p>
          ${seated ? `<button class="btn pri" data-a="next" ${disabled ? 'disabled' : ''}>Ván tiếp</button>` : '<p>Bạn đang xem; có thể tham gia từ ván tiếp theo.</p>'}`;
        if (shown !== number) { shown = number; result.winners.includes(me.uid) ? fanfare() : clack(); }
      } else if (roster.length < 2) html = '<p>Chờ thêm một người vào phòng để chơi.</p>';
      else if (!seated) html = '<p>Bạn đang xem. Danh sách người chơi đã khóa cho ván này; bạn có thể tham gia từ ván tiếp theo.</p>';
      else if (commit[me.uid]) {
        const missing = roster.filter(p => !commit[p.uid]);
        const unopened = roster.filter(p => !round.reveal?.[p.uid]);
        html = `<p role="status">${missing.length ? `Đã khóa lựa chọn. Chờ ${missing.map(p => esc(p.name)).join(', ')} chọn.`
          : unopened.length ? `Mọi người đã chọn đủ. Đang chờ ${unopened.map(p => esc(p.name)).join(', ')} mở lựa chọn…`
          : verifying ? 'Đã mở đủ lựa chọn. Đang kiểm tra kết quả…' : 'Đang xử lý kết quả…'}</p>`;
      } else html = `<p>Chọn một lần; lựa chọn được giữ kín đến khi mọi người đã khóa:</p><div class="picks">${Object.entries(CHOICES).map(([key, value]) => `<button class="pick" data-a="pick" data-c="${key}" aria-label="${value[1]}" ${disabled ? 'disabled' : ''}>${value[0]}<br><small>${value[1]}</small></button>`).join('')}</div>`;
      if (loaded && !result?.complete && roster.length >= 2) {
        html += `<ul class="oan-progress">${roster.map(p => `<li><b>${esc(p.name)}</b><span>${round.reveal?.[p.uid] ? 'Đã mở' : commit[p.uid] ? 'Đã khóa' : 'Chưa chọn'}</span></li>`).join('')}</ul>`;
        if (result?.invalid.length) html += '<p class="err">Có lựa chọn mở không khớp với lựa chọn đã khóa. Ván này chưa được tính điểm.</p>';
        if (stalled) html += '<p>Chưa nhận đủ dữ liệu mở bài. Người đã chọn có thể mở lại game để tự khôi phục lựa chọn.</p>';
        if (seated && (stalled || revealError || result?.invalid.length)) html += `<button class="btn" data-a="restart" ${disabled || verifying ? 'disabled' : ''}>Bắt đầu lại ván</button>`;
      }
      html += `<div class="row" style="margin-top:12px"><button class="btn" data-a="sync" ${busy ? 'disabled' : ''}>Đồng bộ lại</button>${busy ? '<small>Đang xác nhận…</small>' : ''}</div>`;
      q('.main').innerHTML = html;
      q('.oan-errors').textContent = [error, revealError].filter(Boolean).join(' ');
      const scoringPlayers = [...new Map([...ps(), ...roster].map(p => [p.uid, p])).values()];
      q('.tally').innerHTML = scoringPlayers.map(p => `<li>${esc(p.name)}: <b>${evaluation.score[p.uid] || 0}</b></li>`).join('');
    }

    function maybeReveal() {
      if (!alive || !loaded || opening) return;
      const snapshot = st, number = roundNumber(snapshot), round = snapshot.r?.[number];
      if (!round?.commit?.[me.uid] || round.reveal?.[me.uid] || !allCommitted(round, ps())) return;
      const key = `${number}:${round.commit[me.uid]}`;
      if (revealErrorKey === key) return;
      opening = key;
      void revealChoice(room, snapshot, me.uid, ps()).catch(err => {
        if (alive && roundNumber(st) === number && !st.r?.[number]?.reveal?.[me.uid] && st.r?.[number]?.commit?.[me.uid] === round.commit[me.uid]) {
          revealErrorKey = key; revealError = err.message;
        }
      }).finally(() => {
        opening = null;
        if (alive) {
          render();
          // A newer round may have arrived while an older private read was pending.
          if (roundNumber(st) !== number) maybeReveal();
        }
      });
    }

    function receive(raw) {
      if (!alive) return;
      version++; st = raw || {}; loaded = true; verifying = true;
      const number = roundNumber(st), round = st.r?.[number];
      const key = `${number}:${JSON.stringify([round?.commit, round?.reveal])}`;
      if (key !== waitKey) {
        waitKey = key; stalled = false; clearTimeout(waitTimer);
        revealError = ''; revealErrorKey = null;
        if (Object.keys(round?.commit || {}).length) waitTimer = setTimeout(() => { if (alive) { stalled = true; render(); } }, 12000);
      }
      // Rendering is synchronous. Only the newest verification may publish results.
      evaluation = { score: evaluation.score, results: {} };
      render(); maybeReveal();
      const snapshot = st, roster = ps();
      void verification.run(() => tally(snapshot, roster), value => {
        evaluation = value; verifying = false;
        if (value.results[number]?.complete) { clearTimeout(waitTimer); revealError = ''; }
        render();
      }, err => { verifying = false; error = `Chưa kiểm tra được kết quả. ${err.message}`; render(); });
    }

    async function refresh() {
      const before = version;
      revealError = ''; revealErrorKey = null; error = '';
      try {
        const raw = await room.get('g/oan');
        if (alive && version === before) receive(raw);
        else maybeReveal();
      } catch (err) { error = `Chưa đồng bộ được. ${err.message}`; render(); }
    }

    el.onclick = async e => {
      const button = e.target.closest('[data-a]');
      if (!button || !el.contains(button) || button.disabled || busy || !alive) return;
      const action = button.dataset.a, snapshot = st, number = roundNumber(snapshot);
      if (action === 'sync') { busy = true; render(); try { await refresh(); } finally { busy = false; render(); } return; }
      if (!loaded || !participants(snapshot.r?.[number], ps()).some(p => p.uid === me.uid)) return;
      if (action === 'pick' && snapshot.r?.[number]?.commit?.[me.uid]) return;
      if (action === 'restart' && !confirm('Bỏ ván đang chờ và bắt đầu ván mới? Ván bị bỏ sẽ không được tính điểm.')) return;
      busy = true; error = ''; render();
      try {
        if (action === 'pick') {
          await submitChoice(room, number, me.uid, button.dataset.c, ps());
          ctx.ping(participants(st.r?.[number], ps()).filter(p => p.uid !== me.uid).map(p => p.uid), `${me.name} đã chọn oẳn tù tì, đến lượt bạn!`);
        } else if (action === 'next' || action === 'restart') await advanceRound(room, snapshot, me.uid, ps(), action === 'restart');
      } catch (err) {
        const message = err.message;
        await refresh(); error = message;
      } finally { busy = false; render(); }
    };
    ctx.onLeave(() => { alive = false; clearTimeout(waitTimer); verification.stop(); el.onclick = null; });
    ctx.onLeave(onChange(() => { if (loaded) receive(st); }));
    ctx.onLeave(room.watch('g/oan', receive));
  },
};
