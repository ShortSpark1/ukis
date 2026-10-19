import { NPCS, QUESTS } from '../data/npcs.js';
import { EventBus, EVENTS } from '../EventBus.js';
import { getItemInfo } from '../logic/Inventory.js';
import {
  greeting, friendshipLevel, friendshipPoints, availableQuestFor, readyQuestFor, questsToTurnIn,
  acceptQuest, completeQuest, giveGift, questProgress,
} from '../logic/Quests.js';
import { CONFIG } from '../config.js';

// =====================================================================
//  POKALBIŲ VALDIKLIS
//  Sprendžia, ką NPC sako ir kokius atsakymus siūlo. Langą piešia UIScene:
//    GameScene → UIScene:  EVENTS.DIALOG_SHOW  { name, title, hearts, portrait, text, options }
//    UIScene → GameScene:  EVENTS.DIALOG_CHOICE (pasirinkto atsakymo numeris)
//  Kiekvienas „ekranas“ – tekstas + atsakymų sąrašas; atsakymas turi
//  funkciją run(), kuri parodo kitą ekraną.
// =====================================================================
export class DialogController {
  // scene – GameScene (iš jos naudojame state, applyResult, toast)
  constructor(scene) {
    this.scene = scene;
    this.npcId = null;
    this.options = [];
    // 'close' – žaidėjas paspaudė Esc; kitaip – atsakymo numeris
    const onChoice = (index) => (index === 'close' ? this.open && this.close() : this.options[index]?.run());
    EventBus.on(EVENTS.DIALOG_CHOICE, onChoice);
    scene.events.once('shutdown', () => EventBus.off(EVENTS.DIALOG_CHOICE, onChoice));
  }

  get open() {
    return this.npcId !== null;
  }

  get state() {
    return this.scene.state;
  }

  start(npcId) {
    this.npcId = npcId;
    this.say([greeting(this.state, npcId)], () => this.menuOptions());
  }

  close() {
    this.npcId = null;
    this.options = [];
    EventBus.emit(EVENTS.DIALOG_CLOSE);
  }

  // Parodo vieną ar kelis teksto puslapius; po paskutinio – nextOptions()
  say(lines, nextOptions) {
    const [first, ...rest] = lines;
    const options = rest.length
      ? [{ label: 'Toliau', run: () => this.say(rest, nextOptions) }]
      : nextOptions();
    this.show(first, options);
  }

  show(text, options) {
    this.options = options;
    const npc = NPCS[this.npcId];
    const points = friendshipPoints(this.state, this.npcId);
    EventBus.emit(EVENTS.DIALOG_SHOW, {
      npcId: this.npcId,
      name: npc.name,
      title: npc.title,
      hearts: friendshipLevel(this.state, this.npcId),
      maxHearts: CONFIG.FRIENDSHIP.maxLevel,
      heartProgress: (points % CONFIG.FRIENDSHIP.pointsPerLevel) / CONFIG.FRIENDSHIP.pointsPerLevel,
      portrait: `npc_${this.npcId}`,
      text,
      options: options.map((o) => o.label),
    });
  }

  // Pagrindinis meniu: ką galima daryti su šiuo NPC dabar
  menuOptions() {
    const s = this.state;
    const id = this.npcId;
    const options = [];

    const ready = readyQuestFor(s, id);
    if (ready) options.push({ label: `Atiduoti: ${QUESTS[ready].title}`, run: () => this.complete(ready) });

    // Neįvykdytos užduotys, kurias reikės atiduoti šiam NPC
    for (const qid of questsToTurnIn(s, id)) {
      if (qid !== ready) options.push({ label: `Kaip sekasi: ${QUESTS[qid].title}?`, run: () => this.progress(qid) });
    }

    const available = availableQuestFor(s, id);
    if (available) options.push({ label: 'Ar turi man darbo?', run: () => this.offer(available) });

    const item = getItemInfo(s.selectedItem);
    if (item.kind === 'crop') {
      options.push({ label: `Dovanoti: ${item.name}`, run: () => this.gift(s.selectedItem) });
    } else {
      options.push({ label: 'Dovanoti…', run: () => this.say(['Pasirink derlių kuprinėje (I), tada galėsi jį padovanoti.'], () => this.menuOptions()) });
    }
    options.push({ label: 'Iki!', run: () => this.close() });
    return options;
  }

  backToMenu() {
    return [{ label: 'Toliau', run: () => this.show(greeting(this.state, this.npcId), this.menuOptions()) }];
  }

  offer(questId) {
    const q = QUESTS[questId];
    this.say(q.dialog.offer, () => [
      { label: 'Sutinku!', run: () => this.accept(questId) },
      { label: 'Ne dabar', run: () => this.show(greeting(this.state, this.npcId), this.menuOptions()) },
    ]);
  }

  accept(questId) {
    const q = QUESTS[questId];
    acceptQuest(this.state, questId);
    this.scene.toast(`Nauja užduotis: ${q.title}. Žurnalas – J.`, '#c8f7a8', 3000);
    this.scene.afterQuestChange();
    this.say([`Puiku! ${q.summary}`], () => this.backToMenu());
  }

  progress(questId) {
    const q = QUESTS[questId];
    const { current, needed } = questProgress(this.state, questId);
    // Užduotis iš kito NPC (pvz. Antanas siunčia pas Joną) – trumpas paaiškinimas
    const text = q.giver === this.npcId ? q.dialog.progress : `${NPCS[q.giver].name} prašė: ${q.summary}`;
    this.say([`${text} (${current}/${needed})`], () => this.backToMenu());
  }

  complete(questId) {
    const q = QUESTS[questId];
    const result = completeQuest(this.state, questId);
    this.scene.applyResult(result);
    this.scene.afterQuestChange();
    if (!result.ok) {
      this.say([result.message], () => this.backToMenu());
      return;
    }
    this.say(q.dialog.complete, () => this.backToMenu());
  }

  gift(itemId) {
    const result = giveGift(this.state, this.npcId, itemId);
    this.scene.applyResult(result);
    this.say([result.ok ? result.reaction : result.message], () => this.backToMenu());
  }
}
