import { CONFIG } from '../config.js';
import {
  T, S, seededRandom, drawTexture, css, lighten, darken, mix,
  circle, ellipse, roundRect, fillStroke, radialShade, softShadow, vGradient,
} from './utils.js';
import { SEASON_KEYS, SEASON_LOOK, sk } from './seasons.js';
import { NPCS } from '../data/npcs.js';

// =====================================================================
//  OBJEKTAI: medžiai, akmenys, krūmai, parduotuvė, efektai
//  Visi dydžiai – dizaino vienetais (langelis = 32), ctx.scale(S) padidina.
// =====================================================================

const OUTLINE = 0x2b1d14;
export const TREE_VARIANTS = 2;
export const TREE_ORIGIN_Y = 68 / 72; // medžio kamieno apačia (nuo viršaus)

export function makeObjects(scene) {
  // Medžiai ir krūmai – kiekvienam sezonui atskirai (raktas 'tree_0@autumn' ir pan.)
  for (const season of SEASON_KEYS) {
    const look = SEASON_LOOK[season];
    for (let i = 0; i < TREE_VARIANTS; i++) makeTree(scene, sk(`tree_${i}`, season), i === 1, look);
    makeBush(scene, sk('bush', season), look);
  }
  makeRock(scene);
  makeShop(scene);
  makeHouse(scene);
  makeFountain(scene);
  makeBoard(scene);
  // Kaimynų nameliai – tas pats piešinys, tik kitų spalvų stogai
  for (const [npcId, npc] of Object.entries(NPCS)) {
    if (npc.home.cottage) makeHouse(scene, `cottage_${npcId}`, npc.home.roof);
  }
  makeEffects(scene);
}

// Pagalbinė: tekstūra dizaino vienetais
function drawScaled(scene, key, wDesign, hDesign, fn) {
  drawTexture(scene, key, wDesign * S, hDesign * S, (ctx) => {
    ctx.scale(S, S);
    fn(ctx);
  });
}

// ---------- Medis (48 x 72 vnt., kamieno apačia ties y=68) ----------
// look – sezono išvaizda: pavasarį žiedai, vasarą/rudenį – obuoliai (2 variantas),
// rudenį oranžiniai lapai, žiemą – pliki šakos su sniegu
function makeTree(scene, key, withApples, look) {
  drawScaled(scene, key, 48, 72, (ctx) => {
    softShadow(ctx, 24, 67, 17, 5, 0.38);

    // Kamienas su šaknimis
    ctx.beginPath();
    ctx.moveTo(17, 68);
    ctx.quadraticCurveTo(21, 64, 21, 56);
    ctx.lineTo(21.5, 38);
    ctx.lineTo(26.5, 38);
    ctx.lineTo(27, 56);
    ctx.quadraticCurveTo(27, 64, 31, 68);
    ctx.closePath();
    const bark = ctx.createLinearGradient(18, 0, 30, 0);
    bark.addColorStop(0, css(0x5a3519));
    bark.addColorStop(0.45, css(0x8a5a30));
    bark.addColorStop(1, css(0x4a2b13));
    fillStroke(ctx, bark, OUTLINE, 0.7);
    ctx.strokeStyle = css(0x3b220f, 0.6);
    ctx.lineWidth = 0.5;
    for (const [x1, y1, x2, y2] of [[23, 44, 22.6, 52], [25.4, 48, 25.8, 58], [23.6, 58, 23, 64]]) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (!look.leaves) {
      drawBareBranches(ctx, withApples);
      return;
    }

    // Laja: keli persidengiantys „kamuoliai“. Pirma tamsus šešėlinis
    // sluoksnis, tada šviesesni su gradientu – atrodo apimtis.
    const leaves = look.leaves;
    const blobs = [
      [24, 34, 13], [12, 30, 9.5], [36, 30, 9.5], [15, 19, 10],
      [33, 18, 10], [24, 11, 10], [24, 24, 12],
    ];
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y + 2, r + 0.8);
      ctx.fillStyle = css(darken(leaves, 0.5));
      ctx.fill();
    }
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y, r);
      ctx.fillStyle = radialShade(ctx, x, y, r, leaves, 0.35, 0.4);
      ctx.fill();
    }
    // Lapų tekstūra: smulkūs šviesūs ir tamsūs taškeliai
    const rnd = seededRandom(withApples ? 61 : 62);
    for (let i = 0; i < 70; i++) {
      const [bx, by, br] = blobs[Math.floor(rnd() * blobs.length)];
      const a = rnd() * Math.PI * 2;
      const d = rnd() * br * 0.85;
      const x = bx + Math.cos(a) * d;
      const y = by + Math.sin(a) * d;
      const light = y < by;
      ellipse(ctx, x, y, 1.4, 0.9, a);
      if (look.leaves2 && rnd() > 0.5) ctx.fillStyle = css(look.leaves2, 0.8);
      else ctx.fillStyle = light ? css(lighten(leaves, 0.4), 0.55) : css(darken(leaves, 0.45), 0.45);
      ctx.fill();
    }
    // Pavasarį – rausvi žiedai
    if (look.blossom) {
      for (let i = 0; i < (withApples ? 22 : 12); i++) {
        const [bx, by, br] = blobs[Math.floor(rnd() * blobs.length)];
        const a = rnd() * Math.PI * 2;
        const d = rnd() * br * 0.8;
        circle(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 1.1);
        ctx.fillStyle = css(rnd() > 0.3 ? look.blossom : 0xffffff, 0.95);
        ctx.fill();
      }
    }
    if (withApples && !look.blossom) {
      for (const [x, y] of [[14, 28], [31, 22], [22, 33], [36, 32], [20, 16]]) {
        circle(ctx, x, y, 1.9);
        fillStroke(ctx, radialShade(ctx, x, y, 1.9, 0xd8322a), OUTLINE, 0.4);
        circle(ctx, x - 0.6, y - 0.6, 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
      }
    }
  });
}

// Žiemos medis: plikos šakos su sniego kepurėlėmis
function drawBareBranches(ctx, bigger) {
  const branches = [
    [24, 40, 14, 22, 2.2], [24, 40, 34, 20, 2.2], [24, 42, 24, 12, 2.6],
    [14, 22, 8, 14, 1.2], [14, 22, 16, 10, 1], [34, 20, 40, 12, 1.2], [34, 20, 31, 9, 1],
    [24, 12, 19, 5, 1], [24, 12, 29, 4, 1],
  ];
  if (bigger) branches.push([24, 30, 38, 28, 1.4], [24, 32, 10, 30, 1.4]);
  ctx.lineCap = 'round';
  for (const [x1, y1, x2, y2, w] of branches) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2 + (x2 - x1) * 0.15, (y1 + y2) / 2, x2, y2);
    ctx.strokeStyle = css(OUTLINE);
    ctx.lineWidth = w + 0.8;
    ctx.stroke();
    ctx.strokeStyle = css(0x6e4a2a);
    ctx.lineWidth = w;
    ctx.stroke();
    // sniegas ant šakos viršaus
    ctx.beginPath();
    ctx.moveTo(x1 + (x2 - x1) * 0.3, y1 + (y2 - y1) * 0.3 - w * 0.5);
    ctx.lineTo(x2, y2 - w * 0.5);
    ctx.strokeStyle = 'rgba(245,250,255,0.95)';
    ctx.lineWidth = w * 0.7;
    ctx.stroke();
  }
}

// ---------- Akmuo (32 x 32) ----------
function makeRock(scene) {
  drawScaled(scene, 'rock', 32, 32, (ctx) => {
    softShadow(ctx, 16, 26, 13, 4, 0.35);
    ctx.beginPath();
    ctx.moveTo(4, 26);
    ctx.lineTo(6, 16);
    ctx.lineTo(12, 10);
    ctx.lineTo(21, 9);
    ctx.lineTo(27, 15);
    ctx.lineTo(29, 25);
    ctx.quadraticCurveTo(16, 29, 4, 26);
    ctx.closePath();
    fillStroke(ctx, radialShade(ctx, 15, 16, 14, 0x8e9196, 0.35, 0.45), OUTLINE, 0.8);
    // briaunos ir įtrūkimai
    ctx.strokeStyle = css(0x55585e, 0.8);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(14, 18); ctx.lineTo(22, 21);
    ctx.moveTo(14, 18); ctx.lineTo(9, 24);
    ctx.stroke();
    // samanos
    for (const [x, y, r] of [[14, 10.5, 3], [19, 10, 2.4], [8.5, 15, 1.8]]) {
      ellipse(ctx, x, y, r, r * 0.55);
      ctx.fillStyle = css(0x5f9c3a, 0.9);
      ctx.fill();
    }
  });
}

// ---------- Krūmas su uogomis (32 x 32) ----------
function makeBush(scene, key, look) {
  drawScaled(scene, key, 32, 32, (ctx) => {
    softShadow(ctx, 16, 27, 14, 4, 0.35);
    const blobs = [[9, 21, 7], [23, 21, 7], [16, 15, 8.5], [16, 22, 8]];
    // žiemą krūmas – po sniegu, todėl pagrindas žalsvas, o viršus baltas
    const color = look.snow ? 0x3b6a35 : look.bush;
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y + 1, r + 0.7);
      ctx.fillStyle = css(darken(color, 0.5));
      ctx.fill();
    }
    for (const [x, y, r] of blobs) {
      circle(ctx, x, y, r);
      ctx.fillStyle = radialShade(ctx, x, y, r, color, 0.35, 0.35);
      ctx.fill();
    }
    if (look.snow) {
      for (const [x, y, r] of blobs) {
        ellipse(ctx, x, y - r * 0.35, r * 0.85, r * 0.55);
        ctx.fillStyle = radialShade(ctx, x, y - r * 0.35, r * 0.85, 0xf2f6fb, 0.3, 0.15);
        ctx.fill();
      }
      return;
    }
    if (look.leaves2) return; // rudenį uogų nebėra
    for (const [x, y] of [[10, 18], [19, 13], [22, 22], [13, 24], [17, 19]]) {
      circle(ctx, x, y, 1.4);
      fillStroke(ctx, radialShade(ctx, x, y, 1.4, 0x6a3bc4), OUTLINE, 0.3);
    }
  });
}

// ---------- Parduotuvė (64 x 92 vnt.; apačia = 2 langelių pagrindas) ----------
function makeShop(scene) {
  drawScaled(scene, 'shop', 64, 92, (ctx) => {
    softShadow(ctx, 32, 89, 36, 6, 0.35);

    // Akmeninis pamatas
    roundRect(ctx, 2, 81, 60, 9, 1.5);
    fillStroke(ctx, vGradient(ctx, 81, 90, 0x9a9a9a, 0x6d6d6d), OUTLINE, 0.8);
    ctx.strokeStyle = css(0x555555, 0.7);
    ctx.lineWidth = 0.5;
    for (let x = 8; x < 60; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 81); ctx.lineTo(x, 85.5);
      ctx.moveTo(x - 4, 85.5); ctx.lineTo(x - 4, 90);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(2, 85.5); ctx.lineTo(62, 85.5);
    ctx.stroke();

    // Medinės sienos (vertikalios lentos)
    ctx.beginPath();
    ctx.rect(4, 44, 56, 38);
    fillStroke(ctx, vGradient(ctx, 44, 82, 0xcf9c60, 0xa06c38), OUTLINE, 0.8);
    ctx.strokeStyle = css(0x7a4c22, 0.55);
    ctx.lineWidth = 0.5;
    for (let x = 10; x < 60; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 47); ctx.lineTo(x, 81);
      ctx.stroke();
    }
    // sijos
    ctx.beginPath();
    ctx.rect(3, 44, 58, 3.2);
    fillStroke(ctx, 0x6e4321, OUTLINE, 0.6);
    ctx.beginPath();
    ctx.rect(3, 44, 3, 38);
    ctx.rect(58, 44, 3, 38);
    fillStroke(ctx, 0x7a4c26, OUTLINE, 0.6);

    // Kaminas (už stogo)
    ctx.beginPath();
    ctx.rect(44, 6, 8, 18);
    fillStroke(ctx, vGradient(ctx, 6, 24, 0xa8563c, 0x7c3a26), OUTLINE, 0.7);
    ctx.strokeStyle = css(0x5a2a1a, 0.6);
    ctx.lineWidth = 0.4;
    for (let y = 9; y < 24; y += 3) {
      ctx.beginPath(); ctx.moveTo(44, y); ctx.lineTo(52, y); ctx.stroke();
    }
    ctx.beginPath();
    ctx.rect(43, 4, 10, 3);
    fillStroke(ctx, 0x6b6b6b, OUTLINE, 0.6);

    // Stogas su čerpių eilėmis
    ctx.beginPath();
    ctx.moveTo(-1, 48);
    ctx.lineTo(9, 15);
    ctx.lineTo(55, 15);
    ctx.lineTo(65, 48);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 15, 48, 0xc5463a, 0x8f2c24), OUTLINE, 0.9);
    ctx.save();
    ctx.clip();
    for (let row = 0, y = 18; y < 50; y += 4.6, row++) {
      const t = (y - 15) / 33;
      const left = 9 - 10 * t;
      const right = 55 + 10 * t;
      for (let x = left + (row % 2) * 2.5; x < right; x += 5) {
        ctx.beginPath();
        ctx.arc(x + 2.5, y, 2.5, 0, Math.PI);
        ctx.strokeStyle = css(0x6e1f19, 0.6);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, y - 4.6, 64, 1.2);
    }
    ctx.restore();
    // kraigas
    roundRect(ctx, 7.5, 12.5, 49, 3.5, 1.5);
    fillStroke(ctx, 0x7a241d, OUTLINE, 0.7);

    // Iškaba ant stogo
    roundRect(ctx, 11, 26, 42, 11, 2);
    fillStroke(ctx, vGradient(ctx, 26, 37, 0xf3dca6, 0xd9b877), OUTLINE, 0.8);
    ctx.fillStyle = css(0x5a3519);
    ctx.font = 'bold 5.6px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PARDUOTUVĖ', 32, 31.8);

    // Langai su vazonėliais
    for (const wx of [9, 43]) {
      roundRect(ctx, wx - 0.8, 52.2, 13.6, 13.6, 1);
      fillStroke(ctx, 0xf0e2c4, OUTLINE, 0.7);
      ctx.beginPath();
      ctx.rect(wx + 0.7, 53.7, 10.6, 10.6);
      const glass = ctx.createLinearGradient(wx, 53, wx + 11, 65);
      glass.addColorStop(0, css(0xd8f0ff));
      glass.addColorStop(1, css(0x6fa8d8));
      ctx.fillStyle = glass;
      ctx.fill();
      // atspindys
      ctx.beginPath();
      ctx.moveTo(wx + 2, 63); ctx.lineTo(wx + 9, 55.5); ctx.lineTo(wx + 10.5, 55.5); ctx.lineTo(wx + 3.5, 63);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
      ctx.fillStyle = css(0xf0e2c4);
      ctx.fillRect(wx + 5.4, 53.7, 1.2, 10.6);
      ctx.fillRect(wx + 0.7, 58.4, 10.6, 1.2);
      // vazonėlis su gėlėmis
      roundRect(ctx, wx - 1.5, 66, 15, 3.4, 0.8);
      fillStroke(ctx, 0x8a4f2a, OUTLINE, 0.6);
      for (let i = 0; i < 5; i++) {
        circle(ctx, wx + 0.5 + i * 2.75, 65.4, 1.3);
        ctx.fillStyle = css([0xff6f91, 0xffd54f, 0xffffff, 0xff6f91, 0xb388ff][i]);
        ctx.fill();
      }
    }

    // Durys su arka
    ctx.beginPath();
    ctx.moveTo(26, 82);
    ctx.lineTo(26, 66);
    ctx.arc(32, 66, 6, Math.PI, 0);
    ctx.lineTo(38, 82);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 60, 82, 0x7a4524, 0x5a3017), OUTLINE, 0.8);
    ctx.strokeStyle = css(0x3e200e, 0.6);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(30, 62); ctx.lineTo(30, 82);
    ctx.moveTo(34, 62); ctx.lineTo(34, 82);
    ctx.stroke();
    circle(ctx, 36, 74, 0.9);
    fillStroke(ctx, 0xffd54f, OUTLINE, 0.3);

    // Dryžuota markizė virš durų
    ctx.beginPath();
    ctx.moveTo(22, 52);
    ctx.lineTo(42, 52);
    ctx.lineTo(44, 58);
    ctx.lineTo(20, 58);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = css(i % 2 ? 0xffffff : 0x2f8f5b);
      ctx.fillRect(20 + i * 3, 50, 3, 10);
    }
    ctx.restore();
    ctx.strokeStyle = css(OUTLINE, 0.8);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(21.5 + i * 3, 58, 1.5, 0, Math.PI);
      ctx.fillStyle = css(i % 2 ? 0xffffff : 0x2f8f5b);
      ctx.fill();
      ctx.stroke();
    }
  });
}

// ---------- Žaidėjo namelis (64 x 92 vnt.; rąstų sienos, žalias stogas) ----------
// roof – stogo spalvos [viršus, apačia]
function makeHouse(scene, key = 'house', roof = [0x5f8f5a, 0x3a5f3a]) {
  drawScaled(scene, key, 64, 92, (ctx) => {
    softShadow(ctx, 32, 89, 36, 6, 0.35);

    // Akmeninis pamatas
    roundRect(ctx, 3, 82, 58, 8, 1.5);
    fillStroke(ctx, vGradient(ctx, 82, 90, 0x9a9a9a, 0x6d6d6d), OUTLINE, 0.8);

    // Rąstų sienos (horizontalūs rąstai su apvaliais galais)
    for (let i = 0, y = 46; y < 82; y += 6, i++) {
      roundRect(ctx, 5, y, 54, 6, 3);
      fillStroke(ctx, vGradient(ctx, y, y + 6, i % 2 ? 0xb07440 : 0xa3693a, 0x6e4321), OUTLINE, 0.6);
      for (const x of [5, 59]) {
        circle(ctx, x, y + 3, 3);
        fillStroke(ctx, 0xd8a468, OUTLINE, 0.5);
        circle(ctx, x, y + 3, 1.2);
        ctx.strokeStyle = css(0x8a5a30, 0.8);
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }

    // Akmeninis kaminas
    ctx.beginPath();
    ctx.rect(42, 4, 9, 22);
    fillStroke(ctx, vGradient(ctx, 4, 26, 0xa0a0a0, 0x6d6d6d), OUTLINE, 0.7);
    ctx.strokeStyle = css(0x555555, 0.6);
    ctx.lineWidth = 0.4;
    for (let y = 8; y < 26; y += 4) {
      ctx.beginPath(); ctx.moveTo(42, y); ctx.lineTo(51, y); ctx.stroke();
    }

    // Stogas su skiedrų eilėmis
    ctx.beginPath();
    ctx.moveTo(-1, 50);
    ctx.lineTo(32, 14);
    ctx.lineTo(65, 50);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 14, 50, roof[0], roof[1]), OUTLINE, 0.9);
    ctx.save();
    ctx.clip();
    for (let row = 0, y = 20; y < 52; y += 4.5, row++) {
      for (let x = (row % 2) * 2.5 - 2; x < 66; x += 5) {
        ctx.beginPath();
        ctx.arc(x + 2.5, y, 2.5, 0, Math.PI);
        ctx.strokeStyle = css(darken(roof[1], 0.4), 0.55);
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
    ctx.restore();
    // Stoglangis su šilta šviesa
    circle(ctx, 32, 34, 4.5);
    fillStroke(ctx, 0xf0e2c4, OUTLINE, 0.7);
    circle(ctx, 32, 34, 3.3);
    ctx.fillStyle = vGradient(ctx, 30, 37, 0xfff3c4, 0xf2b75a);
    ctx.fill();

    // Langas su užuolaidomis
    for (const wx of [10, 42]) {
      roundRect(ctx, wx - 0.8, 56, 13.6, 12, 1);
      fillStroke(ctx, 0xf0e2c4, OUTLINE, 0.7);
      ctx.beginPath();
      ctx.rect(wx + 0.7, 57.5, 10.6, 9);
      ctx.fillStyle = vGradient(ctx, 57, 67, 0xfff0c0, 0xe9b060);
      ctx.fill();
      ctx.fillStyle = css(0xc8443a, 0.85);
      ctx.fillRect(wx + 0.7, 57.5, 2.6, 9);
      ctx.fillRect(wx + 8.7, 57.5, 2.6, 9);
      ctx.fillStyle = css(0xf0e2c4);
      ctx.fillRect(wx + 5.4, 57.5, 1.2, 9);
    }

    // Durys ir kilimėlis
    roundRect(ctx, 26, 62, 12, 20, [5, 5, 0, 0]);
    fillStroke(ctx, vGradient(ctx, 62, 82, 0x7a4524, 0x5a3017), OUTLINE, 0.8);
    circle(ctx, 35.5, 73, 0.9);
    fillStroke(ctx, 0xffd54f, OUTLINE, 0.3);
    roundRect(ctx, 24, 82.5, 16, 3, 1);
    fillStroke(ctx, 0xb5432f, OUTLINE, 0.5);
  });
}

// ---------- Efektai ir sąsajos detalės ----------
// ---------- Fontanas (4x4 langeliai = 128 x 140 vnt., apačia ties y=140) ----------
// Akmeninis baseinas su vandeniu, viduryje – kolona su dubeniu.
// Purškiamą vandenį prideda GameScene (dalelės).
export const FOUNTAIN_TOP_Y = 34; // kur (dizaino vienetais nuo viršaus) trykšta vanduo
function makeFountain(scene) {
  drawScaled(scene, 'fountain', 128, 140, (ctx) => {
    softShadow(ctx, 64, 122, 62, 16, 0.3);
    // išorinis akmeninis kraštas
    ellipse(ctx, 64, 104, 60, 30);
    fillStroke(ctx, vGradient(ctx, 74, 134, 0xc4bcae, 0x8a8274), OUTLINE, 1);
    ellipse(ctx, 64, 112, 60, 26);
    ctx.fillStyle = css(0x7a7264, 0.6);
    ctx.fill();
    // vanduo baseine
    ellipse(ctx, 64, 102, 52, 24);
    const water = ctx.createRadialGradient(54, 94, 4, 64, 102, 54);
    water.addColorStop(0, css(0x8fd3ff));
    water.addColorStop(1, css(0x2f74c0));
    fillStroke(ctx, water, 0x5a5448, 0.8);
    // bangelės
    ctx.strokeStyle = css(0xffffff, 0.45);
    ctx.lineWidth = 0.8;
    for (const [x, y, r] of [[40, 100, 8], [86, 106, 10], [62, 114, 7], [78, 94, 6]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.35, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // kolona
    ctx.beginPath();
    ctx.moveTo(56, 104); ctx.lineTo(58, 52); ctx.lineTo(70, 52); ctx.lineTo(72, 104);
    ctx.closePath();
    const col = ctx.createLinearGradient(56, 0, 72, 0);
    col.addColorStop(0, css(0xd8d0c0));
    col.addColorStop(1, css(0x8f877a));
    fillStroke(ctx, col, OUTLINE, 0.8);
    // viršutinis dubuo
    ellipse(ctx, 64, 50, 22, 8);
    fillStroke(ctx, vGradient(ctx, 42, 58, 0xd6cebe, 0x948c7e), OUTLINE, 0.8);
    ellipse(ctx, 64, 48, 17, 5);
    ctx.fillStyle = css(0x6fb8f0);
    ctx.fill();
    // vandens srovelės iš dubens į baseiną
    ctx.strokeStyle = css(0xbfe6ff, 0.75);
    ctx.lineWidth = 1.4;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(64 + dir * 20, 52);
      ctx.quadraticCurveTo(64 + dir * 30, 62, 64 + dir * 30, 92);
      ctx.stroke();
    }
    // smaigalys, iš kurio trykšta vanduo
    ctx.beginPath();
    ctx.rect(62, FOUNTAIN_TOP_Y, 4, 12);
    fillStroke(ctx, 0xb0a898, OUTLINE, 0.6);
  });
}

// ---------- Skelbimų lenta (2x1 langeliai = 64 x 64 vnt., apačia ties y=64) ----------
function makeBoard(scene) {
  drawScaled(scene, 'board', 64, 64, (ctx) => {
    softShadow(ctx, 32, 61, 28, 4, 0.35);
    // stulpai
    for (const x of [10, 50]) {
      ctx.beginPath();
      ctx.rect(x, 20, 4, 42);
      fillStroke(ctx, vGradient(ctx, 20, 62, 0x7a4c22, 0x4e2e14), OUTLINE, 0.7);
    }
    // stogelis
    ctx.beginPath();
    ctx.moveTo(2, 14); ctx.lineTo(32, 4); ctx.lineTo(62, 14); ctx.lineTo(60, 17); ctx.lineTo(4, 17);
    ctx.closePath();
    fillStroke(ctx, vGradient(ctx, 4, 17, 0xb0563a, 0x7a3220), OUTLINE, 0.8);
    // lenta
    roundRect(ctx, 6, 18, 52, 30, 2);
    fillStroke(ctx, vGradient(ctx, 18, 48, 0xc99a62, 0x9a6c3a), OUTLINE, 0.9);
    // prisegti lapeliai
    const notes = [[10, 22, 12, 10, 0xfff4dc, -0.08], [25, 21, 14, 12, 0xffe08a, 0.05], [42, 23, 11, 13, 0xd8f0ff, -0.04],
      [14, 34, 13, 11, 0xffd0d8, 0.06], [33, 36, 16, 9, 0xfff4dc, -0.05]];
    for (const [x, y, w, h, color, rot] of notes) {
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      fillStroke(ctx, color, 0x6a5a48, 0.4);
      ctx.strokeStyle = css(0x8a7a68, 0.6);
      ctx.lineWidth = 0.5;
      for (let ly = -h / 2 + 3; ly < h / 2 - 1; ly += 2.2) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 1.5, ly); ctx.lineTo(w / 2 - 1.5, ly);
        ctx.stroke();
      }
      circle(ctx, 0, -h / 2 + 1.2, 0.9);
      ctx.fillStyle = css(0xd03a2a);
      ctx.fill();
      ctx.restore();
    }
  });
}

function makeEffects(scene) {
  // Šešėlis po personažu
  drawScaled(scene, 'shadow', 20, 8, (ctx) => softShadow(ctx, 10, 4, 10, 4, 0.4));

  // Taikiklis: keturi kampai
  drawTexture(scene, 'cursor', T, T, (ctx) => {
    ctx.scale(S, S);
    const L = 8;
    const path = () => {
      ctx.beginPath();
      for (const [x, y, dx, dy] of [[1.5, 1.5, 1, 1], [30.5, 1.5, -1, 1], [30.5, 30.5, -1, -1], [1.5, 30.5, 1, -1]]) {
        ctx.moveTo(x + dx * L, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * L);
      }
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    path();
    ctx.strokeStyle = 'rgba(30,20,10,0.6)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    path();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  });

  // Paspaudimo žiedas ant žemės
  drawScaled(scene, 'click_ring', 24, 12, (ctx) => {
    ellipse(ctx, 12, 6, 10, 4.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  // „Galima nuimti derlių“ ženkliukas
  drawScaled(scene, 'badge_ready', 14, 14, (ctx) => {
    const g = ctx.createRadialGradient(7, 7, 0, 7, 7, 7);
    g.addColorStop(0, 'rgba(255,240,150,0.9)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 14, 14);
    star(ctx, 7, 7, 5.2, 2, 4);
    fillStroke(ctx, 0xfff3a0, 0xb8860b, 0.5);
  });

  // Dalelės
  drawScaled(scene, 'p_dirt', 4, 4, (ctx) => {
    circle(ctx, 2, 2, 1.7);
    ctx.fillStyle = css(0x6e4423);
    ctx.fill();
  });
  drawScaled(scene, 'p_water', 4, 5, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 0.3);
    ctx.quadraticCurveTo(3.8, 3, 2, 4.7);
    ctx.quadraticCurveTo(0.2, 3, 2, 0.3);
    ctx.fillStyle = css(0x9fd4ff);
    ctx.fill();
  });
  drawScaled(scene, 'p_leaf', 5, 3, (ctx) => {
    ellipse(ctx, 2.5, 1.5, 2.3, 1.1);
    ctx.fillStyle = css(0x6abf45);
    ctx.fill();
  });
  drawScaled(scene, 'p_spark', 6, 6, (ctx) => {
    star(ctx, 3, 3, 3, 0.8, 4);
    ctx.fillStyle = '#fffbe0';
    ctx.fill();
  });

  // Lietaus lašas ir snaigė
  drawTexture(scene, 'p_rain', 3, 18, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 18);
    g.addColorStop(0, 'rgba(190,220,255,0)');
    g.addColorStop(1, 'rgba(190,220,255,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(1, 0, 1.5, 18);
  });
  drawTexture(scene, 'p_snow', 10, 10, (ctx) => {
    const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 10, 10);
  });

  // Šviesos: „kaukė“ (iškerpa skylę nakties tamsoje) ir šiltas švytėjimas
  drawTexture(scene, 'light_mask', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  drawTexture(scene, 'light_glow', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,214,130,0.55)');
    g.addColorStop(0.4, 'rgba(255,170,80,0.22)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

  // Debesies šešėlis (labai minkštas, permatomas)
  drawTexture(scene, 'cloud', 420, 260, (ctx) => {
    const rnd = seededRandom(5);
    for (let i = 0; i < 9; i++) {
      const x = 90 + rnd() * 240;
      const y = 80 + rnd() * 100;
      const r = 50 + rnd() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(10,20,40,0.55)');
      g.addColorStop(1, 'rgba(10,20,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 420, 260);
    }
  });

  // Vinjetė dengia EKRANĄ (ne visą pasaulį), todėl naudojame matomos dalies dydį
  const W = CONFIG.VIEW_WIDTH * T;
  const H = CONFIG.VIEW_HEIGHT * T;
  drawTexture(scene, 'vignette', W, H, (ctx) => {
    ctx.translate(W / 2, H / 2);
    ctx.scale(1, H / W);
    const g = ctx.createRadialGradient(0, 0, W * 0.32, 0, 0, W * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,15,30,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(-W, -W, W * 2, W * 2);
  });
}

// Žvaigždės kontūras (naudojama ženkliukams ir dalelėms)
export function star(ctx, cx, cy, outer, inner, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}
