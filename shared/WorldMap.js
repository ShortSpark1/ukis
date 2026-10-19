import { WORLD } from './worldConfig.js';
import { createRng, createNoise2D } from './Random.js';

// =====================================================================
//  PASAULIO ŽEMĖLAPIS (gryna logika, be Phaser) – BENDRAS KLIENTUI IR SERVERIUI
//  Žemėlapis GENERUOJAMAS kodu su fiksuotu seed'u (WORLD.SEED), todėl
//  kiekvieną kartą, kiekvienoje naršyklėje ir serveryje gaunamas lygiai
//  toks pats pasaulis. Siųsti žemėlapio per internetą nereikia.
//
//  Pasaulio išdėstymas (200x200):
//
//      ┌──────────── miškas, upė ─────────────┐
//      │   ┌──────── žiedinis kelias ──────┐  │
//      │   │  [ŠV ūkiai]  ežeras  [ŠR ūkiai]│  │
//      │   │  [V ūkiai]  [MIESTAS] [R ūkiai]│  │
//      │   │  [PV ūkiai] tvenkinys [PR ūkiai]│ │
//      │   └────────────────────────────────┘  │
//      └───────────────────────────────────────┘
//
//  Kiekvienoje ūkių grupėje – 4 sklypai (2x2) po 20x20 langelių,
//  kiekvienas su tvora, vartais, nameliu ir dirva. Iš viso 24 sklypai.
//
//  Generavimo žingsniai:
//    1. viskas – žolė
//    2. miškas (tankus už žiedinio kelio, giraitės tarp zonų)
//    3. ežeras, tvenkinys ir upė
//    4. išvalome vietą miestui, sklypams ir svarbioms vietoms
//    5. miestas: aikštė, fontanas, skelbimų lenta, parduotuvė, kaimynų nameliai
//    6. ūkių sklypai: tvora, vartai, namelis, dirva
//    7. dekoracijos (akmenys, krūmai, gėlės)
//    8. keliai ir takai (per vandenį – tiltai)
// =====================================================================

// Langelių tipai
export const TILE = {
  GRASS: 'grass',       // žolė – galima vaikščioti
  DIRT: 'dirt',         // dirva – galima vaikščioti ir kasti (tik savo sklype)
  WATER: 'water',       // vanduo – negalima vaikščioti
  SHOP: 'shop',         // parduotuvės pastatas – negalima vaikščioti
  TREE: 'tree',         // medis – negalima vaikščioti
  ROCK: 'rock',         // akmuo – negalima vaikščioti
  BUSH: 'bush',         // krūmas – negalima vaikščioti
  FLOWERS: 'flowers',   // žolė su gėlėmis – galima vaikščioti
  FENCE: 'fence',       // sklypo tvora – negalima vaikščioti (praeinama pro vartus)
  HOUSE: 'house',       // žaidėjo namelis sklype – negalima vaikščioti
  COTTAGE: 'cottage',   // kaimyno (NPC) namelis – negalima vaikščioti
  PATH: 'path',         // takas – galima vaikščioti, kasti negalima
  BRIDGE: 'bridge',     // tiltas per vandenį – galima vaikščioti
  PLAZA: 'plaza',       // miesto aikštės grindinys – galima vaikščioti
  FOUNTAIN: 'fountain', // fontanas aikštės viduryje – negalima vaikščioti
  BOARD: 'board',       // skelbimų lenta – negalima vaikščioti
  LAMP: 'lamp',         // gatvės žibintas (naktį šviečia) – negalima vaikščioti
  BENCH: 'bench',       // suoliukas aikštėje – negalima vaikščioti
  STALL: 'stall',       // turgaus prekystalis (2x1) – negalima vaikščioti
  SIGN: 'sign',         // sklypo numerio lentelė – negalima vaikščioti
};

const W = WORLD.WIDTH;
const H = WORLD.HEIGHT;
const CX = Math.floor(W / 2);
const CY = Math.floor(H / 2);
const P = WORLD.PLOT_SIZE;
const GAP = WORLD.PLOT_GAP;
const CLUSTER = 2 * P + GAP; // ūkių grupės (2x2 sklypai) dydis
const RING = WORLD.RING_ROAD;

export const MAP_WIDTH = W;
export const MAP_HEIGHT = H;

// ---------- Svarbiausios vietos (skaičiuojamos nuo pasaulio centro) ----------

// Pagrindiniai keliai (3 langelių pločio) kertasi miesto aikštėje
const ROAD = { x: CX - 1, y: CY - 1, width: 3 };

// Miestas centre
export const TOWN = { x: CX - 22, y: CY - 21, w: 44, h: 43 };
export const PLAZA = { x: CX - 12, y: CY - 12, w: 24, h: 24 };
export const FOUNTAIN = { x: CX - 2, y: CY - 2, w: 4, h: 4 };
export const BOARD = { x: CX - 5, y: CY - 8, w: 2, h: 1 };
// Gėlynai su medžiu aikštės kampuose (4x4)
const GARDENS = [
  { x: PLAZA.x + 2, y: PLAZA.y + 2 }, { x: PLAZA.x + 18, y: PLAZA.y + 2 },
  { x: PLAZA.x + 2, y: PLAZA.y + 18 }, { x: PLAZA.x + 18, y: PLAZA.y + 18 },
].map((g) => ({ ...g, w: 4, h: 4 }));
// Suoliukai aplink fontaną ir turgaus prekystaliai (2x1)
const BENCHES = [
  { x: CX - 4, y: CY - 4 }, { x: CX + 3, y: CY - 4 }, { x: CX - 4, y: CY + 3 }, { x: CX + 3, y: CY + 3 },
];
export const STALLS = [{ x: CX - 5, y: CY + 7 }, { x: CX + 3, y: CY + 7 }];
// Žibintai aikštėje: kampuose ir abipus įėjimų
const PLAZA_LAMPS = (() => {
  const x0 = PLAZA.x;
  const y0 = PLAZA.y;
  const x1 = PLAZA.x + PLAZA.w - 1;
  const y1 = PLAZA.y + PLAZA.h - 1;
  return [
    [x0, y0], [x1, y0], [x0, y1], [x1, y1],
    [CX - 3, y0], [CX + 2, y0], [CX - 3, y1], [CX + 2, y1],
    [x0, CY - 3], [x0, CY + 2], [x1, CY - 3], [x1, CY + 2],
  ].map(([x, y]) => ({ x, y }));
})();
// Parduotuvė (2x2) – aikštės šiaurinėje pusėje; durys – langelis po ja
export const SHOP_POS = { x: CX - 9, y: CY - 15 };
// Kaimynų nameliai (2x2) aplink aikštę. Ona gyvena parduotuvėje.
export const COTTAGES = [
  { npcId: 'jonas', x: CX + 7, y: CY - 15 },
  { npcId: 'ruta', x: CX - 16, y: CY + 4 },
  { npcId: 'antanas', x: CX + 14, y: CY + 4 },
];
// Kur kiekvienas kaimynas išeina iš namų ir grįžta vakare
export const NPC_HOMES = {
  ona: { x: SHOP_POS.x, y: SHOP_POS.y + 2 },
  ...Object.fromEntries(COTTAGES.map((c) => [c.npcId, { x: c.x, y: c.y + 2 }])),
};

// Ežeras šiaurėje ir tvenkinys pietuose (tarp ūkių grupių)
const LAKE = { x: CX + 13, y: RING + 12, radius: 6 };
const POND = { x: CX + 13, y: H - RING - 38, radius: 5 };

// Ūkių grupės: 3 eilės (šiaurė, vidurys, pietūs) x 2 stulpeliai (vakarai, rytai).
// Vidurinės eilės tarpas tarp sklypų sutampa su pagrindiniu keliu.
const MID_ROW_Y = ROAD.y - P;
const CLUSTER_ROWS = [MID_ROW_Y - 7 - CLUSTER, MID_ROW_Y, MID_ROW_Y + CLUSTER + 7];
const CLUSTER_COLS = [TOWN.x - 5 - CLUSTER, TOWN.x + TOWN.w + 5];
// Takai tarp sklypų (3 langelių pločio)
const LANES_X = CLUSTER_COLS.map((x) => x + P);   // šiaurė–pietūs
const LANES_Y = CLUSTER_ROWS.map((y) => y + P);   // rytai–vakarai (vidurinis = pagrindinis kelias)

// Visi ūkių sklypai. Sklypo laukai:
//   id        – numeris (1…24)
//   x, y      – kairysis viršutinis langelis (tvoros kampas), dydis P x P
//   gateSide  – kurioje pusėje vartai ('e' – rytuose, 'w' – vakaruose)
//   gate      – langelis UŽ vartų (ant tako) – čia atvyksta svečiai
//   house     – namelio (2x2) kairysis viršutinis langelis
//   door      – langelis prie namelio durų (čia žaidėjas atsibunda)
//   field     – dirvos stačiakampis { x, y, w, h }
export const PLOTS = buildPlots();

function buildPlots() {
  const plots = [];
  for (const cy of CLUSTER_ROWS) {
    for (const cx of CLUSTER_COLS) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const x = cx + col * (P + GAP);
          const y = cy + row * (P + GAP);
          // Vartai žiūri į taką tarp sklypų
          const gateSide = col === 0 ? 'e' : 'w';
          const houseX = gateSide === 'e' ? x + P - 5 : x + 3;
          plots.push({
            id: plots.length + 1,
            x, y,
            gateSide,
            gate: { x: gateSide === 'e' ? x + P : x - 1, y: y + 5 },
            house: { x: houseX, y: y + 2 },
            door: { x: houseX, y: y + 4 },
            field: { x: x + 2, y: y + 8, w: P - 4, h: P - 10 },
          });
        }
      }
    }
  }
  return plots;
}

// Pavadintos vietos, į kurias eina kaimynai (žr. tvarkaraščius src/data/npcs.js)
export const PLACES = {
  shop_front: { x: SHOP_POS.x + 1, y: SHOP_POS.y + 4 },
  fountain_n: { x: CX, y: FOUNTAIN.y - 2 },
  fountain_s: { x: CX - 1, y: FOUNTAIN.y + FOUNTAIN.h + 1 },
  fountain_w: { x: FOUNTAIN.x - 2, y: CY },
  fountain_e: { x: FOUNTAIN.x + FOUNTAIN.w + 1, y: CY - 1 },
  board: { x: BOARD.x + 1, y: BOARD.y + 1 },
  lake_dock: { x: LAKE.x, y: LAKE.y + 9 },
  pond_shore: { x: POND.x, y: POND.y + 8 },
  w_farms: { x: LANES_X[0] + 1, y: CY },
  e_farms: { x: LANES_X[1] + 1, y: CY },
  n_crossroads: { x: CX, y: TOWN.y - 4 },
  s_crossroads: { x: CX, y: TOWN.y + TOWN.h + 3 },
};

// Čia pasirodo žaidėjas, jei jo vieta nežinoma (miesto aikštėje prie fontano)
export const START_TILE = PLACES.fountain_s;

// ---------- Generavimas ----------

export function createWorldMap(seed = WORLD.SEED) {
  const rng = createRng(seed);
  const noise = createNoise2D(seed);
  const noise2 = createNoise2D(seed + 99);
  const map = Array.from({ length: H }, () => Array(W).fill(TILE.GRASS));
  const set = (x, y, t) => { if (isInside(map, x, y)) map[y][x] = t; };
  const fill = (r, t) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, t);
  };

  // 2. Miškas
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = noise(x * 0.11, y * 0.11);
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y); // atstumas iki krašto
      let tree;
      if (edge < 3) tree = true;                                            // tankus kraštas
      else if (edge < RING) tree = n > WORLD.FOREST_DENSITY && rng() < 0.9;  // miškas už žiedinio kelio
      else tree = (n > WORLD.GROVE_DENSITY && rng() < 0.85) || rng() < 0.01; // giraitės ir pavieniai medžiai
      if (tree) map[y][x] = TILE.TREE;
    }
  }

  // 3. Ežeras, tvenkinys ir upė
  for (const lake of [LAKE, POND]) carveLake(map, lake, noise2);
  carveRiver(map, noise2, [
    { x: LAKE.x, y: LAKE.y - 3 }, // iš ežero į šiaurę
    { x: LAKE.x, y: 12 },
    { x: 12, y: 12 },             // į vakarus
    { x: 12, y: H },              // ir į pietus iki pasaulio krašto
  ]);

  // 4. Išvalome svarbias vietas
  clearRect(map, TOWN.x, TOWN.y, TOWN.w, TOWN.h);
  for (const p of PLOTS) clearRect(map, p.x - 1, p.y - 1, P + 2, P + 2);
  for (const place of Object.values(PLACES)) clearRect(map, place.x - 1, place.y - 1, 3, 3);

  // 5. Miestas
  buildTown(map, rng, fill, set);

  // 6. Ūkių sklypai
  for (const plot of PLOTS) buildPlot(map, plot, fill);

  // 7. Dekoracijos ant laisvos žolės
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x] !== TILE.GRASS || isReserved(x, y)) continue;
      const r = rng();
      if (r < 0.008) map[y][x] = TILE.ROCK;
      else if (r < 0.024) map[y][x] = TILE.BUSH;
      else if (r < 0.09) map[y][x] = TILE.FLOWERS;
    }
  }

  // 8. Keliai ir takai (per vandenį – tiltai)
  const r0 = RING;
  const r1 = W - RING - 2;
  const b1 = H - RING - 2;
  carvePath(map, ROAD.x, 2, ROAD.x, H - 3, 'vertical', ROAD.width);   // pagrindinis šiaurė–pietūs
  carvePath(map, 2, ROAD.y, W - 3, ROAD.y, 'horizontal', ROAD.width); // pagrindinis rytai–vakarai
  carvePath(map, r0, r0, r1 + 1, r0, 'horizontal');                   // žiedinis kelias
  carvePath(map, r0, b1, r1 + 1, b1, 'horizontal');
  carvePath(map, r0, r0, r0, b1 + 1, 'vertical');
  carvePath(map, r1, r0, r1, b1 + 1, 'vertical');
  for (const x of LANES_X) carvePath(map, x, r0, x, b1 + 1, 'vertical', GAP);     // takai tarp sklypų
  for (const y of LANES_Y) carvePath(map, r0, y, r1 + 1, y, 'horizontal', GAP);
  // Takeliai prie ežero ir tvenkinio (sustoja prie vandens)
  carvePath(map, LAKE.x, LANES_Y[0], LAKE.x, LAKE.y, 'vertical', 2, false);
  carvePath(map, POND.x, LANES_Y[2], POND.x, POND.y, 'vertical', 2, false);
  // Žibintai palei pagrindinius kelius (kas 10 langelių, pakaitomis abiejose pusėse)
  placeRoadLamps(map);

  // Takeliai nuo kaimynų durų iki aikštės
  for (const door of Object.values(NPC_HOMES)) {
    if (door.x < PLAZA.x) carvePath(map, door.x, door.y, PLAZA.x - 1, door.y, 'horizontal');
    else if (door.x >= PLAZA.x + PLAZA.w) carvePath(map, PLAZA.x + PLAZA.w, door.y, door.x + 1, door.y, 'horizontal');
    else carvePath(map, door.x, door.y, door.x, PLAZA.y - 1, 'vertical');
  }

  return map;
}

function placeRoadLamps(map) {
  const step = 10;
  let i = 0;
  for (let t = RING + 4; t < W - RING - 4; t += step, i++) {
    const side = i % 2 === 0;
    // šalia vertikalaus kelio ir šalia horizontalaus
    const spots = [
      { x: side ? ROAD.x - 1 : ROAD.x + ROAD.width, y: t },
      { x: t, y: side ? ROAD.y - 1 : ROAD.y + ROAD.width },
    ];
    for (const p of spots) {
      if (inRect(TOWN, p.x, p.y, 0)) continue;
      const tile = getTile(map, p.x, p.y);
      if (tile === TILE.GRASS || tile === TILE.FLOWERS || tile === TILE.TREE || tile === TILE.BUSH || tile === TILE.ROCK) {
        map[p.y][p.x] = TILE.LAMP;
      }
    }
  }
}

// Ežeras: apskritimas su „triukšmu sugadintu“ krantu
function carveLake(map, lake, noise2) {
  const reach = lake.radius + 3;
  for (let y = lake.y - reach; y <= lake.y + reach; y++) {
    for (let x = lake.x - reach; x <= lake.x + reach; x++) {
      const d = Math.hypot(x - lake.x, (y - lake.y) * 1.2);
      const shore = lake.radius + (noise2(x * 0.35, y * 0.35) - 0.5) * 4;
      if (d < shore && isInside(map, x, y)) map[y][x] = TILE.WATER;
    }
  }
}

// Upė eina per nurodytus taškus (tik tiesiomis atkarpomis), bet kiekvienoje
// atkarpoje švelniai vingiuoja į šonus. Atkarpų galuose vingis lygus 0,
// todėl posūkiuose upė nenutrūksta.
function carveRiver(map, noise2, points) {
  const width = WORLD.RIVER_WIDTH;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const horizontal = a.y === b.y;
    const len = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
    const sx = Math.sign(b.x - a.x);
    const sy = Math.sign(b.y - a.y);
    for (let s = 0; s <= len; s++) {
      const fade = Math.sin((Math.PI * s) / Math.max(1, len));
      const wobble = Math.round((noise2(s * 0.07, i * 13.7) - 0.5) * 10 * fade);
      for (let k = 0; k < width; k++) {
        const off = wobble + k - Math.floor(width / 2);
        const x = horizontal ? a.x + sx * s : a.x + off;
        const y = horizontal ? a.y + off : a.y + sy * s;
        if (isInside(map, x, y)) map[y][x] = TILE.WATER;
      }
    }
  }
}

// Miestas: aikštė su fontanu ir skelbimų lenta, aplink – parduotuvė ir nameliai
function buildTown(map, rng, fill, set) {
  fill(PLAZA, TILE.PLAZA);
  fill(FOUNTAIN, TILE.FOUNTAIN);
  fill(BOARD, TILE.BOARD);
  // Gėlynai su medžiu viduryje (gėlės – ant žolės, todėl atrodo kaip žalia salelė)
  for (const g of GARDENS) {
    fill(g, TILE.FLOWERS);
    set(g.x + 1, g.y + 1, TILE.TREE);
  }
  for (const b of BENCHES) set(b.x, b.y, TILE.BENCH);
  for (const st of STALLS) fill({ ...st, w: 2, h: 1 }, TILE.STALL);
  for (const l of PLAZA_LAMPS) set(l.x, l.y, TILE.LAMP);
  fill({ ...SHOP_POS, w: 2, h: 2 }, TILE.SHOP);
  for (const c of COTTAGES) fill({ ...c, w: 2, h: 2 }, TILE.COTTAGE);
  // Prie durų – takas
  for (const door of Object.values(NPC_HOMES)) {
    set(door.x, door.y, TILE.PATH);
    set(door.x + 1, door.y, TILE.PATH);
  }
  // Miesto pakraščiuose – gėlynai ir krūmai (ne prie pastatų)
  const buildings = [{ ...SHOP_POS, w: 2, h: 2 }, ...COTTAGES.map((c) => ({ ...c, w: 2, h: 2 }))];
  for (let y = TOWN.y; y < TOWN.y + TOWN.h; y++) {
    for (let x = TOWN.x; x < TOWN.x + TOWN.w; x++) {
      if (map[y][x] !== TILE.GRASS || inRect(PLAZA, x, y, 1)) continue;
      if (buildings.some((b) => inRect(b, x, y, 2))) continue;
      const r = rng();
      if (r < 0.025) map[y][x] = TILE.BUSH;
      else if (r < 0.2) map[y][x] = TILE.FLOWERS;
    }
  }
}

// Vienas ūkio sklypas: tvora su vartais, namelis, takas nuo vartų ir dirva
function buildPlot(map, plot, fill) {
  const x1 = plot.x + P - 1;
  const y1 = plot.y + P - 1;
  const gateX = plot.gateSide === 'e' ? x1 : plot.x;
  for (let y = plot.y; y <= y1; y++) {
    for (let x = plot.x; x <= x1; x++) {
      const onRing = x === plot.x || x === x1 || y === plot.y || y === y1;
      const isGate = x === gateX && (y === plot.y + 5 || y === plot.y + 6);
      if (isGate) map[y][x] = TILE.PATH;
      else if (onRing) map[y][x] = TILE.FENCE;
    }
  }
  // Takas nuo vartų per visą sklypą (tarp namelio ir dirvos)
  fill({ x: plot.x + 1, y: plot.y + 5, w: P - 2, h: 2 }, TILE.PATH);
  fill({ ...plot.house, w: 2, h: 2 }, TILE.HOUSE);
  fill({ ...plot.door, w: 2, h: 1 }, TILE.PATH);
  fill(plot.field, TILE.DIRT);
  // Prie vartų – žibintas ir lentelė su sklypo numeriu
  const innerX = plot.gateSide === 'e' ? x1 - 1 : plot.x + 1;
  map[plot.y + 4][innerX] = TILE.LAMP;
  map[plot.y + 7][innerX] = TILE.SIGN;
}

// Ar langelis (x, y) yra stačiakampyje r (su atsarga margin)?
function inRect(r, x, y, margin = 0) {
  return x >= r.x - margin && x < r.x + r.w + margin && y >= r.y - margin && y < r.y + r.h + margin;
}

// Ar čia nededame atsitiktinių dekoracijų (miestas, sklypai, svarbios vietos)?
function isReserved(x, y) {
  if (inRect(TOWN, x, y, 1)) return true;
  if (PLOTS.some((p) => inRect({ x: p.x, y: p.y, w: P, h: P }, x, y, 1))) return true;
  return Object.values(PLACES).some((pl) => Math.abs(pl.x - x) <= 1 && Math.abs(pl.y - y) <= 1);
}

function clearRect(map, x0, y0, w, h) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (isInside(map, x, y) && map[y][x] !== TILE.WATER) map[y][x] = TILE.GRASS;
    }
  }
}

// Šių langelių takai neliečia (pastatai, tvoros, dirva, aikštė)
const PATH_KEEPS = new Set([
  TILE.DIRT, TILE.SHOP, TILE.HOUSE, TILE.COTTAGE, TILE.BRIDGE, TILE.FENCE, TILE.PLAZA, TILE.FOUNTAIN, TILE.BOARD,
  TILE.LAMP, TILE.BENCH, TILE.STALL, TILE.SIGN,
]);

// Iškerta tiesų width langelių pločio taką nuo (x0, y0) iki (x1, y1).
// Per vandenį – tiltas (jei bridge = true), kitaip takas sustoja prie vandens.
function carvePath(map, x0, y0, x1, y1, dir, width = 2, bridge = true) {
  const steps = dir === 'horizontal' ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
  const sx = Math.sign(x1 - x0);
  const sy = Math.sign(y1 - y0);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + sx * i;
    const y = y0 + sy * i;
    const cells = Array.from({ length: width }, (_, k) => (dir === 'horizontal' ? [x, y + k] : [x + k, y]));
    if (!bridge && cells.some(([cx, cy]) => getTile(map, cx, cy) === TILE.WATER)) return;
    for (const [cx, cy] of cells) {
      const t = getTile(map, cx, cy);
      if (t === null || PATH_KEEPS.has(t)) continue;
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
const BLOCKING = new Set([
  TILE.WATER, TILE.SHOP, TILE.HOUSE, TILE.COTTAGE, TILE.TREE, TILE.ROCK, TILE.BUSH, TILE.FENCE, TILE.FOUNTAIN, TILE.BOARD,
  TILE.LAMP, TILE.BENCH, TILE.STALL, TILE.SIGN,
]);

export function isBlocked(tileType) {
  return BLOCKING.has(tileType);
}

// Ar galima užeiti ant langelio (ribose ir nėra kliūties)?
export function isWalkable(map, x, y) {
  const t = getTile(map, x, y);
  return t !== null && !isBlocked(t);
}

// Kokia žemė po langeliu (piešimui): medžiai, gėlės ir pan. stovi ant žolės,
// tiltas – virš vandens, fontanas ir lenta – ant aikštės grindinio
export function getGround(tileType) {
  if (tileType === TILE.DIRT) return TILE.DIRT;
  if (tileType === TILE.WATER || tileType === TILE.BRIDGE) return TILE.WATER;
  if (tileType === TILE.PATH) return TILE.PATH;
  if (ON_PLAZA.has(tileType)) return TILE.PLAZA;
  return TILE.GRASS;
}
const ON_PLAZA = new Set([TILE.PLAZA, TILE.FOUNTAIN, TILE.BOARD, TILE.BENCH, TILE.STALL]);

// Kaip getGround, bet žiūri ir į kaimynus: žibintas aikštėje stovi ant
// grindinio, o pievoje – ant žolės
export function groundAt(map, x, y) {
  const t = getTile(map, x, y);
  if (t !== TILE.LAMP) return getGround(t);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (getTile(map, x + dx, y + dy) === TILE.PLAZA) return TILE.PLAZA;
  }
  return TILE.GRASS;
}

// Ar langelį galima sukasti kapliu? (tik sklypų dirva; ar sklypas tavo – tikrina Farming.js)
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

// Ar langelis (x, y) šalia stačiakampio r (įskaitant įstrižai)?
export function isNearRect(r, x, y) {
  return inRect(r, x, y, 1) && !inRect(r, x, y, 0);
}

// ---------- Sklypai ----------

// Sklypas, kuriam priklauso langelis (įskaitant tvorą), arba null
export function plotAt(x, y) {
  return PLOTS.find((p) => x >= p.x && x < p.x + P && y >= p.y && y < p.y + P) ?? null;
}

export function getPlotById(id) {
  return PLOTS.find((p) => p.id === id) ?? null;
}

// Ar langelis yra sklypo dirvoje?
export function inField(plot, x, y) {
  return !!plot && inRect(plot.field, x, y);
}

// Ar žaidėjas stovi prie sklypo namelio durų (arba šalia namelio)?
export function isNearPlotHouse(plot, x, y) {
  return !!plot && isNearRect({ ...plot.house, w: 2, h: 2 }, x, y);
}
