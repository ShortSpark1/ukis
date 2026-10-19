import Phaser from 'phaser';
import { preloadUserSprites, buildSprites } from '../art/SpriteLibrary.js';

// =====================================================================
//  BOOT SCENA
//  1) preload – įkelia tavo sprite'us iš public/assets/ (jei jų yra)
//  2) create  – sukuria VISAS tekstūras per SpriteLibrary: nupiešia
//     grafiką kodu ir pakeičia ją tavo failais (jei jų yra)
// =====================================================================
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Jei kurio nors failo nepavyksta įkelti – ne bėda, naudosime sugeneruotą
    this.load.on('loaderror', (file) => console.warn(`[sprite'ai] Nepavyko įkelti: ${file.src}`));
    preloadUserSprites(this);
  }

  create() {
    buildSprites(this);
    this.scene.start('TitleScene'); // pradžios ekranas
  }
}
