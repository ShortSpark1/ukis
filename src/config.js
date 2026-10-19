// =====================================================================
//  KONFIGŪRACIJA
//  Čia surinkti VISI žaidimo skaičiai: kainos, augimo laikai, XP,
//  laikas, energija, oro tikimybės ir t.t.
//  Norėdamas pakeisti balansą, keisk tik šį failą.
// =====================================================================

// Pasaulio dydis, seed'as ir sklypai – bendrame faile shared/worldConfig.js,
// nes juos naudoja ir serveris
import { WORLD } from '../shared/worldConfig.js';

export const CONFIG = {
  // --- Žaidimas ---
  GAME_TITLE: 'Ūkis',
  GAME_SUBTITLE: 'Jaukus ūkininkavimo žaidimas',
  // Atsiliepimų forma (pvz. Google Forms). Įrašyk savo nuorodą tarp kabučių, pvz.
  // FEEDBACK_URL: 'https://forms.gle/xxxxxxxx',
  // Kol tuščia – mygtukas „Atsiliepimas“ praneša, kad nuoroda dar nenustatyta.
  FEEDBACK_URL: '',

  // --- Žemėlapis ir ekranas ---
  TILE_SIZE: 48,        // vieno langelio dydis pikseliais (visa grafika prisitaiko)
  MAP_WIDTH: WORLD.WIDTH,   // VISO pasaulio plotis langeliais (keisk shared/worldConfig.js)
  MAP_HEIGHT: WORLD.HEIGHT, // VISO pasaulio aukštis langeliais
  WORLD_SEED: WORLD.SEED,   // pasaulio generavimo „sėkla“ – tas pats skaičius = tas pats pasaulis
  VIEW_WIDTH: 20,       // kiek langelių matosi ekrane horizontaliai
  VIEW_HEIGHT: 15,      // kiek langelių matosi ekrane vertikaliai
  // Piešiama tik matoma pasaulio dalis: pasaulis padalintas į „chunk'us“
  // (kvadratus po CHUNK_SIZE x CHUNK_SIZE langelių). Chunk'ai aplink kamerą
  // sukuriami, o nutolę – ištrinami.
  CHUNK_SIZE: 16,
  CHUNK_MARGIN_TILES: 4,    // kiek langelių už ekrano krašto jau piešiama (kad nesimatytų „gimimo“)
  CHUNK_KEEP_TILES: 10,     // chunk'as ištrinamas, kai nutolsta toliau nei tiek langelių už ekrano
  CHUNKS_PER_FRAME: 2,      // daugiausia tiek naujų chunk'ų per kadrą (kad nestrigtų)
  // Minimapas: mažas (kampe) ir didelis (ekrano viduryje); pikseliai vienam langeliui
  MINIMAP_SCALE: 1,
  MINIMAP_BIG_SCALE: 3,
  // Žaidėjo sklypas, kol nėra serverio (keisk shared/worldConfig.js)
  DEFAULT_PLOT_ID: WORLD.DEFAULT_PLOT_ID,
  HUD_HEIGHT: 100,      // apatinės juostos (inventoriaus) aukštis pikseliais

  // --- Garsas ir muzika (visi garsai kuriami kodu, žr. src/audio/Sound.js) ---
  // Garsą žaidėjas įjungia / išjungia klavišu G arba mygtuku viršuje.
  SOUND: {
    sfxVolume: 0.5,     // efektų garsumas (0…1)
    musicVolume: 0.22,  // muzikos garsumas (0…1)
    music: true,        // ar groti ramią fono muziką
    musicBpm: 76,       // muzikos tempas (dūžiai per minutę)
    stepMs: 300,        // žingsnių garsas – ne dažniau kaip kas tiek ms
  },

  // --- Gyvybė aplink (src/scenes/Ambience.js) ---
  AMBIENCE: {
    butterflies: 6,     // kiek drugelių skraido aplink tave dieną (pavasarį ir vasarą)
  },

  // --- Personažas ---
  PLAYER_SPEED: 3.8,              // judėjimo greitis (langeliai per sekundę)

  // --- Pradinė būsena (naujam žaidimui) ---
  STARTING_COINS: 30,
  STARTING_ITEMS: {
    hoe: 1,           // kaplys
    watering_can: 1,  // laistytuvas
    seed_carrot: 6,   // kelios morkų sėklos pradžiai
    seed_radish: 4,   // ir ridikų
  },

  // --- Laikas ---
  // Žaidimo diena: nuo DAY_START_HOUR ryte iki DAY_END_HOUR (26 = 2:00 nakties).
  // Visa ši diena trunka REAL_MINUTES_PER_DAY realių minučių.
  REAL_MINUTES_PER_DAY: 10,
  DAY_START_HOUR: 6,
  DAY_END_HOUR: 26,
  DAYS_PER_SEASON: 7,             // kiekvienas sezonas – tiek žaidimo dienų

  // --- Diena ir naktis (valandos; tamsa – nuo 0 iki NIGHT_MAX_DARKNESS) ---
  DAWN_END_HOUR: 7,               // iki šios valandos ryte dar prieblanda
  DAWN_DARKNESS: 0.35,            // tamsa 6:00 ryte
  DUSK_START_HOUR: 17.5,          // nuo kada pradeda temti
  NIGHT_START_HOUR: 20,           // nuo kada naktis (degamos šviesos)
  DEEP_NIGHT_HOUR: 22,            // nuo kada tamsiausia
  NIGHT_MAX_DARKNESS: 0.62,       // didžiausia tamsa (0 – šviesu, 1 – visiškai juoda)
  RAIN_DARKNESS: 0.15,            // kiek lietus / sniegas papildomai pritemdo dieną

  // --- Energija ---
  ENERGY_MAX: 100,
  // Kiek energijos kainuoja veiksmai
  ENERGY_COST: { till: 4, water: 2, plant: 1, harvest: 1, clear: 3 },
  // Neužmigus laiku (iki DAY_END_HOUR) – nualpstama ir ryte turima tik tokia energijos dalis
  FAINT_ENERGY: 0.5,

  // --- Oras: tikimybė kiekvieną dieną (likusi dalis – saulėta) ---
  // Lietus pats palaisto visus augalus. Pirma žaidimo diena visada saulėta.
  WEATHER: {
    spring: { rain: 0.3 },
    summer: { rain: 0.15 },
    autumn: { rain: 0.35 },
    winter: { snow: 0.55 },
  },

  // --- Augalai ---
  // Laukų reikšmės:
  //   name / goldenName – pavadinimas ir auksinio derliaus pavadinimas
  //   seedPrice    – sėklos kaina parduotuvėje
  //   sellPrice    – vieno derliaus vieneto pardavimo kaina
  //   growDays     – kiek PALAISTYTŲ dienų reikia užaugti (vienam sezonui – ne daugiau 6,
  //                  kad spėtų užaugti per 7 dienų sezoną)
  //   regrowDays   – (nebūtina) po derliaus augalas lieka ir vėl duoda derlių po tiek dienų
  //   seasons      – kuriais sezonais auga ir parduodamos sėklos: spring, summer, autumn, winter
  //   stages       – kiek vizualių augimo stadijų (paskutinė = subrendęs)
  //   harvestXp / harvestPoints – XP ir taškai už vieną derlių
  //   unlockLevel  – nuo kurio lygio galima pirkti sėklas
  //   color        – vaisiaus spalva (naudojama piešiant)
  //   art          – augalo išvaizda: 'root' (šakniavaisis), 'bush' (krūmelis ant atramos),
  //                  'tall' (aukštas), 'leafy' (lapinė galva), 'ground' (didelis vaisius ant žemės),
  //                  'flower' (žiedas)
  //   shape        – (nebūtina) vaisiaus forma ikonai: 'long', 'round', 'bulb', 'berry', 'cluster'
  //   SVARBU: augalo id (pvz. carrot) – vienas žodis be „_“ ženklo.
  CROPS: {
    // ---------- Pavasaris ----------
    radish: {
      name: 'Ridikas', goldenName: 'Auksinis ridikas',
      seedPrice: 8, sellPrice: 16, growDays: 2, seasons: ['spring'], stages: 4,
      harvestXp: 5, harvestPoints: 2, unlockLevel: 1, color: 0xe0457b, art: 'root', shape: 'round',
    },
    carrot: {
      name: 'Morka', goldenName: 'Auksinė morka',
      seedPrice: 10, sellPrice: 25, growDays: 3, seasons: ['spring', 'autumn'], stages: 4,
      harvestXp: 8, harvestPoints: 3, unlockLevel: 1, color: 0xff7f11, art: 'root', shape: 'long',
    },
    lettuce: {
      name: 'Salotos', goldenName: 'Auksinės salotos',
      seedPrice: 15, sellPrice: 34, growDays: 4, seasons: ['spring'], stages: 4,
      harvestXp: 10, harvestPoints: 4, unlockLevel: 1, color: 0x9ccc65, art: 'leafy',
    },
    strawberry: {
      name: 'Braškė', goldenName: 'Auksinė braškė',
      seedPrice: 40, sellPrice: 22, growDays: 4, regrowDays: 2, seasons: ['spring'], stages: 4,
      harvestXp: 6, harvestPoints: 3, unlockLevel: 2, color: 0xe53950, art: 'bush', shape: 'berry',
    },
    tomato: {
      name: 'Pomidoras', goldenName: 'Auksinis pomidoras',
      seedPrice: 30, sellPrice: 28, growDays: 5, regrowDays: 3, seasons: ['spring', 'summer'], stages: 4,
      harvestXp: 9, harvestPoints: 4, unlockLevel: 2, color: 0xe53935, art: 'bush', shape: 'round',
    },
    // ---------- Vasara ----------
    sunflower: {
      name: 'Saulėgrąža', goldenName: 'Auksinė saulėgrąža',
      seedPrice: 20, sellPrice: 48, growDays: 5, seasons: ['summer'], stages: 5,
      harvestXp: 14, harvestPoints: 6, unlockLevel: 2, color: 0xffc107, art: 'flower',
    },
    corn: {
      name: 'Kukurūzas', goldenName: 'Auksinis kukurūzas',
      seedPrice: 50, sellPrice: 115, growDays: 6, seasons: ['summer', 'autumn'], stages: 5,
      harvestXp: 30, harvestPoints: 12, unlockLevel: 3, color: 0xfdd835, art: 'tall',
    },
    pepper: {
      name: 'Paprika', goldenName: 'Auksinė paprika',
      seedPrice: 35, sellPrice: 26, growDays: 5, regrowDays: 2, seasons: ['summer'], stages: 4,
      harvestXp: 8, harvestPoints: 4, unlockLevel: 3, color: 0xf4511e, art: 'bush', shape: 'long',
    },
    melon: {
      name: 'Melionas', goldenName: 'Auksinis melionas',
      seedPrice: 60, sellPrice: 150, growDays: 6, seasons: ['summer'], stages: 5,
      harvestXp: 36, harvestPoints: 15, unlockLevel: 4, color: 0xb5d96a, art: 'ground', shape: 'net',
    },
    // ---------- Ruduo ----------
    beet: {
      name: 'Burokėlis', goldenName: 'Auksinis burokėlis',
      seedPrice: 15, sellPrice: 32, growDays: 4, seasons: ['autumn'], stages: 4,
      harvestXp: 9, harvestPoints: 4, unlockLevel: 2, color: 0x9c2457, art: 'root', shape: 'round',
    },
    cabbage: {
      name: 'Kopūstas', goldenName: 'Auksinis kopūstas',
      seedPrice: 30, sellPrice: 72, growDays: 5, seasons: ['autumn'], stages: 4,
      harvestXp: 18, harvestPoints: 8, unlockLevel: 3, color: 0xb2d98a, art: 'leafy',
    },
    pumpkin: {
      name: 'Moliūgas', goldenName: 'Auksinis moliūgas',
      seedPrice: 70, sellPrice: 190, growDays: 6, seasons: ['autumn'], stages: 5,
      harvestXp: 45, harvestPoints: 20, unlockLevel: 4, color: 0xff8f00, art: 'ground',
    },
    // ---------- Žiema (specialūs, atsparūs šalčiui) ----------
    garlic: {
      name: 'Žieminis česnakas', goldenName: 'Auksinis česnakas',
      seedPrice: 20, sellPrice: 46, growDays: 4, seasons: ['winter'], stages: 4,
      harvestXp: 12, harvestPoints: 5, unlockLevel: 2, color: 0xf3ede0, art: 'root', shape: 'bulb',
    },
    kale: {
      name: 'Garbanotieji kopūstai', goldenName: 'Auksiniai garbanotieji kopūstai',
      seedPrice: 25, sellPrice: 55, growDays: 4, seasons: ['winter'], stages: 4,
      harvestXp: 14, harvestPoints: 6, unlockLevel: 2, color: 0x5f8f6a, art: 'leafy',
    },
    iceberry: {
      name: 'Ledo uogos', goldenName: 'Auksinės ledo uogos',
      seedPrice: 80, sellPrice: 45, growDays: 5, regrowDays: 2, seasons: ['winter'], stages: 4,
      harvestXp: 12, harvestPoints: 8, unlockLevel: 4, color: 0x7fd3ff, art: 'bush', shape: 'cluster',
    },
  },

  // --- Auksinis derlius ---
  // Nuimant derlių su tokia tikimybe gaunamas retas auksinis vaisius
  GOLDEN: {
    chance: 0.06,       // 6 % tikimybė
    priceMult: 3,       // parduodamas tiek kartų brangiau
    xpMult: 2,          // XP padauginamas
    bonusPoints: 10,    // papildomi taškai
  },

  // --- Kaimynai (NPC) ---
  NPC_SPEED: 2.4,            // NPC ėjimo greitis (langeliai per sekundę)
  NPC_TALK_DISTANCE: 1.6,    // iš kiek langelių galima pakalbinti
  FRIENDSHIP: {
    pointsPerLevel: 100,     // kiek draugystės taškų reikia vienai širdelei
    maxLevel: 5,             // daugiausia širdelių
    giftGolden: 80,          // auksinė dovana
    giftLoved: 40,           // mėgstamiausia dovana
    giftLiked: 20,           // patinkanti dovana
    giftNeutral: 8,          // bet kokia kita
    giftDisliked: -10,       // nemėgstama (draugystė sumažėja)
    shopDiscountPerLevel: 0.03, // Onos nuolaida sėkloms už kiekvieną širdelę (3 %)
  },

  // --- XP ir taškai už paprastus veiksmus ---
  ACTIONS: {
    till:  { xp: 1, points: 1 },  // žemės sukasimas
    plant: { xp: 2, points: 1 },  // sėklos pasodinimas
    water: { xp: 1, points: 0 },  // laistymas
  },
  // Pardavus derlių: taškai = pelnas * šis koeficientas (apvalinama žemyn)
  SELL_POINTS_PER_COIN: 0.1,

  // --- Lygiai ---
  // XP, reikalingas pakilti iš lygio L į L+1 = LEVEL_BASE_XP * LEVEL_GROWTH^(L-1)
  LEVEL_BASE_XP: 40,
  LEVEL_GROWTH: 1.5,
  LEVEL_UP_COINS: 20,    // dovana monetomis pakilus lygiu
  LEVEL_UP_POINTS: 25,   // dovana taškais pakilus lygiu

  // --- Išsaugojimas ---
  SAVE_KEY: 'ukis_save_v1',
  SAVE_VERSION: 7,
  AUTOSAVE_INTERVAL_SEC: 10,
};
