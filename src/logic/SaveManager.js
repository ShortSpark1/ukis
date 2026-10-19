import { CONFIG } from '../config.js';
import { createNewState } from './GameState.js';
import { migrateSave } from './Migration.js';

// =====================================================================
//  IŠSAUGOJIMAS (localStorage)
//  Būsena paverčiama JSON tekstu ir įrašoma į naršyklės saugyklą.
//  Ateityje vietoj localStorage čia galima siųsti duomenis į serverį –
//  likusiam kodui nieko keisti nereikės.
// =====================================================================

const BACKUP_KEY = `${CONFIG.SAVE_KEY}_backup`;

export function saveGame(state) {
  try {
    const data = { ...state, savedAt: Date.now() };
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    // Pvz. privatus naršymo režimas arba pilna saugykla
    console.warn('Nepavyko išsaugoti:', err);
    return false;
  }
}

// Įkelia išsaugojimą. Grąžina { state, notice }:
//   state  – būsena arba null (tada pradedamas naujas žaidimas)
//   notice – žinutė žaidėjui (pvz. „laukeliai perkelti“) arba null
// map – dabartinis pasaulio žemėlapis (reikalingas migracijai)
export function loadGame(map) {
  let raw = null;
  try {
    raw = localStorage.getItem(CONFIG.SAVE_KEY);
  } catch {
    return { state: null, notice: null };
  }
  if (!raw) return { state: null, notice: null };

  try {
    const { data, notice } = migrateSave(JSON.parse(raw), map);

    // Sujungiame su naujos būsenos šablonu: jei vėliau pridėsi naują
    // lauką į GameState.js, seni išsaugojimai jį gaus su numatyta reikšme.
    const fresh = createNewState();
    const state = {
      ...fresh,
      ...data,
      inventory: { ...data.inventory },
      plots: { ...data.plots },
    };
    return { state, notice };
  } catch (err) {
    // Išsaugojimas sugadintas arba per senas – nelūžtame, o pradedame iš naujo.
    // Seną tekstą pasidedame atsarginei kopijai (jei norėtum ką nors atkurti).
    console.warn('Nepavyko įkelti išsaugojimo:', err);
    try { localStorage.setItem(BACKUP_KEY, raw); } catch { /* nieko */ }
    return {
      state: null,
      notice: 'Senas išsaugojimas netinka šiai žaidimo versijai, todėl pradėtas naujas žaidimas.',
    };
  }
}

// Greitai pažiūri, ar yra išsaugojimas, ir grąžina trumpą santrauką pradžios
// ekranui: { day, coins, level } arba null. Būsenos nekeičia ir nemigruoja.
export function peekSave() {
  try {
    const data = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
    if (!data || !Number.isFinite(data.coins)) return null;
    return {
      day: Number.isInteger(data.time?.day) ? data.time.day : 1,
      coins: data.coins,
      level: Number.isInteger(data.level) ? data.level : 1,
    };
  } catch {
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(CONFIG.SAVE_KEY);
  } catch {
    // nieko – jei saugyklos nėra, nėra ir ką trinti
  }
}
