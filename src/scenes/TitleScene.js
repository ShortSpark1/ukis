import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { peekSave, deleteSave } from '../logic/SaveManager.js';
import { getSeasonOfDay, getDayOfSeason, SEASON_NAMES } from '../logic/Time.js';
import { ensurePanel, textStyle, sk, GRASS_VARIANTS } from '../art/SpriteLibrary.js';
import { makeButton, showFeedbackPanel } from './widgets.js';
import { VIEW_PX_W, VIEW_PX_H } from './layout.js';

const T = CONFIG.TILE_SIZE;
const W = VIEW_PX_W;
const H = VIEW_PX_H + CONFIG.HUD_HEIGHT;

// Raktas, kuriuo „N“ (naujas žaidimas) žaidime praneša: po perkrovimo
// iškart pradėti naują žaidimą, nerodant pradžios ekrano
export const SKIP_TITLE_KEY = 'ukis_skip_title';

// =====================================================================
//  PRADŽIOS EKRANAS
//  Pavadinimas, trumpas valdymo paaiškinimas ir mygtukai:
//  „Tęsti“ (jei yra išsaugojimas), „Naujas žaidimas“, „Atsiliepimas“.
// =====================================================================
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Paspaudus „N“ žaidime – iškart naujas žaidimas
    let skip = false;
    try {
      skip = sessionStorage.getItem(SKIP_TITLE_KEY) === '1';
      sessionStorage.removeItem(SKIP_TITLE_KEY);
    } catch { /* nieko */ }
    if (skip) {
      this.scene.start('GameScene');
      return;
    }

    this.drawBackground();
    this.drawTitle();
    this.drawControls();
    this.drawButtons();
    this.popup = null;
  }

  // Fonas: pavasario žolė, medžių eilė, ūkininkas ir švelnus patamsinimas
  drawBackground() {
    for (let y = 0; y < H; y += T) {
      for (let x = 0; x < W; x += T) {
        const v = ((x / T) * 7 + (y / T) * 13) % GRASS_VARIANTS;
        this.add.image(x, y, sk(`grass_${v}`, 'spring')).setOrigin(0);
      }
    }
    for (let i = 0; i < 12; i++) {
      this.add.image(40 + i * 82, 108 + (i % 2) * 14, sk(`tree_${i % 2}`, 'spring')).setOrigin(0.5, 0.95);
    }
    for (let i = 0; i < 12; i++) {
      this.add.image(30 + i * 84, H - 4 - (i % 2) * 10, sk(`tree_${(i + 1) % 2}`, 'spring')).setOrigin(0.5, 0.95);
    }
    const farmer = this.add.sprite(W / 2 + 300, 520, 'player', 'down_0').setScale(2);
    this.add.image(farmer.x, farmer.y + 2, 'shadow').setScale(2);
    farmer.setDepth(1);
    this.add.image(W / 2 - 300, 540, 'crop_pumpkin_4').setScale(1.6);
    this.add.image(W / 2 - 240, 545, 'crop_corn_4').setScale(1.6);
    this.add.image(0, 0, 'vignette').setOrigin(0).setDisplaySize(W, H).setAlpha(0.9);
    this.add.rectangle(0, 0, W, H, 0x10180c, 0.25).setOrigin(0);
  }

  drawTitle() {
    const title = this.add.text(W / 2, 150, CONFIG.GAME_TITLE.toUpperCase(), textStyle(84, '#ffd54f', { strokeThickness: 12 }))
      .setOrigin(0.5);
    this.add.text(W / 2, 215, CONFIG.GAME_SUBTITLE, textStyle(22, '#fff4dc')).setOrigin(0.5);
    // švelnus „kvėpavimas“
    this.tweens.add({ targets: title, scale: 1.04, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  drawControls() {
    const lines = [
      ['Pelė', 'kairys – eiti ir naudoti, dešinys – tik eiti'],
      ['WASD / rodyklės', 'eiti,  Tarpas – naudoti daiktą'],
      ['1–7', 'pasirinkti daiktą,  I – kuprinė'],
      ['E', 'kalbėti su kaimynais, parduotuvė, miegas'],
      ['J', 'užduočių žurnalas,  M – minimapas'],
    ];
    const pw = 520;
    const ph = 40 + lines.length * 26;
    const c = this.add.container(W / 2 - pw / 2, 260);
    c.add(this.add.image(0, 0, ensurePanel(this, 'toast', pw, ph)).setOrigin(0));
    c.add(this.add.text(pw / 2, 18, 'Kaip žaisti', textStyle(15, '#ffe7a3')).setOrigin(0.5));
    lines.forEach(([key, what], i) => {
      c.add(this.add.text(150, 44 + i * 26, key, textStyle(14, '#ffd54f')).setOrigin(1, 0.5));
      c.add(this.add.text(166, 44 + i * 26, what, textStyle(14)).setOrigin(0, 0.5));
    });
  }

  drawButtons() {
    const save = peekSave();
    const c = this.add.container(W / 2 - 150, 478);
    if (save) {
      const season = SEASON_NAMES[getSeasonOfDay(save.day)];
      makeButton(this, c, 0, 0, 300, 50, 'Tęsti', () => this.startGame(), true, 'btn', 20);
      c.add(this.add.text(150, 36, `${season}, ${getDayOfSeason(save.day)} d.  ·  lygis ${save.level}  ·  ${save.coins} mon.`, textStyle(12, '#e8d3a8')).setOrigin(0.5, 0));
    } else {
      makeButton(this, c, 0, 0, 300, 50, 'Tęsti', () => {}, false, 'btn', 20);
      c.add(this.add.text(150, 36, 'Išsaugoto žaidimo dar nėra', textStyle(12, '#cdb894')).setOrigin(0.5, 0));
    }
    makeButton(this, c, 0, 86, 300, 50, 'Naujas žaidimas', () => this.newGame(!!save), true, 'btn', 20);
    makeButton(this, c, 60, 156, 180, 34, 'Atsiliepimas', () => this.openFeedback(), true, 'btn', 14);
  }

  startGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('GameScene'));
  }

  // Jei jau yra išsaugotas žaidimas – pirma paklausiame
  newGame(hasSave) {
    if (!hasSave) {
      this.startGame();
      return;
    }
    if (this.popup) return;
    const pw = 460;
    const ph = 190;
    const root = this.add.container(0, 0).setDepth(100);
    root.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.5).setOrigin(0).setInteractive());
    const c = this.add.container(W / 2 - pw / 2, H / 2 - ph / 2);
    root.add(c);
    c.add(this.add.image(0, 0, ensurePanel(this, 'wood', pw, ph)).setOrigin(0).setInteractive());
    c.add(this.add.text(pw / 2, 40, 'Pradėti iš naujo?', textStyle(22, '#ffe7a3')).setOrigin(0.5));
    c.add(this.add.text(pw / 2, 82, 'Dabartinis žaidimas bus ištrintas visam laikui.', textStyle(14)).setOrigin(0.5));
    makeButton(this, c, 40, 140, 170, 40, 'Taip, iš naujo', () => {
      deleteSave();
      this.startGame();
    }, true, 'btn_red', 14);
    makeButton(this, c, pw - 210, 140, 170, 40, 'Atšaukti', () => {
      root.destroy();
      this.popup = null;
    }, true, 'btn', 14);
    this.popup = root;
  }

  openFeedback() {
    if (this.popup) return;
    this.popup = showFeedbackPanel(this, W, H, 100, () => { this.popup = null; });
  }
}
