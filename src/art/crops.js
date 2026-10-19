import { CONFIG } from '../config.js';
import {
  S, drawTexture, css, darken, lighten, circle, ellipse, fillStroke, radialShade, leaf,
} from './utils.js';

// =====================================================================
//  AUGALAI
//  Kiekvienai stadijai – atskira tekstūra crop_<id>_<stadija>.
//  Tekstūra 32 x 48 vnt. (aukštesnė už langelį, kad tilptų kukurūzai);
//  žemės paviršius – ties y = 38. Rodoma su origin (0.5, 1) langelio apačioje.
//
//  Išvaizda parenkama pagal CONFIG.CROPS[...].art:
//    'root' – šakniavaisis (kaip morka), 'bush' – krūmelis (kaip pomidoras),
//    'tall' – aukštas augalas (kaip kukurūzas)
// =====================================================================

const OUTLINE = 0x2b1d14;
const GROUND = 38;
export const CROP_TEX_W = 32 * S;
export const CROP_TEX_H = 48 * S;

const LEAF = 0x3f9a36;

export function makeCrops(scene) {
  for (const [cropId, crop] of Object.entries(CONFIG.CROPS)) {
    for (let stage = 0; stage < crop.stages; stage++) {
      const p = stage / (crop.stages - 1); // progresas 0 … 1
      drawTexture(scene, `crop_${cropId}_${stage}`, CROP_TEX_W, CROP_TEX_H, (ctx) => {
        ctx.scale(S, S);
        if (stage === 0) return drawSeedMound(ctx);
        if (crop.art === 'root') drawCarrotPlant(ctx, p, crop.color);
        else if (crop.art === 'bush') drawTomatoPlant(ctx, p, crop.color, crop.shape);
        else if (crop.art === 'tall') drawCornPlant(ctx, p, crop.color);
        else if (crop.art === 'leafy') drawLeafyPlant(ctx, p, crop.color);
        else if (crop.art === 'ground') drawGroundPlant(ctx, p, crop.color, crop.shape);
        else if (crop.art === 'flower') drawFlowerPlant(ctx, p, crop.color);
        else drawGenericPlant(ctx, p, crop.color);
      });
    }
  }

  // Nuvytęs augalas (kai pasikeitė sezonas): rudi, nukarę stiebai
  drawTexture(scene, 'crop_dead', CROP_TEX_W, CROP_TEX_H, (ctx) => {
    ctx.scale(S, S);
    groundShadow(ctx, 6);
    for (const [angle, len] of [[-2.2, 9], [-1.6, 11], [-1.1, 8], [-0.6, 7]]) {
      ctx.beginPath();
      ctx.moveTo(16, GROUND);
      const ex = 16 + Math.cos(angle) * len;
      const ey = GROUND + Math.sin(angle) * len;
      ctx.quadraticCurveTo(16 + Math.cos(angle) * len * 0.5, ey - 2, ex, ey + 3);
      ctx.strokeStyle = css(0x6b4e2a);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      leaf(ctx, ex, ey + 3, 3.5, 1.2, Math.PI / 2 + (angle + 1.4) * 0.6, 0x8a6a3a, 0.3);
    }
  });
}

// Ką tik pasodinta: kauburėlis su sėkla
function drawSeedMound(ctx) {
  ellipse(ctx, 16, GROUND, 6.5, 2.8);
  ctx.fillStyle = css(0x3a2210);
  ctx.fill();
  ellipse(ctx, 15.4, GROUND - 0.8, 4.5, 1.4);
  ctx.fillStyle = css(0x6b4224, 0.8);
  ctx.fill();
  ellipse(ctx, 16, GROUND - 1.1, 1.4, 0.95, 0.4);
  fillStroke(ctx, 0xf0dfa8, OUTLINE, 0.35);
}

// Mažas daigelis (bendras visiems ankstyvoms stadijoms)
function drawSprout(ctx, p) {
  const h = 3 + p * 8;
  ctx.strokeStyle = css(0x2f7a2a);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(16, GROUND);
  ctx.lineTo(16, GROUND - h);
  ctx.stroke();
  leaf(ctx, 16, GROUND - h, 4 + p * 3, 1.6, -0.5, LEAF);
  leaf(ctx, 16, GROUND - h, 4 + p * 3, 1.6, Math.PI + 0.5, LEAF, -0.25);
}

function groundShadow(ctx, rx) {
  ellipse(ctx, 16, GROUND + 0.3, rx, 1.8);
  ctx.fillStyle = 'rgba(20,10,0,0.35)';
  ctx.fill();
}

// ---------- Morka (šakniavaisis) ----------
function drawCarrotPlant(ctx, p, color) {
  groundShadow(ctx, 5 + p * 3);
  if (p < 0.34) return drawSprout(ctx, p * 2);
  const ripe = p >= 1;
  if (ripe) {
    // morkos „pečiai“ išlindę iš žemės
    ellipse(ctx, 16, GROUND - 0.5, 3.6, 2.4);
    fillStroke(ctx, radialShade(ctx, 16, GROUND - 0.5, 3.6, color, 0.35, 0.25), OUTLINE, 0.5);
    ctx.strokeStyle = css(darken(color, 0.35), 0.7);
    ctx.lineWidth = 0.35;
    ctx.beginPath();
    ctx.moveTo(13.6, GROUND - 0.6); ctx.lineTo(15, GROUND - 0.2);
    ctx.moveTo(17, GROUND + 0.6); ctx.lineTo(18.6, GROUND);
    ctx.stroke();
  }
  // plunksniški lapai
  const stems = 3 + Math.round(p * 4);
  for (let i = 0; i < stems; i++) {
    const t = stems === 1 ? 0.5 : i / (stems - 1);
    const angle = -Math.PI / 2 + (t - 0.5) * 1.4;
    const len = 7 + p * 9 - Math.abs(t - 0.5) * 4;
    drawFrond(ctx, 16, GROUND - 1.5, angle, len);
  }
}

function drawFrond(ctx, x, y, angle, len) {
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  ctx.strokeStyle = css(0x3a8a2c);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  for (let k = 0.35; k <= 1; k += 0.16) {
    const lx = x + (ex - x) * k;
    const ly = y + (ey - y) * k;
    leaf(ctx, lx, ly, 2.6, 0.9, angle - 0.7, 0x56b23f, 0.1);
    leaf(ctx, lx, ly, 2.6, 0.9, angle + 0.7, 0x4aa437, -0.1);
  }
}

// ---------- Pomidoras (krūmelis); shape keičia vaisių formą ----------
function drawTomatoPlant(ctx, p, color, shape = 'round') {
  groundShadow(ctx, 5 + p * 4);
  if (p < 0.34) return drawSprout(ctx, p * 2);

  // atrama
  const stakeH = 10 + p * 22;
  ctx.beginPath();
  ctx.rect(20.4, GROUND - stakeH, 1.6, stakeH + 1);
  fillStroke(ctx, 0xa77845, OUTLINE, 0.4);

  // stiebas (vingiuojantis)
  const h = 8 + p * 22;
  ctx.strokeStyle = css(0x2f7a2a);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(16, GROUND);
  ctx.bezierCurveTo(14, GROUND - h * 0.35, 19, GROUND - h * 0.65, 16.5, GROUND - h);
  ctx.stroke();

  const leaves = 3 + Math.round(p * 5);
  for (let i = 0; i < leaves; i++) {
    const t = (i + 1) / (leaves + 1);
    const y = GROUND - h * t;
    const x = 16 + Math.sin(t * 6) * 1.5;
    const right = i % 2 === 0;
    leaf(ctx, x, y, 5.5 + p * 1.5, 2.2, right ? -0.35 : Math.PI + 0.35, 0x3d9437, right ? -0.2 : 0.2);
  }

  if (p >= 0.6 && p < 1) {
    for (const [x, y] of [[13, GROUND - h * 0.45], [19, GROUND - h * 0.7]]) {
      circle(ctx, x, y, 1.7);
      fillStroke(ctx, radialShade(ctx, x, y, 1.7, 0x8bc34a), OUTLINE, 0.35);
    }
  }
  if (p >= 1) {
    for (const [x, y, r] of [[12.5, GROUND - h * 0.4, 3], [19.5, GROUND - h * 0.55, 2.8], [14, GROUND - h * 0.78, 2.5], [18.5, GROUND - h * 0.25, 2.4]]) {
      if (shape === 'long') drawPepper(ctx, x, y + r, r * 2.6, 0.2, color);
      else if (shape === 'berry') drawStrawberry(ctx, x, y, r * 1.1, color);
      else if (shape === 'cluster') drawBerryCluster(ctx, x, y, r * 0.9, color);
      else drawTomato(ctx, x, y, r, color);
    }
  }
}

// ---------- Lapinės daržovės (salotos, kopūstai) ----------
function drawLeafyPlant(ctx, p, color) {
  groundShadow(ctx, 4 + p * 7);
  if (p < 0.34) return drawSprout(ctx, p * 2);
  const r = 3 + p * 6;
  const cy = GROUND - r * 0.55;
  // išoriniai lapai rozete
  const outer = 5 + Math.round(p * 3);
  for (let i = 0; i < outer; i++) {
    const a = Math.PI + (i / (outer - 1)) * Math.PI;
    leaf(ctx, 16, cy + 1, r * 1.25, r * 0.5, a, darken(color, 0.15), 0.35);
  }
  if (p >= 1) {
    // subrendusi galva
    circle(ctx, 16, cy - 0.5, r * 0.75);
    fillStroke(ctx, radialShade(ctx, 16, cy - 0.5, r * 0.75, lighten(color, 0.1), 0.4, 0.25), OUTLINE, 0.5);
    ctx.strokeStyle = css(darken(color, 0.3), 0.6);
    ctx.lineWidth = 0.4;
    for (const a of [-0.9, -0.3, 0.3, 0.9]) {
      ctx.beginPath();
      ctx.arc(16 + Math.sin(a) * r * 0.2, cy, r * 0.55, Math.PI + a * 0.4, Math.PI * 1.6 + a * 0.4);
      ctx.stroke();
    }
  } else {
    circle(ctx, 16, cy, r * 0.45);
    fillStroke(ctx, radialShade(ctx, 16, cy, r * 0.45, color), OUTLINE, 0.4);
  }
}

// ---------- Ant žemės augantys (moliūgai, melionai) ----------
function drawGroundPlant(ctx, p, color, shape) {
  groundShadow(ctx, 5 + p * 7);
  if (p < 0.25) return drawSprout(ctx, p * 3);
  // vijokliai ir platūs lapai ant žemės
  ctx.strokeStyle = css(0x3f8a2c);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(16, GROUND);
  ctx.bezierCurveTo(10, GROUND - 2, 6, GROUND + 1, 4 + (1 - p) * 6, GROUND - 1);
  ctx.moveTo(16, GROUND);
  ctx.bezierCurveTo(22, GROUND - 3, 26, GROUND, 28 - (1 - p) * 6, GROUND - 2);
  ctx.stroke();
  const leaves = 2 + Math.round(p * 4);
  for (let i = 0; i < leaves; i++) {
    const right = i % 2 === 0;
    const x = 16 + (right ? 1 : -1) * (2 + i * 2);
    leaf(ctx, x, GROUND - 1, 4 + p * 2, 2.6, right ? -1.2 : Math.PI + 1.2, 0x4f9d3a, right ? -0.3 : 0.3);
  }
  if (p >= 0.5 && p < 1) {
    // geltoni žiedai, vėliau – mažas žalias vaisius
    for (const [x, y] of [[11, GROUND - 3], [21, GROUND - 2]]) {
      circle(ctx, x, y, 1.3);
      fillStroke(ctx, 0xffd54f, OUTLINE, 0.3);
    }
    if (p >= 0.74) {
      ellipse(ctx, 16, GROUND - 1.5, 2.6, 2);
      fillStroke(ctx, radialShade(ctx, 16, GROUND - 1.5, 2.6, 0x8bc34a), OUTLINE, 0.4);
    }
  }
  if (p >= 1) drawGroundFruit(ctx, 16, GROUND - 3.5, 7, color, shape);
}

// Didelis vaisius (moliūgas – su briaunomis, melionas – su tinkleliu)
export function drawGroundFruit(ctx, cx, cy, r, color, shape) {
  ellipse(ctx, cx, cy, r, r * 0.78);
  fillStroke(ctx, radialShade(ctx, cx, cy, r, color, 0.35, 0.35), OUTLINE, 0.6);
  ctx.save();
  ellipse(ctx, cx, cy, r, r * 0.78);
  ctx.clip();
  ctx.strokeStyle = css(darken(color, 0.35), 0.65);
  ctx.lineWidth = 0.45;
  if (shape === 'net') {
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * r * 0.32 - r, cy - r); ctx.lineTo(cx + i * r * 0.32 + r, cy + r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + i * r * 0.32 + r, cy - r); ctx.lineTo(cx + i * r * 0.32 - r, cy + r); ctx.stroke();
    }
  } else {
    for (const k of [-0.6, -0.25, 0.25, 0.6]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * Math.abs(k), r * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
  // kotelis
  ctx.beginPath();
  ctx.rect(cx - 0.7, cy - r * 0.78 - 1.8, 1.4, 2.4);
  fillStroke(ctx, 0x5f7f2a, OUTLINE, 0.3);
}

// ---------- Žydintys (saulėgrąžos) ----------
function drawFlowerPlant(ctx, p, color) {
  groundShadow(ctx, 4 + p * 3);
  if (p < 0.25) return drawSprout(ctx, p * 3);
  const h = 8 + p * 26;
  const top = GROUND - h;
  ctx.beginPath();
  ctx.roundRect(15.2, top, 1.8, h, 0.8);
  fillStroke(ctx, 0x4f9d3a, OUTLINE, 0.35);
  const count = 1 + Math.round(p * 3);
  for (let i = 0; i < count; i++) {
    const y = GROUND - 4 - i * (h / (count + 1));
    const right = i % 2 === 0;
    leaf(ctx, 16, y, 5 + p * 2, 2.6, right ? -0.4 : Math.PI + 0.4, 0x4f9d3a, right ? -0.3 : 0.3);
  }
  if (p >= 1) drawSunflowerHead(ctx, 16, top + 1, 6.5, color);
  else if (p >= 0.5) {
    // žalias pumpuras
    circle(ctx, 16, top, 2 + p * 1.5);
    fillStroke(ctx, radialShade(ctx, 16, top, 3, 0x7cb342), OUTLINE, 0.4);
  }
}

export function drawSunflowerHead(ctx, cx, cy, r, color) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ellipse(ctx, cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72, r * 0.38, r * 0.16, a);
    fillStroke(ctx, i % 2 ? color : lighten(color, 0.2), OUTLINE, 0.25);
  }
  circle(ctx, cx, cy, r * 0.46);
  fillStroke(ctx, radialShade(ctx, cx, cy, r * 0.46, 0x6b4020, 0.3, 0.3), OUTLINE, 0.4);
  ctx.fillStyle = css(0x3a2210, 0.7);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    circle(ctx, cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22, r * 0.05);
    ctx.fill();
  }
}

// ---------- Kitos vaisių formos (naudojamos ir ikonoms) ----------
export function drawPepper(ctx, cx, cy, len, angle, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = len * 0.32;
  ctx.beginPath();
  ctx.moveTo(-w, -len * 0.42);
  ctx.quadraticCurveTo(-w * 1.15, len * 0.2, 0, len * 0.5);
  ctx.quadraticCurveTo(w * 1.15, len * 0.2, w, -len * 0.42);
  ctx.quadraticCurveTo(0, -len * 0.55, -w, -len * 0.42);
  fillStroke(ctx, radialShade(ctx, -w * 0.3, 0, len * 0.5, color, 0.45, 0.3), OUTLINE, 0.45);
  ctx.beginPath();
  ctx.rect(-0.6, -len * 0.62, 1.2, len * 0.2);
  fillStroke(ctx, 0x3f8f2f, OUTLINE, 0.3);
  ctx.restore();
}

export function drawStrawberry(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.5);
  ctx.quadraticCurveTo(cx - r, cy + r * 0.6, cx, cy + r * 1.2);
  ctx.quadraticCurveTo(cx + r, cy + r * 0.6, cx + r, cy - r * 0.5);
  ctx.quadraticCurveTo(cx, cy - r * 0.9, cx - r, cy - r * 0.5);
  fillStroke(ctx, radialShade(ctx, cx, cy, r * 1.1, color, 0.4, 0.3), OUTLINE, 0.4);
  ctx.fillStyle = css(0xffe9a8, 0.9);
  for (const [dx, dy] of [[-0.4, 0], [0.4, 0], [0, 0.5], [-0.2, -0.3], [0.25, -0.3], [0, 0.95]]) {
    circle(ctx, cx + dx * r, cy + dy * r * 0.9, r * 0.08);
    ctx.fill();
  }
  for (const a of [-0.6, 0, 0.6]) leaf(ctx, cx, cy - r * 0.55, r * 0.7, r * 0.22, -Math.PI / 2 + a, 0x4caf50, 0.1);
}

export function drawBerryCluster(ctx, cx, cy, r, color) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -0.9], [0, 0.9], [-0.5, 0.45], [0.5, -0.45]]) {
    circle(ctx, cx + dx * r, cy + dy * r, r * 0.62);
    fillStroke(ctx, radialShade(ctx, cx + dx * r, cy + dy * r, r * 0.62, color, 0.5, 0.25), OUTLINE, 0.3);
  }
}

// Apvalus šakniavaisis (ridikas, burokėlis) su lapais viršuje ir šaknele apačioje
export function drawRoundRoot(ctx, cx, cy, r, color) {
  for (const a of [-0.45, 0, 0.45]) leaf(ctx, cx, cy - r * 0.8, r * 1.3, r * 0.3, -Math.PI / 2 + a, 0x4aa437, 0.15);
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.9);
  ctx.lineTo(cx + 0.3, cy + r * 1.6);
  ctx.strokeStyle = css(darken(color, 0.3));
  ctx.lineWidth = 0.6;
  ctx.stroke();
  circle(ctx, cx, cy, r);
  fillStroke(ctx, radialShade(ctx, cx, cy, r, color, 0.45, 0.3), OUTLINE, 0.5);
}

// Česnako galvutė
export function drawGarlic(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.5);
  ctx.quadraticCurveTo(cx + r * 1.3, cy - r * 0.2, cx + r * 0.9, cy + r * 0.8);
  ctx.quadraticCurveTo(cx, cy + r * 1.2, cx - r * 0.9, cy + r * 0.8);
  ctx.quadraticCurveTo(cx - r * 1.3, cy - r * 0.2, cx, cy - r * 1.5);
  fillStroke(ctx, radialShade(ctx, cx, cy, r * 1.2, color, 0.3, 0.2), OUTLINE, 0.5);
  ctx.strokeStyle = css(darken(color, 0.25), 0.8);
  ctx.lineWidth = 0.4;
  for (const k of [-0.45, 0, 0.45]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.3);
    ctx.quadraticCurveTo(cx + k * r * 1.6, cy, cx + k * r, cy + r * 0.9);
    ctx.stroke();
  }
}

// Lapinės galvos ikona (salotos, kopūstai)
export function drawLeafyHead(ctx, cx, cy, r, color) {
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.9 + (i / 6) * Math.PI * 1.2;
    leaf(ctx, cx, cy + r * 0.2, r * 1.15, r * 0.45, a, darken(color, 0.15), 0.3);
  }
  circle(ctx, cx, cy, r * 0.75);
  fillStroke(ctx, radialShade(ctx, cx, cy, r * 0.75, lighten(color, 0.1), 0.4, 0.25), OUTLINE, 0.5);
}

// Pomidoras (naudojama ir ikonoms)
export function drawTomato(ctx, cx, cy, r, color = 0xe53935) {
  circle(ctx, cx, cy, r);
  fillStroke(ctx, radialShade(ctx, cx, cy, r, color, 0.4, 0.35), OUTLINE, 0.45);
  // žalia taurelė-žvaigždutė
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r * 0.55 : r * 0.18;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * rr, cy - r * 0.78 + Math.sin(a) * rr * 0.55);
  }
  ctx.closePath();
  ctx.fillStyle = css(0x3f8f2f);
  ctx.fill();
  ellipse(ctx, cx - r * 0.38, cy - r * 0.28, r * 0.25, r * 0.17, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
}

// ---------- Kukurūzas (aukštas augalas) ----------
function drawCornPlant(ctx, p, color) {
  groundShadow(ctx, 4 + p * 4);
  if (p < 0.2) return drawSprout(ctx, p * 3);

  const h = 8 + p * 28;
  const top = GROUND - h;
  // stiebas su bambliais
  ctx.beginPath();
  ctx.roundRect(15, top, 2.2, h + 0.5, 1);
  const stalk = ctx.createLinearGradient(15, 0, 17.2, 0);
  stalk.addColorStop(0, css(0x6bb34a));
  stalk.addColorStop(1, css(0x3f7f2c));
  fillStroke(ctx, stalk, OUTLINE, 0.4);
  ctx.strokeStyle = css(0x2f6022, 0.7);
  ctx.lineWidth = 0.5;
  for (let y = GROUND - 5; y > top + 2; y -= 6) {
    ctx.beginPath(); ctx.moveTo(15, y); ctx.lineTo(17.2, y); ctx.stroke();
  }

  // ilgi lenkti lapai
  const count = 2 + Math.round(p * 4);
  for (let i = 0; i < count; i++) {
    const y = GROUND - 3 - i * (h / (count + 0.4));
    const right = i % 2 === 0;
    const len = 9 + p * 5 - i * 0.6;
    leaf(ctx, 16.1, y, len, 1.7, right ? -0.55 : Math.PI + 0.55, 0x4f9d3a, right ? -0.7 : 0.7);
  }

  // šluotelė viršuje
  if (p >= 0.7) {
    ctx.strokeStyle = css(0xd9b65a);
    ctx.lineWidth = 0.6;
    for (const a of [-0.9, -0.5, -0.1, 0.3, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(16.1, top + 0.5);
      ctx.quadraticCurveTo(16.1 + Math.sin(a) * 3, top - 3, 16.1 + Math.sin(a) * 4.5, top - 1.5);
      ctx.stroke();
    }
  }

  if (p >= 1) {
    drawCornCob(ctx, 19.2, GROUND - h * 0.45, 7, 0.35, color);
    drawCornCob(ctx, 13, GROUND - h * 0.62, 6, -0.4, color);
  }
}

// Kukurūzo burbuolė (naudojama ir ikonoms). len – ilgis, angle – posvyris
export function drawCornCob(ctx, cx, cy, len, angle, color = 0xfdd835) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = len * 0.36;
  // grūdeliai
  ellipse(ctx, 0, 0, w, len / 2);
  fillStroke(ctx, radialShade(ctx, 0, 0, len / 2, color, 0.35, 0.3), OUTLINE, 0.45);
  ctx.save();
  ellipse(ctx, 0, 0, w, len / 2);
  ctx.clip();
  ctx.strokeStyle = css(darken(color, 0.35), 0.55);
  ctx.lineWidth = 0.3;
  for (let y = -len / 2; y < len / 2; y += len / 9) {
    ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = -w; x < w; x += w / 2.2) {
    ctx.beginPath(); ctx.moveTo(x, -len / 2); ctx.lineTo(x, len / 2); ctx.stroke();
  }
  ctx.restore();
  // lukštai
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, len * 0.55);
    ctx.quadraticCurveTo(side * w * 1.6, len * 0.1, side * w * 0.5, -len * 0.25);
    ctx.quadraticCurveTo(side * w * 0.9, len * 0.2, 0, len * 0.55);
    fillStroke(ctx, side < 0 ? 0x6fbf4a : 0x4f9d3a, OUTLINE, 0.35);
  }
  // plaukeliai
  ctx.strokeStyle = css(0xc98a3a);
  ctx.lineWidth = 0.35;
  for (const dx of [-0.6, 0, 0.6]) {
    ctx.beginPath();
    ctx.moveTo(dx, -len / 2);
    ctx.quadraticCurveTo(dx + 0.8, -len / 2 - 1.2, dx + 0.3, -len / 2 - 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Morka (ikonoms): smailėjanti šaknis su lapais
export function drawCarrot(ctx, cx, cy, len, angle, color = 0xff7f11) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const w = len * 0.2;
  // lapai
  for (const a of [-0.5, -0.15, 0.2, 0.5]) {
    leaf(ctx, 0, -len / 2 + 0.5, len * 0.45, len * 0.07, -Math.PI / 2 + a, 0x4aa437, 0.1);
  }
  ctx.beginPath();
  ctx.moveTo(-w, -len / 2);
  ctx.quadraticCurveTo(-w * 1.05, len * 0.1, 0, len / 2);
  ctx.quadraticCurveTo(w * 1.05, len * 0.1, w, -len / 2);
  ctx.quadraticCurveTo(0, -len / 2 - w * 0.6, -w, -len / 2);
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, css(lighten(color, 0.3)));
  g.addColorStop(0.5, css(color));
  g.addColorStop(1, css(darken(color, 0.3)));
  fillStroke(ctx, g, OUTLINE, 0.5);
  ctx.strokeStyle = css(darken(color, 0.4), 0.7);
  ctx.lineWidth = 0.35;
  for (let i = 0; i < 4; i++) {
    const y = -len / 2 + len * (0.2 + i * 0.18);
    const ww = w * (1 - (i * 0.2 + 0.1));
    ctx.beginPath();
    ctx.moveTo(-ww, y);
    ctx.lineTo(-ww * 0.2, y + 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGenericPlant(ctx, p, color) {
  drawSprout(ctx, p);
  if (p >= 1) {
    circle(ctx, 16, GROUND - 10, 3);
    fillStroke(ctx, radialShade(ctx, 16, GROUND - 10, 3, color), OUTLINE, 0.4);
  }
}
