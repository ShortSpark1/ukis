import { CONFIG } from '../config.js';
import {
  drawTexture, css, darken, lighten, circle, ellipse, roundRect, fillStroke, radialShade, vGradient,
} from './utils.js';
import {
  drawTomato, drawCornCob, drawCarrot, drawPepper, drawStrawberry, drawBerryCluster,
  drawRoundRoot, drawGarlic, drawLeafyHead, drawGroundFruit, drawSunflowerHead,
} from './crops.js';
import { star } from './objects.js';

// =====================================================================
//  IKONOS inventoriui, parduotuvei ir HUD
//  icon_<daikto id> – 44x44 px; piešiame 32 vnt. drobėje.
// =====================================================================

const OUTLINE = 0x2b1d14;
export const ICON_SIZE = 44;

function icon(scene, key, fn, size = ICON_SIZE) {
  drawTexture(scene, key, size, size, (ctx) => {
    ctx.scale(size / 32, size / 32);
    fn(ctx);
  });
}

const GOLD = 0xffcc33;

// Vaisius pagal augalo išvaizdą (art) ir formą (shape) – derliui ir sėklų pakeliams
function drawFruit(ctx, crop, cx, cy, scale, color = crop.color) {
  const { art, shape } = crop;
  if (art === 'root') {
    if (shape === 'round') drawRoundRoot(ctx, cx, cy + 2 * scale, 6.5 * scale, color);
    else if (shape === 'bulb') drawGarlic(ctx, cx, cy + 2 * scale, 6.5 * scale, color);
    else drawCarrot(ctx, cx, cy, 20 * scale, 0.5, color);
  } else if (art === 'bush') {
    if (shape === 'long') drawPepper(ctx, cx, cy + 1 * scale, 17 * scale, 0.35, color);
    else if (shape === 'berry') drawStrawberry(ctx, cx, cy - 1 * scale, 7.5 * scale, color);
    else if (shape === 'cluster') drawBerryCluster(ctx, cx, cy, 4.6 * scale, color);
    else drawTomato(ctx, cx, cy, 8 * scale, color);
  } else if (art === 'tall') drawCornCob(ctx, cx, cy, 20 * scale, 0.45, color);
  else if (art === 'leafy') drawLeafyHead(ctx, cx, cy + 1 * scale, 8 * scale, color);
  else if (art === 'ground') drawGroundFruit(ctx, cx, cy + 1 * scale, 10 * scale, color, shape);
  else if (art === 'flower') drawSunflowerHead(ctx, cx, cy, 11 * scale, color);
  else {
    circle(ctx, cx, cy, 7 * scale);
    fillStroke(ctx, radialShade(ctx, cx, cy, 7 * scale, color), OUTLINE, 0.6);
  }
}

export function makeIcons(scene) {
  // Kaplys: įstrižas medinis kotas ir plati metalinė geležtė viršuje
  icon(scene, 'icon_hoe', (ctx) => {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(7, 28);
    ctx.lineTo(22, 7);
    ctx.strokeStyle = css(OUTLINE);
    ctx.lineWidth = 4.6;
    ctx.stroke();
    const wood = ctx.createLinearGradient(5, 20, 12, 26);
    wood.addColorStop(0, css(0xd09a5e));
    wood.addColorStop(1, css(0x7a4c22));
    ctx.strokeStyle = wood;
    ctx.lineWidth = 3;
    ctx.stroke();
    // geležtė
    ctx.beginPath();
    ctx.moveTo(18.5, 5.5);
    ctx.lineTo(28.5, 7.5);
    ctx.lineTo(29, 16.5);
    ctx.lineTo(24.5, 13.5);
    ctx.lineTo(19.5, 9.5);
    ctx.closePath();
    const metal = ctx.createLinearGradient(19, 5, 29, 16);
    metal.addColorStop(0, css(0xf1f4f8));
    metal.addColorStop(0.5, css(0xaab1ba));
    metal.addColorStop(1, css(0x6c737d));
    fillStroke(ctx, metal, OUTLINE, 0.9, 1);
    ctx.beginPath();
    ctx.moveTo(28.4, 8.5); ctx.lineTo(28.8, 15.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // apkaba
    circle(ctx, 20.6, 8.2, 1.6);
    fillStroke(ctx, 0x8d8f93, OUTLINE, 0.6);
  });

  // Laistytuvas
  icon(scene, 'icon_watering_can', (ctx) => {
    // rankena
    ctx.beginPath();
    ctx.arc(12, 13, 6, Math.PI, Math.PI * 1.9);
    ctx.strokeStyle = css(OUTLINE);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = css(0x3f8a4f);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // snapelis
    ctx.beginPath();
    ctx.moveTo(21, 18);
    ctx.lineTo(28.5, 9.5);
    ctx.lineTo(29.8, 10.8);
    ctx.lineTo(23, 22);
    ctx.closePath();
    fillStroke(ctx, 0x46955a, OUTLINE, 0.7);
    ellipse(ctx, 29.5, 9.8, 2.2, 1.2, -0.75);
    fillStroke(ctx, 0x9aa3ab, OUTLINE, 0.5);
    // indas
    roundRect(ctx, 5, 13, 18, 14, 3);
    const body = ctx.createLinearGradient(5, 0, 23, 0);
    body.addColorStop(0, css(0x7ccf8a));
    body.addColorStop(0.45, css(0x4e9a5b));
    body.addColorStop(1, css(0x2f6b3a));
    fillStroke(ctx, body, OUTLINE, 0.9);
    ctx.fillStyle = css(0x2f6b3a);
    ctx.fillRect(5.5, 16, 17, 1.6);
    ctx.fillRect(5.5, 23, 17, 1.6);
    ellipse(ctx, 9, 20, 1, 2.6);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  });

  for (const [cropId, crop] of Object.entries(CONFIG.CROPS)) {
    // Sėklų pakelis su vaisiaus paveikslėliu
    icon(scene, `icon_seed_${cropId}`, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(7, 7);
      for (let x = 7; x <= 25; x += 3) ctx.lineTo(x + 1.5, x % 2 ? 4.5 : 6);
      ctx.lineTo(25, 7);
      ctx.lineTo(25.5, 28);
      ctx.lineTo(6.5, 28);
      ctx.closePath();
      fillStroke(ctx, vGradient(ctx, 5, 28, 0xf3e3bf, 0xd2b884), OUTLINE, 0.8);
      ctx.fillStyle = css(darken(0xd2b884, 0.2));
      ctx.fillRect(7, 8, 18, 1.2);
      roundRect(ctx, 9, 11, 14, 13, 2.5);
      fillStroke(ctx, lighten(crop.color, 0.75), darken(crop.color, 0.3), 0.6);
      ctx.save();
      roundRect(ctx, 9, 11, 14, 13, 2.5);
      ctx.clip();
      drawFruit(ctx, crop, 16, 17.5, 0.55);
      ctx.restore();
      for (const [x, y] of [[10, 26], [13, 26.4], [20, 26.2]]) {
        ellipse(ctx, x, y, 0.8, 0.5);
        ctx.fillStyle = css(0x8a6a3a);
        ctx.fill();
      }
    });

    // Derlius
    icon(scene, `icon_crop_${cropId}`, (ctx) => {
      ellipse(ctx, 16, 27, 9, 2.4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      drawFruit(ctx, crop, 16, 16, 1);
    });

    // Auksinis derlius: auksinis vaisius su švytėjimu ir žvaigždutėmis
    icon(scene, `icon_crop_${cropId}_gold`, (ctx) => {
      const glow = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
      glow.addColorStop(0, 'rgba(255,230,120,0.75)');
      glow.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 32, 32);
      drawFruit(ctx, crop, 16, 16, 0.95, GOLD);
      for (const [x, y, r] of [[25, 6, 3], [6, 9, 2.2], [26, 24, 2]]) {
        star(ctx, x, y, r, r * 0.35, 4);
        ctx.fillStyle = '#fffbe0';
        ctx.fill();
      }
    });
  }

  // Moneta
  icon(scene, 'icon_coin', (ctx) => {
    circle(ctx, 16, 16, 12);
    fillStroke(ctx, radialShade(ctx, 16, 16, 12, 0xf5c542, 0.5, 0.35), 0x7a5410, 1.4, 1);
    circle(ctx, 16, 16, 8.4);
    ctx.strokeStyle = css(0xb8860b, 0.9);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    star(ctx, 16, 16, 5, 2.2);
    ctx.fillStyle = css(0xfff1a8);
    ctx.fill();
  }, 24);

  // Lygio žvaigždė
  icon(scene, 'icon_star', (ctx) => {
    star(ctx, 16, 17, 14, 6.5);
    fillStroke(ctx, radialShade(ctx, 16, 16, 14, 0xffc928, 0.5, 0.3), 0x7a5410, 1.4, 1);
  }, 26);

  // Oro ikonos: saulė, lietus, sniegas, mėnulis (naktį) ir energijos žaibas
  icon(scene, 'icon_sun', (ctx) => {
    ctx.strokeStyle = css(0xffb300);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10);
      ctx.lineTo(16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14);
      ctx.stroke();
    }
    circle(ctx, 16, 16, 7.5);
    fillStroke(ctx, radialShade(ctx, 16, 16, 7.5, 0xffd54f, 0.5, 0.2), 0xb87a00, 1);
  }, 26);
  const cloud = (ctx, color) => {
    for (const [x, y, r] of [[11, 15, 6], [18, 12, 7.5], [24, 16, 5.5]]) {
      circle(ctx, x, y, r);
      ctx.fillStyle = css(color);
      ctx.fill();
    }
    roundRect(ctx, 6, 14, 23, 7, 3.5);
    ctx.fill();
  };
  icon(scene, 'icon_rain', (ctx) => {
    ctx.strokeStyle = css(0x5aa0ff);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const x of [10, 16, 22]) {
      ctx.beginPath(); ctx.moveTo(x, 23); ctx.lineTo(x - 2, 30); ctx.stroke();
    }
    cloud(ctx, 0xb8c4d4);
  }, 26);
  icon(scene, 'icon_snow', (ctx) => {
    cloud(ctx, 0xdfe7f2);
    ctx.strokeStyle = css(0xffffff);
    ctx.lineWidth = 1.4;
    for (const [x, y] of [[10, 27], [17, 29], [24, 27]]) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * 2.4, y - Math.sin(a) * 2.4);
        ctx.lineTo(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4);
        ctx.stroke();
      }
    }
  }, 26);
  icon(scene, 'icon_moon', (ctx) => {
    ctx.beginPath();
    ctx.arc(16, 16, 11, Math.PI * 0.35, Math.PI * 1.65);
    ctx.arc(21, 13, 9, Math.PI * 1.45, Math.PI * 0.55, true);
    ctx.closePath();
    fillStroke(ctx, radialShade(ctx, 13, 16, 11, 0xfff1b0, 0.4, 0.25), 0x8a7a30, 1);
  }, 26);
  icon(scene, 'icon_energy', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(19, 2); ctx.lineTo(7, 18); ctx.lineTo(15, 18); ctx.lineTo(12, 30); ctx.lineTo(25, 12); ctx.lineTo(17, 12);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 2, 30, 0xfff27a, 0xf2a900), 0x7a5410, 1.2, 1);
  }, 22);

  // Kuprinė
  icon(scene, 'icon_bag', (ctx) => {
    roundRect(ctx, 6, 10, 20, 18, 5);
    fillStroke(ctx, vGradient(ctx, 10, 28, 0xc0844a, 0x7a4c26), OUTLINE, 1);
    roundRect(ctx, 6, 10, 20, 8, [5, 5, 2, 2]);
    fillStroke(ctx, vGradient(ctx, 10, 18, 0xd59a5c, 0x9a6232), OUTLINE, 0.8);
    ctx.beginPath();
    ctx.arc(16, 10, 5, Math.PI, 0);
    ctx.strokeStyle = css(OUTLINE);
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.strokeStyle = css(0x8a5a30);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    roundRect(ctx, 14, 16, 4, 4, 1);
    fillStroke(ctx, 0xffd54f, OUTLINE, 0.5);
  });

  // Taškų brangakmenis
  icon(scene, 'icon_gem', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(8, 11); ctx.lineTo(12, 5); ctx.lineTo(20, 5); ctx.lineTo(24, 11); ctx.lineTo(16, 27);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 5, 27, 0x9ff3ff, 0x1f8fb3), 0x0f4a5e, 1.2, 1);
    ctx.beginPath();
    ctx.moveTo(8, 11); ctx.lineTo(24, 11);
    ctx.moveTo(12, 5); ctx.lineTo(14, 11); ctx.lineTo(16, 27);
    ctx.moveTo(20, 5); ctx.lineTo(18, 11); ctx.lineTo(16, 27);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }, 24);
}
