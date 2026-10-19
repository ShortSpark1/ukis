// =====================================================================
//  PASAULIO NUSTATYMAI – BENDRI KLIENTUI IR SERVERIUI
//  Aplanke shared/ esantys failai naudojami ir naršyklėje (žaidime), ir
//  (nuo 2 etapo) Node.js serveryje. Todėl čia negalima naudoti Phaser
//  ar naršyklės dalykų (window, document) – tik paprastą JavaScript.
//
//  Kadangi abi pusės generuoja pasaulį iš tų pačių skaičių, visi
//  žaidėjai ir serveris mato lygiai tą patį žemėlapį.
// =====================================================================

export const WORLD = {
  WIDTH: 200,           // pasaulio plotis langeliais (ne mažiau 200 – zonų išdėstymas skaičiuojamas nuo centro)
  HEIGHT: 200,          // pasaulio aukštis langeliais
  SEED: 20261019,       // generavimo „sėkla“: tas pats skaičius = tas pats pasaulis

  // --- Ūkių sklypai ---
  PLOT_SIZE: 20,        // sklypo dydis su tvora (20x20 langelių)
  PLOT_GAP: 3,          // tako tarp gretimų sklypų plotis
  // Sklypas, kurį gauna žaidėjas, kol nėra serverio (1 etapas). Nuo 2 etapo
  // laisvą sklypą kiekvienam naujam žaidėjui parinks serveris.
  DEFAULT_PLOT_ID: 10,   // 10 – vakarų grupės sklypas arčiausiai miesto

  // --- Gamta ---
  RING_ROAD: 24,        // žiedinis kelias – tiek langelių nuo pasaulio krašto
  RIVER_WIDTH: 3,       // upės plotis langeliais
  FOREST_DENSITY: 0.38, // kuo mažesnis skaičius, tuo tankesnis miškas už žiedinio kelio (0…1)
  GROVE_DENSITY: 0.64,  // giraičių tankis tarp zonų (kuo didesnis, tuo jų mažiau)
};
