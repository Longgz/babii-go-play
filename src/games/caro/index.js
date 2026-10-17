import './caro.css';
import { N, newGame, applyMove } from './logic.js';
import { store } from '../../core/store.js';
import { clack, fanfare, toggleSound, soundOn } from '../../core/sound.js';

const esc = s => s.replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

export default {
  id: 'caro', name: 'Cờ ca-rô', icon: '⭕', desc: 'Xếp 5 quân liên tiếp để thắng', min: 2, max: 2, ready: true,

  mount(el, ctx) {
    const online = !!ctx.room;
    const nm = p => (online ? ctx.room.players()[p - 1]?.name : ctx.names[p - 1]) || 'Người chơi ' + p;
    let score = store.get('caro:score', [0, 0]);
    let hist = (!online && store.get('caro:hist', null)) || [newGame(1)];
    let nextFirst = store.get('caro:first', 2);

    el.innerHTML = `<section>
      <div class="bar"><a class="bk" href="#/">Quay lại</a><div class="turn" role="status" aria-live="polite"></div><button class="bk snd"></button></div>
      <p class="score"></p>
      <div class="board" aria-label="Bàn cờ ca-rô 15 nhân 15"></div>
      <div class="act"><button class="undo">Đi lại</button><button class="again pri">Ván mới</button></div>
    </section>`;
    const $ = s => el.querySelector(s);
    const board = $('.board');
    for (let i = 0; i < N * N; i++) {
      const c = document.createElement('button');
      c.className = 'c e'; c.dataset.i = i;
      c.setAttribute('aria-label', `Hàng ${(i / N | 0) + 1}, cột ${i % N + 1}`);
      c.innerHTML = '<span class="s"></span>';
      board.appendChild(c);
    }
    const cells = [...board.children], cur = () => hist[hist.length - 1];

    function render() {
      const s = cur(), wl = new Set(s.win ? s.win.line : []);
      board.dataset.t = s.turn;
      cells.forEach((c, i) => {
        const v = s.b[i];
        c.className = 'c ' + (v ? 'p' + v : 'e') + (i === s.last ? ' l' : '') + (wl.has(i) ? ' w' : '');
        c.disabled = !!v || !!s.win;
      });
      $('.turn').innerHTML = s.win
        ? (s.win.p ? `<span class="dot d${s.win.p}"></span>${esc(nm(s.win.p))} thắng!` : 'Hòa ván này')
        : `<span class="dot d${s.turn}"></span>Lượt của ${esc(nm(s.turn))}`;
      $('.score').innerHTML = `${esc(nm(1))} <b>${score[0]}</b> : <b>${score[1]}</b> ${esc(nm(2))}`;
      $('.undo').disabled = hist.length < 2 || online || !!s.win;
      $('.snd').textContent = 'Âm thanh: ' + (soundOn() ? 'bật' : 'tắt');
      if (!online) store.set('caro:hist', hist);
    }

    board.addEventListener('click', e => {
      const c = e.target.closest('.c'); if (!c) return;
      if (online && ctx.room.players()[cur().turn - 1]?.uid !== ctx.me.uid) return;
      const before = cur(), after = applyMove(before, +c.dataset.i);
      if (after === before) return;
      if (online) { const sc = score.slice(); if (after.win?.p) sc[after.win.p - 1]++; ctx.room.set('g/caro', { s: after, score: sc, first: nextFirst }); ctx.ping(after.win ? null : [ctx.room.players()[after.turn - 1]?.uid], after.win ? 'Ván cờ ca-rô đã kết thúc' : 'Đến lượt bạn đánh cờ ca-rô'); return; }
      hist.push(after);
      if (after.win) {
        if (after.win.p) { score[after.win.p - 1]++; store.set('caro:score', score); ctx.toast(`${nm(after.win.p)} thắng ván này!`); fanfare(); }
        else ctx.toast('Hòa nhau rồi');
      } else clack();
      render();
    });
    $('.undo').onclick = () => { if (!online && hist.length > 1 && !cur().win) { hist.pop(); render(); } };
    $('.again').onclick = () => { const g = newGame(nextFirst); nextFirst = 3 - nextFirst; if (online) { ctx.room.set('g/caro', { s: g, score, first: nextFirst }); return; } store.set('caro:first', nextFirst); hist = [g]; render(); };
    $('.snd').onclick = () => { toggleSound(); render(); if (soundOn()) clack(); };
    if (online) ctx.onLeave(ctx.room.watch('g/caro', v => { if (v) { hist = [v.s]; score = v.score || [0, 0]; nextFirst = v.first ?? 2; } render(); }));
    render();
  }
};
