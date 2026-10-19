import { CONFIG } from '../config.js';
import { createRng, createNoise2D } from './Random.js';
import { NPCS } from '../data/npcs.js';

// =====================================================================
//  PASAULIO ŽEMĖLAPIS (gryna logika, be Phaser)
//  Žemėlapis GENERUOJAMAS kodu su fiksuotu seed'u (CONFIG.WORLD_SEED),
//  todėl kiekvieną kartą gaunamas lygiai toks pats pasaulis.
//
//  Generavimo žingsniai:
//    1. viskas – žolė
//    2. miškas (vakaruose, šiaurėje ir aplink kraštus)
//    3. ežeras ir iš jo ištekanti upė
//    4. išvalome vietą ūkiui, parduotuvei ir pradžios taškui
//    5. ūkio dirva ir parduotuvės pastatas
//    6. dekoracijos (akmenys, krūmai, gėlės)
//    7. takai, jungiantys zonas (per upę – tiltai)
// =====================================================================

// Langelių tipai
export const TILE = {
  GRASS: 'grass',     // žolė – galima vaikščioti
  DIRT: 'dirt',       // dirva – galima vaikščioti ir kasti
  WATER: 'water',     // vanduo – negalima vaikščioti
  SHOP: 'shop',       // parduotuvės pastatas – negalima vaikščioti
  TREE: 'tree',       // medis – negalima vaikščioti
  ROCK: 'rock',       // akmuo – negalima vaikščioti
  BUSH: 'bush',       // krūmas – negalima vaikščioti
  FLOWERS: 'flowers', // žolė su gėlėmis – galima vaikščioti
  FENCE: 'fence',     // tvora aplink ūkį – negalima vaikščioti (praeinama pro vartus)
  HOUSE: 'house',     // žaidėjo namelis su lova – negalima vaikščioti
  COTTAGE: 'cottage', // kaimyno (NPC) namelis – negalima vaikščioti
  PATH: 'path',       // takas – galima vaikščioti, kasti negalima
  BRIDGE: 'bridge',   // tiltas per vandenį – galima vaikščioti
};

const W = CONFIG.MAP_WIDTH;
const H = CONFIG.MAP_HEIGHT;

// ---------- Svarbiausios vietos (skaičiuojamos nuo žemėlapio dydžio) ----------

// Ūkio zona centre – vienintelė vieta, kur galima kasti
export const FARM_ZONE = { x: Math.floor(W / 2) - 6, y: Math.floor(H / 2) - 5, w: 12, h: 8 };
// Pagrindinis kelias rytai–vakarai eina iškart po ūkiu
const ROAD_Y = FARM_ZONE.y + FARM_ZONE.h + 1;
// Kelias šiaurė–pietūs – vakarinėje ūkio pusėje
const ROAD_X = FARM_ZONE.x - 3;
// Parduotuvė (2x2) – į rytus nuo ūkio
export const SHOP_POS = { x: FARM_ZONE.x + FARM_ZONE.w + 3, y: FARM_ZONE.y + 3 };
// Žaidėjo namelis (2x2) – į šiaurę nuo ūkio, prie šiaurinių vartų
export const HOUSE_POS = { x: FARM_ZONE.x + Math.floor(FARM_ZONE.w / 2) - 1, y: FARM_ZONE.y - 5 };
// Langelis prie namelio durų (čia žaidėjas atsibunda)
export const HOUSE_DOOR = { x: HOUSE_POS.x + 1, y: HOUSE_POS.y + 2 };
// Čia žaidėjas pasirodo pradėdamas naują žaidimą
export const START_TILE = { x: FARM_ZONE.x + Math.floor(FARM_ZONE.w / 2), y: ROAD_Y };
// Ežeras šiaurės rytuose
const LAKE = { x: W - 13, y: 10, radius: 6 };

// ---------- Generavimas ----------

export function createWorldMap(seed = CONFIG.WORLD_SEED) {
  const rng = createRng(seed);
  const noise = createNoise2D(seed);
  const noise2 = createNoise2D(seed + 99);
  const map = Array.from({ length: H }, () => Array(W).fill(TILE.GRASS));
  const set = (x, y, t) => { if (isInside(map, x, y)) map[y][x] = t; };

  // 2. Miškas
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = noise(x * 0.13, y * 0.13);
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y); // atstumas iki krašto
      let tree = false;
      if (edge < 2) tree = true;                                   // tankus kraštas
      else if (edge < 5) tree = n > 0.45 && rng() < 0.8;           // retėjantis pakraštys
      else if (x < W * 0.3) tree = n > 0.42 - (W * 0.3 - x) * 0.012 && rng() < 0.88; // vakarų miškas
      else if (y < H * 0.18 && x < W * 0.6) tree = n > 0.55 && rng() < 0.85;        // šiaurės giraitė
      else tree = rng() < 0.012;                                   // pavieniai medžiai
      if (tree) map[y][x] = TILE.TREE;
    }
  }

  // 3. Ežeras (apskritimas su „triukšmingu“ krantu)
  for (let y = LAKE.y - 10; y <= LAKE.y + 10; y++) {
    for (let x = LAKE.x - 10; x <= LAKE.x + 10; x++) {
      const d = Math.hypot(x - LAKE.x, (y - LAKE.y) * 1.2);
      const shore = LAKE.radius + (noise2(x * 0.35, y * 0.35) - 0.5) * 4;
      if (d < shore) set(x, y, TILE.WATER);
    }
  }
  // Upė: iš ežero į pietus iki žemėlapio krašto, vingiuodama
  let rx = LAKE.x;
  for (let y = LAKE.y + 3; y < H; y++) {
    rx += (noise2(y * 0.12, 7.3) - 0.5) * 1.8;
    rx = Math.max(FARM_ZONE.x + FARM_ZONE.w + 9, Math.min(W - 4, rx));
    const cx = Math.round(rx);
    set(cx, y, TILE.WATER);
    set(cx + 1, y, TILE.WATER);
  }

  // 4. Išvalome svarbias vietas (su atsarga aplinkui)
  clearRect(map, FARM_ZONE.x - 2, FARM_ZONE.y - 2, FARM_ZONE.w + 4, FARM_ZONE.h + 4);
  clearRect(map, SHOP_POS.x - 2, SHOP_POS.y - 2, 6, 7);
  clearRect(map, HOUSE_POS.x - 3, HOUSE_POS.y - 2, 8, 6);
  for (const c of COTTAGES) clearRect(map, c.x - 1, c.y - 1, 4, 4);

  // 5. Ūkio dirva ir parduotuvė
  for (let y = 0; y < FARM_ZONE.h; y++) {
    for (let x = 0; x < FARM_ZONE.w; x++) map[FARM_ZONE.y + y][FARM_ZONE.x + x] = TILE.DIRT;
  }
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      map[SHOP_POS.y + y][SHOP_POS.x + x] = TILE.SHOP;
      map[HOUSE_POS.y + y][HOUSE_POS.x + x] = TILE.HOUSE;
      for (const c of COTTAGES) map[c.y + y][c.x + x] = TILE.COTTAGE;
    }
  }

  // 5b. Tvora aplink ūkį su vartais į visas puses
  buildFence(map);

  // 6. Dekoracijos ant laisvos žolės
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x] !== TILE.GRASS || nearZone(x, y)) continue;
      const r = rng();
      if (r < 0.012) map[y][x] = TILE.ROCK;
      else if (r < 0.03) map[y][x] = TILE.BUSH;
      else if (r < 0.1) map[y][x] = TILE.FLOWERS;
    }
  }

  // 7. Takai (2 langelių pločio)
  carvePath(map, 3, ROAD_Y, W - 4, ROAD_Y, 'horizontal', true);              // rytai–vakarai (per upę – tiltas)
  carvePath(map, ROAD_X, 3, ROAD_X, H - 4, 'vertical', true);                // šiaurė–pietūs
  carvePath(map, SHOP_POS.x, SHOP_POS.y + 2, SHOP_POS.x, ROAD_Y, 'vertical'); // prie parduotuvės durų
  carvePath(map, ROAD_X, 8, W - 4, 8, 'horizontal', false);                  // į ežerą (sustoja prie kranto)
  carvePath(map, HOUSE_POS.x, HOUSE_POS.y + 2, HOUSE_POS.x, FARM_ZONE.y - 2, 'vertical'); // nuo namelio iki ūkio vartų

  return map;
}

// Kaimynų nameliai (iš src/data/npcs.js): { npcId, x, y } – kairysis viršutinis langelis
export const COTTAGES = Object.entries(NPCS)
  .filter(([, npc]) => npc.home.cottage)
  .map(([npcId, npc]) => ({ npcId, ...npc.home.cottage }));

// Ar langelis netoli svarbių zonų (ten dekoracijų nededame)?
function nearZone(x, y) {
  const inRect = (r, m) => x >= r.x - m && x < r.x + r.w + m && y >= r.y - m && y < r.y + r.h + m;
  return inRect(FARM_ZONE, 2) || inRect({ ...SHOP_POS, w: 2, h: 2 }, 2) || inRect({ ...HOUSE_POS, w: 2, h: 2 }, 2)
    || COTTAGES.some((c) => inRect({ ...c, w: 2, h: 2 }, 1))
    || (Math.abs(x - START_TILE.x) < 3 && Math.abs(y - START_TILE.y) < 3);
}

// Tvora vienu langeliu už ūkio zonos krašto; vartai – 2 langelių tarpai
function buildFence(map) {
  const x0 = FARM_ZONE.x - 1;
  const y0 = FARM_ZONE.y - 1;
  const x1 = FARM_ZONE.x + FARM_ZONE.w;
  const y1 = FARM_ZONE.y + FARM_ZONE.h;
  const gates = new Set([
    `${START_TILE.x - 1},${y1}`, `${START_TILE.x},${y1}`,         // pietūs – į pagrindinį kelią
    `${START_TILE.x - 1},${y0}`, `${START_TILE.x},${y0}`,         // šiaurė
    `${x0},${FARM_ZONE.y + 3}`, `${x0},${FARM_ZONE.y + 4}`,       // vakarai – į kelią šiaurė–pietūs
    `${x1},${SHOP_POS.y}`, `${x1},${SHOP_POS.y + 1}`,             // rytai – link parduotuvės
  ]);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const onRing = x === x0 || x === x1 || y === y0 || y === y1;
      if (onRing && !gates.has(`${x},${y}`) && isInside(map, x, y)) map[y][x] = TILE.FENCE;
    }
  }
}

function clearRect(map, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (isInside(map, x, y) && map[y][x] !== TILE.WATER) map[y][x] = TILE.GRASS;
    }
  }
}

// Iškerta tiesų 2 langelių pločio taką. Per vandenį – tiltas (jei bridge = true),
// kitaip takas sustoja prie vandens. Dirvos ir pastatų neliečia.
function carvePath(map, x0, y0, x1, y1, dir, bridge = true) {
  const steps = dir === 'horizontal' ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
  const sx = Math.sign(x1 - x0);
  const sy = Math.sign(y1 - y0);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + sx * i;
    const y = y0 + sy * i;
    const cells = dir === 'horizontal' ? [[x, y], [x, y + 1]] : [[x, y], [x + 1, y]];
    if (!bridge && cells.some(([cx, cy]) => getTile(map, cx, cy) === TILE.WATER)) return;
    for (const [cx, cy] of cells) {
      const t = getTile(map, cx, cy);
      if (t === null || t === TILE.DIRT || t === TILE.SHOP || t === TILE.HOUSE || t === TILE.COTTAGE || t === TILE.BRIDGE || t === TILE.FENCE) continue;
      map[cy][cx] = t === TILE.WATER ? TILE.BRIDGE : TILE.PATH;
    }
  }
}

// ---------- Užklausos ----------

// Ar langelis yra žemėlapio ribose?
export function isInside(map, x, y) {
  return y >= 0 && y < map.length && x >= 0 && x < map[0].length;
}

// Grąžina langelio tipą arba null, jei už ribų
export function getTile(map, x, y) {
  return isInside(map, x, y) ? map[y][x] : null;
}

// Ar per langelį negalima praeiti?
const BLOCKING = new Set([TILE.WATER, TILE.SHOP, TILE.HOUSE, TILE.COTTAGE, TILE.TREE, TILE.ROCK, TILE.BUSH, TILE.FENCE]);

export function isBlocked(tileType) {
  return BLOCKING.has(tileType);
}

// Ar galima užeiti ant langelio (ribose ir nėra kliūties)?
export function isWalkable(map, x, y) {
  const t = getTile(map, x, y);
  return t !== null && !isBlocked(t);
}

// Kokia žemė po langeliu (piešimui): medžiai, gėlės ir pan. stovi ant žolės,
// tiltas – virš vandens
export function getGround(tileType) {
  if (tileType === TILE.DIRT) return TILE.DIRT;
  if (tileType === TILE.WATER || tileType === TILE.BRIDGE) return TILE.WATER;
  if (tileType === TILE.PATH) return TILE.PATH;
  return TILE.GRASS;
}

// Ar langelį galima sukasti kapliu? (tik ūkio zonos dirva)
export function isTillable(tileType) {
  return tileType === TILE.DIRT;
}

// Ar langelis (x, y) yra šalia nurodyto tipo langelio (įskaitant įstrižai)?
export function isNearTile(map, x, y, type) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (getTile(map, x + dx, y + dy) === type) return true;
    }
  }
  return false;
}

export const isNearShop = (map, x, y) => isNearTile(map, x, y, TILE.SHOP);
export const isNearHouse = (map, x, y) => isNearTile(map, x, y, TILE.HOUSE);

// Suranda parduotuvės kairįjį viršutinį langelį (piešimui ir sąveikai)
export function findShop(map) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === TILE.SHOP) return { x, y };
    }
  }
  return null;
}
