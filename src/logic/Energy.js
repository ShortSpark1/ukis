import { CONFIG } from '../config.js';

// =====================================================================
//  ENERGIJA (gryna logika)
//  Kiekvienas ūkio darbas kainuoja energijos (CONFIG.ENERGY_COST).
//  Kai jos neužtenka, dirbti negalima – reikia eiti miegoti.
// =====================================================================

export function energyCost(kind) {
  return CONFIG.ENERGY_COST[kind] ?? 0;
}

export function hasEnergy(state, kind) {
  return state.energy >= energyCost(kind);
}

export function spendEnergy(state, kind) {
  state.energy = Math.max(0, state.energy - energyCost(kind));
}

// fraction – kokią dalį maksimalios energijos atstatyti (1 = pilnai)
export function restoreEnergy(state, fraction = 1) {
  state.energy = Math.round(CONFIG.ENERGY_MAX * fraction);
}
