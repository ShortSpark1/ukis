import { CONFIG } from '../config.js';
import { createTime } from './Time.js';
import { createQuestState } from './Quests.js';

// =====================================================================
//  ŽAIDIMO BŪSENA
//  Visa informacija apie žaidėjo progresą laikoma VIENAME paprastame
//  objekte. Jį lengva išsaugoti (JSON), o ateityje – siųsti į serverį.
// =====================================================================

export function createNewState() {
  return {
    version: CONFIG.SAVE_VERSION,

    coins: CONFIG.STARTING_COINS,   // žaidimo monetos
    level: 1,                       // dabartinis lygis
    xp: 0,                          // XP dabartiniame lygyje
    points: 0,                      // „taškai“ (ateities airdrop'ui)
    energy: CONFIG.ENERGY_MAX,      // energija (atsistato miegant)

    // Žaidimo laikas: { day, minutes, weather } (žr. logic/Time.js)
    time: createTime(),

    // Užduotys, draugystė su kaimynais ir kada kam paskutinį kartą dovanota
    quests: createQuestState(),   // { active: { id: { progress } }, done: [...] }
    friendship: {},               // npcId → draugystės taškai
    giftsDay: {},                 // npcId → dienos numeris

    // Inventorius: daikto id → kiekis. Pvz. { seed_carrot: 6 }
    inventory: { ...CONFIG.STARTING_ITEMS },

    // Sukasti langeliai. Raktas "x,y" → laukelio duomenys:
    // { crop: 'carrot' | null, daysGrown, watered, dead }
    plots: {},

    // Kokiame pasaulyje žaidžiama – jei vėliau pakeisi žemėlapio dydį ar
    // seed'ą, išsaugojimas tai „pastebės“ ir laukelius perkels.
    world: { width: CONFIG.MAP_WIDTH, height: CONFIG.MAP_HEIGHT, seed: CONFIG.WORLD_SEED },

    // Personažo vieta (langelių vienetais) ir pasirinktas daiktas (pvz. 'hoe', 'seed_carrot')
    player: null,
    selectedItem: 'hoe',
  };
}
