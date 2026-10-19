import { CONFIG } from '../config.js';

// =====================================================================
//  EKRANO IŠDĖSTYMAS
//  Skiriame du dalykus:
//    VIEW  – ekrano dalis, kurioje matosi pasaulis (kamera)
//    WORLD – visas pasaulis (daug didesnis už ekraną)
// =====================================================================

const T = CONFIG.TILE_SIZE;

export const VIEW_PX_W = CONFIG.VIEW_WIDTH * T;
export const VIEW_PX_H = CONFIG.VIEW_HEIGHT * T;
export const WORLD_PX_W = CONFIG.MAP_WIDTH * T;
export const WORLD_PX_H = CONFIG.MAP_HEIGHT * T;

export const SLOT = 64;       // inventoriaus langelio dydis
export const SLOT_GAP = 8;    // tarpas tarp langelių
export const HOTBAR_X = 16;
export const HOTBAR_Y = VIEW_PX_H + 12;

// i-tojo inventoriaus langelio centras ekrane
export function slotCenter(i) {
  return { x: HOTBAR_X + i * (SLOT + SLOT_GAP) + SLOT / 2, y: HOTBAR_Y + SLOT / 2 };
}
