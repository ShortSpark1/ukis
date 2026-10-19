import { CONFIG } from '../config.js';
import { getTile, isTillable, isWalkable, FARM_ZONE } from './WorldMap.js';
import { createTime } from './Time.js';
import { getItemInfo } from './Inventory.js';
import { cleanQuestState } from './Quests.js';

// =====================================================================
//  IŠSAUGOJIMŲ MIGRACIJA (gryna logika)
//  Kai žaidimas keičiasi (pvz. padidėja žemėlapis), seni išsaugojimai
//  neturi „užlūžti“. Čia senus duomenis žingsnis po žingsnio pakeliame
//  iki naujausios versijos:
//    v1 → v2: personažo vieta buvo pikseliais – pamirštame ją
//    v2 → v3: mažas 20x15 žemėlapis → didelis; laukeliai perkeliami į
//             naują ūkio zoną
//    v3 → v4: augalai auga nebe realiu laiku, o žaidimo dienomis;
//             atsirado laikas, oras ir energija
//    v4 → v5: daug augalų; pasirinktas ne langelio numeris, o daiktas
//    v5 → v6: kaimynai, užduotys ir draugystė
//  Be to, KIEKVIENĄ kartą trūkstami ar sugadinti laukai užpildomi
//  numatytomis reikšmėmis (fillDefaults).
//  Jei duomenys visai sugadinti – metame klaidą, o SaveManager pradeda naują žaidimą.
// =====================================================================

// Senųjų versijų augimo laikai sekundėmis (iki v4) – reikalingi
// perskaičiuoti, kiek senas augalas jau buvo paaugęs
const OLD_GROW_SEC = { carrot: 45, tomato: 90, corn: 150 };
// Iki v5 inventoriaus juosta buvo pastovi – pagal šį sąrašą senas
// langelio numeris paverčiamas daiktu
const OLD_HOTBAR = ['hoe', 'watering_can', 'seed_carrot', 'seed_tomato', 'seed_corn', 'crop_carrot', 'crop_tomato', 'crop_corn'];

export function currentWorldInfo() {
  return { width: CONFIG.MAP_WIDTH, height: CONFIG.MAP_HEIGHT, seed: CONFIG.WORLD_SEED };
}

// Grąžina { data, notice }: pataisytus duomenis ir žinutę žaidėjui (arba null)
export function migrateSave(data, map) {
  validate(data);
  const notices = [];
  let version = Number(data.version) || 1;

  if (version < 2) {
    data.player = null;
    version = 2;
  }

  if (version < 3) {
    const { plots, lost } = relocatePlots(data.plots, map);
    data.plots = plots;
    data.player = null;
    data.world = currentWorldInfo();
    notices.push(lost > 0
      ? `Pasaulis padidėjo! Laukeliai perkelti į ūkio zoną centre (${lost} netilpo).`
      : 'Pasaulis padidėjo! Tavo laukeliai ir augalai perkelti į naują ūkio zoną centre.');
    version = 3;
  }

  if (version < 4) {
    // cleanPlot paverčia seną laukelį (growthMs) nauju (daysGrown)
    data.plots = cleanAllPlots(data.plots);
    notices.push('Atsirado diena, naktis ir sezonai! Augalai dabar auga žaidimo dienomis – laistyk juos kasdien.');
    version = 4;
  }

  if (version < 5) {
    data.selectedItem = OLD_HOTBAR[data.selectedSlot] ?? 'hoe';
    delete data.selectedSlot;
    notices.push('Atsirado 15 augalų, kartotinis ir auksinis derlius! Visi daiktai – kuprinėje (klavišas I).');
    version = 5;
  }

  if (version < 6) {
    notices.push('Kaime apsigyveno kaimynai! Pakalbink juos (E) – jie turi užduočių. Žurnalas – J.');
    version = 6;
  }

  if (version !== CONFIG.SAVE_VERSION) {
    throw new Error(`Nežinoma išsaugojimo versija: ${data.version}`);
  }
  data.version = version;

  // Tos pačios versijos išsaugojimas, bet pasaulis kitoks (pvz. pakeitei
  // MAP_WIDTH ar WORLD_SEED faile config.js) – irgi perkeliame laukelius
  const w = data.world;
  const cur = currentWorldInfo();
  if (!w || w.width !== cur.width || w.height !== cur.height || w.seed !== cur.seed) {
    const { plots, lost } = relocatePlots(data.plots, map);
    data.plots = plots;
    data.player = null;
    data.world = cur;
    notices.push(`Žemėlapis pasikeitė – laukeliai perkelti į ūkio zoną${lost ? ` (${lost} netilpo)` : ''}.`);
  }

  fillDefaults(data, map);
  return { data, notice: notices.length ? notices.join(' ') : null };
}

// Paprasti patikrinimai: ar tai panašu į mūsų išsaugojimą?
function validate(data) {
  if (!data || typeof data !== 'object') throw new Error('Išsaugojimas – ne objektas');
  if (!Number.isFinite(data.coins)) throw new Error('Trūksta monetų skaičiaus');
  if (!data.inventory || typeof data.inventory !== 'object') throw new Error('Trūksta inventoriaus');
  if (data.plots == null) data.plots = {};
  if (typeof data.plots !== 'object') throw new Error('Blogi laukeliai');
}

// Trūkstami ar netinkami laukai → numatytos reikšmės.
// Taip seni (ar ranka pakeisti) išsaugojimai niekada nesulaužo žaidimo.
function fillDefaults(data, map) {
  const fresh = createTime();
  const t = data.time && typeof data.time === 'object' ? data.time : {};
  const minMinutes = CONFIG.DAY_START_HOUR * 60;
  const maxMinutes = CONFIG.DAY_END_HOUR * 60 - 1;
  data.time = {
    day: Number.isInteger(t.day) && t.day >= 1 ? t.day : fresh.day,
    minutes: Number.isFinite(t.minutes) ? Math.min(maxMinutes, Math.max(minMinutes, t.minutes)) : fresh.minutes,
    weather: ['sunny', 'rain', 'snow'].includes(t.weather) ? t.weather : fresh.weather,
  };
  data.energy = Number.isFinite(data.energy)
    ? Math.min(CONFIG.ENERGY_MAX, Math.max(0, data.energy))
    : CONFIG.ENERGY_MAX;
  data.plots = cleanAllPlots(data.plots);
  if (typeof data.selectedItem !== 'string' || getItemInfo(data.selectedItem).kind === 'unknown') {
    data.selectedItem = 'hoe';
  }
  delete data.selectedSlot;
  cleanQuestState(data);

  // Personažas negali atsirasti vandenyje, medyje, name ar už pasaulio ribų
  if (data.player) {
    const tx = Math.floor(data.player.x);
    const ty = Math.floor(data.player.y);
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !isWalkable(map, tx, ty)) data.player = null;
  }
}

function cleanAllPlots(plots) {
  const out = {};
  for (const [key, plot] of Object.entries(plots ?? {})) {
    const clean = cleanPlot(plot);
    if (clean) out[key] = clean;
  }
  return out;
}

// Perkelia laukelius į ūkio zoną išlaikant jų tarpusavio išdėstymą:
// kairysis viršutinis senas laukelis atsiduria ūkio zonos kampe.
// Grąžina { plots, lost }, kur lost – kiek laukelių netilpo.
export function relocatePlots(oldPlots, map) {
  const entries = [];
  for (const [key, plot] of Object.entries(oldPlots ?? {})) {
    const [x, y] = key.split(',').map(Number);
    const clean = cleanPlot(plot);
    if (Number.isInteger(x) && Number.isInteger(y) && clean) entries.push({ x, y, plot: clean });
  }
  if (entries.length === 0) return { plots: {}, lost: 0 };

  const minX = Math.min(...entries.map((e) => e.x));
  const minY = Math.min(...entries.map((e) => e.y));
  const plots = {};
  let lost = 0;
  for (const { x, y, plot } of entries) {
    const nx = FARM_ZONE.x + (x - minX);
    const ny = FARM_ZONE.y + (y - minY);
    const key = `${nx},${ny}`;
    if (isTillable(getTile(map, nx, ny)) && !plots[key]) plots[key] = plot;
    else lost += 1;
  }
  return { plots, lost };
}

// Sutvarko vieno laukelio duomenis ir grąžina NAUJO formato laukelį
// { crop, daysGrown, watered, dead } arba null, jei duomenys netinkami.
// Supranta ir seną formatą { crop, growthMs, wetUntil, lastUpdate }.
function cleanPlot(plot) {
  if (!plot || typeof plot !== 'object') return null;
  const crop = plot.crop && CONFIG.CROPS[plot.crop] ? plot.crop : null;
  let daysGrown = 0;
  if (crop) {
    const growDays = CONFIG.CROPS[crop].growDays;
    if (Number.isFinite(plot.daysGrown)) {
      daysGrown = plot.daysGrown;
    } else if (Number.isFinite(plot.growthMs)) {
      // Senas formatas: kokią dalį augimo jau buvo įveikęs → tiek dienų
      const oldMs = (OLD_GROW_SEC[crop] ?? 60) * 1000;
      daysGrown = Math.floor(Math.min(1, plot.growthMs / oldMs) * growDays);
    }
    daysGrown = Math.max(0, Math.min(growDays, Math.floor(daysGrown)));
  }
  return { crop, daysGrown, watered: plot.watered === true, dead: crop ? plot.dead === true : false };
}
