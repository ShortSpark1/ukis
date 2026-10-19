import { CONFIG } from '../config.js';
import { getTile, getGround, groundAt, isBlocked, plotAt, TILE, COTTAGES } from '../../shared/WorldMap.js';
import {
  GRASS_VARIANTS, DIRT_VARIANTS, FLOWER_VARIANTS, PATH_VARIANTS, PLAZA_VARIANTS, TREE_VARIANTS,
  TREE_ORIGIN_Y, FOUNTAIN_TOP_Y, SIGN_TEXT_Y, STALL_VARIANTS, HOUSE_VARIANTS, fenceFrameName, sk, textStyle,
} from '../art/SpriteLibrary.js';
import { VIEW_PX_W, VIEW_PX_H } from './layout.js';

const T = CONFIG.TILE_SIZE;
const S = T / 32;               // dizaino vienetas → pikseliai
const CS = CONFIG.CHUNK_SIZE;   // chunk'o dydis langeliais
const CHUNK_PX = CS * T;        // chunk'o dydis pikseliais
const SIDES = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const CORNERS = { nw: [-1, -1], ne: [1, -1], se: [1, 1], sw: [-1, 1] };

// Pastovus „atsitiktinis“ skaičius kiekvienam langeliui (variantams parinkti)
export function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// =====================================================================
//  PIEŠIMAS CHUNK'AIS
//  200x200 langelių pasaulis – tai 9600x9600 pikselių. Tiek vienu metu
//  piešti būtų per lėta (ir toks paveikslėlis netilptų vaizdo plokštėje).
//  Todėl pasaulį dalijame į kvadratus („chunk'us“) po 16x16 langelių ir
//  laikome tik tuos, kurie yra prie kameros:
//
//    ┌──┬──┬──┬──┬──┐
//    │  │░░│░░│░░│  │   ░░ – sukurti chunk'ai (ekranas + atsarga)
//    ├──┼──┼──┼──┼──┤   ▓▓ – tai, ką rodo kamera
//    │  │░░│▓▓│░░│  │
//    ├──┼──┼──┼──┼──┤   Personažui einant, nauji chunk'ai sukuriami,
//    │  │░░│░░│░░│  │   o nutolę – ištrinami.
//    └──┴──┴──┴──┴──┘
//
//  Kiekviename chunk'e:
//    – žemė (žolė, takai, dirva, krantai, tiltai) „iškepama“ į vieną
//      paveikslėlį (DynamicTexture). Tokie paveikslėliai pernaudojami;
//    – objektai: vanduo (animuotas), medžiai, krūmai, akmenys, tvoros, pastatai;
//    – nematomi kliūčių stačiakampiai, į kuriuos atsitrenkia personažas.
// =====================================================================
export class ChunkRenderer {
  // depths – { ground, edge }, ySort(y) – objektų gylis pagal Y, blockers – Phaser staticGroup
  constructor(scene, map, { depths, ySort, blockers, season }) {
    this.scene = scene;
    this.map = map;
    this.depths = depths;
    this.ySort = ySort;
    this.blockers = blockers;
    this.season = season;
    this.cols = Math.ceil(map[0].length / CS);
    this.rows = Math.ceil(map.length / CS);
    this.chunks = new Map(); // "cx,cy" → chunk
    this.pool = [];          // laisvi žemės paveikslėliai pernaudojimui
    this.texCount = 0;
    this.cottageAt = new Map(COTTAGES.map((c) => [`${c.x},${c.y}`, c.npcId]));
  }

  // Kviečiama kiekvieną kadrą. (x, y) – kameros centras pasaulyje.
  // force – sukurti visus reikiamus chunk'us iš karto (pvz. po teleporto).
  update(x, y, force = false) {
    const halfW = VIEW_PX_W / 2;
    const halfH = VIEW_PX_H / 2;
    const need = this.rangeAround(x, y, halfW, halfH, CONFIG.CHUNK_MARGIN_TILES * T);
    const keep = this.rangeAround(x, y, halfW, halfH, CONFIG.CHUNK_KEEP_TILES * T);

    // Nutolusius ištriname
    for (const [key, chunk] of this.chunks) {
      if (chunk.cx < keep.x0 || chunk.cx > keep.x1 || chunk.cy < keep.y0 || chunk.cy > keep.y1) {
        this.destroyChunk(chunk);
        this.chunks.delete(key);
      }
    }

    // Trūkstamus sukuriame – artimiausius pirmiausia
    const missing = [];
    for (let cy = need.y0; cy <= need.y1; cy++) {
      for (let cx = need.x0; cx <= need.x1; cx++) {
        if (!this.chunks.has(`${cx},${cy}`)) missing.push({ cx, cy });
      }
    }
    if (missing.length === 0) return;
    const dist = (c) => Math.hypot((c.cx + 0.5) * CHUNK_PX - x, (c.cy + 0.5) * CHUNK_PX - y);
    missing.sort((a, b) => dist(a) - dist(b));
    const limit = force ? missing.length : CONFIG.CHUNKS_PER_FRAME;
    for (const { cx, cy } of missing.slice(0, limit)) {
      this.chunks.set(`${cx},${cy}`, this.createChunk(cx, cy));
    }
  }

  // Kurie chunk'ai patenka į plotą aplink (x, y)
  rangeAround(x, y, halfW, halfH, margin) {
    const clampX = (v) => Math.max(0, Math.min(this.cols - 1, v));
    const clampY = (v) => Math.max(0, Math.min(this.rows - 1, v));
    return {
      x0: clampX(Math.floor((x - halfW - margin) / CHUNK_PX)),
      x1: clampX(Math.floor((x + halfW + margin) / CHUNK_PX)),
      y0: clampY(Math.floor((y - halfH - margin) / CHUNK_PX)),
      y1: clampY(Math.floor((y + halfH + margin) / CHUNK_PX)),
    };
  }

  get activeCount() {
    return this.chunks.size;
  }

  // Pasikeitus sezonui – perpiešiame esamus chunk'us (nauji bus iškart tinkami)
  setSeason(season) {
    this.season = season;
    for (const chunk of this.chunks.values()) {
      this.bakeGround(chunk);
      for (const o of chunk.seasonal) o.img.setTexture(sk(o.base, season));
    }
  }

  // ---------- Chunk'o sukūrimas ir ištrynimas ----------

  createChunk(cx, cy) {
    const chunk = { cx, cy, ground: this.takeGround(cx, cy), objects: [], seasonal: [], zones: [] };
    this.bakeGround(chunk);
    this.createObjects(chunk);
    this.createBlockers(chunk);
    return chunk;
  }

  destroyChunk(chunk) {
    for (const obj of chunk.objects) obj.destroy();
    for (const zone of chunk.zones) this.blockers.remove(zone, true, true);
    chunk.ground.image.setVisible(false);
    this.pool.push(chunk.ground);
  }

  // Paima laisvą žemės paveikslėlį iš „baseino“ arba sukuria naują
  takeGround(cx, cy) {
    let g = this.pool.pop();
    if (!g) {
      const key = `chunk_ground_${this.texCount++}`;
      const tex = this.scene.textures.addDynamicTexture(key, CHUNK_PX, CHUNK_PX);
      const image = this.scene.add.image(0, 0, key).setOrigin(0).setDepth(this.depths.edge);
      g = { key, tex, image };
    }
    g.image.setPosition(cx * CHUNK_PX, cy * CHUNK_PX).setVisible(true);
    return g;
  }

  // ---------- Žemė ----------
  // Visa nejudanti žemė (žolė, dirva, takai, kraštai, gėlės, tiltai)
  // nupiešiama į vieną chunk'o paveikslėlį – taip greita.
  bakeGround(chunk) {
    const { tex } = chunk.ground;
    const map = this.map;
    const season = this.season;
    const x0 = chunk.cx * CS;
    const y0 = chunk.cy * CS;
    tex.clear();
    tex.beginDraw();
    const stamp = (key, px, py) => tex.batchDrawFrame(key, undefined, px, py);
    const waterOrOutside = (x, y) => {
      const t = getTile(map, x, y);
      return t === null || getGround(t) === TILE.WATER;
    };

    for (let y = y0; y < y0 + CS; y++) {
      for (let x = x0; x < x0 + CS; x++) {
        const type = getTile(map, x, y);
        if (type === null) continue;
        const gnd = groundAt(map, x, y);
        const h = tileHash(x, y);
        const px = (x - x0) * T;
        const py = (y - y0) * T;

        if (gnd === TILE.WATER) {
          // Krantas toje pusėje, kur prasideda žemė
          for (const [dir, [dx, dy]] of Object.entries(SIDES)) {
            const n = getTile(map, x + dx, y + dy);
            if (n !== null && getGround(n) !== TILE.WATER) stamp(`shore_${dir}`, px, py);
          }
          // Vidiniai kampai: žemė tik įstrižai
          for (const [dir, [dx, dy]] of Object.entries(CORNERS)) {
            if (!waterOrOutside(x + dx, y + dy) && waterOrOutside(x + dx, y) && waterOrOutside(x, y + dy)) {
              stamp(`shore_inner_${dir}`, px, py);
            }
          }
          // Tiltas: lentos guldomos skersai ėjimo krypties
          if (type === TILE.BRIDGE) {
            const horizontal = [getTile(map, x - 1, y), getTile(map, x + 1, y)]
              .some((n) => n === TILE.PATH || n === TILE.BRIDGE);
            stamp(horizontal ? 'bridge_h' : 'bridge_v', px, py);
            // turėklai tik ten, kur tiltas baigiasi (ne tarp dviejų tilto eilių)
            for (const dir of horizontal ? ['n', 's'] : ['e', 'w']) {
              const [dx, dy] = SIDES[dir];
              if (getTile(map, x + dx, y + dy) !== TILE.BRIDGE) stamp(`bridge_rail_${dir}`, px, py);
            }
          }
        } else {
          let base = `grass_${h % GRASS_VARIANTS}`;
          if (gnd === TILE.DIRT) base = `dirt_${h % DIRT_VARIANTS}`;
          if (gnd === TILE.PATH) base = `path_${h % PATH_VARIANTS}`;
          if (gnd === TILE.PLAZA) base = `plaza_${h % PLAZA_VARIANTS}`;
          stamp(sk(base, season), px, py);
          // Žolės kraštas ant dirvos, takų ir grindinio
          if (gnd !== TILE.GRASS) {
            for (const [dir, [dx, dy]] of Object.entries(SIDES)) {
              const n = getTile(map, x + dx, y + dy);
              if (n !== null && groundAt(map, x + dx, y + dy) === TILE.GRASS) stamp(sk(`dirtedge_${dir}`, season), px, py);
            }
          }
        }
        if (type === TILE.FLOWERS) stamp(sk(`flowers_${h % FLOWER_VARIANTS}`, season), px, py);
      }
    }
    tex.endDraw();
  }

  // ---------- Objektai ----------
  createObjects(chunk) {
    const { scene, map, ySort } = this;
    const add = (obj) => {
      chunk.objects.push(obj);
      return obj;
    };
    const x0 = chunk.cx * CS;
    const y0 = chunk.cy * CS;
    // Ar (x, y) – pastato kairysis viršutinis langelis (kairėje ir viršuje – ne tas pats tipas)?
    const isCorner = (x, y, type) => getTile(map, x - 1, y) !== type && getTile(map, x, y - 1) !== type;

    for (let y = y0; y < y0 + CS; y++) {
      for (let x = x0; x < x0 + CS; x++) {
        const type = getTile(map, x, y);
        if (type === null) continue;
        const h = tileHash(x, y);
        const px = x * T;
        const py = y * T;

        // Vanduo animuotas, todėl lieka atskiru sprite'u po „iškepta“ žeme
        if (getGround(type) === TILE.WATER) {
          add(scene.add.sprite(px, py, 'water', 'w0').setOrigin(0).setDepth(this.depths.ground).play('water_anim'));
        }

        if (type === TILE.TREE) {
          const base = `tree_${h % TREE_VARIANTS}`;
          const img = add(scene.add.image(px + T / 2, py + T - 4, sk(base, this.season))
            .setOrigin(0.5, TREE_ORIGIN_Y) // kamieno apačia
            .setDepth(ySort(py + T - 6)));
          chunk.seasonal.push({ img, base });
        } else if (type === TILE.BUSH) {
          const img = add(scene.add.image(px + T / 2, py + T, sk('bush', this.season)).setOrigin(0.5, 1).setDepth(ySort(py + T - 8)));
          chunk.seasonal.push({ img, base: 'bush' });
        } else if (type === TILE.FENCE) {
          // Tvoros kadras priklauso nuo to, kuriose pusėse yra kitos tvoros
          const isFence = (dx, dy) => getTile(map, x + dx, y + dy) === TILE.FENCE;
          const mask = (isFence(0, -1) ? 1 : 0) | (isFence(1, 0) ? 2 : 0) | (isFence(0, 1) ? 4 : 0) | (isFence(-1, 0) ? 8 : 0);
          add(scene.add.image(px, py, 'fence', fenceFrameName(mask)).setOrigin(0).setDepth(ySort(py + T - 6)));
        } else if (type === TILE.ROCK) {
          add(scene.add.image(px + T / 2, py + T, 'rock').setOrigin(0.5, 1).setDepth(ySort(py + T - 8)));
        } else if ((type === TILE.SHOP || type === TILE.HOUSE || type === TILE.COTTAGE) && isCorner(x, y, type)) {
          // Pastatai 2x2: piešinio apačia – ties pagrindo apačia, stogas kyla aukščiau
          let key = type === TILE.SHOP ? 'shop' : `cottage_${this.cottageAt.get(`${x},${y}`)}`;
          if (type === TILE.HOUSE) key = `house_${((plotAt(x, y)?.id ?? 1) - 1) % HOUSE_VARIANTS}`; // kiekvieno sklypo – savas stogas
          const by = py + 2 * T;
          add(scene.add.image(px, by, key).setOrigin(0, 1).setDepth(ySort(by - 4)));
        } else if (type === TILE.FOUNTAIN && isCorner(x, y, type)) {
          this.createFountain(chunk, add, px, py);
        } else if (type === TILE.BOARD && isCorner(x, y, type)) {
          add(scene.add.image(px, py + T, 'board').setOrigin(0, 1).setDepth(ySort(py + T - 4)));
        } else if (type === TILE.LAMP) {
          add(scene.add.image(px + T / 2, py + T - 2, 'lamp').setOrigin(0.5, 1).setDepth(ySort(py + T - 6)));
        } else if (type === TILE.BENCH) {
          add(scene.add.image(px + T / 2, py + T, 'bench').setOrigin(0.5, 1).setDepth(ySort(py + T - 8)));
        } else if (type === TILE.STALL && isCorner(x, y, type)) {
          add(scene.add.image(px, py + T, `stall_${h % STALL_VARIANTS}`).setOrigin(0, 1).setDepth(ySort(py + T - 6)));
        } else if (type === TILE.SIGN) {
          // Lentelė su sklypo numeriu
          const img = add(scene.add.image(px + T / 2, py + T, 'sign').setOrigin(0.5, 1).setDepth(ySort(py + T - 6)));
          const id = plotAt(x, y)?.id ?? '';
          add(scene.add.text(img.x, py + T - img.height + SIGN_TEXT_Y * S, String(id), textStyle(15, '#4a2a10', { stroke: '#f0d098', strokeThickness: 2 }))
            .setOrigin(0.5).setDepth(img.depth + 0.1));
        }
      }
    }
  }

  // Fontanas (4x4) su trykštančiu vandeniu (dalelės)
  createFountain(chunk, add, px, py) {
    const bottom = py + 4 * T;
    const img = add(this.scene.add.image(px + 2 * T, bottom, 'fountain').setOrigin(0.5, 1).setDepth(this.ySort(bottom - 2 * T)));
    const topY = bottom - img.height + FOUNTAIN_TOP_Y * S;
    add(this.scene.add.particles(px + 2 * T, topY, 'p_water', {
      lifespan: 900, speed: { min: 40, max: 90 }, angle: { min: 240, max: 300 }, gravityY: 260,
      scale: { start: 1, end: 0.4 }, alpha: { start: 0.9, end: 0 }, frequency: 40, quantity: 2,
    }).setDepth(img.depth + 1));
  }

  // ---------- Kliūtys ----------
  // Vietoj atskiro stačiakampio kiekvienam langeliui sujungiame gretimus
  // kliūčių langelius eilutėje į vieną ilgą – taip fizikai daug mažiau darbo.
  createBlockers(chunk) {
    const x0 = chunk.cx * CS;
    const y0 = chunk.cy * CS;
    for (let y = y0; y < y0 + CS; y++) {
      let runStart = -1;
      for (let x = x0; x <= x0 + CS; x++) {
        const t = x < x0 + CS ? getTile(this.map, x, y) : null;
        const blocked = t !== null && isBlocked(t);
        if (blocked && runStart < 0) runStart = x;
        if (!blocked && runStart >= 0) {
          const len = x - runStart;
          const zone = this.scene.add.zone(runStart * T + (len * T) / 2, y * T + T / 2, len * T, T);
          this.blockers.add(zone);
          chunk.zones.push(zone);
          runStart = -1;
        }
      }
    }
  }
}
