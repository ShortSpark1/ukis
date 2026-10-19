import { CONFIG } from '../config.js';
import { hash2D } from '../../shared/Random.js';

// =====================================================================
//  ŽAIDIMO LAIKAS (gryna logika)
//  state.time = { day, minutes, weather }
//    day      – žaidimo dienos numeris nuo pradžios (1, 2, 3 …)
//    minutes  – minutės nuo vidurnakčio (360 = 6:00; gali būti > 1440,
//               pvz. 1500 = 1:00 nakties, kol dar neužmigta)
//    weather  – šios dienos oras: 'sunny' | 'rain' | 'snow'
//  Iš dienos numerio apskaičiuojamas sezonas ir metai.
// =====================================================================

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = { spring: 'Pavasaris', summer: 'Vasara', autumn: 'Ruduo', winter: 'Žiema' };
export const SEASON_NAMES_SHORT = { spring: 'pav.', summer: 'vas.', autumn: 'rud.', winter: 'žiem.' };
export const WEATHER_NAMES = { sunny: 'Saulėta', rain: 'Lietus', snow: 'Sninga' };

const DAY_START = CONFIG.DAY_START_HOUR * 60;
const DAY_END = CONFIG.DAY_END_HOUR * 60;

// Kiek žaidimo minučių praeina per vieną realią milisekundę
export const GAME_MINUTES_PER_MS = (DAY_END - DAY_START) / (CONFIG.REAL_MINUTES_PER_DAY * 60 * 1000);

export function createTime() {
  return { day: 1, minutes: DAY_START, weather: 'sunny' };
}

export function getSeasonOfDay(day) {
  return SEASONS[Math.floor((day - 1) / CONFIG.DAYS_PER_SEASON) % SEASONS.length];
}

export function getSeason(state) {
  return getSeasonOfDay(state.time.day);
}

export function getDayOfSeason(day) {
  return ((day - 1) % CONFIG.DAYS_PER_SEASON) + 1;
}

export function getYear(day) {
  return Math.floor((day - 1) / (CONFIG.DAYS_PER_SEASON * SEASONS.length)) + 1;
}

// Laikrodis „HH:MM“, rodomas kas 10 minučių (kaip daugelyje ūkio žaidimų)
export function formatClock(minutes) {
  const m = Math.floor(minutes / 10) * 10 % 1440;
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Pastumia laikrodį. Grąžina true, jei diena baigėsi (laikas miegoti).
export function advanceClock(state, realMs) {
  state.time.minutes = Math.min(DAY_END, state.time.minutes + realMs * GAME_MINUTES_PER_MS);
  return state.time.minutes >= DAY_END;
}

// Oras parenkamas „atsitiktinai“, bet pagal dienos numerį ir pasaulio seed'ą.
// Todėl tą pačią dieną oras visada toks pat (svarbu ateityje – serveriui).
export function rollWeather(day) {
  if (day === 1) return 'sunny';
  const chances = CONFIG.WEATHER[getSeasonOfDay(day)] ?? {};
  const r = hash2D(day, 911, CONFIG.WORLD_SEED);
  const rain = chances.rain ?? 0;
  const snow = chances.snow ?? 0;
  if (r < rain) return 'rain';
  if (r < rain + snow) return 'snow';
  return 'sunny';
}

// Kiek tamsu dabar (0 – šviesu, iki NIGHT_MAX_DARKNESS – naktis).
// Grąžina { darkness, night } – night: 0…1, kiek „naktiška“ spalva ir ar degti šviesas.
export function getDarkness(minutes, weather) {
  const h = minutes / 60;
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  let darkness = 0;
  let night = 0;
  if (h < CONFIG.DAWN_END_HOUR) {
    const t = (h - CONFIG.DAY_START_HOUR) / (CONFIG.DAWN_END_HOUR - CONFIG.DAY_START_HOUR);
    darkness = lerp(CONFIG.DAWN_DARKNESS, 0, t);
    night = lerp(0.6, 0, t);
  } else if (h >= CONFIG.DUSK_START_HOUR) {
    if (h < CONFIG.NIGHT_START_HOUR) {
      const t = (h - CONFIG.DUSK_START_HOUR) / (CONFIG.NIGHT_START_HOUR - CONFIG.DUSK_START_HOUR);
      darkness = lerp(0, CONFIG.NIGHT_MAX_DARKNESS * 0.55, t);
      night = lerp(0, 0.5, t);
    } else {
      const t = (h - CONFIG.NIGHT_START_HOUR) / (CONFIG.DEEP_NIGHT_HOUR - CONFIG.NIGHT_START_HOUR);
      darkness = lerp(CONFIG.NIGHT_MAX_DARKNESS * 0.55, CONFIG.NIGHT_MAX_DARKNESS, t);
      night = lerp(0.5, 1, t);
    }
  }
  if (weather !== 'sunny') darkness = Math.min(1, darkness + CONFIG.RAIN_DARKNESS);
  return { darkness, night };
}
