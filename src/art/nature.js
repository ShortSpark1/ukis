import {
  T, S, seededRandom, drawTexture, css, lighten, darken, mix,
  circle, ellipse, fillStroke, radialShade, softShadow,
} from './utils.js';
import { SEASON_KEYS, SEASON_LOOK, sk } from './seasons.js';

// =====================================================================
//  GAMTA: eglės, beržai ir smulkios žemės detalės
//    – eglės ir beržai (kiekvienam sezonui atskirai) – kad miškas
//      nebūtų iš vienodų medžių;
//    – žolės kuokšteliai, akmenukai, dobilai, grybai – piešiami ant žemės;
//    – lelijos ir nendrės vandenyje;
//    – „dėmės“: dideli švelnūs šviesūs ir tamsūs ratai, kuriais žolė
//      nuspalvinama netolygiai (iš toli nesimato langelių tinklelio).
// =====================================================================

const OUTLINE = 0x2b1d14;
export const PINE_ORIGIN_Y = 76 / 80;   // eglės kamieno apačia (nuo viršaus)
export const BIRCH_ORIGIN_Y = 72 / 76;  // beržo kamieno apačia
export const TUFT_VARIANTS = 3;
export const LILY_VARIANTS = 2;

export function makeNature(scene) {
  for (const season of SEASON_KEYS) {
    const look = SEASON_LOOK[season];
    makePine(scene, sk('pine', season), season);
    makeBirch(scene, sk('birch', season), season, look);
    for (let i = 0; i < TUFT_VARIANTS; i++) makeTuft(scene, sk(`tuft_${i}`, season), 40 + i * 9, look);
    makeReeds(scene, sk('reeds', season), season);
  }
  makePebbles(scene);
  makeClover(scene);
  makeMushrooms(scene);
  for (let i = 0; i < LILY_VARIANTS; i++) makeLily(scene, `lily_${i}`, i === 1);
  makeBlob(scene, 'blob_light', '#ffffff');
  makeBlob(scene, 'blob_dark', '#000000');
}

function drawScaled(scene, key, w, h, fn) {
  drawTexture(scene, key, w * S, h * S, (ctx) => {
    ctx.scale(S, S);
    fn(ctx);
  });
}

// ---------- Eglė (48 x 80 vnt.) ----------
// Keli „aukštai“ trikampių šakų; žiemą ant jų – sniegas
function makePine(scene, key, season) {
  const green = season === 'autumn' ? 0x2f6a3a : season === 'spring' ? 0x3a8048 : 0x2f7440;
  drawScaled(scene, key, 48, 80, (ctx) => {
    softShadow(ctx, 24, 75, 15, 4.5, 0.38);
    // kamienas
    ctx.beginPath();
    ctx.rect(21.5, 58, 5, 18);
    const bark = ctx.createLinearGradient(21.5, 0, 26.5, 0);
    bark.addColorStop(0, css(0x6a4020));
    bark.addColorStop(1, css(0x3a2210));
    fillStroke(ctx, bark, OUTLINE, 0.6);
    // šakų aukštai: [viršūnės y, apačios y, pusplotis]
    const tiers = [[4, 26, 10], [14, 40, 14], [26, 54, 18], [38, 66, 21]];
    for (let i = tiers.length - 1; i >= 0; i--) {
      const [top, bottom, half] = tiers[i];
      // tamsi šešėlio forma
      ctx.beginPath();
      ctx.moveTo(24, top + 1);
      ctx.lineTo(24 + half + 1, bottom + 1.5);
      ctx.quadraticCurveTo(24, bottom - 2, 24 - half - 1, bottom + 1.5);
      ctx.closePath();
      ctx.fillStyle = css(darken(green, 0.5));
      ctx.fill();
      // pagrindinė forma su gradientu (kairė šviesesnė)
      ctx.beginPath();
      ctx.moveTo(24, top);
      ctx.lineTo(24 + half, bottom);
      ctx.quadraticCurveTo(24, bottom - 3.5, 24 - half, bottom);
      ctx.closePath();
      const g = ctx.createLinearGradient(24 - half, top, 24 + half, bottom);
      g.addColorStop(0, css(lighten(green, 0.3)));
      g.addColorStop(0.5, css(green));
      g.addColorStop(1, css(darken(green, 0.35)));
      fillStroke(ctx, g, OUTLINE, 0.6);
      // spygliuotas kraštas – smulkūs dantukai
      ctx.strokeStyle = css(darken(green, 0.45), 0.7);
      ctx.lineWidth = 0.5;
      for (let k = -half + 2; k < half - 1; k += 3) {
        const y = bottom - 3.5 * (1 - (k / half) ** 2);
        ctx.beginPath();
        ctx.moveTo(24 + k, y - 0.5);
        ctx.lineTo(24 + k + 1.2, y + 1.2);
        ctx.stroke();
      }
      if (season === 'winter') {
        // sniegas ant šakų
        ctx.beginPath();
        ctx.moveTo(24, top + 0.5);
        ctx.lineTo(24 + half * 0.55, top + (bottom - top) * 0.6);
        ctx.quadraticCurveTo(24, top + (bottom - top) * 0.45, 24 - half * 0.7, top + (bottom - top) * 0.62);
        ctx.closePath();
        ctx.fillStyle = 'rgba(245,250,255,0.95)';
        ctx.fill();
      }
    }
    // šviesūs blyksniai (spygliai saulėje)
    const rnd = seededRandom(season.length * 13);
    for (let i = 0; i < 22; i++) {
      const tier = tiers[Math.floor(rnd() * tiers.length)];
      const y = tier[0] + 4 + rnd() * (tier[1] - tier[0] - 6);
      const span = ((y - tier[0]) / (tier[1] - tier[0])) * tier[2];
      const x = 24 - span * 0.9 + rnd() * span;
      ellipse(ctx, x, y, 1.2, 0.6, -0.5);
      ctx.fillStyle = css(lighten(green, 0.45), 0.5);
      ctx.fill();
    }
  });
}

// ---------- Beržas (40 x 76 vnt.) ----------
function makeBirch(scene, key, season, look) {
  const leaves = season === 'autumn' ? 0xe8c03a : season === 'spring' ? 0x8fd060 : 0x6ab04a;
  drawScaled(scene, key, 40, 76, (ctx) => {
    softShadow(ctx, 20, 71, 12, 4, 0.35);
    // baltas kamienas su juodais brūkšniais
    ctx.beginPath();
    ctx.moveTo(18, 72);
    ctx.lineTo(18.8, 30);
    ctx.lineTo(21.6, 30);
    ctx.lineTo(22.4, 72);
    ctx.closePath();
    const bark = ctx.createLinearGradient(18, 0, 22.4, 0);
    bark.addColorStop(0, css(0xffffff));
    bark.addColorStop(1, css(0xc8c4bc));
    fillStroke(ctx, bark, OUTLINE, 0.6);
    ctx.fillStyle = css(0x2b2b2b);
    for (const [y, w] of [[36, 1.6], [43, 2.2], [50, 1.4], [57, 2], [64, 1.6]]) ctx.fillRect(18.6 + (y % 3) * 0.3, y, w, 0.8);
    // šakelės
    ctx.strokeStyle = css(0x4a3a2a);
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    for (const [x1, y1, x2, y2] of [[20, 38, 12, 28], [20.6, 34, 28, 24], [20, 30, 18, 16], [20.8, 30, 25, 14]]) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    if (season === 'winter') {
      ctx.strokeStyle = 'rgba(245,250,255,0.95)';
      ctx.lineWidth = 0.6;
      for (const [x1, y1, x2, y2] of [[16, 32, 12, 28], [24, 28, 28, 24], [19, 22, 18, 16]]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1 - 0.5);
        ctx.lineTo(x2, y2 - 0.5);
        ctx.stroke();
      }
      return;
    }
    // reta, „ore kabanti“ laja iš mažų lapų debesėlių
    const blobs = [[20, 14, 8], [11, 24, 7], [29, 22, 7.5], [16, 33, 6], [26, 32, 6], [20, 24, 8]];
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y + 1.5, r + 0.6);
      ctx.fillStyle = css(darken(leaves, 0.5), 0.8);
      ctx.fill();
    }
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y, r);
      ctx.fillStyle = radialShade(ctx, x, y, r, leaves, 0.35, 0.35);
      ctx.fill();
    }
    const rnd = seededRandom(77);
    for (let i = 0; i < 60; i++) {
      const [bx, by, br] = blobs[Math.floor(rnd() * blobs.length)];
      const a = rnd() * Math.PI * 2;
      const d = rnd() * br * 0.9;
      ellipse(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 1.1, 0.7, a);
      ctx.fillStyle = rnd() > 0.5 ? css(lighten(leaves, 0.45), 0.6) : css(darken(leaves, 0.4), 0.45);
      ctx.fill();
    }
    if (look.blossom) {
      // pavasarį – šviesūs žirginiai
      for (let i = 0; i < 10; i++) {
        const [bx, by, br] = blobs[Math.floor(rnd() * blobs.length)];
        ellipse(ctx, bx + (rnd() - 0.5) * br, by + (rnd() - 0.5) * br, 0.5, 1.4);
        ctx.fillStyle = css(0xd8e88a);
        ctx.fill();
      }
    }
  });
}

// ---------- Žolės kuokštelis (langelio dydžio, permatomas) ----------
function makeTuft(scene, key, seed, look) {
  drawScaled(scene, key, 32, 32, (ctx) => {
    if (look.snow) {
      // žiemą – tik kelios sausos žolelės iš sniego
      ctx.strokeStyle = css(0x9a8a5a, 0.9);
      ctx.lineWidth = 0.6;
      for (const [x, h] of [[13, 4], [15, 5], [17, 3.5]]) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x + 0.6, 22 - h);
        ctx.stroke();
      }
      return;
    }
    const rnd = seededRandom(seed);
    const cx = 8 + rnd() * 16;
    const cy = 16 + rnd() * 10;
    ellipse(ctx, cx, cy + 0.5, 5, 1.6);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const x = cx - 4 + rnd() * 8;
      const h = 3.5 + rnd() * 4.5;
      const bend = (rnd() - 0.5) * 3;
      ctx.beginPath();
      ctx.moveTo(x, cy);
      ctx.quadraticCurveTo(x + bend * 0.3, cy - h * 0.6, x + bend, cy - h);
      ctx.strokeStyle = css(rnd() > 0.5 ? look.blade1 : lighten(look.blade2, 0.1), 0.95);
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }
  });
}

function makePebbles(scene) {
  drawScaled(scene, 'pebbles', 32, 32, (ctx) => {
    const rnd = seededRandom(5);
    for (let i = 0; i < 4; i++) {
      const x = 8 + rnd() * 16;
      const y = 10 + rnd() * 14;
      const r = 0.9 + rnd() * 1.3;
      ellipse(ctx, x, y + 0.5, r, r * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
      ellipse(ctx, x, y, r, r * 0.7);
      ctx.fillStyle = radialShade(ctx, x, y, r, rnd() > 0.5 ? 0xa8a49c : 0x8e8a82, 0.4, 0.3);
      ctx.fill();
    }
  });
}

function makeClover(scene) {
  drawScaled(scene, 'clover', 32, 32, (ctx) => {
    const rnd = seededRandom(9);
    for (let i = 0; i < 3; i++) {
      const x = 8 + rnd() * 16;
      const y = 10 + rnd() * 14;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        circle(ctx, x + Math.cos(a) * 1.1, y + Math.sin(a) * 1.1, 1.05);
        ctx.fillStyle = css(0x4a9a3a);
        ctx.fill();
      }
      if (i === 0) {
        circle(ctx, x + 3, y - 2, 1.2);
        ctx.fillStyle = css(0xf0e8ff);
        ctx.fill();
      }
    }
  });
}

function makeMushrooms(scene) {
  drawScaled(scene, 'mushrooms', 32, 32, (ctx) => {
    for (const [x, y, s] of [[14, 22, 1], [18.5, 20, 0.75]]) {
      softShadow(ctx, x, y + 0.5, 3 * s, 1 * s, 0.3);
      ctx.beginPath();
      ctx.rect(x - 0.9 * s, y - 3.4 * s, 1.8 * s, 3.4 * s);
      fillStroke(ctx, 0xf4ecd8, OUTLINE, 0.4);
      ctx.beginPath();
      ctx.ellipse(x, y - 3.4 * s, 3.2 * s, 2.2 * s, 0, Math.PI, 0);
      ctx.closePath();
      fillStroke(ctx, radialShade(ctx, x - 1, y - 4.5 * s, 3.4 * s, 0xd8322a, 0.35, 0.3), OUTLINE, 0.5);
      for (const [dx, dy] of [[-1.4, -4.4], [0.8, -5], [1.8, -3.8]]) {
        circle(ctx, x + dx * s, y + dy * s, 0.45 * s);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
  });
}

// ---------- Vandens lelija (ant vandens) ----------
function makeLily(scene, key, withFlower) {
  drawScaled(scene, key, 32, 32, (ctx) => {
    for (const [x, y, r, a] of withFlower ? [[14, 15, 5, 0.6]] : [[12, 12, 4.5, 2], [21, 20, 3.5, -0.5]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, a + 0.35, a + Math.PI * 2 - 0.35);
      ctx.closePath();
      fillStroke(ctx, radialShade(ctx, x - 1, y - 1, r, 0x4a9a3a, 0.3, 0.3), 0x1e4a1e, 0.5);
    }
    if (withFlower) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        ellipse(ctx, 15 + Math.cos(a) * 1.8, 13 + Math.sin(a) * 1.2, 1.6, 0.9, a);
        ctx.fillStyle = css(k % 2 ? 0xffd0e0 : 0xffffff);
        ctx.fill();
      }
      circle(ctx, 15, 13, 0.9);
      ctx.fillStyle = css(0xffd54f);
      ctx.fill();
    }
  });
}

// ---------- Nendrės (prie kranto) ----------
function makeReeds(scene, key, season) {
  const stem = season === 'winter' || season === 'autumn' ? 0xa08a50 : 0x4a8a3a;
  drawScaled(scene, key, 32, 32, (ctx) => {
    const rnd = seededRandom(31);
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const x = 6 + rnd() * 20;
      const base = 26 + rnd() * 4;
      const h = 10 + rnd() * 10;
      const bend = (rnd() - 0.5) * 4;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + bend * 0.3, base - h * 0.5, x + bend, base - h);
      ctx.strokeStyle = css(mix(stem, rnd() > 0.5 ? 0xffffff : 0x000000, 0.12));
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // švendrų „burbuolės“
      if (i % 2 === 0) {
        ellipse(ctx, x + bend * 0.85, base - h * 0.85, 0.9, 2.2, bend * 0.05);
        ctx.fillStyle = css(0x6a4020);
        ctx.fill();
      }
    }
    if (season === 'winter') {
      ctx.fillStyle = 'rgba(245,250,255,0.85)';
      ctx.fillRect(6, 27, 20, 2);
    }
  });
}

// ---------- Dėmė: didelis švelnus ratas (3 x 3 langeliai) ----------
function makeBlob(scene, key, color) {
  drawTexture(scene, key, T * 3, T * 3, (ctx) => {
    const g = ctx.createRadialGradient(T * 1.5, T * 1.5, 0, T * 1.5, T * 1.5, T * 1.5);
    g.addColorStop(0, color);
    g.addColorStop(1, color === '#ffffff' ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, T * 3, T * 3);
  });
}

