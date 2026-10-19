import { CONFIG } from '../config.js';
import { addItem, removeItem, getCount, getItemInfo, allItemIds } from './Inventory.js';
import { getSeason, SEASON_NAMES } from './Time.js';
import { shopDiscount } from './Quests.js';

// =====================================================================
//  EKONOMIKA (gryna logika)
//  Sėklų pirkimas ir derliaus pardavimas. Visos kainos – config.js.
//  Grąžina tokį pat rezultatą kaip Farming.js: { ok, message, reward }.
// =====================================================================

const NO_REWARD = { xp: 0, points: 0 };

// Ar žaidėjo lygis jau leidžia pirkti šias sėklas?
export function isUnlocked(state, cropId) {
  return state.level >= CONFIG.CROPS[cropId].unlockLevel;
}

// Kurių augalų sėklas šiuo sezonu parduoda parduotuvė
export function seedsForSale(state) {
  const season = getSeason(state);
  return Object.keys(CONFIG.CROPS).filter((id) => CONFIG.CROPS[id].seasons.includes(season));
}

// Sėklų kaina su Onos nuolaida (už draugystę)
export function seedPriceOf(state, cropId) {
  return Math.max(1, Math.round(CONFIG.CROPS[cropId].seedPrice * (1 - shopDiscount(state))));
}

// Vieno derliaus vieneto kaina (auksinis – brangesnis)
export function sellPriceOf(itemId) {
  const info = getItemInfo(itemId);
  if (info.kind !== 'crop') return 0;
  const base = CONFIG.CROPS[info.cropId].sellPrice;
  return info.golden ? base * CONFIG.GOLDEN.priceMult : base;
}

// Derlius, kurį žaidėjas turi (pardavimui)
export function sellableItems(state) {
  return allItemIds().filter((id) => getItemInfo(id).kind === 'crop' && getCount(state, id) > 0);
}

export function buySeeds(state, cropId, amount = 1) {
  const crop = CONFIG.CROPS[cropId];
  if (!crop) return { ok: false, message: 'Tokių sėklų nėra.', reward: NO_REWARD };
  if (!seedsForSale(state).includes(cropId)) {
    return { ok: false, message: `${crop.name}: sėklos šiuo sezonu (${SEASON_NAMES[getSeason(state)].toLowerCase()}) neparduodamos.`, reward: NO_REWARD };
  }
  if (!isUnlocked(state, cropId)) {
    return { ok: false, message: `${crop.name}: reikia ${crop.unlockLevel} lygio.`, reward: NO_REWARD };
  }

  const cost = seedPriceOf(state, cropId) * amount;
  if (state.coins < cost) {
    return { ok: false, message: `Trūksta monetų (reikia ${cost}).`, reward: NO_REWARD };
  }

  state.coins -= cost;
  addItem(state, `seed_${cropId}`, amount);
  return { ok: true, message: `Nupirkta: ${crop.name} (sėklos) ×${amount} (−${cost} mon.)`, reward: NO_REWARD };
}

// itemId – derliaus daiktas, pvz. 'crop_carrot' arba 'crop_carrot_gold'
export function sellCrop(state, itemId, amount = 1) {
  const info = getItemInfo(itemId);
  if (info.kind !== 'crop') return { ok: false, message: 'Tai ne derlius.', reward: NO_REWARD };
  if (amount <= 0 || !removeItem(state, itemId, amount)) {
    return { ok: false, message: `Neturi tiek: ${info.name}.`, reward: NO_REWARD };
  }

  const earned = sellPriceOf(itemId) * amount;
  state.coins += earned;
  const points = Math.floor(earned * CONFIG.SELL_POINTS_PER_COIN);
  return { ok: true, message: `Parduota: ${info.name} ×${amount} (+${earned} mon.)`, reward: { xp: 0, points } };
}

// Parduoda visą turimą derlių iš karto
export function sellAllCrops(state) {
  let earned = 0;
  for (const itemId of sellableItems(state)) {
    const count = getCount(state, itemId);
    removeItem(state, itemId, count);
    earned += sellPriceOf(itemId) * count;
  }
  if (earned === 0) return { ok: false, message: 'Neturi derliaus pardavimui.', reward: NO_REWARD };

  state.coins += earned;
  const points = Math.floor(earned * CONFIG.SELL_POINTS_PER_COIN);
  return { ok: true, message: `Parduotas visas derlius (+${earned} mon.)`, reward: { xp: 0, points } };
}
