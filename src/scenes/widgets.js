import { CONFIG } from '../config.js';
import { ensurePanel, textStyle } from '../art/SpriteLibrary.js';

// =====================================================================
//  BENDRI SĄSAJOS ELEMENTAI (naudoja ir pradžios ekranas, ir UIScene)
// =====================================================================

// Mygtukas: piešinys + užrašas; užvedus pelę – šviesesnis.
// (x, y) – kairysis kraštas ir vertikalus vidurys konteineryje.
export function makeButton(scene, container, x, y, w, h, label, onClick, enabled = true, style = 'btn', fontSize = 13) {
  const base = scene.add.image(x, y, ensurePanel(scene, enabled ? style : 'btn_off', w, h)).setOrigin(0, 0.5);
  const hover = scene.add.image(x, y, ensurePanel(scene, 'btn_hover', w, h)).setOrigin(0, 0.5).setVisible(false);
  const text = scene.add.text(x + w / 2, y, label, textStyle(fontSize, enabled ? '#ffffff' : '#c9bcae')).setOrigin(0.5);
  container.add([base, hover, text]);
  if (enabled) {
    base.setInteractive({ useHandCursor: true });
    base.on('pointerover', () => hover.setVisible(style === 'btn'));
    base.on('pointerout', () => hover.setVisible(false));
    base.on('pointerdown', () => {
      text.setY(y + 1);
      // kitame kadre – kad mygtukas nebūtų naikinamas jo paties paspaudimo metu
      scene.time.delayedCall(0, onClick);
    });
  }
  return { base, text };
}

// Atsiliepimo langas su nuoroda į formą (CONFIG.FEEDBACK_URL).
// Grąžina konteinerį; onClose iškviečiamas uždarius.
export function showFeedbackPanel(scene, screenW, screenH, depth, onClose) {
  const W = 560;
  const H = 260;
  const root = scene.add.container(0, 0).setDepth(depth);
  const close = () => {
    root.destroy();
    onClose?.();
  };
  const dim = scene.add.rectangle(0, 0, screenW, screenH, 0x000000, 0.5).setOrigin(0).setInteractive();
  dim.on('pointerdown', () => scene.time.delayedCall(0, close));
  root.add(dim);

  const c = scene.add.container((screenW - W) / 2, (screenH - H) / 2);
  root.add(c);
  c.add(scene.add.image(0, 0, ensurePanel(scene, 'wood', W, H)).setOrigin(0).setInteractive());
  c.add(scene.add.text(W / 2, 30, 'ATSILIEPIMAS', textStyle(22, '#ffd54f')).setOrigin(0.5));

  const url = (CONFIG.FEEDBACK_URL ?? '').trim();
  const text = url
    ? 'Ačiū, kad išbandei žaidimą! Parašyk, kas patiko, kas trukdė ir ką pridėtum. Užtruks vos minutę.'
    : 'Atsiliepimų formos nuoroda dar nenustatyta. Žaidimo kūrėjas ją gali įrašyti faile src/config.js (FEEDBACK_URL).';
  c.add(scene.add.text(W / 2, 92, text, textStyle(14, '#fff4dc', { align: 'center', wordWrap: { width: W - 60 } })).setOrigin(0.5));
  if (url) {
    c.add(scene.add.text(W / 2, 146, url, textStyle(12, '#9ff3ff', { wordWrap: { width: W - 60, useAdvancedWrap: true } })).setOrigin(0.5));
    makeButton(scene, c, W / 2 - 200, H - 42, 220, 38, 'Atidaryti formą', () => {
      // Forma atsidaro naujame skirtuke – žaidimas lieka atidarytas
      window.open(url, '_blank', 'noopener');
    }, true, 'btn', 14);
  }
  makeButton(scene, c, url ? W / 2 + 40 : W / 2 - 80, H - 42, 160, 38, 'Uždaryti', close, true, 'btn_red', 14);
  return root;
}
