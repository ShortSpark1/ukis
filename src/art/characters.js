import {
  S, drawTexture, css, darken, lighten, mix, circle, ellipse, roundRect, fillStroke, radialShade,
} from './utils.js';

// =====================================================================
//  PERSONAŽAI – ūkininkas ir kaimynai (NPC)
//  Kiekvienam – vienas paveikslėlis: 4 kryptys x (4 ėjimo kadrai + 1 mirksėjimo).
//  Išvaizdą keičia „look“: spalvos, skrybėlė (arba plaukai), barzda, ilgi plaukai.
//  Kadrų pavadinimai: 'down_0' … 'down_3', 'left_0' … ir 'down_blink' ir t.t.
//
//  Kaip piešiama, kad atrodytų „gyvai“:
//    – kiekviena kūno dalis nuspalvinta gradientu: šviesa krenta iš viršaus
//      kairės, todėl apačia ir dešinė pusė tamsesnės (atrodo apimties);
//    – akys: baltymas, rainelė, vyzdys ir blizgesys, virš jų – antakiai;
//    – ėjimas: kojos ir rankos juda priešingai, kūnas pašoka ir pasilenkia;
//    – stovint GameScene leidžia personažui „kvėpuoti“ ir kartais sumirksėti.
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
  eyes: 0x5a8a3a,
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
    eyes: look.eyes ?? 0x6a4a2a,
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

// Sukuria personažo tekstūrą su kadrais '<kryptis>_<kadras>' (pvz. 'down_0') ir '<kryptis>_blink'
export function makeCharacter(scene, key, look) {
  setLook(look);
  const fw = PLAYER_FRAME_W;
  const fh = PLAYER_FRAME_H;
  const cols = WALK_FRAMES + 1; // paskutinis stulpelis – mirksėjimas
  const tex = drawTexture(scene, key, fw * cols, fh * PLAYER_DIRS.length, (ctx) => {
    PLAYER_DIRS.forEach((dir, row) => {
      for (let f = 0; f < cols; f++) {
        const blink = f === WALK_FRAMES;
        const phase = blink ? 0 : [0, 1, 0, -1][f]; // -1..1: kuri koja priekyje
        ctx.save();
        ctx.translate(f * fw, row * fh);
        ctx.scale(S, S);
        if (dir === 'left') {
          // kairė = veidrodinis dešinės atspindys
          ctx.translate(FW, 0);
          ctx.scale(-1, 1);
          drawSide(ctx, phase, blink);
        } else if (dir === 'right') {
          drawSide(ctx, phase, blink);
        } else {
          drawFront(ctx, phase, dir === 'down', blink);
        }
        ctx.restore();
      }
    });
  });
  // Užregistruojame kiekvieną kadrą atskiru pavadinimu
  PLAYER_DIRS.forEach((dir, row) => {
    for (let f = 0; f < WALK_FRAMES; f++) tex.add(`${dir}_${f}`, 0, f * fw, row * fh, fw, fh);
    tex.add(`${dir}_blink`, 0, WALK_FRAMES * fw, row * fh, fw, fh);
  });
}

// ---------- Pagalbinės ----------

// Gradientas „šviesa iš viršaus kairės“ stačiakampiui (x, y, w, h)
function lit(ctx, x, y, w, h, color, light = 0.22, dark = 0.22) {
  const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, css(lighten(color, light)));
  g.addColorStop(0.55, css(color));
  g.addColorStop(1, css(darken(color, dark)));
  return g;
}

// Batas: padas, šviesus atspindys ant nosies
function boot(ctx, x, y, w, color, toeRight = false) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, 3.2, toeRight ? [1.2, 1.8, 1, 1] : 1.4);
  fillStroke(ctx, lit(ctx, x, y, w, 3.2, color, 0.25, 0.3), C.outline, 0.6);
  ctx.fillStyle = css(darken(color, 0.45));
  ctx.fillRect(x + 0.3, y + 2.5, w - 0.6, 0.7);
  ellipse(ctx, x + (toeRight ? w - 1.4 : w / 2 - 0.4), y + 0.9, 0.9, 0.45);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
}

// Plaštaka su šešėliu
function hand(ctx, x, y) {
  circle(ctx, x, y, 1.55);
  fillStroke(ctx, radialShade(ctx, x - 0.4, y - 0.4, 1.6, C.skin, 0.2, 0.25), C.outline, 0.5);
}

// Akis: baltymas, rainelė, vyzdys, blizgesys (blink – užmerkta)
function eye(ctx, x, y, blink, side = false) {
  if (blink) {
    ctx.beginPath();
    ctx.moveTo(x - 1, y + 0.3);
    ctx.quadraticCurveTo(x, y + 0.9, x + 1, y + 0.3);
    ctx.strokeStyle = css(0x2a1a10);
    ctx.lineWidth = 0.55;
    ctx.stroke();
    return;
  }
  ellipse(ctx, x, y, side ? 0.9 : 1.15, 1.4);
  ctx.fillStyle = '#fbf6ee';
  ctx.fill();
  ctx.strokeStyle = css(0x2a1a10, 0.8);
  ctx.lineWidth = 0.35;
  ctx.stroke();
  ellipse(ctx, x + (side ? 0.25 : 0.1), y + 0.2, side ? 0.6 : 0.8, 1.05);
  ctx.fillStyle = css(C.eyes);
  ctx.fill();
  circle(ctx, x + (side ? 0.3 : 0.15), y + 0.3, 0.45);
  ctx.fillStyle = css(0x140c06);
  ctx.fill();
  circle(ctx, x + (side ? 0.55 : 0.45), y - 0.35, 0.32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function brow(ctx, x, y, tilt) {
  ctx.beginPath();
  ctx.moveTo(x - 1.1, y + tilt);
  ctx.quadraticCurveTo(x, y - 0.5, x + 1.1, y - tilt);
  ctx.strokeStyle = css(darken(C.beard ?? C.hair, 0.15));
  ctx.lineWidth = 0.6;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// Languoti marškiniai su šešėliu (clip – liemens forma)
function plaid(ctx, x, y, w, h) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = css(darken(C.shirt, 0.4), 0.4);
  ctx.lineWidth = 0.55;
  for (let px = x + 1.5; px < x + w; px += 2.4) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke(); }
  for (let py = y + 1.5; py < y + h; py += 2.4) { ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x + w, py); ctx.stroke(); }
  ctx.strokeStyle = css(lighten(C.shirt, 0.35), 0.18);
  for (let px = x + 2.7; px < x + w; px += 2.4) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke(); }
  ctx.restore();
}

// ---------- Iš priekio arba iš nugaros ----------
function drawFront(ctx, phase, facingDown, blink) {
  const bob = phase !== 0 ? -0.7 : 0;
  const liftL = phase === 1 ? 1.4 : 0;
  const liftR = phase === -1 ? 1.4 : 0;

  // Kojos (kelnės) ir batai
  for (const [x, lift] of [[8.2, liftL], [12.4, liftR]]) {
    roundRect(ctx, x, 23, 3.4, 5.6 - lift, 1);
    fillStroke(ctx, lit(ctx, x, 23, 3.4, 5.6, darken(C.overall, 0.12)), C.outline, 0.6);
    boot(ctx, x - 0.5, 27.4 - lift, 4.4, C.boot);
  }

  ctx.save();
  ctx.translate(0, bob);

  // Ilgi plaukai (už pečių)
  if (C.longHair) {
    ctx.beginPath();
    ctx.moveTo(5.4, 9);
    ctx.quadraticCurveTo(4.6, 16, 6.2, 18.6);
    ctx.lineTo(17.8, 18.6);
    ctx.quadraticCurveTo(19.4, 16, 18.6, 9);
    ctx.closePath();
    fillStroke(ctx, lit(ctx, 5, 9, 14, 10, darken(C.hair, facingDown ? 0.18 : 0)), C.outline, 0.5);
  }

  // Rankos (už liemens), mojuoja priešingai kojoms
  for (const [x, swing] of [[4.2, phase * 1.2], [16.8, -phase * 1.2]]) {
    roundRect(ctx, x, 14.8 + swing * 0.5, 3.1, 6.8, 1.5);
    fillStroke(ctx, lit(ctx, x, 14.8, 3.1, 6.8, C.shirt), C.outline, 0.6);
    // rankogalis
    ctx.fillStyle = css(darken(C.shirt, 0.3));
    ctx.fillRect(x + 0.3, 20.4 + swing * 0.5, 2.5, 0.8);
    hand(ctx, x + 1.55, 22.2 + swing);
  }

  // Liemuo – languoti marškiniai
  roundRect(ctx, 6.4, 14, 11.2, 10.6, 3);
  fillStroke(ctx, lit(ctx, 6.4, 14, 11.2, 10.6, C.shirt), C.outline, 0.7);
  roundRect(ctx, 6.4, 14, 11.2, 10.6, 3);
  plaid(ctx, 6.4, 14, 11.2, 10.6);
  if (facingDown) {
    // apykaklė
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(12, 14.4);
      ctx.lineTo(12 + dir * 3, 13.8);
      ctx.lineTo(12 + dir * 1.8, 16);
      ctx.closePath();
      fillStroke(ctx, lighten(C.shirt, 0.12), C.outline, 0.45);
    }
  }

  // Kombinezonas
  roundRect(ctx, 7.2, 21.4, 9.6, 3.8, 1);
  fillStroke(ctx, lit(ctx, 7.2, 21.4, 9.6, 3.8, C.overall), C.outline, 0.6);
  if (facingDown) {
    roundRect(ctx, 8.3, 16.4, 7.4, 7.2, 1.3);
    fillStroke(ctx, lit(ctx, 8.3, 16.4, 7.4, 7.2, C.overall), C.outline, 0.6);
    // petnešos
    ctx.strokeStyle = css(C.overall);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(9.1, 16.6); ctx.lineTo(8.6, 14.1);
    ctx.moveTo(14.9, 16.6); ctx.lineTo(15.4, 14.1);
    ctx.stroke();
    // kišenė su siūle
    roundRect(ctx, 10.2, 18.5, 3.6, 2.6, 0.5);
    fillStroke(ctx, darken(C.overall, 0.14), C.outline, 0.35);
    ctx.setLineDash([0.5, 0.45]);
    ctx.strokeStyle = css(lighten(C.overall, 0.45), 0.8);
    ctx.lineWidth = 0.3;
    roundRect(ctx, 8.8, 17, 6.4, 6.2, 1);
    ctx.stroke();
    ctx.setLineDash([]);
    // sagos
    for (const bx of [9.4, 14.6]) {
      circle(ctx, bx, 17.3, 0.7);
      fillStroke(ctx, radialShade(ctx, bx - 0.2, 17.1, 0.8, 0xffd54f, 0.5, 0.3), C.outline, 0.3);
    }
  } else {
    // nugaroje – sukryžiuotos petnešos
    roundRect(ctx, 7.9, 19.2, 8.2, 4.2, 1);
    fillStroke(ctx, lit(ctx, 7.9, 19.2, 8.2, 4.2, C.overall), C.outline, 0.6);
    ctx.strokeStyle = css(C.overall);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(8.8, 14.4); ctx.lineTo(15, 19.5);
    ctx.moveTo(15.2, 14.4); ctx.lineTo(9, 19.5);
    ctx.stroke();
  }

  // Kaklas ir galva
  ctx.fillStyle = css(darken(C.skin, 0.18));
  ctx.fillRect(10.7, 12.6, 2.6, 2);
  // ausys
  for (const ex of [5.7, 18.3]) {
    ellipse(ctx, ex, 10, 1.25, 1.6);
    fillStroke(ctx, darken(C.skin, 0.05), C.outline, 0.5);
  }
  circle(ctx, 12, 9.2, 6.5);
  fillStroke(ctx, radialShade(ctx, 10.6, 7.6, 7.4, C.skin, 0.22, 0.22), C.outline, 0.7);

  if (facingDown) {
    // plaukai šonuose
    for (const hx of [6.2, 17.8]) {
      ellipse(ctx, hx, 8.2, 1.6, 3);
      fillStroke(ctx, C.hair, C.outline, 0.5);
    }
    eye(ctx, 9.6, 10.2, blink);
    eye(ctx, 14.4, 10.2, blink);
    brow(ctx, 9.5, 7.9, 0.15);
    brow(ctx, 14.5, 7.9, -0.15);
    // nosis – tik švelnus šešėlis
    ellipse(ctx, 12.2, 11.7, 0.7, 0.45);
    ctx.fillStyle = css(darken(C.skin, 0.2), 0.7);
    ctx.fill();
    // skruostai
    for (const bx of [7.9, 16.1]) {
      ellipse(ctx, bx, 12.1, 1.3, 0.75);
      ctx.fillStyle = 'rgba(255,110,110,0.32)';
      ctx.fill();
    }
    // šypsena
    ctx.beginPath();
    ctx.arc(12, 12.3, 1.4, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.strokeStyle = css(0x6b3a22);
    ctx.lineWidth = 0.55;
    ctx.lineCap = 'round';
    ctx.stroke();
    // barzda
    if (C.beard) {
      ctx.beginPath();
      ctx.moveTo(7.4, 10.6);
      ctx.quadraticCurveTo(7.8, 16.6, 12, 16.8);
      ctx.quadraticCurveTo(16.2, 16.6, 16.6, 10.6);
      ctx.quadraticCurveTo(14.4, 13.6, 12, 13.2);
      ctx.quadraticCurveTo(9.6, 13.6, 7.4, 10.6);
      fillStroke(ctx, lit(ctx, 7.4, 10.6, 9.2, 6.2, C.beard, 0.15, 0.2), C.outline, 0.5);
      ctx.beginPath();
      ctx.arc(12, 13.6, 1.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = css(0x6b3a22);
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  } else {
    // iš nugaros matosi tik plaukai
    circle(ctx, 12, 9.6, 6.3);
    fillStroke(ctx, radialShade(ctx, 10.6, 7.6, 7, C.hair, 0.22, 0.32), C.outline, 0.6);
    ctx.strokeStyle = css(darken(C.hair, 0.32), 0.6);
    ctx.lineWidth = 0.4;
    for (const x of [9.4, 12, 14.6]) { ctx.beginPath(); ctx.moveTo(x, 7.6); ctx.quadraticCurveTo(x + 0.5, 11, x + 0.2, 15); ctx.stroke(); }
  }

  if (C.hat) drawHat(ctx, 12, 0, facingDown);
  else drawHairTop(ctx, 12, facingDown);
  ctx.restore();
}

// Plaukai viršugalvyje (kai nėra skrybėlės) – su kirpčiukais ir šviesia sruoga
function drawHairTop(ctx, cx, facingDown) {
  ctx.beginPath();
  ctx.arc(cx, 9, 6.8, Math.PI * 1.02, Math.PI * 1.98);
  if (facingDown) {
    ctx.quadraticCurveTo(cx + 4.6, 6.2, cx + 2.4, 7.6);
    ctx.quadraticCurveTo(cx + 1, 5.8, cx - 0.8, 7.4);
    ctx.quadraticCurveTo(cx - 2.6, 5.8, cx - 4.4, 7.8);
  }
  ctx.closePath();
  fillStroke(ctx, radialShade(ctx, cx - 1.6, 4.6, 7, C.hair, 0.3, 0.28), C.outline, 0.6);
  ctx.beginPath();
  ctx.arc(cx - 0.6, 6.4, 4.2, Math.PI * 1.15, Math.PI * 1.5);
  ctx.strokeStyle = css(lighten(C.hair, 0.4), 0.7);
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ---------- Iš šono (į dešinę) ----------
function drawSide(ctx, phase, blink) {
  const bob = phase !== 0 ? -0.7 : 0;
  const lean = phase !== 0 ? 0.35 : 0; // einant truputį pasilenkia į priekį

  // Galinė ir priekinė kojos žengia priešingomis kryptimis
  const legs = [
    { x: 10 - phase * 1.9, color: darken(C.overall, 0.3), boot: darken(C.boot, 0.2) },
    { x: 10 + phase * 1.9, color: darken(C.overall, 0.1), boot: C.boot },
  ];
  for (const leg of legs) {
    roundRect(ctx, leg.x, 23, 3.6, 5.4, 1);
    fillStroke(ctx, lit(ctx, leg.x, 23, 3.6, 5.4, leg.color), C.outline, 0.6);
    boot(ctx, leg.x - 0.4, 27.4, 5.3, leg.boot, true);
  }

  ctx.save();
  ctx.translate(lean, bob);

  // ilgi plaukai už nugaros
  if (C.longHair) {
    ctx.beginPath();
    ctx.moveTo(6.4, 7.6);
    ctx.quadraticCurveTo(4.6, 13, 6, 18.4);
    ctx.lineTo(11.6, 18);
    ctx.lineTo(11.4, 8);
    ctx.closePath();
    fillStroke(ctx, lit(ctx, 5, 8, 7, 10, darken(C.hair, 0.08)), C.outline, 0.5);
  }

  // galinė ranka
  roundRect(ctx, 10.6 - phase * 1.7, 15.2, 3, 6.6, 1.4);
  fillStroke(ctx, darken(C.shirt, 0.28), C.outline, 0.5);
  hand(ctx, 12.1 - phase * 1.7, 22.2);

  // liemuo
  roundRect(ctx, 7.9, 14, 8.7, 10.6, 3);
  fillStroke(ctx, lit(ctx, 7.9, 14, 8.7, 10.6, C.shirt), C.outline, 0.7);
  roundRect(ctx, 7.9, 14, 8.7, 10.6, 3);
  plaid(ctx, 7.9, 14, 8.7, 10.6);
  roundRect(ctx, 8.5, 17, 7.7, 8.2, 1.3);
  fillStroke(ctx, lit(ctx, 8.5, 17, 7.7, 8.2, C.overall), C.outline, 0.6);
  ctx.strokeStyle = css(C.overall);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(12.6, 17.2); ctx.lineTo(12.2, 14.2);
  ctx.stroke();
  circle(ctx, 12.5, 18, 0.65);
  fillStroke(ctx, radialShade(ctx, 12.3, 17.8, 0.8, 0xffd54f, 0.5, 0.3), C.outline, 0.3);
  // šoninė kišenė
  ctx.beginPath();
  ctx.moveTo(13.6, 21.2); ctx.quadraticCurveTo(15.6, 21.4, 15.8, 23.4);
  ctx.strokeStyle = css(darken(C.overall, 0.35));
  ctx.lineWidth = 0.4;
  ctx.stroke();

  // galva, ausis, plaukai
  ctx.fillStyle = css(darken(C.skin, 0.18));
  ctx.fillRect(11, 12.6, 2.7, 2);
  circle(ctx, 12.5, 9.2, 6.4);
  fillStroke(ctx, radialShade(ctx, 12.2, 7.4, 7.2, C.skin, 0.22, 0.2), C.outline, 0.7);
  circle(ctx, 18.5, 10.7, 1.1);
  fillStroke(ctx, C.skin, C.outline, 0.5);
  ctx.beginPath();
  ctx.ellipse(8.4, 9, 3.3, 4.7, 0, 0, Math.PI * 2);
  fillStroke(ctx, radialShade(ctx, 7.6, 7, 4.6, C.hair, 0.2, 0.25), C.outline, 0.5);
  ellipse(ctx, 11.1, 10.3, 1.05, 1.45);
  fillStroke(ctx, darken(C.skin, 0.06), C.outline, 0.4);
  ellipse(ctx, 11.1, 10.4, 0.45, 0.7);
  ctx.fillStyle = css(darken(C.skin, 0.25), 0.7);
  ctx.fill();

  // akis, antakis, skruostas, burna
  eye(ctx, 15.8, 10, blink, true);
  brow(ctx, 15.9, 7.8, -0.1);
  ellipse(ctx, 15.3, 12.4, 1.2, 0.7);
  ctx.fillStyle = 'rgba(255,110,110,0.32)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16.2, 13.1);
  ctx.quadraticCurveTo(17, 13.5, 17.7, 12.9);
  ctx.strokeStyle = css(0x6b3a22);
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';
  ctx.stroke();
  if (C.beard) {
    ctx.beginPath();
    ctx.moveTo(12.4, 11.2);
    ctx.quadraticCurveTo(13.2, 16.8, 16.4, 16);
    ctx.quadraticCurveTo(18.8, 15, 18.4, 12.2);
    ctx.quadraticCurveTo(15.4, 13.6, 12.4, 11.2);
    fillStroke(ctx, lit(ctx, 12.4, 11.2, 6.4, 5, C.beard, 0.15, 0.2), C.outline, 0.5);
  }

  if (C.hat) drawHat(ctx, 12.8, 0, false);
  else drawHairTop(ctx, 12.6, false);

  // priekinė ranka
  roundRect(ctx, 11.2 + phase * 1.7, 15.2, 3.1, 6.6, 1.5);
  fillStroke(ctx, lit(ctx, 11.2, 15.2, 3.1, 6.6, C.shirt), C.outline, 0.6);
  ctx.fillStyle = css(darken(C.shirt, 0.3));
  ctx.fillRect(11.5 + phase * 1.7, 20.6, 2.5, 0.8);
  hand(ctx, 12.75 + phase * 1.7, 22.4);

  ctx.restore();
}

// Šiaudinė skrybėlė (cx – centras): kraštai, viršus, juostelė, pynimas
function drawHat(ctx, cx, oy, facingDown) {
  // šešėlis ant kaktos
  if (facingDown) {
    ellipse(ctx, cx, 7 + oy, 6.2, 1.2);
    ctx.fillStyle = 'rgba(60,30,10,0.25)';
    ctx.fill();
  }
  ellipse(ctx, cx, 5.3 + oy, 9.6, 2.8);
  const brim = ctx.createLinearGradient(0, 2.5, 0, 8.2);
  brim.addColorStop(0, css(lighten(C.hat, 0.3)));
  brim.addColorStop(1, css(darken(C.hat, 0.25)));
  fillStroke(ctx, brim, C.outline, 0.7);
  ctx.beginPath();
  ctx.roundRect(cx - 4.5, 0.5 + oy, 9, 5.1, [3.2, 3.2, 0.6, 0.6]);
  fillStroke(ctx, lit(ctx, cx - 4.5, 0.5, 9, 5, lighten(C.hat, 0.08), 0.25, 0.2), C.outline, 0.7);
  ctx.fillStyle = css(C.band);
  ctx.fillRect(cx - 4.5, 3.8 + oy, 9, 1.4);
  ctx.fillStyle = css(lighten(C.band, 0.3), 0.6);
  ctx.fillRect(cx - 4.5, 3.8 + oy, 9, 0.4);
  // šiaudų pynimas
  ctx.strokeStyle = css(darken(C.hat, 0.32), 0.35);
  ctx.lineWidth = 0.35;
  for (let x = cx - 7.6; x <= cx + 7.6; x += 1.6) {
    ctx.beginPath();
    ctx.moveTo(x, 4.3 + oy);
    ctx.lineTo(x + 0.6, 6.9 + oy);
    ctx.stroke();
  }
  ctx.strokeStyle = css(mix(C.hat, 0xffffff, 0.5), 0.35);
  for (let x = cx - 3.6; x <= cx + 3.6; x += 1.5) {
    ctx.beginPath();
    ctx.moveTo(x, 1.2 + oy);
    ctx.lineTo(x, 3.6 + oy);
    ctx.stroke();
  }
}
