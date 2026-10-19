import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { EventBus, EVENTS } from '../EventBus.js';
import {
  createWorldMap, getTile, isBlocked, isInside, isNearShop, plotAt, getPlotById, isNearPlotHouse,
  TILE, SHOP_POS, COTTAGES, PLOTS,
} from '../../shared/WorldMap.js';
import { createNewState } from '../logic/GameState.js';
import { getHotbarItems, getItemInfo, hasItem, HOTBAR_SIZE } from '../logic/Inventory.js';
import {
  till, plant, water, harvest, clearDead, getActionPreview,
  getPlot, plotKey, isWet, isReady, isDead, getStage,
} from '../logic/Farming.js';
import { buySeeds, sellCrop, sellAllCrops } from '../logic/Economy.js';
import { applyReward, cropsUnlockedAt } from '../logic/Progression.js';
import { saveGame, loadGame, deleteSave } from '../logic/SaveManager.js';
import { findPath, pathToTile, pathNextTo, isWithinReach } from '../logic/Pathfinding.js';
import { getSeason, getDayOfSeason, advanceClock, SEASON_NAMES, WEATHER_NAMES } from '../logic/Time.js';
import { endDay } from '../logic/DayCycle.js';
import { onHarvest } from '../logic/Quests.js';
import { hasEnergy, spendEnergy } from '../logic/Energy.js';
// Visa grafika – tik iš SpriteLibrary (žr. src/art/SpriteLibrary.js)
import { WATER_FRAMES, PLAYER_DIRS, WALK_FRAMES, PLAYER_FRAME, LAMP_LIGHT_Y, textStyle } from '../art/SpriteLibrary.js';
import { Environment } from './Environment.js';
import { ChunkRenderer, tileHash as hash } from './ChunkRenderer.js';
import { Ambience } from './Ambience.js';
import { NpcManager } from './NpcManager.js';
import { SKIP_TITLE_KEY } from './TitleScene.js';
import { DialogController } from './DialogController.js';
import { Sound } from '../audio/Sound.js';
import { VIEW_PX_W, VIEW_PX_H, WORLD_PX_W, WORLD_PX_H, slotCenter } from './layout.js';

const T = CONFIG.TILE_SIZE;
const SPEED = CONFIG.PLAYER_SPEED * T; // pikseliai per sekundę
const S = T / 32;                      // dizaino vienetas → pikseliai (pastatų piešiniams)

// Piešimo sluoksniai (kuo didesnis skaičius – tuo arčiau žiūrovo).
// Objektai (personažas, medžiai, augalai) rūšiuojami pagal Y: kas
// žemiau ekrane, tas piešiamas priekyje. Taip galima „užeiti už“ medžio.
const DEPTH = {
  GROUND: 0, EDGE: 1, DECOR: 2, SOIL: 3, MARKER: 4,
  OBJECTS: 10, FX: 5000, CREATURES: 5050, CLOUDS: 5100, NIGHT: 5150, LIGHTS: 5160, GLOW: 5165, WEATHER: 5170,
  VIGNETTE: 5200, CURSOR: 5300, TEXT: 5400,
};
const ySort = (y) => DEPTH.OBJECTS + y;

// Debesys juda plote aplink kamerą (didesniame už ekraną, kad persikėlimas nesimatytų)
const CLOUD_COUNT = 8;
const CLOUD_AREA_W = VIEW_PX_W + 900;
const CLOUD_AREA_H = VIEW_PX_H + 900;

const DIRECTIONS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const GOOD = '#fff4dc';
const BAD = '#ffb3a8';
const NEWS = '#fff59d';

// =====================================================================
//  ŽAIDIMO SCENA
//  Atsakinga už tai, ką matome žemėlapyje: langelius, personažą, augalus,
//  efektus, laiką. Taisyklių logika gyvena src/logic/ moduliuose – čia tik
//  iškviečiame jų funkcijas ir parodome rezultatą.
// =====================================================================
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Pasaulis generuojamas su fiksuotu seed'u – kiekvieną kartą toks pat
    this.map = createWorldMap();

    // Žaidimo būsena: įkeliame išsaugotą (jei reikia – migruojame) arba
    // pradedame naują. Registry – Phaser „bendra lentyna“, iš kurios
    // būseną ir žemėlapį pasiima UIScene.
    const { state: loaded, notice } = loadGame(this.map);
    this.state = loaded ?? createNewState();
    this.registry.set('state', this.state);
    this.registry.set('map', this.map);
    this.season = getSeason(this.state);
    // Žaidėjo ūkio sklypas (kol nėra serverio – CONFIG.DEFAULT_PLOT_ID)
    this.myPlot = getPlotById(this.state.plotId);

    this.createAnimations();
    this.createWorld();
    this.createPlayer();
    this.createInput();
    this.createEffects();
    this.setupCamera();
    // Iškart nupiešiame chunk'us aplink personažą
    this.chunks.update(this.player.x, this.player.y, true);

    // Diena / naktis, šviesos ir oras
    this.env = new Environment(this, { night: DEPTH.NIGHT, lights: DEPTH.LIGHTS, weather: DEPTH.WEATHER });
    for (const l of this.buildingLights) this.env.addLight(l.x, l.y, l.r);
    // Drugeliai, jonvabaliai, krentantys lapai
    this.ambience = new Ambience(this, { creatures: DEPTH.CREATURES, glow: DEPTH.GLOW });

    // Kaimynai (NPC) ir pokalbiai su jais
    this.npcs = new NpcManager(this, this.map, ySort, DEPTH.TEXT);
    this.npcs.placeAll(this.state.time.minutes);
    this.npcs.refreshBubbles(this.state);
    this.dialog = new DialogController(this);
    this.talkHint = this.add.text(0, 0, 'E – kalbėti', textStyle(13, NEWS)).setOrigin(0.5, 1).setDepth(DEPTH.TEXT).setVisible(false);

    // Taikiklis – rodo, kurį langelį paveiks veiksmas
    this.cursor = this.add.image(0, 0, 'cursor').setOrigin(0).setDepth(DEPTH.CURSOR);
    this.tweens.add({ targets: this.cursor, alpha: { from: 1, to: 0.55 }, duration: 700, yoyo: true, repeat: -1 });

    // Sukastų langelių piešiniai: raktas "x,y" → { soil, crop, badge }
    this.plotSprites = new Map();
    this.refreshAllPlots();

    // Kas sekundę atnaujiname laukelių vaizdą (pvz. jei pasikeitė iš kitur)
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.refreshAllPlots();
        this.npcs.refreshBubbles(this.state);
      },
    });

    // Paleidžiame UI sceną lygiagrečiai (ji piešiama virš žaidimo)
    this.scene.launch('UIScene');
    this.notifyChange();

    this.setupSaving();
    // UIScene pasileidžia kitame kadre, todėl žinutę rodome truputį vėliau
    this.time.delayedCall(250, () => {
      if (notice) this.toast(notice, NEWS, 7000); // migracijos pranešimas – ilgiau
      else if (loaded) this.toast('Žaidimas įkeltas. Sveikas sugrįžęs!', '#c8f7a8');
      else this.toast('Naujas žaidimas! Pasirink kaplį ir spausk ant rudos dirvos.', '#c8f7a8');
    });
  }

  // ---------- Kamera ----------
  setupCamera() {
    const cam = this.cameras.main;
    // Kamera rodo tik viršutinę ekrano dalį (apačioje – UI juosta)
    cam.setViewport(0, 0, VIEW_PX_W, VIEW_PX_H);
    // Ribos: kamera niekada nerodo nieko už pasaulio krašto
    cam.setBounds(0, 0, WORLD_PX_W, WORLD_PX_H);
    // Sekame personažą; 0.12 – „švelnumas“ (kamera truputį vėluoja, atrodo sklandžiau)
    cam.startFollow(this.player, true, 0.12, 0.12);

    // Informacija minimapui: personažo vieta ir matomas plotas.
    // Tą patį objektą atnaujiname kas kadrą, o UIScene jį skaito.
    this.viewInfo = { px: 0, py: 0, camX: 0, camY: 0, camW: VIEW_PX_W, camH: VIEW_PX_H };
    this.registry.set('view', this.viewInfo);
  }

  // Ekrano taškas (pelė) → pasaulio koordinatės
  pointerWorld(pointer) {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  // Ar pelė virš UI elemento (apatinė juosta, minimapas, laikrodis), kurio žaidimas neturi „gaudyti“?
  pointerOverUI(pointer) {
    if (pointer.y >= VIEW_PX_H) return true;
    const rects = this.registry.get('uiRects') ?? [];
    return rects.some((r) => pointer.x >= r.x && pointer.x < r.x + r.w && pointer.y >= r.y && pointer.y < r.y + r.h);
  }

  // ---------- Animacijos ----------
  createAnimations() {
    for (const dir of PLAYER_DIRS) {
      if (this.anims.exists(`walk_${dir}`)) continue;
      this.anims.create({
        key: `walk_${dir}`,
        frames: Array.from({ length: WALK_FRAMES }, (_, f) => ({ key: 'player', frame: `${dir}_${f}` })),
        frameRate: 9,
        repeat: -1,
      });
    }
    if (!this.anims.exists('water_anim')) {
      this.anims.create({
        key: 'water_anim',
        frames: Array.from({ length: WATER_FRAMES }, (_, f) => ({ key: 'water', frame: `w${f}` })),
        frameRate: 3,
        repeat: -1,
      });
    }
  }

  // ---------- Žemėlapis ----------
  // Pasaulis piešiamas chunk'ais (žr. ChunkRenderer.js): tik matoma dalis.
  // Čia – tai, kas reikalinga visam pasauliui: kliūčių grupė, šviesos
  // pastatų languose naktį ir užuominos prie parduotuvės bei namelio.
  createWorld() {
    this.blockers = this.physics.add.staticGroup();
    this.chunks = new ChunkRenderer(this, this.map, {
      depths: { ground: DEPTH.GROUND, edge: DEPTH.EDGE },
      ySort,
      blockers: this.blockers,
      season: this.season,
    });

    // Pastatų langų šviesos naktį. Piešinio aukštis reikalingas, kad
    // žinotume, kur ant jo yra langai (dizaino vienetais).
    this.buildingLights = [];
    const addLights = (key, tileX, tileY, spots) => {
      const bottom = (tileY + 2) * T;
      const top = bottom - this.textures.getFrame(key).height;
      for (const [dx, dy, r] of spots) this.buildingLights.push({ x: tileX * T + dx * S, y: top + dy * S, r });
    };
    this.shopPos = SHOP_POS;
    addLights('shop', SHOP_POS.x, SHOP_POS.y, [[15.6, 59, 95], [49.6, 59, 95], [32, 70, 80]]);
    for (const plot of PLOTS) addLights('house', plot.house.x, plot.house.y, [[16.5, 62, 100], [48.5, 62, 100], [32, 34, 70]]);
    for (const c of COTTAGES) addLights(`cottage_${c.npcId}`, c.x, c.y, [[16.5, 62, 90], [48.5, 62, 90]]);
    // Gatvės žibintai
    const lampTop = T - 2 - this.textures.getFrame('lamp').height + LAMP_LIGHT_Y * S;
    this.map.forEach((row, y) => row.forEach((tile, x) => {
      if (tile === TILE.LAMP) this.buildingLights.push({ x: x * T + T / 2, y: y * T + lampTop, r: 120 });
    }));

    const sx = SHOP_POS.x * T;
    const sy = (SHOP_POS.y + 2) * T;
    this.shopHint = this.add
      .text(sx + T, sy + 6, 'Spausk ant namo arba E', textStyle(13, NEWS))
      .setOrigin(0.5, 0).setDepth(DEPTH.TEXT).setVisible(false);
    const hx = this.myPlot.house.x * T;
    const hy = (this.myPlot.house.y + 2) * T;
    this.houseHint = this.add
      .text(hx + T, hy + 6, 'Tavo namelis: spausk ant jo arba E – miegoti', textStyle(13, NEWS))
      .setOrigin(0.5, 0).setDepth(DEPTH.TEXT).setVisible(false);
    // Užrašas virš savo sklypo vartų
    const gate = this.myPlot.gate;
    this.add.text(gate.x * T + T / 2, gate.y * T - 4, 'Tavo ūkis', textStyle(14, '#ffe7a3'))
      .setOrigin(0.5, 1).setDepth(DEPTH.TEXT - 1);

    // Fizikos pasaulio ribos = viso pasaulio dydis (už krašto išeiti negalima)
    this.physics.world.setBounds(0, 0, WORLD_PX_W, WORLD_PX_H);
  }

  // Pasikeitus sezonui – nauja žemė ir medžių / krūmų piešiniai
  applySeasonVisuals(season) {
    this.season = season;
    this.chunks.setSeason(season);
  }

  // ---------- Personažas ----------
  createPlayer() {
    // Išsaugota vieta laikoma langelių vienetais, kad nepriklausytų nuo langelio dydžio
    const pos = this.state.player
      ? { x: this.state.player.x * T, y: this.state.player.y * T }
      : this.tileToPlayerPos(this.myPlot.door); // naujas žaidimas – prie savo namelio

    this.playerShadow = this.add.image(pos.x, pos.y, 'shadow');
    this.player = this.physics.add.sprite(pos.x, pos.y, 'player', 'down_0');
    this.player.setOrigin(0.5, 0.9); // „inkaras“ prie kojų
    this.player.setCollideWorldBounds(true);
    // Fizinis kūnas – tik pėdų plotas, kad būtų galima priartėti prie objektų
    this.player.body.setSize(20, 14).setOffset((PLAYER_FRAME.w - 20) / 2, PLAYER_FRAME.h - 18);
    this.facing = 'down';

    this.physics.add.collider(this.player, this.blockers);

    // Kelias, kuriuo einame paspaudus pele (langelių sąrašas)
    this.path = null;
    this.pendingAction = null;
  }

  tileToPlayerPos(tile) {
    return { x: tile.x * T + T / 2, y: tile.y * T + T / 2 + 6 };
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Tarpas – panaudoti daiktą ant langelio priešais; E – parduotuvė / miegas
    this.input.keyboard.on('keydown-SPACE', () => this.useSelectedItem());
    this.input.keyboard.on('keydown-E', () => this.interact());

    // Pelė: kairys mygtukas – eiti ir naudoti, dešinys – tik eiti
    this.input.mouse?.disableContextMenu();
    this.usingMouse = false;
    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', () => { this.usingMouse = true; });

    // UIScene praneša, ar atidaryta parduotuvė / miego langas, ir kokį mygtuką paspaudė
    this.shopOpen = false;
    this.bagOpen = false;
    this.journalOpen = false;
    this.feedbackOpen = false;
    this.sleepPromptOpen = false;
    this.sleeping = false;
    const onShopState = (open) => {
      // Įsimename uždarymo laiką: tas pats paspaudimas neturi pasiųsti personažo eiti
      if (this.shopOpen && !open) this.uiClosedAt = this.time.now;
      this.shopOpen = open;
    };
    const onShopAction = (action) => this.handleShopAction(action);
    const onBagState = (open) => {
      if (this.bagOpen && !open) this.uiClosedAt = this.time.now;
      this.bagOpen = open;
    };
    const onSleepAnswer = (yes) => {
      this.sleepPromptOpen = false;
      this.uiClosedAt = this.time.now;
      if (yes) this.goToSleep(false);
    };
    // Paspaudimas minimape – nueiti į tą vietą
    const onMinimapWalk = (tile) => {
      if (this.isBlockedByUI()) return;
      this.usingMouse = true;
      this.walk(pathToTile(this.map, this.getPlayerTile(), tile), null, tile);
    };
    EventBus.on(EVENTS.SHOP_STATE, onShopState);
    EventBus.on(EVENTS.SHOP_ACTION, onShopAction);
    EventBus.on(EVENTS.BAG_STATE, onBagState);
    const onJournalState = (open) => {
      if (this.journalOpen && !open) this.uiClosedAt = this.time.now;
      this.journalOpen = open;
    };
    const onDialogClose = () => { this.uiClosedAt = this.time.now; };
    EventBus.on(EVENTS.JOURNAL_STATE, onJournalState);
    const onFeedbackState = (open) => {
      if (this.feedbackOpen && !open) this.uiClosedAt = this.time.now;
      this.feedbackOpen = open;
    };
    EventBus.on(EVENTS.FEEDBACK_STATE, onFeedbackState);
    EventBus.on(EVENTS.DIALOG_CLOSE, onDialogClose);
    EventBus.on(EVENTS.SLEEP_ANSWER, onSleepAnswer);
    EventBus.on(EVENTS.MINIMAP_WALK, onMinimapWalk);
    this.events.once('shutdown', () => {
      EventBus.off(EVENTS.SHOP_STATE, onShopState);
      EventBus.off(EVENTS.SHOP_ACTION, onShopAction);
      EventBus.off(EVENTS.BAG_STATE, onBagState);
      EventBus.off(EVENTS.JOURNAL_STATE, onJournalState);
      EventBus.off(EVENTS.FEEDBACK_STATE, onFeedbackState);
      EventBus.off(EVENTS.DIALOG_CLOSE, onDialogClose);
      EventBus.off(EVENTS.SLEEP_ANSWER, onSleepAnswer);
      EventBus.off(EVENTS.MINIMAP_WALK, onMinimapWalk);
    });
  }

  // Ar atidarytas koks nors langas (tada personažas stovi, laikas sustoja)
  isBlockedByUI() {
    return this.shopOpen || this.bagOpen || this.journalOpen || this.feedbackOpen || this.dialog?.open
      || this.sleepPromptOpen || this.sleeping;
  }

  // ---------- Efektai ----------
  createEffects() {
    const base = { emitting: false, alpha: { start: 1, end: 0 } };
    this.fx = {
      dirt: this.add.particles(0, 0, 'p_dirt', {
        ...base, lifespan: 600, speed: { min: 60, max: 150 }, angle: { min: 200, max: 340 },
        gravityY: 500, scale: { start: 1.3, end: 0.5 },
      }),
      water: this.add.particles(0, 0, 'p_water', {
        ...base, lifespan: 550, speed: { min: 40, max: 110 }, angle: { min: 230, max: 310 },
        gravityY: 600, scale: { start: 1.2, end: 0.6 },
      }),
      leaf: this.add.particles(0, 0, 'p_leaf', {
        ...base, lifespan: 900, speed: { min: 60, max: 160 }, angle: { min: 200, max: 340 },
        gravityY: 300, rotate: { min: 0, max: 360 },
      }),
      spark: this.add.particles(0, 0, 'p_spark', {
        ...base, lifespan: 800, speed: { min: 30, max: 110 }, scale: { start: 1.4, end: 0 }, blendMode: 'ADD',
      }),
    };
    Object.values(this.fx).forEach((e) => e.setDepth(DEPTH.FX));

    // Lėtai slenkantys debesų šešėliai. Pasaulis didelis, todėl debesų
    // nedaug – jie „keliauja“ kartu su kamera (žr. moveClouds).
    this.clouds = Array.from({ length: CLOUD_COUNT }, () =>
      this.add.image(
        this.player.x + Phaser.Math.Between(-CLOUD_AREA_W / 2, CLOUD_AREA_W / 2),
        this.player.y + Phaser.Math.Between(-CLOUD_AREA_H / 2, CLOUD_AREA_H / 2),
        'cloud',
      ).setAlpha(0.14).setScale(1.5).setDepth(DEPTH.CLOUDS),
    );

    // Vinjetė – tamsesni ekrano kraštai. setScrollFactor(0): „priklijuota“
    // prie ekrano, nejuda kartu su pasauliu.
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.VIGNETTE);
  }

  burst(kind, x, y, count) {
    this.fx[kind].explode(count, x * T + T / 2, y * T + T / 2);
  }

  // Trumpai parodo įrankio ikoną, „mostelėjančią“ virš langelio
  swingTool(itemId, x, y) {
    const icon = this.add.image(x * T + T / 2, y * T + T / 2 - 6, `icon_${itemId}`)
      .setDepth(DEPTH.FX).setAngle(-45).setScale(0.9);
    this.tweens.add({
      targets: icon, angle: 25, y: icon.y + 6, duration: 220, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: icon, alpha: 0, duration: 150, onComplete: () => icon.destroy() }),
    });
  }

  // Nuimtas derlius „nuskrenda“ į inventorių (juostos langelį arba kuprinę)
  flyToInventory(itemId, x, y) {
    const index = getHotbarItems(this.state).indexOf(itemId);
    const slot = index >= 0 ? index : HOTBAR_SIZE; // HOTBAR_SIZE – kuprinės langelis
    // Langelis yra EKRANE, o ikona – PASAULYJE: perskaičiuojame per kameros poslinkį
    const screen = slotCenter(slot);
    const cam = this.cameras.main;
    const target = { x: screen.x + cam.scrollX, y: screen.y + cam.scrollY };
    const icon = this.add.image(x * T + T / 2, y * T + T / 2, `icon_${itemId}`).setDepth(DEPTH.TEXT);
    this.tweens.add({ targets: icon, y: icon.y - 30, duration: 250, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: icon, x: target.x, y: target.y, scale: 0.7, delay: 250, duration: 550, ease: 'Cubic.easeIn',
      onComplete: () => icon.destroy(),
    });
  }

  // ---------- Kiekvienas kadras ----------
  update(time, delta) {
    // Chunk'ai aplink kamerą (sukuriami / ištrinami pagal poreikį)
    const view = this.cameras.main.worldView;
    if (view.width > 0) this.chunks.update(view.centerX, view.centerY);
    this.moveClouds(delta);

    // Laikas eina tik tada, kai neatidarytas joks langas
    if (!this.isBlockedByUI()) {
      const dayOver = advanceClock(this.state, delta);
      if (dayOver) this.faint();
      // Kaimynai vaikšto pagal tvarkaraštį (kol atidarytas langas – stovi)
      this.npcs.update(delta, this.state.time.minutes);
    }
    this.env.update(this.state.time.minutes, this.state.time.weather, this.player);
    this.ambience.update(delta, { ...this.state.time, season: this.season });

    if (this.isBlockedByUI()) {
      this.player.setVelocity(0, 0);
      this.updatePlayerVisuals();
      this.cursor.setVisible(false);
      this.shopHint?.setVisible(false);
      this.houseHint.setVisible(false);
      this.talkHint.setVisible(false);
      return;
    }

    const kx = (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0) - (this.cursors.left.isDown || this.wasd.A.isDown ? 1 : 0);
    const ky = (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0) - (this.cursors.up.isDown || this.wasd.W.isDown ? 1 : 0);

    if (kx || ky) {
      // Klaviatūra visada turi pirmenybę prieš pelės kelią
      this.usingMouse = false;
      this.stopWalking();
      const v = new Phaser.Math.Vector2(kx, ky).normalize().scale(SPEED);
      this.player.setVelocity(v.x, v.y);
      this.setFacingFromVector(kx, ky);
    } else if (this.path) {
      this.followPath(delta);
    } else {
      this.player.setVelocity(0, 0);
    }

    this.updatePlayerVisuals();
    this.updateCursor();
    this.updateViewInfo();

    const p = this.getPlayerTile();
    this.shopHint?.setVisible(isNearShop(this.map, p.x, p.y));
    this.houseHint.setVisible(isNearPlotHouse(this.myPlot, p.x, p.y));
    // Šalia kaimyno – užuomina „E – kalbėti“ virš jo galvos
    const npc = this.npcs.nearest(this.player.x, this.player.y);
    this.talkHint.setVisible(!!npc);
    if (npc) this.talkHint.setPosition(npc.sprite.x, npc.sprite.y - 72);
  }

  updateViewInfo() {
    const v = this.cameras.main.worldView;
    Object.assign(this.viewInfo, {
      px: this.player.x, py: this.player.y, camX: v.x, camY: v.y, camW: v.width, camH: v.height,
    });
  }

  // Debesys juda į rytus. Išplaukęs už ploto aplink kamerą debesis
  // perkeliamas į kitą pusę – taip keli debesys dengia visą pasaulį.
  moveClouds(delta) {
    const cam = this.cameras.main;
    const left = cam.scrollX + VIEW_PX_W / 2 - CLOUD_AREA_W / 2;
    const top = cam.scrollY + VIEW_PX_H / 2 - CLOUD_AREA_H / 2;
    for (const c of this.clouds) {
      c.x += delta * 0.012;
      if (c.x < left) c.x += CLOUD_AREA_W;
      else if (c.x > left + CLOUD_AREA_W) c.x -= CLOUD_AREA_W;
      if (c.y < top) c.y += CLOUD_AREA_H;
      else if (c.y > top + CLOUD_AREA_H) c.y -= CLOUD_AREA_H;
    }
  }

  setFacingFromVector(vx, vy) {
    if (Math.abs(vx) >= Math.abs(vy) && vx !== 0) this.facing = vx > 0 ? 'right' : 'left';
    else if (vy !== 0) this.facing = vy > 0 ? 'down' : 'up';
  }

  updatePlayerVisuals() {
    const v = this.player.body.velocity;
    const moving = Math.abs(v.x) + Math.abs(v.y) > 5;
    if (moving) {
      this.player.anims.play(`walk_${this.facing}`, true);
      const t = this.getPlayerTile();
      const ground = getTile(this.map, t.x, t.y);
      Sound.step(this.time.now, ground === TILE.PATH || ground === TILE.PLAZA || ground === TILE.BRIDGE);
    } else {
      this.player.anims.stop();
      this.player.setFrame(`${this.facing}_0`);
    }
    this.player.setDepth(ySort(this.player.body.bottom));
    this.playerShadow.setPosition(this.player.x, this.player.y - 3).setDepth(this.player.depth - 0.5);
  }

  // Langelis, ant kurio stovi personažas (pagal pėdų vietą)
  getPlayerTile() {
    const c = this.player.body.center;
    return { x: Math.floor(c.x / T), y: Math.floor(c.y / T) };
  }

  // Langelis priešais personažą – čia veikia klaviatūros veiksmai
  getTargetTile() {
    const p = this.getPlayerTile();
    const d = DIRECTIONS[this.facing];
    return { x: p.x + d.dx, y: p.y + d.dy };
  }

  faceToward(target) {
    const me = this.getPlayerTile();
    this.setFacingFromVector(target.x - me.x, target.y - me.y);
    this.player.setFrame(`${this.facing}_0`);
  }

  selectedItemId() {
    return this.state.selectedItem;
  }

  previewAt(x, y) {
    return getActionPreview(this.state, this.map, x, y, this.selectedItemId());
  }

  // Taikiklis: pelės langelis (jei naudojama pelė) arba langelis priešais
  updateCursor() {
    const ptr = this.input.activePointer;
    const overMap = ptr.x >= 0 && ptr.x < VIEW_PX_W && ptr.y >= 0 && !this.pointerOverUI(ptr);
    let t;
    if (this.usingMouse && overMap) {
      const w = this.pointerWorld(ptr);
      t = { x: Math.floor(w.x / T), y: Math.floor(w.y / T) };
    } else {
      t = this.getTargetTile();
    }

    if (!isInside(this.map, t.x, t.y)) {
      this.cursor.setVisible(false);
      return;
    }
    const type = getTile(this.map, t.x, t.y);
    let tint = 0xffffff;
    if (type === TILE.SHOP || this.isMyHouseTile(t.x, t.y)) tint = 0xffe066; // parduotuvė, savo namelis
    else if (this.previewAt(t.x, t.y)) tint = 0x9cff7a;            // galima atlikti veiksmą
    else if (isBlocked(type)) tint = 0xff8a80;                     // nepraeinama
    this.cursor.setVisible(true).setPosition(t.x * T, t.y * T).setTint(tint);
  }

  // ---------- Valdymas pele ----------
  onPointerDown(pointer) {
    if (this.isBlockedByUI() || this.pointerOverUI(pointer)) return; // UI juosta ar minimapas
    if (this.time.now - (this.uiClosedAt ?? -Infinity) < 150) return;
    this.usingMouse = true;

    const world = this.pointerWorld(pointer); // atsižvelgia į kameros poslinkį
    const target = { x: Math.floor(world.x / T), y: Math.floor(world.y / T) };
    if (!isInside(this.map, target.x, target.y)) return;

    const me = this.getPlayerTile();
    const moveOnly = pointer.rightButtonDown();
    const type = getTile(this.map, target.x, target.y);

    // Paspaudė ant kaimyno – prieiname ir pakalbiname
    const clickedNpc = moveOnly ? null : this.npcs.npcAt(world.x, world.y);
    if (clickedNpc) {
      if (this.npcs.nearest(this.player.x, this.player.y) === clickedNpc) {
        this.stopWalking();
        this.talkTo(clickedNpc);
      } else {
        const npcTile = this.npcs.tileOf(clickedNpc);
        this.walk(pathNextTo(this.map, me, npcTile), { type: 'talk', npcId: clickedNpc.id }, npcTile);
      }
      return;
    }

    // Paspaudė ant parduotuvės – nueiname ir atidarome
    if (!moveOnly && type === TILE.SHOP) {
      if (isNearShop(this.map, me.x, me.y)) {
        this.stopWalking();
        this.openShop();
      } else {
        this.walk(findPath(this.map, me, (x, y) => isNearShop(this.map, x, y)), { type: 'shop' }, target);
      }
      return;
    }
    // Paspaudė ant savo namelio – nueiname prie durų ir siūlome miegoti
    if (!moveOnly && type === TILE.HOUSE) {
      if (!this.isMyHouseTile(target.x, target.y)) {
        this.toast(`Tai ${plotAt(target.x, target.y)?.id ?? ''} sklypo namelis. Tavo – sklype ${this.myPlot.id}.`, BAD);
      } else if (isNearPlotHouse(this.myPlot, me.x, me.y)) {
        this.stopWalking();
        this.askToSleep();
      } else {
        this.walk(pathToTile(this.map, me, this.myPlot.door), { type: 'sleep' }, target);
      }
      return;
    }

    // Ar su pasirinktu daiktu čia galima ką nors padaryti?
    const action = moveOnly ? null : this.previewAt(target.x, target.y);
    if (action) {
      if (isWithinReach(me, target)) {
        this.stopWalking();
        this.faceToward(target);
        this.useItemAt(target.x, target.y);
      } else {
        this.walk(pathNextTo(this.map, me, target), { type: 'use', ...target }, target);
      }
    } else {
      this.walk(pathToTile(this.map, me, target), null, target);
    }
  }

  // Pradeda eiti nurodytu keliu; pending – ką padaryti atėjus
  walk(path, pending, clickedTile) {
    if (path === null) {
      this.toast('Ten nueiti negalima.', BAD);
      return;
    }
    // Jei stovime ne langelio centre – pirma pasitaisome, kad nekliūtume už kampų
    const me = this.getPlayerTile();
    const c = this.player.body.center;
    if (Math.hypot(c.x - (me.x * T + T / 2), c.y - (me.y * T + T / 2)) > 6) path.unshift(me);

    this.path = path;
    this.pendingAction = pending;
    this.lastDist = Infinity;
    this.stuckTime = 0;
    this.showClickMarker(clickedTile);
    if (path.length === 0) this.arrive();
  }

  stopWalking() {
    this.path = null;
    this.pendingAction = null;
  }

  followPath(delta) {
    const next = this.path[0];
    const tx = next.x * T + T / 2;
    const ty = next.y * T + T / 2;
    const c = this.player.body.center;
    const dx = tx - c.x;
    const dy = ty - c.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      this.path.shift();
      this.lastDist = Infinity;
      if (this.path.length === 0) this.arrive();
      return;
    }

    // Jei ilgiau nei pusę sekundės nepriartėjame – kažkas trukdo, sustojame
    this.stuckTime = dist >= this.lastDist - 0.05 ? this.stuckTime + delta : 0;
    this.lastDist = dist;
    if (this.stuckTime > 500) {
      this.stopWalking();
      this.player.setVelocity(0, 0);
      return;
    }

    this.player.setVelocity((dx / dist) * SPEED, (dy / dist) * SPEED);
    this.setFacingFromVector(dx, dy);
  }

  // Atėjome į kelio galą – atliekame suplanuotą veiksmą
  arrive() {
    this.path = null;
    this.player.setVelocity(0, 0);
    const action = this.pendingAction;
    this.pendingAction = null;
    if (!action) return;

    if (action.type === 'use') {
      this.faceToward(action);
      this.useItemAt(action.x, action.y);
    } else if (action.type === 'shop') {
      this.faceToward({ x: this.shopPos.x, y: this.shopPos.y + 1 });
      this.openShop();
    } else if (action.type === 'talk') {
      // NPC galėjo nueiti – tikriname, ar jis vis dar šalia
      const npc = this.npcs.get(action.npcId);
      if (npc && !npc.hidden && this.npcs.nearest(this.player.x, this.player.y) === npc) this.talkTo(npc);
      else this.toast('Kaimynas jau nuėjo. Pabandyk dar kartą.', BAD);
    } else if (action.type === 'sleep') {
      this.faceToward({ x: this.myPlot.door.x, y: this.myPlot.house.y });
      this.askToSleep();
    }
  }

  showClickMarker(tile) {
    const ring = this.add.image(tile.x * T + T / 2, tile.y * T + T * 0.62, 'click_ring')
      .setDepth(DEPTH.MARKER).setScale(0.5);
    this.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
  }

  // ---------- Ūkininkavimas ----------

  // Klaviatūra (tarpas): veiksmas ant langelio priešais
  useSelectedItem() {
    const t = this.getTargetTile();
    this.useItemAt(t.x, t.y);
  }

  // Panaudoja pasirinktą daiktą ant langelio (x, y)
  useItemAt(x, y) {
    if (this.isBlockedByUI()) return;
    const plot = getPlot(this.state, x, y);
    const itemId = this.selectedItemId();
    const info = getItemInfo(itemId);

    // 1) Nusprendžiame, koks tai veiksmas
    let kind = null;
    let result = null;
    if (plot && isReady(plot)) kind = 'harvest'; // subrendusį – nuimame bet kuo
    else if (!hasItem(this.state, itemId)) result = { ok: false, message: `Neturi: ${info.name}.` };
    else if (itemId === 'hoe') kind = plot && isDead(plot) ? 'clear' : 'till';
    else if (itemId === 'watering_can') kind = 'water';
    else if (info.kind === 'seed') kind = 'plant';
    else result = { ok: false, message: 'Derlių parduok parduotuvėje.' };

    // 2) Ar užtenka energijos?
    if (kind && !hasEnergy(this.state, kind)) {
      result = { ok: false, message: 'Per daug pavargai. Eik miegoti į namelį!' };
      kind = null;
    }

    // 3) Atliekame veiksmą
    if (kind === 'harvest') {
      result = harvest(this.state, x, y);
      if (result.ok) {
        this.flyToInventory(result.itemId, x, y);
        if (result.golden) this.celebrateGolden(x, y);
        onHarvest(this.state, getItemInfo(result.itemId).cropId); // „nuimk N derlių“ užduotims
        this.npcs.refreshBubbles(this.state);
      }
    } else if (kind === 'till') result = till(this.state, this.map, x, y);
    else if (kind === 'clear') result = clearDead(this.state, x, y);
    else if (kind === 'water') result = water(this.state, x, y);
    else if (kind === 'plant') result = plant(this.state, x, y, info.cropId);

    if (result.ok && kind) {
      spendEnergy(this.state, kind);
      this.playActionEffect(kind, itemId, x, y);
    }
    this.applyResult(result, x, y);
  }

  playActionEffect(kind, itemId, x, y) {
    Sound.play(kind);
    if (kind === 'till' || kind === 'clear') {
      this.swingTool(itemId, x, y);
      this.burst('dirt', x, y, 14);
    } else if (kind === 'water') {
      this.swingTool(itemId, x, y);
      this.burst('water', x, y, 16);
    } else if (kind === 'plant') {
      this.burst('dirt', x, y, 6);
      this.burst('spark', x, y, 4);
    } else if (kind === 'harvest') {
      this.burst('leaf', x, y, 12);
      this.burst('spark', x, y, 8);
    }
  }

  // Parodo veiksmo rezultatą: atnaujina langelį, žinutę ir UI.
  // x, y – nebūtini (pvz. parduotuvės veiksmai su langeliu nesusiję).
  applyResult(result, x, y) {
    if (result.ok && x !== undefined) this.refreshPlot(x, y);
    if (!result.ok) Sound.play('error');
    this.toast(result.message, result.golden ? '#ffd54f' : result.ok ? GOOD : BAD, result.golden ? 4000 : undefined);

    // Atlygis: XP ir taškai (+ galimas naujas lygis)
    if (result.ok && result.reward) {
      const { xp = 0, points = 0 } = result.reward;
      const levelsGained = applyReward(this.state, result.reward);

      const parts = [];
      if (xp > 0) parts.push(`+${xp} XP`);
      if (points > 0) parts.push(`+${points} tšk.`);
      if (parts.length) this.floatText(parts.join('   '), x, y);

      if (levelsGained > 0) this.onLevelUp();
    }
    this.notifyChange();
  }

  // Auksinis derlius – daug žybsnių ir trumpas auksinis blyksnis
  celebrateGolden(x, y) {
    Sound.play('golden');
    this.burst('spark', x, y, 30);
    this.cameras.main.flash(250, 255, 220, 120);
  }

  onLevelUp() {
    Sound.play('levelup');
    const lvl = this.state.level;
    const unlocked = cropsUnlockedAt(lvl);
    let msg = `Naujas lygis: ${lvl}! +${CONFIG.LEVEL_UP_COINS} mon., +${CONFIG.LEVEL_UP_POINTS} tšk.`;
    if (unlocked.length) msg += ` Atrakinta: ${unlocked.join(', ')}`;
    this.toast(msg, '#c8f7a8');
    this.cameras.main.flash(350, 255, 250, 200);
    this.fx.spark.explode(30, this.player.x, this.player.y - 30);
  }

  // Kylantis ir nykstantis tekstas (pvz. „+8 XP“) virš langelio ar personažo
  floatText(text, x, y) {
    const px = x !== undefined ? x * T + T / 2 : this.player.x;
    const py = y !== undefined ? y * T : this.player.y - 50;
    const label = this.add.text(px, py, text, textStyle(16, '#d4ffb0')).setOrigin(0.5, 1).setDepth(DEPTH.TEXT);
    this.tweens.add({
      targets: label, y: py - 36, alpha: { from: 1, to: 0 }, duration: 1300, ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  // ---------- Parduotuvė ir namelis (klavišas E) ----------
  openShop() {
    Sound.play('open');
    EventBus.emit(EVENTS.TOGGLE_SHOP, true);
  }

  interact() {
    if (this.shopOpen) {
      EventBus.emit(EVENTS.TOGGLE_SHOP, false);
      return;
    }
    if (this.isBlockedByUI()) return;
    const npc = this.npcs.nearest(this.player.x, this.player.y);
    const p = this.getPlayerTile();
    if (npc) this.talkTo(npc);
    else if (isNearShop(this.map, p.x, p.y)) this.openShop();
    else if (isNearPlotHouse(this.myPlot, p.x, p.y)) this.askToSleep();
    else this.toast('Prieik prie kaimyno, parduotuvės ar savo namelio (arba spausk ant jų pele).', BAD);
  }

  // ---------- Pokalbiai ----------
  talkTo(npc) {
    this.stopWalking();
    this.player.setVelocity(0, 0);
    this.npcs.faceToward(npc, this.player.x, this.player.y);
    this.faceToward(this.npcs.tileOf(npc));
    Sound.play('talk');
    this.dialog.start(npc.id);
  }

  // Po užduoties priėmimo / atidavimo – atnaujiname ženkliukus ir UI
  afterQuestChange() {
    this.npcs.refreshBubbles(this.state);
    this.notifyChange();
  }

  // action pavyzdžiai: { type: 'buy', cropId: 'carrot', amount: 5 }
  //                    { type: 'sell', itemId: 'crop_tomato_gold', amount: 1 }
  //                    { type: 'sellAll' }
  handleShopAction(action) {
    let result;
    if (action.type === 'buy') result = buySeeds(this.state, action.cropId, action.amount);
    else if (action.type === 'sell') result = sellCrop(this.state, action.itemId, action.amount);
    else if (action.type === 'sellAll') result = sellAllCrops(this.state);
    else return;
    if (result.ok) Sound.play('coin');
    this.applyResult(result);
  }

  // ---------- Miegas ir nauja diena ----------
  askToSleep() {
    this.sleepPromptOpen = true;
    EventBus.emit(EVENTS.SLEEP_PROMPT);
  }

  // Neužmigus iki DAY_END_HOUR – nualpstama ir atsibundama namelyje
  faint() {
    if (this.sleeping) return;
    this.toast('Jau 2:00 nakties… Nualpai iš nuovargio!', BAD, 2500);
    this.goToSleep(true);
  }

  goToSleep(fainted) {
    if (this.sleeping) return;
    this.sleeping = true;
    this.stopWalking();
    Sound.play('sleep');
    EventBus.emit(EVENTS.TOGGLE_SHOP, false);

    const cam = this.cameras.main;
    cam.fadeOut(800, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Visa logika – DayCycle.js: nauja diena, oras, augalai, energija
      const summary = endDay(this.state, fainted);
      if (summary.season !== this.season) this.applySeasonVisuals(summary.season);

      // Atsibundame prie savo namelio durų
      const pos = this.tileToPlayerPos(this.myPlot.door);
      this.player.body.reset(pos.x, pos.y);
      this.facing = 'down';
      cam.centerOn(pos.x, pos.y);
      this.chunks.update(pos.x, pos.y, true);

      this.npcs.placeAll(this.state.time.minutes);
      this.refreshAllPlots();
      this.notifyChange();
      this.save();
      cam.fadeIn(800, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.sleeping = false;
        this.toast(this.morningMessage(summary, fainted), NEWS, 6000);
        Sound.play('morning');
      });
    });
  }

  morningMessage(summary, fainted) {
    const parts = [`Labas rytas! ${SEASON_NAMES[summary.season]}, ${getDayOfSeason(summary.day)} diena. ${WEATHER_NAMES[summary.weather]}.`];
    if (summary.seasonChanged) parts.push(`Prasidėjo naujas sezonas: ${SEASON_NAMES[summary.season].toLowerCase()}!`);
    if (summary.wilted > 0) parts.push(`Nuvyto augalų: ${summary.wilted} (išrauk juos kapliu).`);
    if (summary.weather === 'rain') parts.push('Lietus palaistė augalus.');
    if (fainted) parts.push('Energijos – tik pusė.');
    return parts.join(' ');
  }

  // ---------- Laukelių vaizdas ----------
  refreshAllPlots() {
    for (const key of Object.keys(this.state.plots)) {
      const [x, y] = key.split(',').map(Number);
      this.refreshPlot(x, y);
    }
    // Piešiniai, kurių būsenoje nebėra
    for (const key of [...this.plotSprites.keys()]) {
      if (!this.state.plots[key]) {
        const [x, y] = key.split(',').map(Number);
        this.refreshPlot(x, y);
      }
    }
  }

  // Atnaujina vieno langelio vaizdą pagal jo būseną
  refreshPlot(x, y) {
    const key = plotKey(x, y);
    const plot = getPlot(this.state, x, y);
    let sprites = this.plotSprites.get(key);

    // Langelio nebėra – ištriname piešinius
    if (!plot) {
      if (sprites) {
        for (const obj of [sprites.soil, sprites.crop, sprites.badge]) {
          this.tweens.killTweensOf(obj);
          obj.destroy();
        }
        this.plotSprites.delete(key);
      }
      return;
    }

    // Pirmą kartą – sukuriame piešinius
    if (!sprites) {
      const px = x * T;
      const py = y * T;
      const h = hash(x, y);
      sprites = {
        soil: this.add.image(px, py, 'soil_dry').setOrigin(0).setDepth(DEPTH.SOIL),
        crop: this.add.image(px + T / 2, py + T, 'soil_dry')
          .setOrigin(0.5, 1).setDepth(ySort(py + T * 0.75)).setVisible(false),
        badge: this.add.image(px + T - 9, py + 9, 'badge_ready').setDepth(DEPTH.FX - 1).setVisible(false),
        wasReady: false,
      };
      // Augalas švelniai siūbuoja vėjyje
      this.tweens.add({
        targets: sprites.crop, angle: { from: -2.5, to: 2.5 }, duration: 1500 + (h % 900),
        delay: h % 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: sprites.badge, y: py + 3, scale: { from: 0.9, to: 1.15 },
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.plotSprites.set(key, sprites);
    }

    sprites.soil.setTexture(isWet(plot) ? 'soil_wet' : 'soil_dry');

    const stage = getStage(plot);
    sprites.crop.setVisible(stage >= 0);
    if (isDead(plot)) sprites.crop.setTexture('crop_dead');
    else if (stage >= 0) sprites.crop.setTexture(`crop_${plot.crop}_${stage}`);

    const ready = isReady(plot);
    sprites.badge.setVisible(ready);
    sprites.wasReady = ready;
  }

  // ---------- Išsaugojimas ----------
  setupSaving() {
    this.time.addEvent({
      delay: CONFIG.AUTOSAVE_INTERVAL_SEC * 1000,
      loop: true,
      callback: () => this.save(),
    });

    // Išsaugome ir uždarant / perkraunant puslapį ar perjungiant skirtuką
    const onUnload = () => this.save();
    const onHidden = () => { if (document.hidden) this.save(); };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onHidden);
    this.events.once('shutdown', () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onHidden);
    });

    // K – išsaugoti rankiniu būdu, N – pradėti naują žaidimą
    this.input.keyboard.on('keydown-K', () => {
      if (this.save()) this.toast('Žaidimas išsaugotas.', '#c8f7a8');
      else this.toast('Nepavyko išsaugoti (ar leidžiama naudoti localStorage?).', BAD);
    });
    this.input.keyboard.on('keydown-N', () => this.newGame());
  }

  save() {
    if (this.resetting) return false;
    // Vieta – langelių vienetais (nepriklauso nuo TILE_SIZE)
    this.state.player = { x: this.player.x / T, y: this.player.y / T };
    return saveGame(this.state);
  }

  newGame() {
    if (!window.confirm('Pradėti naują žaidimą? Visas progresas bus ištrintas.')) return;
    this.resetting = true; // kad beforeunload neišsaugotų senos būsenos
    deleteSave();
    // Po perkrovimo – iškart naujas žaidimas (be pradžios ekrano)
    try { sessionStorage.setItem(SKIP_TITLE_KEY, '1'); } catch { /* nieko */ }
    window.location.reload();
  }

  // ---------- Pagalbinės ----------
  // Ar langelis – žaidėjo (ne kito sklypo) namelio dalis?
  isMyHouseTile(x, y) {
    const h = this.myPlot.house;
    return x >= h.x && x < h.x + 2 && y >= h.y && y < h.y + 2;
  }

  toast(text, color = GOOD, duration) {
    EventBus.emit(EVENTS.TOAST, text, color, duration);
  }

  notifyChange() {
    EventBus.emit(EVENTS.STATE_CHANGED, this.state);
  }
}
