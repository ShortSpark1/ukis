import {
  S, drawTexture, css, darken, lighten, circle, ellipse, roundRect, fillStroke, radialShade,
} from './utils.js';

// =====================================================================
//  PERSONAŽAI – ūkininkas ir kaimynai (NPC)
//  Kiekvienam – vienas paveikslėlis su 16 kadrų: 4 kryptys x 4 ėjimo kadrai.
//  Išvaizdą keičia „look“: spalvos, skrybėlė (arba plaukai), barzda, ilgi plaukai.
//  Kadrų pavadinimai: 'down_0' … 'down_3', 'left_0' … ir t.t.
//  Ėjimas: kojos ir rankos juda priešingai, kūnas truputį pašoka.
// =====================================================================

const FW = 24; // kadro plotis (dizaino vnt.)
const FH = 32; // kadro aukštis
export const PLAYER_FRAME_W = FW * S;
export const PLAYER_FRAME_H = FH * S;
export const PLAYER_DIRS = ['down', 'left', 'right', 'up'];
export const WALK_FRAMES = 4;

// Ūkininko (žaidėjo) išvaizda
export const PLAYER_LOOK = {
  skin: 0xf2c08a,
  hair: 0x7a4a24,
  shirt: 0xc8443a,
  overall: 0x3f6fb5,
  boot: 0x5b3a22,
  hat: { color: 0xe3bd6b, band: 0xb5432f },
  beard: null,
  longHair: false,
};

// Šiuo metu piešiamo personažo spalvos (nustatoma makeCharacter pradžioje)
let C = null;

function setLook(look) {
  C = {
    outline: 0x2b1d14,
    skin: look.skin,
    hair: look.hair,
    shirt: look.shirt,
    overall: look.overall,
    boot: look.boot,
    hat: look.hat?.color ?? null,
    band: look.hat?.band ?? null,
    beard: look.beard ?? null,
    longHair: !!look.longHair,
  };
}

export function makePlayer(scene) {
  makeCharacter(scene, 'player', PLAYER_LOOK);
}

// Sukuria personažo tekstūrą su kadrais '<kryptis>_<kadras>' (pvz. 'down_0')
export function makeCharacter(scene, key, look) {
  setLook(look);
  const fw = PLAYER_FRAME_W;
  const fh = PLAYER_FRAME_H;
  const tex = drawTexture(scene, key, fw * WALK_FRAMES, fh * PLAYER_DIRS.length, (ctx) => {
    PLAYER_DIRS.forEach((dir, row) => {
      for (let f = 0; f < WALK_FRAMES; f++) {
        const phase = [0, 1, 0, -1][f]; // -1..1: kuri koja priekyje
        ctx.save();
        ctx.translate(f * fw, row * fh);
        ctx.scale(S, S);
        if (dir === 'left') {
          // kairė = veidrodinis dešinės atspindys
          ctx.translate(FW, 0);
          ctx.scale(-1, 1);
          drawSide(ctx, phase);
        } else if (dir === 'right') {
          drawSide(ctx, phase);
        } else {
          drawFront(ctx, phase, dir === 'down');
        }
        ctx.restore();
      }
    });
  });
  // Užregistruojame kiekvieną kadrą atskiru pavadinimu
  PLAYER_DIRS.forEach((dir, row) => {
    for (let f = 0; f < WALK_FRAMES; f++) tex.add(`${dir}_${f}`, 0, f * fw, row * fh, fw, fh);
  });
}

// ---------- Iš priekio arba iš nugaros ----------
function drawFront(ctx, phase, facingDown) {
  const bob = phase !== 0 ? -0.6 : 0;
  const liftL = phase === 1 ? 1.4 : 0;
  const liftR = phase === -1 ? 1.4 : 0;

  // Kojos ir batai
  for (const [x, lift] of [[8.3, liftL], [12.3, liftR]]) {
    roundRect(ctx, x, 23, 3.4, 5.6 - lift, 1);
    fillStroke(ctx, darken(C.overall, 0.15), C.outline, 0.6);
    roundRect(ctx, x - 0.5, 27.6 - lift, 4.4, 3, 1.3);
    fillStroke(ctx, C.boot, C.outline, 0.6);
  }

  ctx.save();
  ctx.translate(0, bob);

  // Ilgi plaukai (už pečių)
  if (C.longHair) {
    roundRect(ctx, 5.2, 7, 13.6, 10, 4);
    fillStroke(ctx, darken(C.hair, facingDown ? 0.15 : 0), C.outline, 0.5);
  }

  // Rankos (už liemens), mojuoja priešingai kojoms
  for (const [x, swing] of [[4.4, phase * 1.2], [16.6, -phase * 1.2]]) {
    roundRect(ctx, x, 15 + swing * 0.5, 3, 6.6, 1.4);
    fillStroke(ctx, C.shirt, C.outline, 0.6);
    circle(ctx, x + 1.5, 22 + swing, 1.45);
    fillStroke(ctx, C.skin, C.outline, 0.5);
  }

  // Liemuo – languoti marškiniai
  roundRect(ctx, 6.5, 14, 11, 10.5, 3);
  fillStroke(ctx, C.shirt, C.outline, 0.7);
  ctx.save();
  roundRect(ctx, 6.5, 14, 11, 10.5, 3);
  ctx.clip();
  ctx.strokeStyle = css(darken(C.shirt, 0.35), 0.45);
  ctx.lineWidth = 0.6;
  for (let x = 8; x < 18; x += 2.5) { ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x, 25); ctx.stroke(); }
  for (let y = 15.5; y < 25; y += 2.5) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(18, y); ctx.stroke(); }
  ctx.restore();

  // Kombinezonas
  roundRect(ctx, 7.3, 21.5, 9.4, 3.6, 1);
  fillStroke(ctx, C.overall, C.outline, 0.6);
  if (facingDown) {
    roundRect(ctx, 8.4, 16.4, 7.2, 7, 1.2);
    fillStroke(ctx, C.overall, C.outline, 0.6);
    ctx.strokeStyle = css(C.overall);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(9.2, 16.6); ctx.lineTo(8.7, 14.2);
    ctx.moveTo(14.8, 16.6); ctx.lineTo(15.3, 14.2);
    ctx.stroke();
    roundRect(ctx, 10.3, 18.6, 3.4, 2.4, 0.5);
    fillStroke(ctx, darken(C.overall, 0.15), C.outline, 0.35);
    for (const bx of [9.4, 14.6]) {
      circle(ctx, bx, 17.4, 0.65);
      fillStroke(ctx, 0xffd54f, C.outline, 0.3);
    }
  } else {
    // nugaroje – sukryžiuotos petnešos
    roundRect(ctx, 8, 19.2, 8, 4, 1);
    fillStroke(ctx, C.overall, C.outline, 0.6);
    ctx.strokeStyle = css(C.overall);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(8.8, 14.4); ctx.lineTo(15, 19.5);
    ctx.moveTo(15.2, 14.4); ctx.lineTo(9, 19.5);
    ctx.stroke();
  }

  // Kaklas ir galva
  ctx.fillStyle = css(darken(C.skin, 0.1));
  ctx.fillRect(10.8, 12.6, 2.4, 2);
  circle(ctx, 12, 9.4, 6.3);
  fillStroke(ctx, radialShade(ctx, 12, 9.4, 6.3, C.skin, 0.3, 0.2), C.outline, 0.7);

  if (facingDown) {
    // plaukai šonuose
    for (const hx of [6.4, 17.6]) {
      ellipse(ctx, hx, 8.6, 1.6, 3.1);
      fillStroke(ctx, C.hair, C.outline, 0.5);
    }
    // akys su blizgesiu
    for (const ex of [9.7, 14.3]) {
      ellipse(ctx, ex, 10.4, 0.95, 1.25);
      ctx.fillStyle = css(0x2a1a10);
      ctx.fill();
      circle(ctx, ex + 0.3, 9.95, 0.35);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    // skruostai
    for (const bx of [8.1, 15.9]) {
      ellipse(ctx, bx, 12.2, 1.2, 0.7);
      ctx.fillStyle = 'rgba(255,120,120,0.35)';
      ctx.fill();
    }
    // šypsena
    ctx.beginPath();
    ctx.arc(12, 12.2, 1.3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = css(0x6b3a22);
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // barzda
    if (C.beard) {
      ctx.beginPath();
      ctx.moveTo(7.6, 10.8);
      ctx.quadraticCurveTo(8, 16.4, 12, 16.6);
      ctx.quadraticCurveTo(16, 16.4, 16.4, 10.8);
      ctx.quadraticCurveTo(12, 13.6, 7.6, 10.8);
      fillStroke(ctx, C.beard, C.outline, 0.5);
    }
  } else {
    // iš nugaros matosi tik plaukai
    circle(ctx, 12, 9.8, 6.1);
    fillStroke(ctx, radialShade(ctx, 12, 9.8, 6.1, C.hair, 0.2, 0.3), C.outline, 0.6);
    ctx.strokeStyle = css(darken(C.hair, 0.3), 0.6);
    ctx.lineWidth = 0.4;
    for (const x of [9.5, 12, 14.5]) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x + 0.3, 14.5); ctx.stroke(); }
  }

  if (C.hat) drawHat(ctx, 12, 0);
  else drawHairTop(ctx, 12, facingDown);
  ctx.restore();
}

// Plaukai viršugalvyje (kai nėra skrybėlės)
function drawHairTop(ctx, cx, facingDown) {
  ctx.beginPath();
  ctx.arc(cx, 9.2, 6.6, Math.PI * 1.02, Math.PI * 1.98);
  if (facingDown) ctx.quadraticCurveTo(cx + 2, 6.4, cx - 2, 6.8);
  ctx.closePath();
  fillStroke(ctx, radialShade(ctx, cx, 6, 6, C.hair, 0.3, 0.25), C.outline, 0.6);
}

// ---------- Iš šono (į dešinę) ----------
function drawSide(ctx, phase) {
  const bob = phase !== 0 ? -0.6 : 0;

  // Galinė ir priekinė kojos žengia priešingomis kryptimis
  const legs = [
    { x: 10 - phase * 1.8, color: darken(C.overall, 0.3), boot: darken(C.boot, 0.2) },
    { x: 10 + phase * 1.8, color: darken(C.overall, 0.12), boot: C.boot },
  ];
  for (const leg of legs) {
    roundRect(ctx, leg.x, 23, 3.6, 5.4, 1);
    fillStroke(ctx, leg.color, C.outline, 0.6);
    ctx.beginPath();
    ctx.roundRect(leg.x - 0.4, 27.6, 5.2, 3, [1.2, 1.8, 1.2, 1.2]);
    fillStroke(ctx, leg.boot, C.outline, 0.6);
  }

  ctx.save();
  ctx.translate(0, bob);

  // ilgi plaukai už nugaros
  if (C.longHair) {
    roundRect(ctx, 5.5, 7, 6.5, 10, 3);
    fillStroke(ctx, C.hair, C.outline, 0.5);
  }

  // galinė ranka
  roundRect(ctx, 10.6 - phase * 1.6, 15.2, 3, 6.6, 1.4);
  fillStroke(ctx, darken(C.shirt, 0.25), C.outline, 0.5);

  // liemuo
  roundRect(ctx, 8, 14, 8.5, 10.5, 3);
  fillStroke(ctx, C.shirt, C.outline, 0.7);
  roundRect(ctx, 8.6, 17, 7.5, 8, 1.2);
  fillStroke(ctx, C.overall, C.outline, 0.6);
  ctx.strokeStyle = css(C.overall);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(12.5, 17.2); ctx.lineTo(12.2, 14.2);
  ctx.stroke();
  circle(ctx, 12.4, 18, 0.6);
  fillStroke(ctx, 0xffd54f, C.outline, 0.3);

  // galva, nosis, ausis
  ctx.fillStyle = css(darken(C.skin, 0.1));
  ctx.fillRect(11, 12.6, 2.6, 2);
  circle(ctx, 12.4, 9.4, 6.2);
  fillStroke(ctx, radialShade(ctx, 13, 9.4, 6.2, C.skin, 0.3, 0.2), C.outline, 0.7);
  circle(ctx, 18.3, 10.9, 1.1);
  fillStroke(ctx, C.skin, C.outline, 0.5);
  ctx.beginPath();
  ctx.ellipse(8.6, 9.2, 3.2, 4.6, 0, 0, Math.PI * 2);
  fillStroke(ctx, C.hair, C.outline, 0.5);
  ellipse(ctx, 11.2, 10.4, 1, 1.4);
  fillStroke(ctx, darken(C.skin, 0.08), C.outline, 0.4);

  // akis, skruostas, burna
  ellipse(ctx, 15.7, 10.2, 0.85, 1.2);
  ctx.fillStyle = css(0x2a1a10);
  ctx.fill();
  circle(ctx, 15.95, 9.8, 0.32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ellipse(ctx, 15.4, 12.4, 1.1, 0.65);
  ctx.fillStyle = 'rgba(255,120,120,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16.2, 13.1);
  ctx.quadraticCurveTo(17, 13.4, 17.6, 12.9);
  ctx.strokeStyle = css(0x6b3a22);
  ctx.lineWidth = 0.5;
  ctx.stroke();
  if (C.beard) {
    ctx.beginPath();
    ctx.moveTo(12.6, 11.4);
    ctx.quadraticCurveTo(13.4, 16.6, 16.4, 15.8);
    ctx.quadraticCurveTo(18.6, 14.8, 18.2, 12.2);
    ctx.quadraticCurveTo(15.4, 13.4, 12.6, 11.4);
    fillStroke(ctx, C.beard, C.outline, 0.5);
  }

  if (C.hat) drawHat(ctx, 12.8, 0);
  else drawHairTop(ctx, 12.6, false);

  // priekinė ranka
  roundRect(ctx, 11.2 + phase * 1.6, 15.2, 3, 6.6, 1.4);
  fillStroke(ctx, C.shirt, C.outline, 0.6);
  circle(ctx, 12.7 + phase * 1.6, 22.3, 1.45);
  fillStroke(ctx, C.skin, C.outline, 0.5);

  ctx.restore();
}

// Šiaudinė skrybėlė (cx – centras)
function drawHat(ctx, cx, oy) {
  ellipse(ctx, cx, 5.3 + oy, 9.4, 2.7);
  const brim = ctx.createLinearGradient(0, 2.6, 0, 8);
  brim.addColorStop(0, css(lighten(C.hat, 0.25)));
  brim.addColorStop(1, css(darken(C.hat, 0.2)));
  fillStroke(ctx, brim, C.outline, 0.7);
  ctx.beginPath();
  ctx.roundRect(cx - 4.4, 0.6 + oy, 8.8, 5, [3, 3, 0.6, 0.6]);
  fillStroke(ctx, lighten(C.hat, 0.1), C.outline, 0.7);
  ctx.fillStyle = css(C.band);
  ctx.fillRect(cx - 4.4, 3.9 + oy, 8.8, 1.3);
  // šiaudų tekstūra
  ctx.strokeStyle = css(darken(C.hat, 0.3), 0.35);
  ctx.lineWidth = 0.35;
  for (let x = cx - 7; x <= cx + 7; x += 1.8) {
    ctx.beginPath();
    ctx.moveTo(x, 4.4 + oy);
    ctx.lineTo(x + 0.6, 6.8 + oy);
    ctx.stroke();
  }
}
