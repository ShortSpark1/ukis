import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../EventBus.js';
import { getHotbarItems, getOwnedItems, getItemInfo, getCount, HOTBAR_SIZE } from '../logic/Inventory.js';
import { isUnlocked, seedsForSale, sellableItems, sellPriceOf, seedPriceOf } from '../logic/Economy.js';
import { questProgress, friendshipLevel, friendshipPoints, shopDiscount } from '../logic/Quests.js';
import { NPCS, QUESTS } from '../data/npcs.js';
import { showFeedbackPanel } from './widgets.js';
import { xpToNextLevel } from '../logic/Progression.js';
import { getSeason, getDayOfSeason, getYear, formatClock, getDarkness, SEASON_NAMES, SEASON_NAMES_SHORT } from '../logic/Time.js';
// Visa grafika – tik iš SpriteLibrary
import { ensurePanel, textStyle, makeMinimapTexture } from '../art/SpriteLibrary.js';
import { TILE } from '../logic/WorldMap.js';
import { VIEW_PX_W, VIEW_PX_H, SLOT, HOTBAR_Y, slotCenter } from './layout.js';

const STATS_X = 600;
const BAR_W = 200;
const T = CONFIG.TILE_SIZE;

// Minimapas: kiek pikselių vienam pasaulio langeliui
const MM_SCALE = 3;
// Minimapo spalvos pagal langelio tipą
const MM_COLORS = {
  [TILE.GRASS]: '#5a9c3a', [TILE.FLOWERS]: '#6aa845', [TILE.DIRT]: '#8a5a32',
  [TILE.WATER]: '#2f74c0', [TILE.PATH]: '#c9a874', [TILE.BRIDGE]: '#8a6038',
  [TILE.TREE]: '#24622a', [TILE.ROCK]: '#8e9196', [TILE.BUSH]: '#3b8a35', [TILE.SHOP]: '#d04a3a',
  [TILE.FENCE]: '#c99258', [TILE.HOUSE]: '#4e7a52', [TILE.COTTAGE]: '#7a5a8a',
};

// =====================================================================
//  UI SCENA
//  Piešiama virš žaidimo: inventoriaus juosta, kuprinė, statistika,
//  pagalba, laikrodis, žinutės, parduotuvės ir miego langai.
//  Ji tik RODO būseną ir praneša apie paspaudimus – pati taisyklių nekeičia.
// =====================================================================
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.state = this.registry.get('state');
    this.items = getHotbarItems(this.state);

    // Apatinės juostos medinis fonas
    this.add.image(0, VIEW_PX_H - 6, ensurePanel(this, 'wood', VIEW_PX_W, CONFIG.HUD_HEIGHT + 6)).setOrigin(0);

    this.createHotbar();
    this.createStats();
    this.createHelp();
    this.createToast();
    this.createMinimap();
    this.createClock();
    this.createTopButtons();
    this.updateUIRects();
    this.createInput();
    this.shopPanel = null;  // parduotuvės langas (sukuriamas atidarius)
    this.shopSellPage = 0;  // parduotuvės derliaus sąrašo puslapis
    this.bagPanel = null;   // kuprinės langas
    this.dialogPanel = null;  // pokalbio su kaimynu langas
    this.journalPanel = null; // užduočių žurnalas
    this.sleepPanel = null; // klausimas „Eiti miegoti?“

    // Klausomės žinučių iš GameScene
    EventBus.on(EVENTS.STATE_CHANGED, this.refresh, this);
    EventBus.on(EVENTS.STATE_CHANGED, this.drawMinimapPlots, this);
    EventBus.on(EVENTS.TOAST, this.showToast, this);
    EventBus.on(EVENTS.TOGGLE_SHOP, this.setShopOpen, this);
    EventBus.on(EVENTS.SLEEP_PROMPT, this.showSleepPrompt, this);
    EventBus.on(EVENTS.DIALOG_SHOW, this.showDialog, this);
    EventBus.on(EVENTS.DIALOG_CLOSE, this.hideDialog, this);
    // Uždarant sceną būtina atsijungti, kitaip liks „vaiduokliai“ klausytojai
    this.events.once('shutdown', () => {
      EventBus.off(EVENTS.STATE_CHANGED, this.refresh, this);
      EventBus.off(EVENTS.STATE_CHANGED, this.drawMinimapPlots, this);
      EventBus.off(EVENTS.TOAST, this.showToast, this);
      EventBus.off(EVENTS.TOGGLE_SHOP, this.setShopOpen, this);
      EventBus.off(EVENTS.SLEEP_PROMPT, this.showSleepPrompt, this);
      EventBus.off(EVENTS.DIALOG_SHOW, this.showDialog, this);
      EventBus.off(EVENTS.DIALOG_CLOSE, this.hideDialog, this);
    });

    this.refresh();
  }

  // ---------- Greitoji juosta ----------
  // HOTBAR_SIZE langelių su įrankiais ir turimomis sėklomis + paskutinis
  // langelis – kuprinė (visi daiktai). Juostos turinys keičiasi: nupirkus
  // naujų sėklų, jos atsiranda juostoje.
  createHotbar() {
    const slotTex = ensurePanel(this, 'slot', SLOT, SLOT);
    const selTex = ensurePanel(this, 'slot_sel', SLOT, SLOT);

    this.slots = Array.from({ length: HOTBAR_SIZE }, (_, i) => {
      const { x, y } = slotCenter(i);
      const bg = this.add.image(x, y, slotTex).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectSlot(i));
      bg.on('pointerover', () => this.items[i] && this.itemNameText.setText(this.itemLabel(this.items[i])));
      bg.on('pointerout', () => this.itemNameText.setText(this.itemLabel(this.state.selectedItem)));

      const icon = this.add.image(x, y - 1, 'icon_hoe').setVisible(false);
      this.add.text(x - SLOT / 2 + 6, y - SLOT / 2 + 3, String(i + 1), textStyle(11, '#e8d3a8'));
      const count = this.add.text(x + SLOT / 2 - 5, y + SLOT / 2 - 3, '', textStyle(15)).setOrigin(1, 1);
      return { bg, icon, count, slotTex, selTex };
    });

    // Kuprinės langelis
    const { x, y } = slotCenter(HOTBAR_SIZE);
    const bag = this.add.image(x, y, slotTex).setInteractive({ useHandCursor: true });
    bag.on('pointerdown', () => this.toggleBag());
    bag.on('pointerover', () => this.itemNameText.setText('Kuprinė – visi daiktai (I)'));
    bag.on('pointerout', () => this.itemNameText.setText(this.itemLabel(this.state.selectedItem)));
    this.add.image(x, y - 1, 'icon_bag');
    this.add.text(x - SLOT / 2 + 6, y - SLOT / 2 + 3, 'I', textStyle(11, '#e8d3a8'));

    this.itemNameText = this.add.text(16, HOTBAR_Y + SLOT + 4, '', textStyle(13, '#ffe7a3'));
  }

  itemLabel(itemId) {
    const info = getItemInfo(itemId);
    return info.kind === 'tool' ? info.name : `${info.name} ×${getCount(this.state, itemId)}`;
  }

  // ---------- Statistika (dešinėje) ----------
  createStats() {
    const x = STATS_X;
    const y = VIEW_PX_H + 8;
    this.add.image(x, y, ensurePanel(this, 'inset', VIEW_PX_W - x - 14, 84)).setOrigin(0);

    this.add.image(x + 22, y + 20, 'icon_coin');
    this.coinsText = this.add.text(x + 40, y + 20, '', textStyle(17, '#ffd54f')).setOrigin(0, 0.5);

    this.add.image(x + 170, y + 20, 'icon_star');
    this.levelText = this.add.text(x + 188, y + 20, '', textStyle(17)).setOrigin(0, 0.5);

    this.add.image(x + 14, y + 44, 'bar_bg').setOrigin(0, 0.5);
    this.xpBar = this.add.image(x + 14, y + 44, 'bar_fill').setOrigin(0, 0.5);
    this.xpText = this.add.text(x + 22 + BAR_W, y + 44, '', textStyle(12, '#d4ffb0')).setOrigin(0, 0.5);

    this.add.image(x + 22, y + 67, 'icon_gem');
    this.pointsText = this.add.text(x + 40, y + 67, '', textStyle(15, '#9ff3ff')).setOrigin(0, 0.5);
  }

  // ---------- Pagalba (viršutiniame kairiajame kampe, H – paslėpti) ----------
  createHelp() {
    const lines = [
      'Pelė: kairys – eiti ir naudoti, dešinys – tik eiti',
      'WASD / rodyklės – eiti     Tarpas – naudoti     1–7 – daiktai   I – kuprinė',
      'E – kalbėti / parduotuvė / miegoti   J – užduotys   K – išsaugoti',
      'N – naujas žaidimas   M – minimapas   H – slėpti šią pagalbą',
    ];
    this.help = this.add.container(10, 10).setDepth(50);
    this.help.add(this.add.image(0, 0, ensurePanel(this, 'toast', 470, 90)).setOrigin(0));
    lines.forEach((line, i) => {
      this.help.add(this.add.text(14, 10 + i * 18, line, textStyle(12, i === 0 ? '#ffe7a3' : '#fff4dc')));
    });
  }

  createInput() {
    // Skaičių klavišai 1..7 pasirenka juostos langelį
    this.input.keyboard.on('keydown', (event) => {
      if (this.isModalOpen()) return;
      const n = parseInt(event.key, 10);
      if (n >= 1 && n <= HOTBAR_SIZE) this.selectSlot(n - 1);
    });
    this.input.keyboard.on('keydown-ESC', () => {
      this.setShopOpen(false);
      this.setBagOpen(false);
      this.setJournalOpen(false);
      this.answerSleep(false);
      if (this.dialogPanel) this.time.delayedCall(0, () => EventBus.emit(EVENTS.DIALOG_CHOICE, 'close'));
    });
    this.input.keyboard.on('keydown-J', () => {
      if (this.shopPanel || this.sleepPanel || this.dialogPanel || this.bagPanel) return;
      this.setJournalOpen(!this.journalPanel);
    });
    this.input.keyboard.on('keydown-I', () => {
      if (this.shopPanel || this.sleepPanel || this.dialogPanel || this.journalPanel) return;
      this.toggleBag();
    });
    this.input.keyboard.on('keydown-H', () => this.help.setVisible(!this.help.visible));
    this.input.keyboard.on('keydown-M', () => this.setMinimapVisible(!this.minimap.visible));

    // Pelės ratukas – sukti per juostos daiktus
    this.input.on('wheel', (pointer, objects, dx, dy) => {
      if (this.isModalOpen() || this.items.length === 0) return;
      const dir = dy > 0 ? 1 : -1;
      const cur = Math.max(0, this.items.indexOf(this.state.selectedItem));
      this.selectSlot((cur + dir + this.items.length) % this.items.length);
    });
  }

  isModalOpen() {
    return !!(this.shopPanel || this.bagPanel || this.sleepPanel || this.dialogPanel || this.journalPanel || this.feedbackPanel);
  }

  // ---------- Pokalbis su kaimynu ----------
  // GameScene (DialogController) atsiunčia, ką rodyti; čia tik piešiame
  showDialog(view) {
    this.hideDialog();
    const W = 820;
    const H = 236;
    const x0 = (VIEW_PX_W - W) / 2;
    const y0 = VIEW_PX_H - H - 14;
    const root = this.add.container(0, 0).setDepth(240);
    this.dialogPanel = root;
    // Paspaudimai už lango neturi pasiekti žaidimo
    root.add(this.add.rectangle(0, 0, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 0x000000, 0.25).setOrigin(0).setInteractive());

    const c = this.add.container(x0, y0);
    root.add(c);
    c.add(this.add.image(0, 0, ensurePanel(this, 'wood', W, H)).setOrigin(0).setInteractive());

    // Portretas, vardas, širdelės
    c.add(this.add.image(20, 20, ensurePanel(this, 'inset', 120, 120)).setOrigin(0));
    c.add(this.add.image(80, 82, view.portrait, 'down_0').setScale(2.2));
    c.add(this.add.text(80, 160, view.name, textStyle(18, '#ffe7a3')).setOrigin(0.5));
    c.add(this.add.text(80, 182, view.title, textStyle(12, '#e8d3a8')).setOrigin(0.5));
    c.add(this.add.text(80, 206, this.heartsText(view.hearts, view.maxHearts), textStyle(16, '#ff6b81')).setOrigin(0.5));

    // Tekstas
    c.add(this.add.image(156, 20, ensurePanel(this, 'inset', 380, H - 40)).setOrigin(0));
    c.add(this.add.text(172, 34, view.text, textStyle(15, '#fff4dc', { wordWrap: { width: 350 }, lineSpacing: 4 })));

    // Atsakymai (dešinėje)
    this.dialogOptionsCount = view.options.length;
    view.options.forEach((label, i) => {
      const short = label.length > 30 ? `${label.slice(0, 29)}…` : label;
      this.makeButton(c, 552, 40 + i * 38, 250, 32, short, () => this.chooseDialogOption(i), true, i === view.options.length - 1 && view.options.length > 1 ? 'btn_red' : 'btn');
    });
  }

  heartsText(level, max) {
    return '♥'.repeat(level) + '♡'.repeat(Math.max(0, max - level));
  }

  // Atsakymą siunčiame kitame kadre (mygtuko nenaikiname jo paspaudimo metu)
  chooseDialogOption(index) {
    if (!this.dialogPanel || index < 0) return;
    this.time.delayedCall(0, () => EventBus.emit(EVENTS.DIALOG_CHOICE, index));
  }

  hideDialog() {
    if (this.dialogPanel) {
      this.dialogPanel.destroy();
      this.dialogPanel = null;
    }
  }

  // ---------- Užduočių žurnalas (J) ----------
  setJournalOpen(open) {
    if (open && !this.journalPanel) this.renderJournal();
    if (!open && this.journalPanel) {
      this.journalPanel.destroy();
      this.journalPanel = null;
    }
    EventBus.emit(EVENTS.JOURNAL_STATE, !!this.journalPanel);
  }

  renderJournal() {
    if (this.journalPanel) this.journalPanel.destroy();
    const W = 760;
    const H = 560;
    const root = this.add.container(0, 0).setDepth(230);
    this.journalPanel = root;
    const dim = this.add.rectangle(0, 0, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.time.delayedCall(0, () => this.setJournalOpen(false)));
    root.add(dim);
    const c = this.add.container((VIEW_PX_W - W) / 2, (VIEW_PX_H - H) / 2);
    root.add(c);
    c.add(this.add.image(0, 0, ensurePanel(this, 'wood', W, H)).setOrigin(0).setInteractive());
    c.add(this.add.text(W / 2, 26, 'UŽDUOČIŲ ŽURNALAS', textStyle(24, '#ffd54f')).setOrigin(0.5));
    this.makeButton(c, 18, 26, 36, 30, 'X', () => this.time.delayedCall(0, () => this.setJournalOpen(false)), true, 'btn_red');

    // --- Aktyvios užduotys ---
    c.add(this.add.image(16, 52, ensurePanel(this, 'inset', 460, 492)).setOrigin(0));
    const done = this.state.quests.done.length;
    c.add(this.add.text(32, 64, `Aktyvios užduotys (atlikta: ${done} iš ${Object.keys(QUESTS).length})`, textStyle(15, '#e8d3a8')));
    const active = Object.keys(this.state.quests.active);
    if (active.length === 0) {
      c.add(this.add.text(246, 280, 'Aktyvių užduočių nėra.\nPakalbink kaimynus – virš jų galvų „!“.', textStyle(14, '#cdb894', { align: 'center' })).setOrigin(0.5));
    }
    active.slice(0, 6).forEach((id, i) => {
      const q = QUESTS[id];
      const y = 98 + i * 74;
      const { current, needed } = questProgress(this.state, id);
      const ready = current >= needed;
      const turnIn = NPCS[q.turnIn ?? q.giver].name;
      c.add(this.add.text(32, y, q.title, textStyle(15, ready ? '#9cff7a' : '#fff4dc')));
      if (q.chain) c.add(this.add.text(460, y + 2, q.chain, textStyle(11, '#ffd54f')).setOrigin(1, 0));
      c.add(this.add.text(32, y + 22, q.summary, textStyle(12, '#e8d3a8', { wordWrap: { width: 420 } })));
      const status = ready ? `Atlikta! Atiduok: ${turnIn}` : `${current} / ${needed}   (atiduoti: ${turnIn})`;
      c.add(this.add.text(32, y + 42, status, textStyle(12, ready ? '#9cff7a' : '#cdb894')));
    });

    // --- Draugystė ---
    c.add(this.add.image(486, 52, ensurePanel(this, 'inset', 258, 492)).setOrigin(0));
    c.add(this.add.text(502, 64, 'Draugystė', textStyle(15, '#e8d3a8')));
    Object.entries(NPCS).forEach(([id, npc], i) => {
      const y = 104 + i * 92;
      c.add(this.add.image(522, y + 14, `npc_${id}`, 'down_0').setScale(0.9));
      c.add(this.add.text(552, y, npc.name, textStyle(15)));
      c.add(this.add.text(552, y + 20, npc.title, textStyle(11, '#cdb894')));
      const lvl = friendshipLevel(this.state, id);
      c.add(this.add.text(552, y + 36, this.heartsText(lvl, CONFIG.FRIENDSHIP.maxLevel), textStyle(16, '#ff6b81')));
      const pts = friendshipPoints(this.state, id) % CONFIG.FRIENDSHIP.pointsPerLevel;
      const note = lvl >= CONFIG.FRIENDSHIP.maxLevel ? 'didžiausia draugystė' : `iki kitos širdelės: ${CONFIG.FRIENDSHIP.pointsPerLevel - pts}`;
      c.add(this.add.text(552, y + 58, note, textStyle(11, '#cdb894')));
    });
    const disc = Math.round(shopDiscount(this.state) * 100);
    c.add(this.add.text(502, 500, `Onos nuolaida sėkloms: ${disc} %`, textStyle(13, '#ffd54f')));
    c.add(this.add.text(W - 20, H - 18, 'J / Esc – uždaryti', textStyle(12, '#e8d3a8')).setOrigin(1, 0.5));
  }

  selectSlot(index) {
    const itemId = this.items[index];
    if (!itemId) return;
    this.selectItem(itemId);
  }

  selectItem(itemId) {
    const changed = itemId !== this.state.selectedItem;
    this.state.selectedItem = itemId;
    this.refresh();
    const index = this.items.indexOf(itemId);
    if (changed && index >= 0) {
      // mažas „šoktelėjimas“ pasirinktai ikonai
      const icon = this.slots[index].icon;
      this.tweens.killTweensOf(icon);
      icon.setScale(1);
      this.tweens.add({ targets: icon, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    }
  }

  // ---------- Kuprinė (visi daiktai) ----------
  toggleBag() {
    this.setBagOpen(!this.bagPanel);
  }

  setBagOpen(open) {
    if (open && !this.bagPanel) this.renderBag();
    if (!open && this.bagPanel) {
      this.bagPanel.destroy();
      this.bagPanel = null;
    }
    EventBus.emit(EVENTS.BAG_STATE, !!this.bagPanel);
  }

  renderBag() {
    if (this.bagPanel) this.bagPanel.destroy();
    const items = getOwnedItems(this.state);
    const COLS = 8;
    const CELL = 72;
    const rows = Math.max(1, Math.ceil(items.length / COLS));
    const W = COLS * CELL + 40;
    const H = 120 + rows * CELL + 30;

    const root = this.add.container(0, 0).setDepth(220);
    this.bagPanel = root;
    const dim = this.add.rectangle(0, 0, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.time.delayedCall(0, () => this.setBagOpen(false)));
    root.add(dim);
    const c = this.add.container((VIEW_PX_W - W) / 2, Math.max(10, (VIEW_PX_H - H) / 2));
    root.add(c);
    c.add(this.add.image(0, 0, ensurePanel(this, 'wood', W, H)).setOrigin(0).setInteractive());
    c.add(this.add.text(W / 2, 26, 'KUPRINĖ', textStyle(24, '#ffd54f')).setOrigin(0.5));
    this.makeButton(c, 18, 26, 36, 30, 'X', () => this.time.delayedCall(0, () => this.setBagOpen(false)), true, 'btn_red');
    const info = this.add.text(W / 2, 62, 'Spausk ant daikto, kad jį pasirinktum', textStyle(13, '#e8d3a8')).setOrigin(0.5);
    c.add(info);

    const slotTex = ensurePanel(this, 'slot', SLOT, SLOT);
    const selTex = ensurePanel(this, 'slot_sel', SLOT, SLOT);
    items.forEach((itemId, i) => {
      const x = 20 + (i % COLS) * CELL + CELL / 2;
      const y = 92 + Math.floor(i / COLS) * CELL + CELL / 2;
      const it = getItemInfo(itemId);
      const bg = this.add.image(x, y, itemId === this.state.selectedItem ? selTex : slotTex).setInteractive({ useHandCursor: true });
      const count = getCount(this.state, itemId);
      c.add([bg, this.add.image(x, y - 1, `icon_${itemId}`)]);
      if (it.kind !== 'tool') c.add(this.add.text(x + SLOT / 2 - 5, y + SLOT / 2 - 3, String(count), textStyle(15)).setOrigin(1, 1));
      // Užvedus pelę – pavadinimas ir kaina
      const describe = () => {
        let text = this.itemLabel(itemId);
        if (it.kind === 'crop') text += ` – parduodama po ${sellPriceOf(itemId)} mon.`;
        if (it.kind === 'seed') {
          const crop = CONFIG.CROPS[it.cropId];
          text += ` – auga ${crop.growDays} d., ${crop.seasons.map((s) => SEASON_NAMES_SHORT[s]).join(', ')}`;
        }
        return text;
      };
      bg.on('pointerover', () => info.setText(describe()));
      bg.on('pointerdown', () => {
        if (it.kind === 'crop') {
          info.setText(`${describe()}. Derlių parduok parduotuvėje.`);
          return;
        }
        this.time.delayedCall(0, () => {
          this.selectItem(itemId);
          this.setBagOpen(false);
        });
      });
    });
    c.add(this.add.text(W - 20, H - 20, 'I / Esc – uždaryti', textStyle(12, '#e8d3a8')).setOrigin(1, 0.5));
  }

  // ---------- Minimapas ----------
  // Visas pasaulis sumažintas iki mažo paveikslėlio: 1 langelis = 3 px.
  // Ant jo piešiame laukelius, matomą ekrano plotą ir žaidėjo tašką.
  createMinimap() {
    const map = this.registry.get('map');
    const w = map[0].length * MM_SCALE;
    const h = map.length * MM_SCALE;

    // Pagrindas piešiamas vieną kartą (žemėlapis nesikeičia)
    makeMinimapTexture(this, 'minimap_base', map, MM_SCALE, MM_COLORS);

    const x0 = VIEW_PX_W - w - 16;
    const y0 = 16;
    this.minimap = this.add.container(x0, y0).setDepth(60);
    this.minimap.add(this.add.image(-6, -6, ensurePanel(this, 'wood', w + 12, h + 12)).setOrigin(0));
    const base = this.add.image(0, 0, 'minimap_base').setOrigin(0).setInteractive({ useHandCursor: true });
    // Paspaudus minimapą – personažas eina į tą vietą
    base.on('pointerdown', (pointer, localX, localY) => {
      EventBus.emit(EVENTS.MINIMAP_WALK, { x: Math.floor(localX / MM_SCALE), y: Math.floor(localY / MM_SCALE) });
    });
    this.mmPlots = this.add.graphics();
    this.mmView = this.add.graphics();
    this.mmPlayer = this.add.circle(0, 0, 3.5, 0xff3b30).setStrokeStyle(1.5, 0xffffff);
    this.minimap.add([base, this.mmPlots, this.mmView, this.mmPlayer]);
    this.minimap.add(this.add.text(w / 2, h + 3, 'Žemėlapis (M)', textStyle(11, '#e8d3a8')).setOrigin(0.5, 0));
    this.tweens.add({ targets: this.mmPlayer, scale: 1.35, duration: 500, yoyo: true, repeat: -1 });

    // Pranešame GameScene, kad šio ploto paspaudimai skirti UI, ne žaidimui
    this.minimapRect = { x: x0 - 6, y: y0 - 6, w: w + 12, h: h + 26 };
    this.drawMinimapPlots();
  }

  setMinimapVisible(visible) {
    this.minimap.setVisible(visible);
    this.updateUIRects();
  }

  // ---------- Mygtukai po pagalba: užduotys ir atsiliepimas ----------
  createTopButtons() {
    const y0 = 108;
    const c = this.add.container(10, y0).setDepth(55);
    this.makeButton(c, 0, 16, 136, 30, 'Užduotys (J)', () => {
      if (this.shopPanel || this.sleepPanel || this.dialogPanel || this.bagPanel) return;
      this.setJournalOpen(!this.journalPanel);
    });
    this.makeButton(c, 144, 16, 136, 30, 'Atsiliepimas', () => this.openFeedback());
    this.topButtonsRect = { x: 10, y: y0, w: 290, h: 32 };
    this.feedbackPanel = null;
  }

  openFeedback() {
    if (this.isModalOpen() || this.feedbackPanel) return;
    this.feedbackPanel = showFeedbackPanel(this, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 260, () => {
      this.feedbackPanel = null;
      EventBus.emit(EVENTS.FEEDBACK_STATE, false);
    });
    EventBus.emit(EVENTS.FEEDBACK_STATE, true);
  }

  // Pranešame GameScene, kurie ekrano plotai priklauso UI (ten paspaudus – personažas neina)
  updateUIRects() {
    const rects = [this.clockRect];
    if (this.topButtonsRect) rects.push(this.topButtonsRect);
    if (this.minimap.visible) rects.push(this.minimapRect);
    this.registry.set('uiRects', rects);
  }

  // ---------- Laikrodis, sezonas, oras ir energija (po minimapu) ----------
  createClock() {
    const w = 196;
    const h = 92;
    const x0 = VIEW_PX_W - w - 10;
    const y0 = this.minimapRect.y + this.minimapRect.h + 6;
    this.clock = this.add.container(x0, y0).setDepth(60);
    this.clock.add(this.add.image(0, 0, ensurePanel(this, 'wood', w, h)).setOrigin(0));

    this.seasonText = this.add.text(w / 2, 17, '', textStyle(14, '#ffe7a3')).setOrigin(0.5);
    this.weatherIcon = this.add.image(36, 45, 'icon_sun');
    this.clockText = this.add.text(w / 2 + 12, 45, '', textStyle(24)).setOrigin(0.5);
    this.clock.add([this.seasonText, this.weatherIcon, this.clockText]);

    // Energijos juosta: tamsus fonas + spalvotas užpildas (žalia → geltona → raudona)
    this.clock.add(this.add.image(22, 72, 'icon_energy'));
    this.energyBarW = w - 74;
    this.clock.add(this.add.rectangle(38, 72, this.energyBarW + 4, 14, 0x1e120a).setOrigin(0, 0.5).setStrokeStyle(1, 0x0e0804));
    this.energyBar = this.add.rectangle(40, 72, this.energyBarW, 10, 0x7cc35a).setOrigin(0, 0.5);
    this.energyText = this.add.text(w - 12, 72, '', textStyle(12)).setOrigin(1, 0.5);
    this.clock.add([this.energyBar, this.energyText]);

    this.clockRect = { x: x0, y: y0, w, h };
    this.updateClock();
  }

  updateClock() {
    const t = this.state.time;
    const season = getSeason(this.state);
    const year = getYear(t.day);
    const label = `${SEASON_NAMES[season]}, ${getDayOfSeason(t.day)} d.${year > 1 ? ` (${year} m.)` : ''}`;
    if (this.seasonText.text !== label) this.seasonText.setText(label);
    const clock = formatClock(t.minutes);
    if (this.clockText.text !== clock) this.clockText.setText(clock);

    // Naktį be lietaus – mėnulis, kitaip – oro ikona
    const { night } = getDarkness(t.minutes, t.weather);
    const icon = t.weather === 'rain' ? 'icon_rain' : t.weather === 'snow' ? 'icon_snow' : night > 0.4 ? 'icon_moon' : 'icon_sun';
    if (this.weatherIcon.texture.key !== icon) this.weatherIcon.setTexture(icon);

    const ratio = Math.max(0, Math.min(1, this.state.energy / CONFIG.ENERGY_MAX));
    this.energyBar.width = Math.max(0, this.energyBarW * ratio);
    this.energyBar.setFillStyle(ratio > 0.5 ? 0x7cc35a : ratio > 0.2 ? 0xf2c84b : 0xe0533c);
    const et = String(Math.round(this.state.energy));
    if (this.energyText.text !== et) this.energyText.setText(et);
  }

  // ---------- Miego klausimas ----------
  showSleepPrompt() {
    if (this.sleepPanel) return;
    const W = 440;
    const H = 180;
    const root = this.add.container(0, 0).setDepth(250);
    const dim = this.add.rectangle(0, 0, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive();
    root.add(dim);
    const c = this.add.container((VIEW_PX_W - W) / 2, (VIEW_PX_H - H) / 2);
    root.add(c);
    c.add(this.add.image(0, 0, ensurePanel(this, 'wood', W, H)).setOrigin(0).setInteractive());
    c.add(this.add.image(46, 48, 'icon_moon'));
    c.add(this.add.text(W / 2 + 14, 40, 'Eiti miegoti?', textStyle(22, '#ffe7a3')).setOrigin(0.5));
    c.add(this.add.text(W / 2 + 14, 76, 'Diena baigsis, o ryte energija bus pilna.', textStyle(14)).setOrigin(0.5));
    this.makeButton(c, 70, 128, 140, 40, 'Miegoti', () => this.answerSleepLater(true));
    this.makeButton(c, W - 210, 128, 140, 40, 'Dar ne', () => this.answerSleepLater(false), true, 'btn_red');
    this.sleepPanel = root;
  }

  // Kaip ir parduotuvėje – atsakome kitame kadre (mygtuko nenaikiname jo paspaudimo metu)
  answerSleepLater(yes) {
    this.time.delayedCall(0, () => this.answerSleep(yes));
  }

  answerSleep(yes) {
    if (!this.sleepPanel) return;
    this.sleepPanel.destroy();
    this.sleepPanel = null;
    EventBus.emit(EVENTS.SLEEP_ANSWER, yes);
  }

  // Laukeliai minimape: ruda – sukasta, žalia – auga, geltona – galima nuimti
  drawMinimapPlots() {
    if (!this.mmPlots) return;
    this.mmPlots.clear();
    for (const [key, plot] of Object.entries(this.state.plots)) {
      const [x, y] = key.split(',').map(Number);
      const ready = plot.crop && !plot.dead && plot.daysGrown >= CONFIG.CROPS[plot.crop].growDays;
      let color = 0x4a2c17;                // sukasta žemė
      if (plot.crop) color = plot.dead ? 0x8a6a3a : ready ? 0xffe066 : 0x7ed957;
      this.mmPlots.fillStyle(color);
      this.mmPlots.fillRect(x * MM_SCALE, y * MM_SCALE, MM_SCALE, MM_SCALE);
    }
  }

  // Kiekvieną kadrą: žaidėjo taškas ir kameros rėmelis
  update() {
    this.updateClock();
    const v = this.registry.get('view');
    if (!v || !this.minimap.visible) return;
    const k = MM_SCALE / T;
    this.mmPlayer.setPosition(v.px * k, v.py * k);
    this.mmView.clear();
    this.mmView.lineStyle(1, 0xffffff, 0.9);
    this.mmView.strokeRect(v.camX * k, v.camY * k, v.camW * k, v.camH * k);
  }

  // ---------- Žinutės ----------
  createToast() {
    this.toast = this.add.container(VIEW_PX_W / 2, VIEW_PX_H - 34).setDepth(100).setAlpha(0);
    this.toastBg = this.add.image(0, 0, ensurePanel(this, 'toast', 200, 38));
    // Ilgos žinutės laužomos į kelias eilutes
    this.toastText = this.add.text(0, 0, '', textStyle(15, '#fff4dc', { align: 'center', wordWrap: { width: 760 } })).setOrigin(0.5);
    this.toast.add([this.toastBg, this.toastText]);
  }

  showToast(text, color = '#fff4dc', duration = 2200) {
    this.toastText.setText(text).setColor(color);
    // fono plotis pagal teksto ilgį (apvaliname, kad nekurtume daug tekstūrų)
    const w = Math.ceil((this.toastText.width + 40) / 20) * 20;
    const h = Math.ceil((this.toastText.height + 18) / 10) * 10;
    this.toastBg.setTexture(ensurePanel(this, 'toast', w, h));
    this.tweens.killTweensOf(this.toast);
    const y = VIEW_PX_H - 16 - h / 2;
    this.toast.setAlpha(1).setY(y + 6);
    this.tweens.add({ targets: this.toast, y, duration: 150, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.toast, alpha: 0, delay: duration, duration: 400 });
  }

  // ---------- Parduotuvė ----------
  setShopOpen(open) {
    if (open && !this.shopPanel) this.renderShop();
    if (!open && this.shopPanel) {
      this.shopPanel.destroy();
      this.shopPanel = null;
    }
    EventBus.emit(EVENTS.SHOP_STATE, !!this.shopPanel);
  }

  // Mygtukas: piešinys + užrašas; užvedus pelę – šviesesnis
  makeButton(container, x, y, w, h, label, onClick, enabled = true, style = 'btn') {
    const base = this.add.image(x, y, ensurePanel(this, enabled ? style : 'btn_off', w, h)).setOrigin(0, 0.5);
    const hover = this.add.image(x, y, ensurePanel(this, 'btn_hover', w, h)).setOrigin(0, 0.5).setVisible(false);
    const text = this.add.text(x + w / 2, y, label, textStyle(13, enabled ? '#ffffff' : '#c9bcae')).setOrigin(0.5);
    container.add([base, hover, text]);
    if (enabled) {
      base.setInteractive({ useHandCursor: true });
      base.on('pointerover', () => hover.setVisible(style === 'btn'));
      base.on('pointerout', () => hover.setVisible(false));
      base.on('pointerdown', () => {
        text.setY(y + 1);
        onClick();
      });
    }
  }

  // delayedCall(0) – atliekame kitame kadre, nes langas po veiksmo
  // perpiešiamas, o mygtuko nesaugu naikinti jo paties paspaudimo metu.
  shopAction(action) {
    this.time.delayedCall(0, () => EventBus.emit(EVENTS.SHOP_ACTION, action));
  }

  closeShopLater() {
    this.time.delayedCall(0, () => this.setShopOpen(false));
  }

  // Parduotuvės langas perpiešiamas iš naujo kiekvieną kartą pasikeitus
  // būsenai – paprasčiausias būdas visada rodyti teisingus skaičius.
  // Kairėje – ŠIO SEZONO sėklos, dešinėje – turimas derlius (puslapiais).
  renderShop() {
    if (this.shopPanel) this.shopPanel.destroy();

    const W = 900;
    const H = 540;
    const root = this.add.container(0, 0).setDepth(200);
    this.shopPanel = root;

    // Pritamsintas fonas; paspaudus už lango – uždaroma
    const dim = this.add.rectangle(0, 0, VIEW_PX_W, VIEW_PX_H + CONFIG.HUD_HEIGHT, 0x000000, 0.45).setOrigin(0);
    dim.setInteractive();
    dim.on('pointerdown', () => this.closeShopLater());
    root.add(dim);

    const c = this.add.container((VIEW_PX_W - W) / 2, (VIEW_PX_H - H) / 2);
    root.add(c);
    const bg = this.add.image(0, 0, ensurePanel(this, 'wood', W, H)).setOrigin(0);
    bg.setInteractive(); // kad paspaudimai lange neuždarytų parduotuvės
    c.add(bg);

    c.add(this.add.text(W / 2, 26, 'PARDUOTUVĖ', textStyle(26, '#ffd54f')).setOrigin(0.5));
    c.add(this.add.image(W - 118, 26, 'icon_coin'));
    c.add(this.add.text(W - 100, 26, String(this.state.coins), textStyle(18, '#ffd54f')).setOrigin(0, 0.5));
    this.makeButton(c, 18, 26, 36, 30, 'X', () => this.closeShopLater(), true, 'btn_red');

    // --- Kairė: šio sezono sėklos ---
    const season = getSeason(this.state);
    c.add(this.add.image(16, 52, ensurePanel(this, 'inset', 430, 440)).setOrigin(0));
    c.add(this.add.text(32, 64, `Sėklos (${SEASON_NAMES[season].toLowerCase()})`, textStyle(15, '#e8d3a8')));
    const discount = Math.round(shopDiscount(this.state) * 100);
    if (discount > 0) c.add(this.add.text(436, 64, `Onos nuolaida −${discount} %`, textStyle(12, '#9cff7a')).setOrigin(1, 0));
    const forSale = seedsForSale(this.state);
    if (forSale.length === 0) {
      c.add(this.add.text(231, 270, 'Šiuo sezonu sėklų nėra', textStyle(14, '#cdb894')).setOrigin(0.5));
    }
    forSale.forEach((cropId, i) => {
      const y = 118 + i * 74;
      const crop = CONFIG.CROPS[cropId];
      const unlocked = isUnlocked(this.state, cropId);
      c.add(this.add.image(52, y, `icon_seed_${cropId}`).setScale(0.9).setAlpha(unlocked ? 1 : 0.4));
      c.add(this.add.text(82, y - 11, crop.name, textStyle(15)).setOrigin(0, 0.5));
      const regrow = crop.regrowDays ? `, vėl kas ${crop.regrowDays} d.` : '';
      const seasons = crop.seasons.map((s) => SEASON_NAMES_SHORT[s]).join(', ');
      c.add(this.add.text(82, y + 10, `${crop.growDays} d.${regrow} · ${seasons}`, textStyle(11, '#cdb894')).setOrigin(0, 0.5));
      c.add(this.add.image(278, y, 'icon_coin').setScale(0.75));
      const price = seedPriceOf(this.state, cropId);
      c.add(this.add.text(292, y, String(price), textStyle(15, price < crop.seedPrice ? '#9cff7a' : '#ffd54f')).setOrigin(0, 0.5));
      if (unlocked) {
        this.makeButton(c, 330, y, 50, 32, '+1',
          () => this.shopAction({ type: 'buy', cropId, amount: 1 }), this.state.coins >= price);
        this.makeButton(c, 386, y, 50, 32, '+5',
          () => this.shopAction({ type: 'buy', cropId, amount: 5 }), this.state.coins >= price * 5);
      } else {
        c.add(this.add.text(436, y, `Nuo ${crop.unlockLevel} lygio`, textStyle(13, '#ff9e8a')).setOrigin(1, 0.5));
      }
    });

    // --- Dešinė: turimas derlius (po 6 viename puslapyje) ---
    const PER_PAGE = 6;
    const sellable = sellableItems(this.state);
    const pages = Math.max(1, Math.ceil(sellable.length / PER_PAGE));
    this.shopSellPage = Math.min(this.shopSellPage, pages - 1);
    c.add(this.add.image(454, 52, ensurePanel(this, 'inset', 430, 440)).setOrigin(0));
    c.add(this.add.text(470, 64, 'Parduoti derlių', textStyle(15, '#e8d3a8')));
    if (sellable.length === 0) {
      c.add(this.add.text(669, 270, 'Neturi derliaus', textStyle(14, '#cdb894')).setOrigin(0.5));
    }
    sellable.slice(this.shopSellPage * PER_PAGE, (this.shopSellPage + 1) * PER_PAGE).forEach((itemId, i) => {
      const y = 116 + i * 60;
      const it = getItemInfo(itemId);
      const count = getCount(this.state, itemId);
      c.add(this.add.image(490, y, `icon_${itemId}`).setScale(0.9));
      c.add(this.add.text(520, y - 10, `${it.name} ×${count}`, textStyle(14, it.golden ? '#ffd54f' : '#fff4dc')).setOrigin(0, 0.5));
      c.add(this.add.text(520, y + 10, `${sellPriceOf(itemId)} mon./vnt.`, textStyle(12, '#ffd54f')).setOrigin(0, 0.5));
      this.makeButton(c, 762, y, 50, 32, '1', () => this.shopAction({ type: 'sell', itemId, amount: 1 }));
      this.makeButton(c, 818, y, 58, 32, 'Visus', () => this.shopAction({ type: 'sell', itemId, amount: count }));
    });
    if (pages > 1) {
      const y = 470;
      this.makeButton(c, 600, y, 40, 30, '<', () => this.changeSellPage(-1), this.shopSellPage > 0);
      c.add(this.add.text(669, y, `${this.shopSellPage + 1} / ${pages}`, textStyle(13)).setOrigin(0.5));
      this.makeButton(c, 698, y, 40, 30, '>', () => this.changeSellPage(1), this.shopSellPage < pages - 1);
    }

    // Apačia
    this.makeButton(c, 18, H - 26, 220, 34, 'Parduoti visą derlių', () => this.shopAction({ type: 'sellAll' }), sellable.length > 0);
    c.add(this.add.text(W - 20, H - 26, 'E / Esc – uždaryti', textStyle(13, '#e8d3a8')).setOrigin(1, 0.5));
  }

  changeSellPage(delta) {
    this.time.delayedCall(0, () => {
      this.shopSellPage += delta;
      this.renderShop();
    });
  }

  // ---------- Perpiešimas pagal būseną ----------
  refresh() {
    this.coinsText.setText(String(this.state.coins));

    const need = xpToNextLevel(this.state.level);
    this.levelText.setText(`Lygis ${this.state.level}`);
    this.xpText.setText(`${this.state.xp}/${need} XP`);
    // XP juosta: rodome tik dalį paveikslėlio (setCrop)
    this.xpBar.setCrop(0, 0, Math.max(2, BAR_W * (this.state.xp / need)), 14);
    this.pointsText.setText(`Taškai: ${this.state.points}`);

    // Juostos turinys gali pasikeisti (nupirktos naujos sėklos, išnaudotos senos)
    this.items = getHotbarItems(this.state);
    this.slots.forEach((slot, i) => {
      const itemId = this.items[i];
      slot.icon.setVisible(!!itemId);
      if (!itemId) {
        slot.count.setText('');
        slot.bg.setTexture(slot.slotTex);
        return;
      }
      const info = getItemInfo(itemId);
      const count = getCount(this.state, itemId);
      slot.icon.setTexture(`icon_${itemId}`);
      slot.count.setText(info.kind === 'tool' ? '' : String(count));
      slot.bg.setTexture(itemId === this.state.selectedItem ? slot.selTex : slot.slotTex);
    });
    this.itemNameText.setText(this.itemLabel(this.state.selectedItem));

    if (this.shopPanel) this.renderShop();
    if (this.bagPanel) this.renderBag();
    if (this.journalPanel) this.renderJournal();
  }
}
