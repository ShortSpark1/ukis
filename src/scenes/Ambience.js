import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { getDarkness } from '../logic/Time.js';
import { BUTTERFLY_VARIANTS } from '../art/SpriteLibrary.js';
import { VIEW_PX_W, VIEW_PX_H } from './layout.js';

// =====================================================================
//  GYVYBĖ APLINK: drugeliai, jonvabaliai, krentantys lapai ir žiedlapiai
//  Visa tai vyksta tik aplink kamerą (kaip ir debesys), todėl dideliame
//  pasaulyje nekainuoja beveik nieko.
//    – drugeliai skraido dieną pavasarį ir vasarą (ne per lietų);
//    – jonvabaliai šviečia naktį (ne žiemą ir ne per lietų);
//    – rudenį krenta lapai, pavasarį – žiedlapiai.
// =====================================================================

const AREA_W = VIEW_PX_W + 400; // plotas aplink kamerą, kuriame skraido drugeliai
const AREA_H = VIEW_PX_H + 400;

export class Ambience {
  constructor(scene, depths) {
    this.scene = scene;
    const cam = scene.cameras.main;
    const cx = cam.scrollX + VIEW_PX_W / 2;
    const cy = cam.scrollY + VIEW_PX_H / 2;

    // Drugeliai: sparnų mojavimas – tai greitas suspaudimas per plotį (scaleX)
    this.butterflies = Array.from({ length: CONFIG.AMBIENCE.butterflies }, (_, i) => {
      const img = scene.add.image(
        cx + Phaser.Math.Between(-AREA_W / 2, AREA_W / 2),
        cy + Phaser.Math.Between(-AREA_H / 2, AREA_H / 2),
        `butterfly_${i % BUTTERFLY_VARIANTS}`,
      ).setDepth(depths.creatures).setAlpha(0);
      scene.tweens.add({ targets: img, scaleX: 0.25, duration: 110 + i * 7, yoyo: true, repeat: -1 });
      return { img, angle: Math.random() * Math.PI * 2, speed: 30 + Math.random() * 25, phase: Math.random() * 10 };
    });

    // Jonvabaliai: švytinčios dalelės visame ekrane (virš nakties tamsos)
    this.fireflies = scene.add.particles(0, 0, 'p_spark', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-VIEW_PX_W / 2, -VIEW_PX_H / 2, VIEW_PX_W, VIEW_PX_H) },
      lifespan: { min: 2500, max: 4500 }, speedX: { min: -12, max: 12 }, speedY: { min: -14, max: 6 },
      scale: { start: 0.9, end: 0.4 }, alpha: { values: [0, 1, 0.3, 1, 0] }, tint: 0xd8ff7a,
      blendMode: 'ADD', frequency: 140, emitting: false,
    }).setDepth(depths.glow);

    // Lapai / žiedlapiai: krenta iš viršaus, lėtai sukasi
    this.leaves = scene.add.particles(0, 0, 'p_petal', {
      x: { min: -60, max: VIEW_PX_W + 60 }, y: -20,
      lifespan: 9000, speedY: { min: 30, max: 60 }, speedX: { min: -30, max: 25 },
      rotate: { start: 0, end: 360 }, scale: { min: 1.2, max: 2 }, alpha: 0.9,
      frequency: 450, emitting: false,
    }).setScrollFactor(0).setDepth(depths.creatures);
    this.leafMode = null;
  }

  // Kiekvieną kadrą
  update(delta, { minutes, weather, season }) {
    const cam = this.scene.cameras.main;
    const { night } = getDarkness(minutes, weather);
    const wet = weather === 'rain' || weather === 'snow';

    // --- Drugeliai ---
    const butterflyTime = !wet && night < 0.2 && (season === 'spring' || season === 'summer');
    const left = cam.scrollX + VIEW_PX_W / 2 - AREA_W / 2;
    const top = cam.scrollY + VIEW_PX_H / 2 - AREA_H / 2;
    const dt = delta / 1000;
    for (const b of this.butterflies) {
      // Kryptis pamažu „klaidžioja“ – skrydis atrodo atsitiktinis
      b.phase += dt;
      b.angle += Math.sin(b.phase * 1.7) * 2.2 * dt;
      b.img.x += Math.cos(b.angle) * b.speed * dt;
      b.img.y += Math.sin(b.angle) * b.speed * dt + Math.sin(b.phase * 6) * 0.4;
      if (b.img.x < left) b.img.x += AREA_W; else if (b.img.x > left + AREA_W) b.img.x -= AREA_W;
      if (b.img.y < top) b.img.y += AREA_H; else if (b.img.y > top + AREA_H) b.img.y -= AREA_H;
      const target = butterflyTime ? 1 : 0;
      b.img.alpha += (target - b.img.alpha) * Math.min(1, dt * 1.5);
      b.img.setVisible(b.img.alpha > 0.02);
    }

    // --- Jonvabaliai ---
    this.fireflies.setPosition(cam.scrollX + VIEW_PX_W / 2, cam.scrollY + VIEW_PX_H / 2);
    const fireflyTime = !wet && night > 0.5 && season !== 'winter';
    if (fireflyTime !== this.fireflies.emitting) {
      if (fireflyTime) this.fireflies.start(); else this.fireflies.stop();
    }

    // --- Lapai rudenį, žiedlapiai pavasarį ---
    const mode = wet ? null : season === 'autumn' ? 'autumn' : season === 'spring' ? 'spring' : null;
    if (mode !== this.leafMode) {
      this.leafMode = mode;
      if (!mode) this.leaves.stop();
      else {
        this.leaves.setParticleTint(mode === 'autumn' ? 0xf0a040 : 0xffc8e0);
        this.leaves.frequency = mode === 'autumn' ? 380 : 900;
        this.leaves.start();
      }
    }
  }
}
