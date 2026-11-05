import { DURATION, ROUND_COUNT } from './logic.js';
export const BASE = 'snow', PATH = `${BASE}/state`, STALE_MS = 15000;
export const isHost = (s, uid, token) => !!s && s.hostUid === uid && s.hostToken === token;
export const available = (s, now) => !s || s.phase === 'closed' || now - s.updatedAt > STALE_MS;
export function validState(s) {
  return !!s && s.v === 1 && typeof s.id === 'string' && typeof s.hostUid === 'string' && typeof s.hostToken === 'string' &&
    ['lobby', 'countdown', 'playing', 'results', 'ended', 'closed'].includes(s.phase) && Number.isInteger(s.rev) && Number.isFinite(s.updatedAt) &&
    Number.isInteger(s.round) && s.round >= 0 && s.round <= ROUND_COUNT &&
    (['lobby', 'closed'].includes(s.phase) || Array.isArray(s.players) && s.players.length >= 2 && s.players.length <= 6 && new Set(s.players.map(p => p.uid)).size === s.players.length && s.players.every(p => typeof p.uid === 'string' && typeof p.token === 'string' && typeof p.name === 'string')) &&
    (s.phase !== 'countdown' || Number.isFinite(s.startsAt)) &&
    (!s.status || Object.values(s.status).every(p => p && typeof p.alive === 'boolean' && Number.isFinite(p.rank) && Number.isFinite(p.points) && Number.isFinite(p.dashUntil))) &&
    (!s.scores || Object.values(s.scores).every(n => Number.isFinite(n) && n >= 0));
}
export function claim(s, uid, token, id, now) {
  if (s && (!validState(s) || !available(s, now))) return undefined;
  return { v: 1, id, hostUid: uid, hostToken: token, rev: 0, phase: 'lobby', round: 0, updatedAt: now, duration: DURATION, reason: '' };
}
export function updateHost(s, expected, patch, now) {
  if (!validState(s) || s.id !== expected.id || s.rev !== expected.rev || s.hostUid !== expected.hostUid || s.hostToken !== expected.hostToken || s.phase === 'closed') return undefined;
  return { ...s, ...patch, id: s.id, hostUid: s.hostUid, hostToken: s.hostToken, rev: s.rev + 1, updatedAt: now };
}
export function readyPlayers(peers, packets, id, now) {
  return Object.entries(peers || {}).filter(([uid, p]) => {
    const packet = packets?.[uid]?.[p.token];
    return p.id === id && typeof p.name === 'string' && p.name.trim() && typeof p.token === 'string' && Number.isFinite(p.at) && packet?.id === id && Number.isFinite(packet.at) && Math.abs(now - packet.at) < 3500;
  }).sort((a, b) => a[1].at - b[1].at || a[0].localeCompare(b[0])).map(([uid, p]) => ({ uid, token: p.token, name: p.name.trim().slice(0, 24) }));
}
export function startRound(s, players, now) {
  if (!validState(s) || !['lobby', 'results'].includes(s.phase) || s.round >= ROUND_COUNT || players.length < 2 || players.length > 6 || new Set(players.map(p => p.uid)).size !== players.length) return undefined;
  const roster = s.round ? s.players : players;
  if (!Array.isArray(roster) || roster.length < 2) return undefined;
  return { phase: 'countdown', round: s.round + 1, players: roster, startsAt: now + 3500, elapsed: 0,
    scores: s.scores || Object.fromEntries(roster.map(p => [p.uid, 0])),
    status: Object.fromEntries(roster.map(p => [p.uid, { alive: true, rank: 0, points: 0, dashUntil: 0, connected: true, offline: false }])) };
}
export function finishRound(s, world, status) {
  if (s.phase !== 'playing' || !world.over) return undefined;
  return { phase: s.round >= ROUND_COUNT ? 'ended' : 'results', elapsed: world.elapsed, status,
    scores: Object.fromEntries(s.players.map(p => [p.uid, (s.scores?.[p.uid] || 0) + (status[p.uid]?.points || 0)])) };
}

// Readiness belongs to this connection and this round. Old tabs, prior matches,
// and spectators cannot accidentally start the next round.
export function readyRoster(s, peers, packets, readiness, now) {
  if (!validState(s) || !['lobby', 'results', 'ended'].includes(s.phase)) return [];
  let present = readyPlayers(peers, packets, s.id, now);
  if (s.phase === 'results') present = present.filter(p => s.players.some(q => q.uid === p.uid && q.token === p.token));
  const seats = present.slice(0, 6);
  return seats.length >= 2 && seats.every(p => {
    const r = readiness?.[p.uid]; return r?.id === s.id && r.round === s.round && r.token === p.token;
  }) ? seats : [];
}
