import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, LEN, OPT, norm, encode, decode, avatarSVG, avatarInner, randomAvatar, getAvatar, setAvatar, SHOESC } from './avatar.js';

test('old avatar codes preserve original selections and gain safe defaults', () => {
  const old = { gender: 1, weight: 2, skin: 3, hair: 6, hairC: 7, face: 5, top: 6, topC: 9, bot: 4, botC: 7, shoes: 0, hat: 5, acc: 5 };
  const loaded = decode(btoa(JSON.stringify(old)));
  for (const [key, value] of Object.entries(old)) assert.equal(loaded[key], value);
  for (const key of ['effect', 'motion', 'pattern', 'backdrop']) assert.equal(loaded[key], 0);
  assert.deepEqual(norm(null), DEFAULT);
});

test('invalid input cannot inject SVG or create incomplete avatars', () => {
  for (const raw of [null, [], 'text', {}, { face: 999 }, { face: -1 }]) assert.equal(decode(btoa(JSON.stringify(raw))), null);
  assert.equal(decode('not-base64'), null);
  assert.equal(decode('a'.repeat(9000)), null);
  const raw = { face: '<script>alert(1)</script>', hairC: Infinity, top: -1, bot: 1.5, effect: null, motion: 'NaN' };
  assert.deepEqual(norm(raw), DEFAULT);
  assert.doesNotMatch(avatarSVG(raw), /<script|undefined|NaN|Infinity/);
});

test('new choices, effects, and independent shoe colors survive a share roundtrip', () => {
  const avatar = Object.fromEntries(Object.entries(LEN).map(([key, length]) => [key, length - 1]));
  assert.deepEqual(decode(encode(avatar)), avatar);
  assert.equal(LEN.hair, OPT.hairM.length); assert.equal(LEN.hair, OPT.hairF.length);
  assert.equal(LEN.shoesC, SHOESC.length);
  assert.notEqual(avatarInner({ ...DEFAULT, shoesC: 1 }), avatarInner({ ...DEFAULT, shoesC: 2 }));
  assert.equal(norm({ ...DEFAULT, shoes: 5, shoesC: 4 }).shoesC, 4);
});

test('every visual option generates finite SVG and changes the selected feature', () => {
  for (const gender of [0, 1]) {
    for (const key of ['hair', 'face', 'top', 'bot', 'shoes', 'hat', 'acc', 'pattern', 'effect']) {
      const variants = Array.from({ length: LEN[key] }, (_, i) => avatarSVG({ ...DEFAULT, gender, [key]: i }, 130, { crop: 'full' }));
      for (const svg of variants) {
        assert.match(svg, /^<svg/); assert.doesNotMatch(svg, /undefined|NaN|Infinity/);
      }
      assert.equal(new Set(variants).size, LEN[key], `${key} / gender ${gender} has duplicate or missing options`);
    }
  }
});

test('headshot clip IDs match their references and are unique across repeated avatars', () => {
  const ids = new Set();
  for (let i = 0; i < 30; i++) {
    const svg = avatarSVG(DEFAULT, 32);
    const id = svg.match(/clipPath id="([^"]+)"/)[1];
    assert.ok(svg.includes(`clip-path="url(#${id})"`));
    assert.ok(!ids.has(id)); ids.add(id);
  }
});

test('reaction face overrides pause cosmetic movement and do not mutate saved configuration', () => {
  const avatar = { ...DEFAULT, motion: 2, effect: 1, face: 6 };
  const before = structuredClone(avatar);
  const svg = avatarSVG(avatar, 130, { crop: 'full', overrideFace: 5 });
  assert.match(svg, /av-static/); assert.deepEqual(avatar, before);
  assert.match(avatarSVG(avatar, 130, { animate: false }), /av-static/);
  assert.doesNotMatch(avatarSVG(avatar, 130), /av-static/);
  assert.equal(avatarInner(avatar, { overrideFace: 999 }), avatarInner(avatar));
});

test('random selection stays within all expanded option limits', () => {
  for (let i = 0; i < 200; i++) {
    const value = randomAvatar();
    assert.deepEqual(norm(value), value);
    assert.deepEqual(decode(encode(value)), value);
  }
});

test('saving reports storage failure instead of claiming the avatar was saved', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), data = new Map();
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, value) => { data.set(key, value); },
    } });
    const value = { ...DEFAULT, face: 8, shoesC: 3, effect: 4 };
    assert.equal(setAvatar(value), true); assert.deepEqual(getAvatar(), value);
    globalThis.localStorage.setItem = () => { throw new Error('quota exceeded'); };
    assert.equal(setAvatar({ ...value, face: 9 }), false);
    assert.deepEqual(getAvatar(), value);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});
