import Phaser from 'phaser';

// =====================================================================
//  ĮVYKIŲ KANALAS
//  Bendras „radijas“, per kurį scenos siunčia žinutes viena kitai.
//  Pvz. GameScene praneša „būsena pasikeitė“, o UIScene perpiešia HUD.
// =====================================================================
export const EventBus = new Phaser.Events.EventEmitter();

// Įvykių pavadinimai vienoje vietoje, kad nesuklystum rašydamas
export const EVENTS = {
  STATE_CHANGED: 'state-changed', // būsena pasikeitė – reikia perpiešti UI
  TOAST: 'toast',                 // trumpa žinutė ekrane
  SELECT_SLOT: 'select-slot',     // pasirinktas inventoriaus langelis
  TOGGLE_SHOP: 'toggle-shop',     // atidaryti / uždaryti parduotuvę
  SHOP_STATE: 'shop-state',       // parduotuvė atidaryta (true) / uždaryta (false)
  SHOP_ACTION: 'shop-action',     // paspaustas parduotuvės mygtukas (pirkti / parduoti)
  MINIMAP_WALK: 'minimap-walk',   // paspaustas minimapas – eiti į langelį { x, y }
  SLEEP_PROMPT: 'sleep-prompt',   // parodyti klausimą „Eiti miegoti?“
  SLEEP_ANSWER: 'sleep-answer',   // atsakymas į miego klausimą (true / false)
  BAG_STATE: 'bag-state',         // kuprinė atidaryta (true) / uždaryta (false)
  JOURNAL_STATE: 'journal-state', // užduočių žurnalas atidarytas / uždarytas
  DIALOG_SHOW: 'dialog-show',     // parodyti pokalbio ekraną { name, text, options, ... }
  DIALOG_CHOICE: 'dialog-choice', // žaidėjas pasirinko atsakymą (numeris)
  DIALOG_CLOSE: 'dialog-close',   // pokalbis baigtas
  FEEDBACK_STATE: 'feedback-state', // atsiliepimo langas atidarytas / uždarytas
};
