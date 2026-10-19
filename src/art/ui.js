import { drawTexture, css, lighten, darken, seededRandom } from './utils.js';

// =====================================================================
//  SĄSAJOS (UI) PIEŠINIAI
//  Skydeliai piešiami tokio dydžio, kokio reikia, ir įsimenami pagal
//  raktą, pvz. 'panel_wood_620x470'. Antrą kartą tas pats dydis
//  nebepiešiamas – paimamas jau sukurtas.
// =====================================================================

export const FONT_FAMILY = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

// Teksto stilius su kontūru – gerai įskaitomas ant bet kokio fono
export function textStyle(size, color = '#fff4dc', extra = {}) {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke: '#2a180c',
    strokeThickness: Math.max(2, Math.round(size / 4.5)),
    resolution: 2, // ryškesnis tekstas, kai žaidimas ištempiamas
    ...extra,
  };
}

const STYLES = {
  // Medinis rėmas
  wood: { radius: 10, border: 0x2a180c, top: 0x9c6a3a, bottom: 0x6e4320, planks: true, highlight: 0.25, nails: true },
  // Įgilintas tamsus laukas
  inset: { radius: 8, border: 0x24150a, top: 0x3b2414, bottom: 0x4a2e1a, inner: true },
  // Inventoriaus langeliai
  slot: { radius: 8, border: 0x24150a, top: 0x4e3220, bottom: 0x6a4630, inner: true },
  slot_sel: { radius: 8, border: 0xffd34d, top: 0x7a5232, bottom: 0x9a6a40, inner: true, glow: 0xffd34d },
  // Mygtukai
  btn: { radius: 6, border: 0x1f3b12, top: 0x7cc35a, bottom: 0x3f7f2e, highlight: 0.35 },
  btn_hover: { radius: 6, border: 0x1f3b12, top: 0x98dc74, bottom: 0x52983c, highlight: 0.4 },
  btn_off: { radius: 6, border: 0x2a2018, top: 0x7a6a5a, bottom: 0x52463a, highlight: 0.12 },
  btn_red: { radius: 6, border: 0x4a120c, top: 0xd86a52, bottom: 0x9a3626, highlight: 0.35 },
  // Žinutė
  toast: { radius: 10, border: 0x1a1008, top: 0x3a2616, bottom: 0x2a1a0e, alpha: 0.92 },
};

export function panelKey(style, w, h) {
  return `panel_${style}_${Math.round(w)}x${Math.round(h)}`;
}

// Grąžina tekstūros raktą; jei tokio dar nėra – nupiešia
export function ensurePanel(scene, style, w, h) {
  w = Math.round(w);
  h = Math.round(h);
  const key = panelKey(style, w, h);
  if (scene.textures.exists(key)) return key;
  const st = STYLES[style];

  drawTexture(scene, key, w, h, (ctx) => {
    ctx.globalAlpha = st.alpha ?? 1;
    const r = st.radius;
    const pad = st.glow ? 2 : 1;

    if (st.glow) {
      ctx.shadowColor = css(st.glow, 0.9);
      ctx.shadowBlur = 6;
    }
    // pagrindas su gradientu
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(st.top));
    g.addColorStop(1, css(st.bottom));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.clip();
    // horizontalios lentos
    if (st.planks) {
      const rnd = seededRandom(w * 7 + h);
      for (let y = 14; y < h; y += 16) {
        ctx.fillStyle = 'rgba(40,20,5,0.35)';
        ctx.fillRect(0, y, w, 1.5);
        ctx.fillStyle = 'rgba(255,220,170,0.12)';
        ctx.fillRect(0, y + 1.5, w, 1);
      }
      for (let i = 0; i < w * h / 900; i++) {
        ctx.fillStyle = `rgba(60,30,10,${0.08 + rnd() * 0.1})`;
        ctx.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 18, 1);
      }
    }
    // vidinis šešėlis (įgilinimo įspūdis)
    if (st.inner) {
      const sh = ctx.createLinearGradient(0, 0, 0, 10);
      sh.addColorStop(0, 'rgba(0,0,0,0.45)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(0, 0, w, 10);
    }
    ctx.restore();

    // šviesus vidinis kraštelis viršuje
    if (st.highlight) {
      ctx.beginPath();
      ctx.roundRect(pad + 2, pad + 2, w - pad * 2 - 4, h - pad * 2 - 4, Math.max(2, r - 2));
      ctx.strokeStyle = css(lighten(st.top, 0.5), st.highlight);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // išorinis kontūras
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
    ctx.strokeStyle = css(st.border);
    ctx.lineWidth = st.glow ? 2.5 : 2;
    ctx.stroke();

    // vinutės kampuose
    if (st.nails && w > 60 && h > 40) {
      for (const [x, y] of [[9, 9], [w - 9, 9], [9, h - 9], [w - 9, h - 9]]) {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = css(0xb9a37a);
        ctx.fill();
        ctx.strokeStyle = css(darken(0xb9a37a, 0.6));
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
  return key;
}

// XP juostos fonas ir užpildas
export function makeBarTextures(scene, w, h) {
  drawTexture(scene, 'bar_bg', w, h, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, w - 1, h - 1, h / 2);
    ctx.fillStyle = css(0x1e120a);
    ctx.fill();
    ctx.strokeStyle = css(0x0e0804);
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  drawTexture(scene, 'bar_fill', w, h, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(1.5, 1.5, w - 3, h - 3, (h - 3) / 2);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(0xb6f07a));
    g.addColorStop(0.5, css(0x6cbf3c));
    g.addColorStop(1, css(0x3f8a22));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(4, 3, w - 8, 1.5);
  });
}
