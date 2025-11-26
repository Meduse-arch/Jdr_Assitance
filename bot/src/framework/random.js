function d(max) {
  const m = Number(max) || 0;
  if (m <= 0) return 0;
  return Math.floor(Math.random() * m) + 1;
}

function xdy(x, y) {
  const xi = Math.max(0, Number(x) || 0);
  const yi = Math.max(1, Number(y) || 1);
  const vals = Array.from({ length: xi }, () => d(yi));
  return { vals, sum: vals.reduce((a, b) => a + b, 0) };
}

function adv(max, type) {
  const m = Math.max(1, Number(max) || 1);
  const v1 = d(m);
  const v2 = type === 'a' || type === 'm' ? d(m) : null;
  const chosen = v2 == null ? v1 : (type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2));
  return { chosen, list: v2 == null ? [v1] : [v1, v2] };
}

function parseXdy(str) {
  const m = /^(\d+)d(\d+)$/.exec(str || '');
  return m ? { x: parseInt(m[1], 10), y: parseInt(m[2], 10) } : null;
}

/* Optionnel: RNG seedable pour tests */
function makeRng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const rand = () => (s = (1664525 * s + 1013904223) >>> 0) / 2**32;
  const dSeed = (max) => {
    const m = Number(max) || 0;
    if (m <= 0) return 0;
    return Math.floor(rand() * m) + 1;
  };
  const xdySeed = (x, y) => {
    const xi = Math.max(0, Number(x) || 0);
    const yi = Math.max(1, Number(y) || 1);
    const vals = Array.from({ length: xi }, () => dSeed(yi));
    return { vals, sum: vals.reduce((a, b) => a + b, 0) };
  };
  const advSeed = (max, type) => {
    const m = Math.max(1, Number(max) || 1);
    const v1 = dSeed(m);
    const v2 = type === 'a' || type === 'm' ? dSeed(m) : null;
    const chosen = v2 == null ? v1 : (type === 'a' ? Math.max(v1, v2) : Math.min(v1, v2));
    return { chosen, list: v2 == null ? [v1] : [v1, v2] };
  };
  return { rand, d: dSeed, xdy: xdySeed, adv: advSeed };
}

module.exports = { d, xdy, adv, parseXdy, makeRng };
