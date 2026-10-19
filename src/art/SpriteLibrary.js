import { CONFIG } from '../config.js';
// Sąrašas failų, kuriuos žaidėjas įdėjo į public/assets/ (jį sudaro Vite
// įskiepis faile vite.config.js). Jei aplanko nėra – tuščias masyvas.
import userAssets from 'virtual:user-assets';
import {
  makeTerrain, GRASS_VARIANTS, DIRT_VARIANTS, FLOWER_VARIANTS, WATER_FRAMES, PATH_VARIANTS, PLAZA_VARIANTS, fenceFrameName,
} from './terrain.js';
import { makeObjects, TREE_VARIANTS, TREE_ORIGIN_Y, FOUNTAIN_TOP_Y } from './objects.js';
import { makePlayer, makeCharacter, PLAYER_DIRS, WALK_FRAMES, PLAYER_FRAME_W, PLAYER_FRAME_H } from './characters.js';
import { NPCS } from '../data/npcs.js';
import { makeCrops } from './crops.js';
import { makeIcons } from './icons.js';
import { ensurePanel, textStyle, makeBarTextures, FONT_FAMILY } from './ui.js';
import { SEASON_KEYS, sk } from './seasons.js';

// =====================================================================
//  SPRITE'Ų BIBLIOTEKA – VIENINTELĖ VIETA, IŠ KURIOS ATEINA GRAFIKA
//
//  Scenos niekada pačios nepiešia: jos naudoja tik čia sukurtus
//  tekstūrų raktus ir šiame faile esančias funkcijas.
//
//  Kaip tai veikia:
//    1. buildSprites() nupiešia visą grafiką kodu (failai terrain.js,
//       objects.js, characters.js, crops.js, icons.js, ui.js).
//    2. Jei public/assets/ aplanke yra tavo failas iš sąrašo OVERRIDES
//       (pvz. grass.png), jis PAKEIČIA atitinkamą nupieštą piešinį.
// =====================================================================

export {
  GRASS_VARIANTS, DIRT_VARIANTS, FLOWER_VARIANTS, WATER_FRAMES, PATH_VARIANTS, PLAZA_VARIANTS, TREE_VARIANTS,
  TREE_ORIGIN_Y, FOUNTAIN_TOP_Y, PLAYER_DIRS, WALK_FRAMES, fenceFrameName, ensurePanel, textStyle, FONT_FAMILY,
  SEASON_KEYS, sk,
};
export const PLAYER_FRAME = { w: PLAYER_FRAME_W, h: PLAYER_FRAME_H };

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const SIDES = ['n', 'e', 's', 'w'];
const CORNERS = ['nw', 'ne', 'se', 'sw'];

// ---------------------------------------------------------------------
// Failai, kuriais galima pakeisti piešinius.
//   file   – failo vardas public/assets/ aplanke
//   names  – kuriuos piešinius (arba kadrus) jis pakeičia, iš eilės
//   sheet  – jei nurodyta: tai vienos tekstūros kadrai (animacijoms)
//   cols   – kiek kadrų vienoje failo eilutėje (numatytai – visi vienoje)
//   base   – rekomenduojamas vieno kadro dydis (README lentelei)
//   seasonal – piešinys turi versiją kiekvienam sezonui. Failas (pvz. grass.png)
//            tinka visiems sezonams, o grass_winter.png – tik žiemai.
// Kadrų dydis faile gali būti bet koks – jis ištempiamas iki žaidimo
// piešinio dydžio, išlaikant proporcijas (apačia sulygiuojama su žeme).
// ---------------------------------------------------------------------
function buildOverrideList() {
  const list = [
    { file: 'grass.png', seasonal: true, names: range(GRASS_VARIANTS, (i) => `grass_${i}`), base: '16x16' },
    { file: 'dirt.png', seasonal: true, names: range(DIRT_VARIANTS, (i) => `dirt_${i}`), base: '16x16' },
    { file: 'path.png', seasonal: true, names: range(PATH_VARIANTS, (i) => `path_${i}`), base: '16x16' },
    { file: 'plaza.png', seasonal: true, names: range(PLAZA_VARIANTS, (i) => `plaza_${i}`), base: '16x16' },
    { file: 'soil.png', names: ['soil_dry', 'soil_wet'], base: '16x16' },
    { file: 'flowers.png', seasonal: true, names: range(FLOWER_VARIANTS, (i) => `flowers_${i}`), base: '16x16' },
    { file: 'water.png', sheet: 'water', names: range(WATER_FRAMES, (i) => `w${i}`), base: '16x16' },
    { file: 'shore.png', names: [...SIDES.map((d) => `shore_${d}`), ...CORNERS.map((d) => `shore_inner_${d}`)], base: '16x16' },
    { file: 'grass_edge.png', seasonal: true, names: SIDES.map((d) => `dirtedge_${d}`), base: '16x16' },
    { file: 'bridge.png', names: ['bridge_h', 'bridge_v', ...SIDES.map((d) => `bridge_rail_${d}`)], base: '16x16' },
    { file: 'fence.png', sheet: 'fence', names: range(16, fenceFrameName), base: '16x16' },
    { file: 'tree.png', seasonal: true, names: range(TREE_VARIANTS, (i) => `tree_${i}`), base: '32x48' },
    { file: 'bush.png', seasonal: true, names: ['bush'], base: '16x16' },
    { file: 'rock.png', names: ['rock'], base: '16x16' },
    { file: 'shop.png', names: ['shop'], base: '32x46' },
    { file: 'house.png', names: ['house'], base: '32x46' },
    { file: 'fountain.png', names: ['fountain'], base: '64x70' },
    { file: 'board.png', names: ['board'], base: '32x32' },
    { file: 'crop_dead.png', names: ['crop_dead'], base: '16x24' },
    {
      file: 'player.png', sheet: 'player', cols: WALK_FRAMES,
      names: PLAYER_DIRS.flatMap((d) => range(WALK_FRAMES, (f) => `${d}_${f}`)), base: '24x32',
    },
    { file: 'icon_hoe.png', names: ['icon_hoe'], base: '16x16' },
    { file: 'icon_watering_can.png', names: ['icon_watering_can'], base: '16x16' },
    { file: 'icon_coin.png', names: ['icon_coin'], base: '16x16' },
    { file: 'icon_star.png', names: ['icon_star'], base: '16x16' },
    { file: 'icon_gem.png', names: ['icon_gem'], base: '16x16' },
    { file: 'icon_bag.png', names: ['icon_bag'], base: '16x16' },
  ];
  for (const npcId of Object.keys(NPCS)) {
    list.push({
      file: `npc_${npcId}.png`, sheet: `npc_${npcId}`, cols: WALK_FRAMES,
      names: PLAYER_DIRS.flatMap((d) => range(WALK_FRAMES, (f) => `${d}_${f}`)), base: '24x32',
    });
    if (NPCS[npcId].home.cottage) list.push({ file: `cottage_${npcId}.png`, names: [`cottage_${npcId}`], base: '32x46' });
  }
  for (const [cropId, crop] of Object.entries(CONFIG.CROPS)) {
    list.push({ file: `crop_${cropId}.png`, names: range(crop.stages, (s) => `crop_${cropId}_${s}`), base: '16x24' });
    list.push({ file: `icon_seed_${cropId}.png`, names: [`icon_seed_${cropId}`], base: '16x16' });
    list.push({ file: `icon_crop_${cropId}.png`, names: [`icon_crop_${cropId}`], base: '16x16' });
    list.push({ file: `icon_crop_${cropId}_gold.png`, names: [`icon_crop_${cropId}_gold`], base: '16x16' });
  }
  return list;
}

export const OVERRIDES = buildOverrideList();

// Sezoninius įrašus „išskleidžia“ į konkrečius: kiekvienam sezonui –
// savas failas (jei yra, pvz. grass_winter.png) arba bendras (grass.png)
function concreteOverrides() {
  const out = [];
  for (const o of OVERRIDES) {
    if (!o.seasonal) {
      out.push(o);
      continue;
    }
    for (const season of SEASON_KEYS) {
      const specific = o.file.replace('.png', `_${season}.png`);
      const file = userAssets.includes(specific) ? specific : o.file;
      out.push({ ...o, file, names: o.names.map((n) => sk(n, season)) });
    }
  }
  return out;
}

// ---------- 1. Žaidėjo failų įkėlimas (BootScene.preload) ----------
export function preloadUserSprites(scene) {
  const files = new Set(concreteOverrides().map((o) => o.file));
  for (const file of files) {
    if (userAssets.includes(file)) scene.load.image(`user__${file}`, `assets/${file}`);
  }
}

// ---------- 2. Visų tekstūrų sukūrimas (BootScene.create) ----------
export function buildSprites(scene) {
  // Visa grafika piešiama kodu
  makeTerrain(scene);  // žolė, dirva, takai, vanduo, krantai, tiltai, tvoros, sukasta žemė, gėlės
  makeObjects(scene);  // medžiai, akmenys, krūmai, parduotuvė, efektai
  makePlayer(scene);   // ūkininkas su ėjimo animacija
  for (const [npcId, npc] of Object.entries(NPCS)) makeCharacter(scene, `npc_${npcId}`, npc.look); // kaimynai
  makeCrops(scene);    // augalų stadijos
  makeIcons(scene);    // inventoriaus ir HUD ikonos
  makeBarTextures(scene, 200, 14); // XP juosta

  // Tavo failai pakeičia nupieštus piešinius
  const used = [];
  for (const o of concreteOverrides()) {
    if (applyOverride(scene, o) && !used.includes(o.file)) used.push(o.file);
  }
  if (used.length) console.info(`[sprite'ai] Naudojami tavo failai: ${used.join(', ')}`);
}

// Iš žaidėjo paveikslėlio iškerpa kadrus ir pakeičia jais esamas tekstūras
function applyOverride(scene, o) {
  const key = `user__${o.file}`;
  if (!scene.textures.exists(key)) return false;
  const img = scene.textures.get(key).getSourceImage();
  const cols = o.cols ?? o.names.length;
  const rows = Math.ceil(o.names.length / cols);
  if (img.width % cols !== 0 || img.height % rows !== 0) {
    console.warn(
      `[sprite'ai] public/assets/${o.file}: ${img.width}x${img.height} px nesidalija į ${cols}x${rows} kadrus. ` +
      'Naudojamas nupieštas piešinys.',
    );
    return false;
  }
  const fw = img.width / cols;
  const fh = img.height / rows;

  // Kiekvieno kadro tikslinis dydis – toks, kokio buvo nupieštas piešinys
  const targetSize = (name) => {
    const frame = o.sheet ? scene.textures.getFrame(o.sheet, name) : scene.textures.getFrame(name);
    return { w: frame.width, h: frame.height };
  };
  const canvases = o.names.map((name, i) => {
    const { w, h } = targetSize(name);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const scale = Math.min(w / fw, h / fh);
    // Mažus pixel art piešinius (pvz. 16x16) didiname „kvadratiniais“ pikseliais
    ctx.imageSmoothingEnabled = scale < 1.5;
    const dw = fw * scale;
    const dh = fh * scale;
    ctx.drawImage(img, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh, (w - dw) / 2, h - dh, dw, dh);
    return c;
  });

  if (o.sheet) {
    // Animacijų tekstūra: sudedame kadrus į vieną eilę ir užregistruojame vardus
    const { w, h } = targetSize(o.names[0]);
    const sheet = document.createElement('canvas');
    sheet.width = w * canvases.length;
    sheet.height = h;
    canvases.forEach((c, i) => sheet.getContext('2d').drawImage(c, i * w, 0));
    scene.textures.remove(o.sheet);
    const tex = scene.textures.addCanvas(o.sheet, sheet);
    o.names.forEach((name, i) => tex.add(name, 0, i * w, 0, w, h));
  } else {
    o.names.forEach((name, i) => {
      scene.textures.remove(name);
      scene.textures.addCanvas(name, canvases[i]);
    });
  }
  return true;
}

// ---------- 3. Minimapo paveikslėlis ----------
export function makeMinimapTexture(scene, key, map, scale, colors) {
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas');
  c.width = map[0].length * scale;
  c.height = map.length * scale;
  const ctx = c.getContext('2d');
  map.forEach((row, y) => row.forEach((tile, x) => {
    ctx.fillStyle = colors[tile] ?? '#5a9c3a';
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }));
  scene.textures.addCanvas(key, c);
  return key;
}
