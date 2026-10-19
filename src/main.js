import Phaser from 'phaser';
import { CONFIG } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { isLikelyPhone, showMobileNotice } from './mobileCheck.js';
import { Sound } from './audio/Sound.js';

// =====================================================================
//  ĮĖJIMO TAŠKAS
//  Čia sukuriamas Phaser žaidimas ir užregistruojamos scenos.
// =====================================================================

const config = {
  type: Phaser.AUTO,           // WebGL, jei galima, kitaip Canvas
  parent: 'game',              // <div id="game"> iš index.html
  width: CONFIG.VIEW_WIDTH * CONFIG.TILE_SIZE,   // ekranas rodo tik dalį pasaulio
  height: CONFIG.VIEW_HEIGHT * CONFIG.TILE_SIZE + CONFIG.HUD_HEIGHT,
  backgroundColor: '#1e2a1e',
  pixelArt: false,             // glotni grafika (piešiame su gradientais)
  antialias: true,
  physics: {
    default: 'arcade',         // paprasta „dėžučių“ fizika kolizijoms
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,    // ištempia per visą langą išlaikant proporcijas
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, GameScene, UIScene],
};

const game = new Phaser.Game(config);

// Naršyklės leidžia groti garsą tik po pirmo paspaudimo ar klavišo
const unlockSound = () => Sound.unlock();
window.addEventListener('pointerdown', unlockSound);
window.addEventListener('keydown', unlockSound);

// Telefone – pranešimas, kad žaisti geriau kompiuteryje
if (isLikelyPhone()) showMobileNotice();

// Kūrimo režime žaidimą pasiekiame naršyklės konsolėje (derinimui): window.__game
if (import.meta.env.DEV) window.__game = game;
