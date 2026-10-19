import { CONFIG } from '../config.js';
import { NPCS, QUESTS, GIFT_REACTIONS } from '../data/npcs.js';
import { addItem, removeItem, getCount, getItemInfo } from './Inventory.js';
import { hash2D } from '../../shared/Random.js';

// =====================================================================
//  UŽDUOTYS IR DRAUGYSTĖ (gryna logika)
//  Duomenys (kas, ką sako, ką prašo) – src/data/npcs.js.
//
//  Būsenoje:
//    state.quests     = { active: { id: { progress } }, done: [id, ...] }
//    state.friendship = { npcId: taškai }
//    state.giftsDay   = { npcId: dienos numeris, kai paskutinį kartą gavo dovaną }
//  Funkcijos, kurios duoda atlygį, grąžina { ok, message, reward } – kaip ir
//  Farming.js; XP ir taškus prideda kviečiantis kodas (GameScene.applyResult).
// =====================================================================

const NO_REWARD = { xp: 0, points: 0 };
const F = CONFIG.FRIENDSHIP;

// ---------- Draugystė ----------
export function friendshipPoints(state, npcId) {
  return state.friendship[npcId] ?? 0;
}

export function friendshipLevel(state, npcId) {
  return Math.min(F.maxLevel, Math.floor(friendshipPoints(state, npcId) / F.pointsPerLevel));
}

// Grąžina, kiek širdelių pakilo
export function addFriendship(state, npcId, amount) {
  const before = friendshipLevel(state, npcId);
  const max = F.maxLevel * F.pointsPerLevel;
  state.friendship[npcId] = Math.max(0, Math.min(max, friendshipPoints(state, npcId) + amount));
  return friendshipLevel(state, npcId) - before;
}

// Onos (parduotuvininkės) nuolaida sėkloms: 0 … 0.15
export function shopDiscount(state) {
  return friendshipLevel(state, 'ona') * F.shopDiscountPerLevel;
}

// Pasisveikinimas pagal draugystės lygį (kasdien – kitas sakinys)
export function greeting(state, npcId) {
  const npc = NPCS[npcId];
  const level = friendshipLevel(state, npcId);
  const thresholds = Object.keys(npc.greetings).map(Number).filter((t) => t <= level);
  const lines = npc.greetings[Math.max(...thresholds)];
  const pick = Math.floor(hash2D(state.time.day, npcId.length, 7) * lines.length);
  return lines[pick];
}

// ---------- Užduotys ----------
const turnInOf = (quest) => quest.turnIn ?? quest.giver;

export function isDone(state, questId) {
  return state.quests.done.includes(questId);
}

export function isActive(state, questId) {
  return !!state.quests.active[questId];
}

// Ar užduotis jau gali būti pasiūlyta?
function requirementsMet(state, quest) {
  const r = quest.requires ?? {};
  if (r.level && state.level < r.level) return false;
  if (r.friendship && friendshipLevel(state, quest.giver) < r.friendship) return false;
  if (r.quests && !r.quests.every((id) => isDone(state, id))) return false;
  return true;
}

// Kiek jau padaryta: { current, needed }
export function questProgress(state, questId) {
  const quest = QUESTS[questId];
  const g = quest.goal;
  if (g.type === 'deliver') return { current: Math.min(g.amount, getCount(state, g.item)), needed: g.amount };
  const active = state.quests.active[questId];
  return { current: Math.min(g.amount, active?.progress ?? 0), needed: g.amount };
}

export function isQuestComplete(state, questId) {
  const { current, needed } = questProgress(state, questId);
  return current >= needed;
}

// Pirmoji užduotis, kurią šis NPC gali pasiūlyti (tik viena aktyvi iš to paties NPC)
export function availableQuestFor(state, npcId) {
  const busy = Object.keys(state.quests.active).some((id) => QUESTS[id].giver === npcId);
  if (busy) return null;
  return Object.keys(QUESTS).find((id) => {
    const q = QUESTS[id];
    return q.giver === npcId && !isDone(state, id) && !isActive(state, id) && requirementsMet(state, q);
  }) ?? null;
}

// Aktyvios užduotys, kurias reikia atiduoti šiam NPC
export function questsToTurnIn(state, npcId) {
  return Object.keys(state.quests.active).filter((id) => turnInOf(QUESTS[id]) === npcId);
}

// Užduotis, kurią šiam NPC galima atiduoti DABAR (įvykdyta)
export function readyQuestFor(state, npcId) {
  return questsToTurnIn(state, npcId).find((id) => isQuestComplete(state, id)) ?? null;
}

export function acceptQuest(state, questId) {
  if (!QUESTS[questId] || isActive(state, questId) || isDone(state, questId)) return false;
  state.quests.active[questId] = { progress: 0 };
  return true;
}

// Nuimtas derlius – skaičiuojame „harvest“ tipo užduotims
export function onHarvest(state, cropId) {
  for (const [id, data] of Object.entries(state.quests.active)) {
    const g = QUESTS[id].goal;
    if (g.type === 'harvest' && (g.crop === 'any' || g.crop === cropId)) data.progress += 1;
  }
}

// Atiduoda įvykdytą užduotį: paima daiktus, duoda atlygį
export function completeQuest(state, questId) {
  const quest = QUESTS[questId];
  if (!quest || !isActive(state, questId)) return { ok: false, message: 'Tokios užduoties neturi.', reward: NO_REWARD };
  if (!isQuestComplete(state, questId)) return { ok: false, message: 'Užduotis dar neatlikta.', reward: NO_REWARD };

  if (quest.goal.type === 'deliver') removeItem(state, quest.goal.item, quest.goal.amount);
  delete state.quests.active[questId];
  state.quests.done.push(questId);

  const r = quest.reward;
  const parts = [];
  if (r.coins) {
    state.coins += r.coins;
    parts.push(`+${r.coins} mon.`);
  }
  for (const [itemId, amount] of Object.entries(r.items ?? {})) {
    addItem(state, itemId, amount);
    parts.push(`${getItemInfo(itemId).name} ×${amount}`);
  }
  let hearts = 0;
  if (r.friendship) hearts += addFriendship(state, quest.giver, r.friendship);
  for (const [npcId, amount] of Object.entries(r.friendshipWith ?? {})) addFriendship(state, npcId, amount);

  let message = `Užduotis „${quest.title}“ atlikta! ${parts.join(', ')}`;
  if (hearts > 0) message += ` ${NPCS[quest.giver].name}: +${hearts} ♥`;
  return { ok: true, message, reward: { xp: r.xp ?? 0, points: r.points ?? 0 }, hearts };
}

// ---------- Dovanos ----------
// Dovanoti galima derlių, kiekvienam NPC – kartą per dieną
export function giveGift(state, npcId, itemId) {
  const npc = NPCS[npcId];
  const info = getItemInfo(itemId);
  if (info.kind !== 'crop' || getCount(state, itemId) < 1) {
    return { ok: false, message: 'Dovanoti galima tik derlių. Pasirink jį kuprinėje (I).', reward: NO_REWARD };
  }
  if (state.giftsDay[npcId] === state.time.day) {
    return { ok: false, message: GIFT_REACTIONS.already, reward: NO_REWARD };
  }

  removeItem(state, itemId, 1);
  state.giftsDay[npcId] = state.time.day;

  let amount = F.giftNeutral;
  let reaction = GIFT_REACTIONS.neutral;
  if (info.golden) { amount = F.giftGolden; reaction = GIFT_REACTIONS.golden; }
  else if (npc.gifts.loved.includes(info.cropId)) { amount = F.giftLoved; reaction = GIFT_REACTIONS.loved; }
  else if (npc.gifts.liked.includes(info.cropId)) { amount = F.giftLiked; reaction = GIFT_REACTIONS.liked; }
  else if (npc.gifts.disliked.includes(info.cropId)) { amount = F.giftDisliked; reaction = GIFT_REACTIONS.disliked; }

  const hearts = addFriendship(state, npcId, amount);
  const change = amount >= 0 ? `+${amount}` : `${amount}`;
  let message = `${npc.name}: „${reaction}“ (draugystė ${change})`;
  if (hearts > 0) message += ` +${hearts} ♥`;
  return { ok: true, message, reaction, reward: { xp: 2, points: amount > 0 ? 2 : 0 }, hearts };
}

// ---------- Naujos būsenos laukai (naudoja GameState ir Migration) ----------
export function createQuestState() {
  return { active: {}, done: [] };
}

// Sutvarko išsaugotus duomenis: pašalina nežinomas užduotis ir NPC
export function cleanQuestState(data) {
  const q = data.quests && typeof data.quests === 'object' ? data.quests : {};
  const active = {};
  for (const [id, v] of Object.entries(q.active ?? {})) {
    if (QUESTS[id]) active[id] = { progress: Number.isFinite(v?.progress) ? v.progress : 0 };
  }
  const done = Array.isArray(q.done) ? q.done.filter((id) => QUESTS[id]) : [];
  data.quests = { active, done: [...new Set(done)] };

  const friendship = {};
  for (const [id, v] of Object.entries(data.friendship ?? {})) {
    if (NPCS[id] && Number.isFinite(v)) friendship[id] = Math.max(0, v);
  }
  data.friendship = friendship;

  const giftsDay = {};
  for (const [id, v] of Object.entries(data.giftsDay ?? {})) {
    if (NPCS[id] && Number.isInteger(v)) giftsDay[id] = v;
  }
  data.giftsDay = giftsDay;
}
