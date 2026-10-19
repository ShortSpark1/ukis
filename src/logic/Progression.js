import { CONFIG } from '../config.js';

// =====================================================================
//  PROGRESAS: XP, LYGIAI IR TAŠKAI (gryna logika)
//
//  XP – patirtis. Prikaupus pakankamai, pakylama lygiu ir atrakinami
//       nauji augalai.
//  Taškai (points) – atskiras skaitiklis, kaupiamas už veiksmus.
//       Kol kas tai tik skaičius; ateityje jį būtų galima naudoti
//       airdrop'ui. Jis NIEKADA nemažėja ir neišleidžiamas parduotuvėje.
// =====================================================================

// Kiek XP reikia pakilti iš šio lygio į kitą
export function xpToNextLevel(level) {
  return Math.round(CONFIG.LEVEL_BASE_XP * Math.pow(CONFIG.LEVEL_GROWTH, level - 1));
}

export function addPoints(state, amount) {
  if (amount > 0) state.points += amount;
}

// Prideda XP ir, jei reikia, pakelia lygį (gali pakelti ir kelis kartus).
// Grąžina, kiek lygių pakilta.
export function addXp(state, amount) {
  let levelsGained = 0;
  state.xp += amount;

  while (state.xp >= xpToNextLevel(state.level)) {
    state.xp -= xpToNextLevel(state.level);
    state.level += 1;
    levelsGained += 1;
    // Dovanos už naują lygį
    state.coins += CONFIG.LEVEL_UP_COINS;
    addPoints(state, CONFIG.LEVEL_UP_POINTS);
  }
  return levelsGained;
}

// Pritaiko veiksmo atlygį { xp, points }. Grąžina pakilusių lygių skaičių.
export function applyReward(state, reward) {
  if (!reward) return 0;
  addPoints(state, reward.points ?? 0);
  return addXp(state, reward.xp ?? 0);
}

// Kurie augalai atrakinami būtent šiame lygyje (žinutei parodyti)
export function cropsUnlockedAt(level) {
  return Object.values(CONFIG.CROPS).filter((c) => c.unlockLevel === level).map((c) => c.name);
}
