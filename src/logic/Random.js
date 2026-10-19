// =====================================================================
//  ATSITIKTINUMAS SU SĖKLA (seed) – gryna logika
//  Tas pats seed'as visada duoda tą pačią skaičių seką, todėl
//  sugeneruotas pasaulis kiekvieną kartą bus lygiai toks pat
//  (ir serveryje, ir visų žaidėjų naršyklėse).
// =====================================================================

// Sveikųjų skaičių „maišytuvas“ – iš (x, y, seed) padaro atsitiktinį skaičių
export function hash2D(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296; // 0 … 1
}

// Atsitiktinių skaičių generatorius: kiekvienas kvietimas – kitas skaičius 0…1
export function createRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    // mulberry32 algoritmas – trumpas ir pakankamai geras žaidimams
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// „Vertės triukšmas“ (value noise): sklandžiai kintantis atsitiktinumas.
// Gretimi taškai turi panašias reikšmes, todėl iš jo gaunasi natūralios
// formos – miško dėmės, ežero krantai, upės vingiai.
export function createNoise2D(seed) {
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const a = hash2D(ix, iy, seed);
    const b = hash2D(ix + 1, iy, seed);
    const c = hash2D(ix, iy + 1, seed);
    const d = hash2D(ix + 1, iy + 1, seed);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy; // 0 … 1
  };
}
