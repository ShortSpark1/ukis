import { CONFIG } from '../config.js';
import { getTile, isTillable, plotAt, inField } from '../../shared/WorldMap.js';
import { addItem, removeItem, hasItem, cropItemId } from './Inventory.js';
import { getSeason, SEASON_NAMES } from './Time.js';

// =====================================================================
//  ŪKININKAVIMAS (gryna logika)
//  Ciklas: kasti → sodinti → laistyti → (auga) → nuimti derlių.
//
//  Augalai auga pagal ŽAIDIMO DIENAS: kiekvieną rytą (po miego) augalas
//  paauga viena diena, jei vakar buvo palaistytas. Lietus palaisto pats.
//  Augalas auga tik savo sezonais – pasikeitus sezonui netinkami nuvysta.
//
//  Laukelio duomenys: { crop, daysGrown, watered, dead }
//
//  Kiekviena veiksmo funkcija grąžina rezultatą:
//    { ok: true/false, message: 'tekstas', reward: { xp, points } }
//  Pati funkcija XP neprideda – tai padaro kviečiantis kodas.
// =====================================================================

const NO_REWARD = { xp: 0, points: 0 };

export function plotKey(x, y) {
  return `${x},${y}`;
}

export function getPlot(state, x, y) {
  return state.plots[plotKey(x, y)] ?? null;
}

// Pagalbinės funkcijos rezultatams kurti
function fail(message) {
  return { ok: false, message, reward: NO_REWARD };
}
function success(message, reward = NO_REWARD) {
  return { ok: true, message, reward };
}

// Ar augalas auga šiuo sezonu?
export function growsInSeason(cropId, season) {
  return CONFIG.CROPS[cropId]?.seasons.includes(season) ?? false;
}

// Sezonų sąrašas tekstu, pvz. „pavasarį, rudenį“ (žinutėms)
export function seasonsText(cropId) {
  const names = { spring: 'pavasarį', summer: 'vasarą', autumn: 'rudenį', winter: 'žiemą' };
  return CONFIG.CROPS[cropId].seasons.map((s) => names[s]).join(', ');
}

// ---------- Augimas ----------

export function isWet(plot) {
  return !!plot.watered;
}

export function isDead(plot) {
  return !!plot.crop && !!plot.dead;
}

// Augimo progresas nuo 0 iki 1
export function getProgress(plot) {
  if (!plot.crop) return 0;
  return Math.min(1, plot.daysGrown / CONFIG.CROPS[plot.crop].growDays);
}

export function isReady(plot) {
  return !!plot.crop && !plot.dead && getProgress(plot) >= 1;
}

// Augimo stadija: 0 = ką tik pasodinta, (stages-1) = subrendęs
export function getStage(plot) {
  if (!plot.crop) return -1;
  const stages = CONFIG.CROPS[plot.crop].stages;
  if (isReady(plot)) return stages - 1;
  return Math.min(stages - 2, Math.floor(getProgress(plot) * (stages - 1)));
}

// Naujos dienos rytas. Iškviečiama po miego.
//   prevSeason – vakarykštis sezonas, newSeason – šiandienos, weather – šiandienos oras
// Grąžina { grown, wilted }: kiek augalų paaugo ir kiek nuvyto.
export function startNewDay(state, prevSeason, newSeason, weather) {
  let grown = 0;
  let wilted = 0;
  for (const plot of Object.values(state.plots)) {
    if (plot.crop && !plot.dead) {
      // 1) Vakar palaistytas augalas paauga viena diena
      const growDays = CONFIG.CROPS[plot.crop].growDays;
      if (plot.watered && growsInSeason(plot.crop, prevSeason) && plot.daysGrown < growDays) {
        plot.daysGrown += 1;
        grown += 1;
      }
      // 2) Prasidėjo sezonas, kuriuo augalas neauga – jis nuvysta
      if (newSeason !== prevSeason && !growsInSeason(plot.crop, newSeason)) {
        plot.dead = true;
        wilted += 1;
      }
    }
    // 3) Naujas rytas – žemė išdžiūsta, nebent lyja
    plot.watered = weather === 'rain';
  }
  return { grown, wilted };
}

// Ar langelis yra ŽAIDĖJO sklypo dirvoje? Svetimame sklype ūkininkauti negalima.
export function isOwnField(state, x, y) {
  const plot = plotAt(x, y);
  return !!plot && plot.id === state.plotId && inField(plot, x, y);
}

// ---------- Veiksmo „peržiūra“ ----------

// Kokį veiksmą atliktume su šiuo daiktu ant šio langelio?
// Grąžina 'harvest' | 'till' | 'clear' | 'water' | 'plant' arba null (nieko).
// Būsenos NEKEIČIA – naudojama pelės žymekliui ir sprendimui, ar eiti
// prie langelio ir ką nors daryti, ar tiesiog nueiti.
export function getActionPreview(state, map, x, y, itemId) {
  const plot = getPlot(state, x, y);
  if (plot && isReady(plot)) return 'harvest';
  if (!hasItem(state, itemId)) return null;

  if (itemId === 'hoe') {
    if (plot && isDead(plot)) return 'clear';
    return !plot && isTillable(getTile(map, x, y)) && isOwnField(state, x, y) ? 'till' : null;
  }
  if (itemId === 'watering_can') return plot ? 'water' : null;
  if (itemId.startsWith('seed_')) return plot && !plot.crop ? 'plant' : null;
  return null;
}

// ---------- Veiksmai ----------

export function till(state, map, x, y) {
  if (!isTillable(getTile(map, x, y))) return fail('Čia kasti negalima – ieškok rudos dirvos savo ūkyje.');
  if (!isOwnField(state, x, y)) return fail('Tai ne tavo sklypas – kasti galima tik savo ūkyje.');
  if (getPlot(state, x, y)) return fail('Ši žemė jau sukasta.');

  state.plots[plotKey(x, y)] = { crop: null, daysGrown: 0, watered: state.time.weather === 'rain', dead: false };
  return success('Žemė sukasta!', CONFIG.ACTIONS.till);
}

// Nuvytusio augalo išrovimas kapliu
export function clearDead(state, x, y) {
  const plot = getPlot(state, x, y);
  if (!plot || !isDead(plot)) return fail('Čia nėra nuvytusio augalo.');
  plot.crop = null;
  plot.dead = false;
  plot.daysGrown = 0;
  return success('Nuvytęs augalas išrautas.');
}

export function plant(state, x, y, cropId) {
  const plot = getPlot(state, x, y);
  const crop = CONFIG.CROPS[cropId];
  if (!crop) return fail('Nežinomas augalas.');
  if (!plot) return fail('Pirma sukask žemę kapliu.');
  if (plot.crop) return fail(plot.dead ? 'Pirma išrauk nuvytusį augalą kapliu.' : 'Čia jau kažkas auga.');
  if (!hasItem(state, `seed_${cropId}`)) return fail('Neturi šių sėklų.');
  const season = getSeason(state);
  if (!growsInSeason(cropId, season)) {
    return fail(`${crop.name} neauga – dabar ${SEASON_NAMES[season].toLowerCase()}. Auga ${seasonsText(cropId)}.`);
  }

  removeItem(state, `seed_${cropId}`);
  plot.crop = cropId;
  plot.daysGrown = 0;
  plot.dead = false;
  return success(`Pasodinta: ${crop.name}. Laistyk kasdien!`, CONFIG.ACTIONS.plant);
}

export function water(state, x, y) {
  const plot = getPlot(state, x, y);
  if (!plot) return fail('Laistyti galima tik sukastą žemę.');

  const wasDry = !plot.watered;
  plot.watered = true;
  // Atlygis tik jei laistome sausą žemę su augančiu augalu (kad nebūtų „spaminimo“)
  const growing = plot.crop && !plot.dead && !isReady(plot);
  return success(wasDry ? 'Palaistyta!' : 'Jau palaistyta šiandien.', wasDry && growing ? CONFIG.ACTIONS.water : NO_REWARD);
}

// random – atsitiktinių skaičių funkcija (0…1). Testams galima perduoti savo.
// Rezultate papildomai: itemId (koks daiktas gautas) ir golden (ar auksinis).
export function harvest(state, x, y, random = Math.random) {
  const plot = getPlot(state, x, y);
  if (!plot || !plot.crop) return fail('Čia nieko neauga.');
  if (plot.dead) return fail('Augalas nuvyto – išrauk jį kapliu.');
  if (!isReady(plot)) {
    const crop = CONFIG.CROPS[plot.crop];
    return fail(`Dar neužaugo: ${plot.daysGrown}/${crop.growDays} d.`);
  }

  const cropId = plot.crop;
  const crop = CONFIG.CROPS[cropId];
  // Retas auksinis derlius
  const golden = random() < CONFIG.GOLDEN.chance;
  const itemId = cropItemId(cropId, golden);
  addItem(state, itemId);

  if (crop.regrowDays) {
    // Augalas lieka ir vėl duos derlių po regrowDays dienų
    plot.daysGrown = Math.max(0, crop.growDays - crop.regrowDays);
  } else {
    plot.crop = null;
    plot.daysGrown = 0;
  }

  const reward = golden
    ? { xp: crop.harvestXp * CONFIG.GOLDEN.xpMult, points: crop.harvestPoints + CONFIG.GOLDEN.bonusPoints }
    : { xp: crop.harvestXp, points: crop.harvestPoints };
  const again = crop.regrowDays ? ` Vėl užaugs po ${crop.regrowDays} d.` : '';
  const message = golden ? `Retas radinys! ${crop.goldenName}!${again}` : `Nuimtas derlius: ${crop.name}!${again}`;
  return { ...success(message, reward), itemId, golden };
}
