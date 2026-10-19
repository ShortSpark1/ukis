import { CONFIG } from '../config.js';

// =====================================================================
//  PIEŠIMO PAGALBINĖS FUNKCIJOS
//  Visą grafiką piešiame naršyklės Canvas 2D API: jis moka gradientus,
//  kreives, permatomumą ir šešėlius. Phaser vėliau tokį „drobės“
//  paveikslėlį naudoja kaip įprastą tekstūrą.
//
//  „Dizaino vienetai“: piešiame taip, lyg langelis būtų 32x32, o
//  ctx.scale() padidina iki tikro dydžio (CONFIG.TILE_SIZE). Taip
//  pakeitus langelio dydį, visi piešiniai prisitaiko patys.
// =====================================================================

export const DESIGN = 32;
export const S = CONFIG.TILE_SIZE / DESIGN; // mastelis: dizaino vienetas → pikseliai
export const T = CONFIG.TILE_SIZE;

// „Atsitiktiniai“ skaičiai su sėkla – kiekvieną kartą tie patys
export function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Sukuria drobės tekstūrą, leidžia joje piešti ir ją „užbaigia“.
// fn(ctx, plotis, aukštis)
export function drawTexture(scene, key, width, height, fn) {
  const tex = scene.textures.createCanvas(key, Math.ceil(width), Math.ceil(height));
  const ctx = tex.getContext();
  fn(ctx, width, height);
  tex.refresh();
  return tex;
}

// ---------- Spalvos ----------
// Spalvas laikome skaičiais (0xRRGGBB), o Canvas'ui paverčiame tekstu.

export function rgb(n) {
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function css(n, alpha = 1) {
  const [r, g, b] = rgb(n);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Sumaišo dvi spalvas: t=0 → a, t=1 → b
export function mix(a, b, t) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | bl;
}

export const lighten = (c, t) => mix(c, 0xffffff, t);
export const darken = (c, t) => mix(c, 0x000000, t);

// ---------- Figūros ----------

// Užpildo stačiakampį „triukšmu“ – kiekvienas pikselis truputį kitos
// spalvos. Taip žolė ar žemė atrodo natūraliau. Koordinatės – PIKSELIAIS.
export function noiseRect(ctx, x0, y0, w, h, base, variance, rnd) {
  const img = ctx.getImageData(x0, y0, w, h);
  const [r, g, b] = rgb(base);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (rnd() - 0.5) * variance;
    img.data[i] = r + v;
    img.data[i + 1] = g + v;
    img.data[i + 2] = b + v * 0.6;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, x0, y0);
}

export function ellipse(ctx, x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, Math.PI * 2);
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Užpildas + kontūras vienu kvietimu (figūra jau turi būti nubrėžta)
export function fillStroke(ctx, fill, stroke = 0x2b1d14, lineWidth = 0.7, strokeAlpha = 0.85) {
  ctx.fillStyle = typeof fill === 'number' ? css(fill) : fill;
  ctx.fill();
  if (stroke !== null) {
    ctx.strokeStyle = css(stroke, strokeAlpha);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Vertikalus gradientas tarp dviejų spalvų
export function vGradient(ctx, y0, y1, top, bottom) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(bottom));
  return g;
}

// Apskritas gradientas: šviesus taškas (x,y) → tamsus kraštas.
// Puikiai tinka apvaliems daiktams (vaisiams, akmenims) – atrodo 3D.
export function radialShade(ctx, cx, cy, r, color, lightAmt = 0.45, darkAmt = 0.35) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, css(lighten(color, lightAmt)));
  g.addColorStop(0.55, css(color));
  g.addColorStop(1, css(darken(color, darkAmt)));
  return g;
}

// Minkštas šešėlis po objektu (dizaino vienetais)
export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.3) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(20,30,10,${alpha})`);
  g.addColorStop(1, 'rgba(20,30,10,0)');
  ctx.fillStyle = g;
  circle(ctx, 0, 0, rx);
  ctx.fill();
  ctx.restore();
}

// Lapas: smailėjanti forma su vidurine gysla.
// (x, y) – lapo pradžia, len – ilgis, width – plotis, angle – kampas radianais
export function leaf(ctx, x, y, len, width, angle, color, bend = 0.25) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -width - len * bend * 0.3, len, -len * bend * 0.4);
  ctx.quadraticCurveTo(len * 0.5, width - len * bend * 0.3, 0, 0);
  const g = ctx.createLinearGradient(0, -width, 0, width);
  g.addColorStop(0, css(lighten(color, 0.25)));
  g.addColorStop(1, css(darken(color, 0.25)));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = css(darken(color, 0.5), 0.7);
  ctx.lineWidth = 0.4;
  ctx.stroke();
  // gysla
  ctx.beginPath();
  ctx.moveTo(0.5, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * bend * 0.25, len * 0.9, -len * bend * 0.37);
  ctx.strokeStyle = css(lighten(color, 0.35), 0.6);
  ctx.lineWidth = 0.35;
  ctx.stroke();
  ctx.restore();
}
