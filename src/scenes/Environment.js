import Phaser from 'phaser';
import { getDarkness } from '../logic/Time.js';
import { VIEW_PX_W, VIEW_PX_H } from './layout.js';

// =====================================================================
//  APLINKA: diena / naktis, šviesos ir oras (lietus, sniegas)
//
//  Kaip daroma naktis: virš viso ekrano yra „tamsos“ sluoksnis
//  (RenderTexture). Kiekvieną kadrą jį užpildome tamsia spalva, o ties
//  šviesomis (langai, personažas) „ištriname“ minkštą apskritimą – ten
//  matosi pasaulis. Ant viršaus dar uždedame šiltą švytėjimą.
// =====================================================================

const DUSK_COLOR = 0x3a2450;   // vakaro spalva (violetinė)
const NIGHT_COLOR = 0x0a1030;  // nakties spalva (tamsiai mėlyna)
const PLAYER_LIGHT_RADIUS = 150;

export class Environment {
  constructor(scene, depths) {
    this.scene = scene;
    this.lights = [];

    // Tamsos sluoksnis – „priklijuotas“ prie ekrano
    this.darknessLayer = scene.add.renderTexture(0, 0, VIEW_PX_W, VIEW_PX_H)
      .setOrigin(0).setScrollFactor(0).setDepth(depths.night);
    // Šviesos „kaukė“ – nepridedama į sceną, naudojama tik trynimui
    this.mask = scene.make.image({ key: 'light_mask', add: false });
    this.glowDepth = depths.lights;

    // Lietus ir sniegas – dalelės, kurios krenta per visą ekraną
    this.rain = scene.add.particles(0, 0, 'p_rain', {
      x: { min: -120, max: VIEW_PX_W + 120 }, y: -30,
      speedY: { min: 760, max: 940 }, speedX: { min: -170, max: -130 }, rotate: 10,
      lifespan: 900, quantity: 3, frequency: 12, alpha: { start: 0.85, end: 0.4 }, emitting: false,
    }).setScrollFactor(0).setDepth(depths.weather);
    this.snow = scene.add.particles(0, 0, 'p_snow', {
      x: { min: -40, max: VIEW_PX_W + 40 }, y: -20,
      speedY: { min: 35, max: 75 }, speedX: { min: -30, max: 30 }, scale: { min: 0.5, max: 1.3 },
      lifespan: 12000, quantity: 1, frequency: 45, alpha: 0.9, emitting: false,
    }).setScrollFactor(0).setDepth(depths.weather);
    this.weather = null;
  }

  // Prideda šviesą pasaulyje (x, y – pasaulio koordinatės, radius – pikseliais)
  addLight(x, y, radius) {
    const glow = this.scene.add.image(x, y, 'light_glow')
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(this.glowDepth).setAlpha(0)
      .setScale((radius * 2.2) / 256);
    this.lights.push({ x, y, radius, glow });
  }

  setWeather(weather) {
    if (weather === this.weather) return;
    this.weather = weather;
    if (weather === 'rain') this.rain.start(); else this.rain.stop();
    if (weather === 'snow') this.snow.start(); else this.snow.stop();
    // iš karto „pripildome“ ekraną, kad lietus neprasidėtų iš tuščio dangaus
    if (weather === 'rain') this.rain.fastForward(900);
    if (weather === 'snow') this.snow.fastForward(8000);
  }

  // Kviečiama kiekvieną kadrą
  update(minutes, weather, player) {
    this.setWeather(weather);
    const { darkness, night } = getDarkness(minutes, weather);
    // Šviesos įsijungia temstant (night 0 → 1)
    const lightPower = Math.min(1, Math.max(0, (night - 0.15) * 2));

    for (const l of this.lights) l.glow.setAlpha(lightPower * 0.9);
    if (darkness <= 0.005) {
      this.darknessLayer.setVisible(false);
      return;
    }
    this.darknessLayer.setVisible(true);

    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(DUSK_COLOR),
      Phaser.Display.Color.ValueToColor(NIGHT_COLOR),
      100, Math.round(night * 100),
    );
    const cam = this.scene.cameras.main;
    const layer = this.darknessLayer;
    layer.clear();
    layer.fill(Phaser.Display.Color.GetColor(color.r, color.g, color.b), darkness);

    // Ištriname šviesias vietas
    if (lightPower > 0) {
      for (const l of this.lights) {
        const sx = l.x - cam.scrollX;
        const sy = l.y - cam.scrollY;
        if (sx < -l.radius || sy < -l.radius || sx > VIEW_PX_W + l.radius || sy > VIEW_PX_H + l.radius) continue;
        this.eraseCircle(sx, sy, l.radius, lightPower);
      }
    }
    // Aplink personažą visada truputį šviesiau, kad naktį matytųsi kelias
    if (darkness > 0.15) {
      this.eraseCircle(player.x - cam.scrollX, player.y - 30 - cam.scrollY, PLAYER_LIGHT_RADIUS, 0.75);
    }
  }

  eraseCircle(x, y, radius, strength) {
    this.mask.setPosition(x, y).setScale((radius * 2) / 256).setAlpha(strength);
    this.darknessLayer.erase(this.mask);
  }
}
