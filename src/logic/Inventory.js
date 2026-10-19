import { CONFIG } from '../config.js';

// =====================================================================
//  INVENTORIUS (gryna logika)
//  Daiktų id sistema:
//    'hoe', 'watering_can'  – įrankiai
//    'seed_<augalas>'       – sėklos, pvz. 'seed_carrot'
//    'crop_<augalas>'       – derlius, pvz. 'crop_carrot'
//    'crop_<augalas>_gold'  – retas auksinis derlius, pvz. 'crop_carrot_gold'
// =====================================================================

const TOOLS = {
  hoe: 'Kaplys',
  watering_can: 'Laistytuvas',
};

// Kiek langelių turi greitoji juosta ekrano apačioje (paskutinis – kuprinė)
export const HOTBAR_SIZE = 7;

// Kiek turime šio daikto?
export function getCount(state, itemId) {
  return state.inventory[itemId] ?? 0;
}

export function hasItem(state, itemId, amount = 1) {
  return getCount(state, itemId) >= amount;
}

export function addItem(state, itemId, amount = 1) {
  state.inventory[itemId] = getCount(state, itemId) + amount;
}

// Pašalina daiktą. Grąžina false, jei neužtenka.
export function removeItem(state, itemId, amount = 1) {
  if (!hasItem(state, itemId, amount)) return false;
  state.inventory[itemId] -= amount;
  return true;
}

export const cropItemId = (cropId, golden = false) => `crop_${cropId}${golden ? '_gold' : ''}`;

// Informacija apie daiktą: pavadinimas, rūšis, augalo id ir ar auksinis
export function getItemInfo(itemId) {
  if (TOOLS[itemId]) return { id: itemId, kind: 'tool', name: TOOLS[itemId] };

  const [prefix, cropId, quality] = itemId.split('_');
  const crop = CONFIG.CROPS[cropId];
  if (prefix === 'seed' && crop) return { id: itemId, kind: 'seed', cropId, name: `${crop.name} (sėklos)` };
  if (prefix === 'crop' && crop) {
    const golden = quality === 'gold';
    return { id: itemId, kind: 'crop', cropId, golden, name: golden ? crop.goldenName : crop.name };
  }
  return { id: itemId, kind: 'unknown', name: itemId };
}

// Visų galimų daiktų tvarka: įrankiai → sėklos → derlius → auksinis derlius
export function allItemIds() {
  const cropIds = Object.keys(CONFIG.CROPS);
  return [
    ...Object.keys(TOOLS),
    ...cropIds.map((id) => `seed_${id}`),
    ...cropIds.map((id) => cropItemId(id)),
    ...cropIds.map((id) => cropItemId(id, true)),
  ];
}

// Daiktai, kuriuos žaidėjas TURI (kuprinei): įrankiai visada, kiti – jei kiekis > 0
export function getOwnedItems(state) {
  return allItemIds().filter((id) => getItemInfo(id).kind === 'tool' || getCount(state, id) > 0);
}

// Greitoji juosta: įrankiai ir turimos sėklos (kiek telpa)
export function getHotbarItems(state) {
  return getOwnedItems(state)
    .filter((id) => ['tool', 'seed'].includes(getItemInfo(id).kind))
    .slice(0, HOTBAR_SIZE);
}
