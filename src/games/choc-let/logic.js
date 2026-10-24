export const BODY_PARTS = [
    {
        id: "head",
        name: "Xoa đầu",
        icon: "🤚",
        x: 50,
        y: 12,
        quote: "Tóc rối hết rồi nè!",
        face: 1,
        soundTone: 680,
        motion: "gentle",
    },
    {
        id: "cheek",
        name: "Véo má",
        icon: "🌸",
        x: 32,
        y: 26,
        quote: "Má phúng phính của tui đó!",
        face: 3,
        soundTone: 540,
        motion: "pinch",
    },
    {
        id: "nose",
        name: "Véo mũi",
        icon: "👃",
        x: 50,
        y: 27,
        quote: "Hắt xì! Nhột mũi quá!",
        face: 4,
        soundTone: 600,
        motion: "pinch",
    },
    {
        id: "armpit",
        name: "Chọc nách",
        icon: "🪶",
        x: 29,
        y: 44,
        quote: "Haha, nhột quá, tha tui!",
        face: 5,
        soundTone: 440,
        motion: "tickle",
    },
    {
        id: "waist",
        name: "Chọc eo",
        icon: "👉",
        x: 31,
        y: 53,
        quote: "Ối! Nhột bên eo quá!",
        face: 5,
        soundTone: 460,
        motion: "tickle",
    },
    {
        id: "belly",
        name: "Chọc bụng",
        icon: "🍩",
        x: 50,
        y: 55,
        quote: "Bụng tui đâu phải cái trống!",
        face: 5,
        soundTone: 380,
        motion: "tickle",
    },
    {
        id: "chest",
        name: "Chạm ngực",
        icon: "👕",
        x: 50,
        y: 44,
        quote: "Áo tui bị nhăn rồi nè!",
        face: 4,
        soundTone: 490,
        motion: "gentle",
    },
    {
        id: "butt",
        name: "Chạm mông",
        icon: "🍑",
        x: 66,
        y: 66,
        quote: "Ú òa! Làm tui giật mình!",
        face: 4,
        soundTone: 320,
        motion: "pinch",
    },
    {
        id: "secret",
        name: 'Chạm "between the legs',
        icon: "🤫",
        x: 50,
        y: 66,
        quote: "Ơ, tay ai mà cứ thích đi lung tung thế này nhỉ?",
        face: 4,
        soundTone: 320,
        motion: "pinch",
    },
    {
        id: "thigh",
        name: "Chạm đùi",
        icon: "🦵",
        x: 41,
        y: 77,
        quote: "Nhột chân quá đi thôi!",
        face: 5,
        soundTone: 410,
        motion: "tickle",
    },
];
const aliases = {
    cheek_l: "cheek",
    cheek_r: "cheek",
    neck: "armpit",
    hip: "butt",
};
export const partOf = (id) =>
    BODY_PARTS.find((p) => p.id === (aliases[id] || id));
const count = (n) => (Number.isSafeInteger(n) && n >= 0 ? n : 0);

export function stateOf(raw) {
    const s = {
        ...raw,
        schema: 2,
        seq: count(raw?.seq),
        events: { ...raw?.events },
        visits: { ...raw?.visits },
        receipts: { ...raw?.receipts },
        stats: { ...raw?.stats },
        count: { ...raw?.count },
    };
    // The old format retained only one event. Preserve that one without recounting it.
    const old = raw?.last;
    if (
        raw?.schema !== 2 &&
        old?.from &&
        old?.to &&
        old.from !== old.to &&
        partOf(old.partId)
    ) {
        s.seq++;
        s.events.legacy = {
            id: "legacy",
            seq: s.seq,
            from: old.from,
            to: old.to,
            partId: partOf(old.partId).id,
            at: count(old.at),
            fromName: "",
            toName: "",
        };
    }
    delete s.last;
    return s;
}

export function eventsOf(raw) {
    return Object.values(raw?.events || {})
        .filter(
            (e) =>
                e &&
                typeof e.id === "string" &&
                typeof e.from === "string" &&
                typeof e.to === "string" &&
                e.from !== e.to &&
                count(e.seq) > 0 &&
                partOf(e.partId),
        )
        .sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
}

export function addPoke(raw, event) {
    if (
        !event?.id ||
        /[.#$\[\]/]/.test(event.id) ||
        !event.from ||
        !event.to ||
        event.from === event.to ||
        !partOf(event.partId)
    )
        throw new Error("Thao tác hoặc người nhận không hợp lệ.");
    const s = stateOf(raw);
    if (s.events[event.id]) return s; // Retrying a confirmed send must not count twice.
    const part = partOf(event.partId);
    const e = {
        id: event.id,
        from: event.from,
        to: event.to,
        partId: part.id,
        at: count(event.at),
        fromName: String(event.fromName || ""),
        toName: String(event.toName || ""),
        seq: s.seq + 1,
    };
    s.seq = e.seq;
    s.events[e.id] = e;
    s.count[e.from] = count(s.count[e.from]) + 1;
    s.stats[e.to] = {
        ...s.stats[e.to],
        [part.id]: count(s.stats[e.to]?.[part.id]) + 1,
    };
    return s;
}

export function enterVisit(raw, uid, visitId, at) {
    const s = stateOf(raw),
        old = s.visits[uid];
    if (old?.id === visitId) return s;
    s.visits[uid] = {
        id: visitId,
        seq: s.seq,
        at,
        previousSeq: count(old?.seq),
        previousAt: count(old?.at),
    };
    return s;
}

export function acknowledge(raw, uid, through) {
    const s = stateOf(raw);
    s.receipts[uid] = Math.max(
        count(s.receipts[uid]),
        Math.min(count(through), s.seq),
    );
    return s;
}

export function historyFor(raw, uid, since, receivedAtEntry) {
    return eventsOf(raw).filter(
        (e) =>
            (e.to === uid || e.from === uid) &&
            (e.seq > since || (e.to === uid && e.seq > receivedAtEntry)),
    );
}

// One timer per queue. New snapshots enqueue; they never replace the active reaction.
export function reactionQueue({
    start,
    complete = () => {},
    idle = () => {},
    schedule = setTimeout,
    cancel = clearTimeout,
    duration = 1800,
}) {
    const seen = new Set(),
        pending = [];
    let current = null,
        timer = null,
        stopped = false;
    const next = () => {
        if (stopped || current) return;
        current = pending.shift() || null;
        if (!current) {
            idle();
            return;
        }
        start(current);
        timer = schedule(() => {
            const done = current;
            current = null;
            timer = null;
            complete(done);
            next();
        }, duration);
    };
    return {
        add(events) {
            if (stopped) return;
            for (const e of events)
                if (!seen.has(e.id)) {
                    seen.add(e.id);
                    pending.push(e);
                }
            pending.sort((a, b) => a.seq - b.seq);
            next();
        },
        get remaining() {
            return pending.length + (current ? 1 : 0);
        },
        stop() {
            stopped = true;
            if (timer !== null) cancel(timer);
            pending.length = 0;
            current = null;
        },
    };
}
