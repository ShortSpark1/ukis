// =====================================================================
//  TELEFONO PATIKRA
//  Žaidimas sukurtas kompiuteriui: daug valdymo klavišais, o telefono
//  ekrane 960 px pločio vaizdas tampa per mažas skaityti. Todėl telefone
//  parodome pranešimą (su mygtuku „Vis tiek bandyti“ – pele ar pirštu
//  vaikščioti ir dirbti vis tiek galima).
// =====================================================================

// Ar tai greičiausiai telefonas ar planšetė be pelės?
export function isLikelyPhone() {
  const touchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 600;
  return touchOnly || smallScreen;
}

export function showMobileNotice() {
  const box = document.createElement('div');
  box.id = 'mobile-notice';
  box.innerHTML = `
    <div class="card">
      <div class="icon">🥕</div>
      <h1>Žaisk kompiuteryje</h1>
      <p>Šis žaidimas sukurtas kompiuteriui su klaviatūra ir pele. Telefone vaizdas per mažas,
         o dalis valdymo (E, I, J klavišai) neveiks.</p>
      <p>Atsidaryk šią nuorodą kompiuteryje – ten žaisti bus daug smagiau!</p>
      <button type="button">Vis tiek bandyti</button>
    </div>`;
  const style = document.createElement('style');
  style.textContent = `
    #mobile-notice { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center;
      justify-content: center; padding: 16px; background: rgba(20, 30, 20, 0.92);
      font-family: "Trebuchet MS", "Segoe UI", Verdana, sans-serif; color: #fff4dc; }
    #mobile-notice .card { max-width: 420px; padding: 24px; text-align: center; border-radius: 14px;
      background: #6e4320; border: 3px solid #2a180c; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
    #mobile-notice .icon { font-size: 48px; }
    #mobile-notice h1 { margin: 8px 0 12px; font-size: 24px; color: #ffd54f; }
    #mobile-notice p { margin: 0 0 12px; font-size: 16px; line-height: 1.4; }
    #mobile-notice button { margin-top: 8px; padding: 12px 22px; font-size: 16px; font-weight: bold;
      color: #fff; background: #5aa543; border: 2px solid #1f3b12; border-radius: 8px; }`;
  document.head.appendChild(style);
  document.body.appendChild(box);
  // Paspaudimai ant pranešimo neturi pasiekti žaidimo (Phaser klausosi viso lango)
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'pointerup', 'mouseup', 'touchend']) {
    box.addEventListener(type, (e) => e.stopPropagation());
  }
  box.querySelector('button').addEventListener('click', () => box.remove());
}
