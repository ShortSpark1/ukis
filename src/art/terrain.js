import {
  T, S, DESIGN, seededRandom, drawTexture, noiseRect, css, lighten, darken,
  circle, ellipse, roundRect, fillStroke, vGradient, softShadow,
} from './utils.js';
import { SEASON_KEYS, SEASON_LOOK, sk } from './seasons.js';

// =====================================================================
//  RELJEFAS: žolė, dirva, takai, vanduo, krantai, tiltai, tvoros,
//  sukasta žemė, gėlės
// =====================================================================

const DIRT = 0x8a5a32;
const WATER = 0x2f74c0;
const OUTLINE = 0x2b1d14;

export const GRASS_VARIANTS = 4;
export const DIRT_VARIANTS = 2;
export const FLOWER_VARIANTS = 3;
export const WATER_FRAMES = 4;
export const PATH_VARIANTS = 2;

// Tvoros kadro pavadinimas pagal kaimynų kaukę (1=š, 2=r, 4=p, 8=v)
export const fenceFrameName = (mask) => `f${mask}`;

export function makeTerrain(scene) {
  // Sezoniniai piešiniai: kiekvienam sezonui atskira versija (raktas 'grass_0@winter' ir pan.)
  for (const season of SEASON_KEYS) {
    const look = SEASON_LOOK[season];
    for (let i = 0; i < GRASS_VARIANTS; i++) makeGrass(scene, sk(`grass_${i}`, season), 100 + i * 17, look);
    for (let i = 0; i < DIRT_VARIANTS; i++) makeDirt(scene, sk(`dirt_${i}`, season), 300 + i * 31, look);
    for (let i = 0; i < FLOWER_VARIANTS; i++) makeFlowers(scene, sk(`flowers_${i}`, season), 500 + i * 13, look);
    for (let i = 0; i < PATH_VARIANTS; i++) makePath(scene, sk(`path_${i}`, season), 700 + i * 11, look);
    makeGrassEdges(scene, season, look);
  }
  makeBridge(scene, 'bridge_h', 0);
  makeBridge(scene, 'bridge_v', Math.PI / 2);
  for (const [dir, angle] of Object.entries(SIDES)) makeBridgeRail(scene, `bridge_rail_${dir}`, angle);
  makeFence(scene);
  makeWater(scene);
  makeEdges(scene);
  makeSoil(scene, 'soil_dry', false);
  makeSoil(scene, 'soil_wet', true);
}

// Pasuka piešinį aplink langelio centrą (kraštams: š, r, p, v)
function rotated(ctx, angle, fn) {
  ctx.save();
  ctx.translate(T / 2, T / 2);
  ctx.rotate(angle);
  ctx.translate(-T / 2, -T / 2);
  ctx.scale(S, S);
  fn(ctx);
  ctx.restore();
}

const SIDES = { n: 0, e: Math.PI / 2, s: Math.PI, w: -Math.PI / 2 };
const CORNERS = { nw: 0, ne: Math.PI / 2, se: Math.PI, sw: -Math.PI / 2 };

// ---------- Žolė ----------
function makeGrass(scene, key, seed, look) {
  drawTexture(scene, key, T, T, (ctx) => {
    const rnd = seededRandom(seed);
    noiseRect(ctx, 0, 0, T, T, look.grass, look.snow ? 8 : 16, rnd);

    // Švelnios šviesesnės / tamsesnės dėmės (toliau nuo kraštų – kad nesimatytų siūlių)
    for (let i = 0; i < 3; i++) {
      const r = 6 + rnd() * 6;
      const x = r + rnd() * (T - 2 * r);
      const y = r + rnd() * (T - 2 * r);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const c = rnd() > 0.5 ? look.grassLight : look.grassDark;
      g.addColorStop(0, css(c, look.snow ? 0.35 : 0.18));
      g.addColorStop(1, css(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, T, T);
    }

    // Žolės stiebeliai (žiemą – tik vienas kitas, kyšantis iš sniego)
    const blades = look.snow ? 6 : 46;
    for (let i = 0; i < blades; i++) {
      const x = Math.floor(rnd() * T);
      const y = Math.floor(rnd() * T);
      const h = 2 + Math.floor(rnd() * 3);
      ctx.fillStyle = rnd() > 0.45 ? css(look.blade1, 0.75) : css(look.blade2, 0.8);
      ctx.fillRect(x, y, 1, h);
      if (rnd() > 0.6) ctx.fillRect(x + 1, y + 1, 1, h - 1);
    }
    // Sniego žybsniai
    if (look.snow) {
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1);
      }
    }
  });
}

// ---------- Gėlės (dekoracija ant žolės, permatomas fonas) ----------
function makeFlowers(scene, key, seed, look) {
  // Pavasarį daug įvairiaspalvių gėlių, rudenį – kelios geltonos ir oranžinės, žiemą – nė vienos
  const palette = look.leaves2
    ? [0xffb347, 0xe8743a, 0xffe066]
    : [0xffffff, 0xff8fb8, 0xb58cff, 0xffe066, 0x7fc8ff, 0xff7a5c];
  drawTexture(scene, key, T, T, (ctx) => {
    const rnd = seededRandom(seed);
    ctx.scale(S, S);
    const count = Math.round((3 + Math.floor(rnd() * 3)) * look.flowers);
    for (let i = 0; i < count; i++) {
      const x = 5 + rnd() * 22;
      const y = 7 + rnd() * 20;
      const color = palette[Math.floor(rnd() * palette.length)];
      // stiebas ir lapelis
      ctx.strokeStyle = css(0x2f6b22);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.3, y + 4);
      ctx.stroke();
      ellipse(ctx, x + 1.2, y + 3, 1.2, 0.5, -0.5);
      ctx.fillStyle = css(0x4c9a33);
      ctx.fill();
      // žiedlapiai
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        circle(ctx, x + Math.cos(a) * 1.15, y + Math.sin(a) * 1.15, 0.95);
        ctx.fillStyle = css(color);
        ctx.fill();
        ctx.strokeStyle = css(darken(color, 0.35), 0.6);
        ctx.lineWidth = 0.25;
        ctx.stroke();
      }
      circle(ctx, x, y, 0.65);
      ctx.fillStyle = css(0xffb300);
      ctx.fill();
    }
    // Rudenį – nukritę lapai
    if (look.leaves2) {
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, 3 + rnd() * 26, 3 + rnd() * 26, 1.4, 0.8, rnd() * 3);
        ctx.fillStyle = css(rnd() > 0.5 ? look.leaves : look.leaves2, 0.9);
        ctx.fill();
      }
    }
  });
}

// ---------- Dirva (dar nesukasta lauko žemė) ----------
function makeDirt(scene, key, seed, look) {
  drawTexture(scene, key, T, T, (ctx) => {
    const rnd = seededRandom(seed);
    noiseRect(ctx, 0, 0, T, T, DIRT, 22, rnd);
    ctx.save();
    ctx.scale(S, S);
    // akmenukai su šešėliu
    for (let i = 0; i < 6; i++) {
      const x = 2 + rnd() * 28;
      const y = 2 + rnd() * 28;
      const r = 0.5 + rnd() * 0.9;
      ellipse(ctx, x, y + 0.4, r, r * 0.7);
      ctx.fillStyle = css(0x4a2e16, 0.5);
      ctx.fill();
      ellipse(ctx, x, y, r, r * 0.7);
      ctx.fillStyle = css(rnd() > 0.5 ? 0xb89470 : 0xa07d5b);
      ctx.fill();
    }
    // tamsūs grumstai
    for (let i = 0; i < 10; i++) {
      ellipse(ctx, rnd() * 32, rnd() * 32, 0.6 + rnd(), 0.4 + rnd() * 0.5);
      ctx.fillStyle = css(0x5e3a1c, 0.45);
      ctx.fill();
    }
    if (look.snow) snowPatches(ctx, rnd, 3);
    ctx.restore();
  });
}

// Sniego lopinėliai (dizaino vienetais, toliau nuo kraštų)
function snowPatches(ctx, rnd, count) {
  for (let i = 0; i < count; i++) {
    const r = 2.5 + rnd() * 3.5;
    const x = r + rnd() * (32 - 2 * r);
    const y = r + rnd() * (32 - 2 * r);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(240,246,252,0.95)');
    g.addColorStop(0.7, 'rgba(225,235,246,0.7)');
    g.addColorStop(1, 'rgba(225,235,246,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// ---------- Takas (sutrypta žvyruota žemė) ----------
function makePath(scene, key, seed, look) {
  drawTexture(scene, key, T, T, (ctx) => {
    const rnd = seededRandom(seed);
    noiseRect(ctx, 0, 0, T, T, 0xbf9c6b, 20, rnd);
    ctx.save();
    ctx.scale(S, S);
    // žvyro akmenukai
    for (let i = 0; i < 14; i++) {
      const x = 1 + rnd() * 30;
      const y = 1 + rnd() * 30;
      const r = 0.4 + rnd() * 0.8;
      ellipse(ctx, x, y + 0.3, r, r * 0.7);
      ctx.fillStyle = css(0x6e5232, 0.45);
      ctx.fill();
      ellipse(ctx, x, y, r, r * 0.7);
      ctx.fillStyle = css(rnd() > 0.5 ? 0xe0cba4 : 0xa8916c);
      ctx.fill();
    }
    if (look.snow) snowPatches(ctx, rnd, 4);
    ctx.restore();
  });
}

// ---------- Tiltas (lentos per vandenį; angle=0 – einama rytai–vakarai) ----------
// Turėklai – atskiri piešiniai, dedami tik išoriniame tilto krašte,
// kad plačiame tilte per vidurį nebūtų papildomų turėklų.
function makeBridge(scene, key, angle) {
  drawTexture(scene, key, T, T, (ctx) => {
    rotated(ctx, angle, () => {
      // šešėlis ant vandens
      ctx.fillStyle = 'rgba(10,30,60,0.35)';
      ctx.fillRect(0, 2, 32, 31);
      // lentos skersai ėjimo krypties
      for (let x = 0; x < 32; x += 4) {
        ctx.beginPath();
        ctx.rect(x + 0.2, 0, 3.6, 32);
        const g = ctx.createLinearGradient(0, 3, 0, 28);
        g.addColorStop(0, css(x % 8 ? 0xb07a45 : 0xa06c3a));
        g.addColorStop(1, css(x % 8 ? 0x8a5a30 : 0x7a4c26));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = css(0x4a2b13, 0.8);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        // vinutės
        ctx.fillStyle = css(0x3a2a1a, 0.8);
        ctx.fillRect(x + 1.6, 4, 0.6, 0.6);
        ctx.fillRect(x + 1.6, 27.4, 0.6, 0.6);
      }
    });
  });
}

// Turėklas viršutiniame krašte (pasukamas į kitas puses)
function makeBridgeRail(scene, key, angle) {
  drawTexture(scene, key, T, T, (ctx) => {
    rotated(ctx, angle, () => {
      ctx.beginPath();
      ctx.rect(0, 1.2, 32, 2.6);
      ctx.fillStyle = css(0x6e4321);
      ctx.fill();
      ctx.strokeStyle = css(0x3a220f, 0.9);
      ctx.lineWidth = 0.5;
      ctx.stroke();
      for (const px of [3, 19]) {
        ctx.beginPath();
        ctx.rect(px, 0.4, 3, 4.4);
        ctx.fillStyle = css(0x5a3519);
        ctx.fill();
        ctx.stroke();
      }
    });
  });
}

// ---------- Tvora (16 kadrų pagal kaimynus: 1=š, 2=r, 4=p, 8=v) ----------
// Vienoje tekstūroje 'fence' – 16 kadrų f0 … f15. Kiekvienas stulpelis
// „jungiasi“ skersiniais su tomis pusėmis, kuriose yra kita tvora.
function makeFence(scene) {
  const wood = (ctx, y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, css(0xd8a468));
    g.addColorStop(1, css(0x8a5a30));
    return g;
  };
  const tex = drawTexture(scene, 'fence', T * 16, T, (ctx) => {
    for (let mask = 0; mask < 16; mask++) {
      ctx.save();
      ctx.translate(mask * T, 0);
      ctx.scale(S, S);
      softShadow(ctx, 16, 28, 7, 2.2, 0.35);
      // skersiniai į vakarus / rytus
      for (const y of [11, 18]) {
        if (mask & 8) { roundRect(ctx, -1, y, 17, 3, 0.8); fillStroke(ctx, wood(ctx, y, y + 3), OUTLINE, 0.6); }
        if (mask & 2) { roundRect(ctx, 16, y, 17, 3, 0.8); fillStroke(ctx, wood(ctx, y, y + 3), OUTLINE, 0.6); }
      }
      // jungtys į šiaurę / pietus (vertikalios lentos)
      if (mask & 1) { roundRect(ctx, 14.5, -1, 3, 9, 0.8); fillStroke(ctx, vGradient(ctx, 0, 9, 0xc99258, 0x8a5a30), OUTLINE, 0.6); }
      if (mask & 4) { roundRect(ctx, 14.5, 24, 3, 9, 0.8); fillStroke(ctx, vGradient(ctx, 24, 33, 0xc99258, 0x8a5a30), OUTLINE, 0.6); }
      // stulpelis su smailiu viršum
      ctx.beginPath();
      ctx.moveTo(13, 9);
      ctx.lineTo(16, 5.5);
      ctx.lineTo(19, 9);
      ctx.lineTo(19, 27);
      ctx.lineTo(13, 27);
      ctx.closePath();
      const post = ctx.createLinearGradient(13, 0, 19, 0);
      post.addColorStop(0, css(0xe0ae72));
      post.addColorStop(1, css(0x7a4c26));
      fillStroke(ctx, post, OUTLINE, 0.7);
      ctx.strokeStyle = css(0x5a3519, 0.5);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(15.2, 12); ctx.lineTo(15.6, 24);
      ctx.stroke();
      ctx.restore();
    }
  });
  for (let mask = 0; mask < 16; mask++) tex.add(fenceFrameName(mask), 0, mask * T, 0, T, T);
}

// ---------- Vanduo (4 animacijos kadrai viename paveikslėlyje) ----------
function makeWater(scene) {
  const tex = drawTexture(scene, 'water', T * WATER_FRAMES, T, (ctx) => {
    // Bangelės: vietos fiksuotos, keičiasi tik ryškumas ir nedidelis poslinkis.
    const waveRnd = seededRandom(777);
    const waves = Array.from({ length: 7 }, () => ({
      x: waveRnd() * T, y: waveRnd() * T, len: 3 + waveRnd() * 4, phase: waveRnd() * Math.PI * 2,
    }));

    for (let f = 0; f < WATER_FRAMES; f++) {
      const ox = f * T;
      noiseRect(ctx, ox, 0, T, T, WATER, 9, seededRandom(900)); // tas pats triukšmas visuose kadruose
      const t = (f / WATER_FRAMES) * Math.PI * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, 0, T, T);
      ctx.clip();
      for (const w of waves) {
        const alpha = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(t + w.phase));
        const dx = Math.sin(t + w.phase) * 1.5;
        // piešiame ir „persuktą“ kopiją, kad bangelė nesikirstų per kraštą
        for (const wrap of [-T, 0, T]) {
          const x = ox + w.x + dx + wrap;
          ctx.beginPath();
          ctx.moveTo(x - w.len * S * 0.5, w.y);
          ctx.quadraticCurveTo(x, w.y + 1.6 * S, x + w.len * S * 0.5, w.y);
          ctx.strokeStyle = css(0xbfe1ff, alpha);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      // mažyčiai žybsniai skirtinguose kadruose
      const spark = seededRandom(1000 + f);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(ox + Math.floor(spark() * (T - 2)), Math.floor(spark() * (T - 2)), 2, 1);
      }
      ctx.restore();
    }
  });
  for (let f = 0; f < WATER_FRAMES; f++) tex.add(`w${f}`, 0, f * T, 0, T, T);
}

// ---------- Kraštai ----------
function makeEdges(scene) {
  // Kranto juosta vandens langelio pusėje, kuri ribojasi su žeme.
  // Banguota linija periodiška (kartojasi kas 32 vnt.), todėl gretimi
  // langeliai susijungia be siūlių.
  const wave = (x) => Math.sin((x / DESIGN) * Math.PI * 4) * 0.7;

  for (const [dir, angle] of Object.entries(SIDES)) {
    drawTexture(scene, `shore_${dir}`, T, T, (ctx) => {
      rotated(ctx, angle, () => {
        // seklus vanduo
        const g = ctx.createLinearGradient(0, 2, 0, 11);
        g.addColorStop(0, css(0x7fc4ee, 0.55));
        g.addColorStop(1, css(0x7fc4ee, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 2, 32, 9);
        // smėlis
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(32, 0);
        for (let x = 32; x >= 0; x -= 1) ctx.lineTo(x, 3 + wave(x));
        ctx.closePath();
        const sand = ctx.createLinearGradient(0, 0, 0, 4);
        sand.addColorStop(0, css(0xe3cd8f));
        sand.addColorStop(1, css(0xc9ad6c));
        ctx.fillStyle = sand;
        ctx.fill();
        // puta
        ctx.beginPath();
        for (let x = 0; x <= 32; x += 1) ctx.lineTo(x, 4 + wave(x + 5) * 0.8);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });
    });
  }

  // Vidiniai kranto kampai (kai žemė yra tik įstrižai)
  for (const [dir, angle] of Object.entries(CORNERS)) {
    drawTexture(scene, `shore_inner_${dir}`, T, T, (ctx) => {
      rotated(ctx, angle, () => {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 10);
        g.addColorStop(0, css(0x7fc4ee, 0.5));
        g.addColorStop(1, css(0x7fc4ee, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 11, 11);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 3.4, 0, Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = css(0xd6bf80);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 4.3, 0, Math.PI / 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });
    });
  }
}

// ---------- Žolės kraštas ant dirvos ir takų (sezoninis) ----------
function makeGrassEdges(scene, season, look) {
  for (const [dir, angle] of Object.entries(SIDES)) {
    drawTexture(scene, sk(`dirtedge_${dir}`, season), T, T, (ctx) => {
      rotated(ctx, angle, () => {
        // šešėlis po žolės kraštu
        const sh = ctx.createLinearGradient(0, 2, 0, 6);
        sh.addColorStop(0, 'rgba(40,20,5,0.35)');
        sh.addColorStop(1, 'rgba(40,20,5,0)');
        ctx.fillStyle = sh;
        ctx.fillRect(0, 2, 32, 4);
        // žolės (žiemą – sniego) „lūpa“ su nukarusiais stiebeliais
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let x = 0; x <= 32; x += 2) {
          const h = 2.2 + Math.sin(x * 1.7) * 0.6 + Math.sin(x * 0.55) * 0.5;
          ctx.lineTo(x, h);
          ctx.lineTo(x + 1, h + 1.3);
        }
        ctx.lineTo(32, 0);
        ctx.closePath();
        ctx.fillStyle = css(look.grass);
        ctx.fill();
        ctx.strokeStyle = css(look.snow ? look.grassDark : darken(look.grass, 0.3), 0.8);
        ctx.lineWidth = 0.4;
        ctx.stroke();
      });
    });
  }
}

// ---------- Sukasta žemė ----------
function makeSoil(scene, key, wet) {
  const base = wet ? 0x4a2c17 : 0x6e4423;
  drawTexture(scene, key, T, T, (ctx) => {
    // Triukšmą piešiame atskiroje drobėje, o tada „iškerpame“ apvalintu stačiakampiu
    const noise = document.createElement('canvas');
    noise.width = T;
    noise.height = T;
    noiseRect(noise.getContext('2d'), 0, 0, T, T, base, 18, seededRandom(wet ? 41 : 42));

    ctx.save();
    ctx.scale(S, S);
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, 29, 29, 4);
    ctx.save();
    ctx.clip();
    ctx.scale(1 / S, 1 / S);
    ctx.drawImage(noise, 0, 0);
    ctx.restore();

    // vagos: tamsus griovelis + šviesesnė keterėlė
    for (let row = 0; row < 4; row++) {
      const y = 6 + row * 7;
      ctx.beginPath();
      ctx.moveTo(4, y);
      ctx.bezierCurveTo(12, y + 0.8, 20, y - 0.8, 28, y);
      ctx.strokeStyle = css(darken(base, 0.45), 0.9);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4.5, y - 1.9);
      ctx.bezierCurveTo(12, y - 1.1, 20, y - 2.7, 27.5, y - 1.9);
      ctx.strokeStyle = css(lighten(base, 0.28), 0.55);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // kraštas
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, 29, 29, 4);
    ctx.strokeStyle = css(darken(base, 0.5), 0.8);
    ctx.lineWidth = 1;
    ctx.stroke();

    // drėgnos žemės blizgesys
    if (wet) {
      const rnd = seededRandom(7);
      for (let i = 0; i < 7; i++) {
        ellipse(ctx, 4 + rnd() * 24, 4 + rnd() * 24, 0.9 + rnd() * 0.8, 0.35);
        ctx.fillStyle = 'rgba(170,210,255,0.35)';
        ctx.fill();
      }
    }
    ctx.restore();
  });
}
