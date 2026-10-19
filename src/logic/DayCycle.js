import { CONFIG } from '../config.js';
import { getSeasonOfDay, rollWeather } from './Time.js';
import { startNewDay } from './Farming.js';
import { restoreEnergy } from './Energy.js';

// =====================================================================
//  DIENOS PABAIGA (gryna logika)
//  Iškviečiama, kai žaidėjas eina miegoti arba nualpsta 2:00 nakties.
//  Pereina į kitą rytą: nauja diena, oras, augalų augimas, energija.
// =====================================================================

// fainted = true – nualpo (nemiegojo lovoje), todėl atgauna tik dalį energijos.
// Grąžina santrauką žinutėms: { day, season, seasonChanged, weather, grown, wilted }
export function endDay(state, fainted = false) {
  const prevSeason = getSeasonOfDay(state.time.day);

  state.time.day += 1;
  state.time.minutes = CONFIG.DAY_START_HOUR * 60;
  state.time.weather = rollWeather(state.time.day);

  const season = getSeasonOfDay(state.time.day);
  const { grown, wilted } = startNewDay(state, prevSeason, season, state.time.weather);
  restoreEnergy(state, fainted ? CONFIG.FAINT_ENERGY : 1);

  return {
    day: state.time.day,
    season,
    seasonChanged: season !== prevSeason,
    weather: state.time.weather,
    grown,
    wilted,
  };
}
