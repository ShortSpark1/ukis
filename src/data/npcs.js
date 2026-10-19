// =====================================================================
//  KAIMYNAI (NPC), DIALOGAI IR UŽDUOTYS
//  Tai DUOMENŲ failas: čia nėra jokios logikos, tik tekstai ir skaičiai.
//  Norėdamas pridėti naują užduotį ar pakeisti pokalbį – keisk tik čia.
//
//  Koordinatės – pasaulio langeliai (x, y). Jos turi būti ant takų ar
//  žolės (ne vandenyje, ne medyje), kitaip NPC ten nenueis.
// =====================================================================

// ---------------------------------------------------------------------
// NPC
//   id, name, title   – identifikatorius, vardas, kas jis toks
//   look              – išvaizdos spalvos (oda, plaukai, marškiniai, kombinezonas,
//                       skrybėlė / null, barzda / null, ilgi plaukai)
//   home.cottage      – namelio (2x2) kairysis viršutinis langelis; null – gyvena parduotuvėje
//   home.door         – langelis prie durų (čia NPC išeina ir grįžta)
//   home.roof         – namelio stogo spalvos [viršus, apačia]
//   schedule          – dienos tvarkaraštis: nuo kurios valandos kur būti.
//                       { home: true } – eina namo (naktį jo nesimato)
//   greetings         – pasisveikinimai pagal draugystės lygį (0, 2, 4 ir t.t.)
//   gifts             – kokias daržoves mėgsta / nemėgsta (augalų id)
// ---------------------------------------------------------------------
export const NPCS = {
  ona: {
    name: 'Ona',
    title: 'parduotuvininkė',
    look: {
      skin: 0xf0c49a, hair: 0x4a2a18, shirt: 0x3f8f5b, overall: 0xf0e2c4, boot: 0x5b3a22,
      hat: null, beard: null, longHair: true,
    },
    home: { cottage: null, door: { x: 40, y: 22 } },
    schedule: [
      { hour: 8, at: { x: 40, y: 23 } },
      { hour: 12, at: { x: 31, y: 27 } },
      { hour: 14, at: { x: 38, y: 24 } },
      { hour: 20, home: true },
    ],
    greetings: {
      0: ['Sveikas atvykęs į kaimą! Sėklų rasi mano parduotuvėje.', 'Labas! Šiandien gera diena prekybai.'],
      2: ['O, mano mėgstamiausias ūkininkas! Kaip derlius?', 'Labas! Tau visada atidėsiu geriausias sėklas.'],
      4: ['Kaip gerai, kad užsukai! Be tavęs mano lentynos būtų tuščios.'],
    },
    gifts: { loved: ['sunflower', 'strawberry'], liked: ['carrot', 'lettuce', 'tomato'], disliked: ['garlic'] },
  },
  jonas: {
    name: 'Jonas',
    title: 'žvejys',
    look: {
      skin: 0xe8b48a, hair: 0x8a8a8a, shirt: 0x2f5f9f, overall: 0x5a4a3a, boot: 0x3a2a1a,
      hat: { color: 0xf2c12e, band: 0xc9961a }, beard: 0xb5b5b5, longHair: false,
    },
    home: { cottage: { x: 33, y: 5 }, door: { x: 34, y: 7 }, roof: [0x5a86c0, 0x34507a] },
    schedule: [
      { hour: 6.5, at: { x: 39, y: 9 } },
      { hour: 13, at: { x: 53, y: 27 } },
      { hour: 16, at: { x: 39, y: 9 } },
      { hour: 20.5, home: true },
    ],
    greetings: {
      0: ['Ššš... žuvis kimba. Ko tau, jaunuoli?', 'Ežeras šiandien ramus.'],
      2: ['A, tai tu! Sėsk, papasakosiu apie lydeką, kurią vos neištraukiau.'],
      4: ['Tu man – kaip sūnus. Arba bent kaip labai geras kaimynas.'],
    },
    gifts: { loved: ['tomato', 'melon'], liked: ['corn', 'pepper', 'pumpkin'], disliked: ['radish'] },
  },
  ruta: {
    name: 'Rūta',
    title: 'sodininkė',
    look: {
      skin: 0xf6cfa8, hair: 0xe8c26a, shirt: 0x9a5fc0, overall: 0x6a8f3a, boot: 0x5b3a22,
      hat: { color: 0xf6e7b0, band: 0xff8fb8 }, beard: null, longHair: true,
    },
    home: { cottage: { x: 14, y: 23 }, door: { x: 15, y: 25 }, roof: [0xc77bb0, 0x8a4a78] },
    schedule: [
      { hour: 8, at: { x: 22, y: 21 } },
      { hour: 11, at: { x: 37, y: 23 } },
      { hour: 15, at: { x: 11, y: 27 } },
      { hour: 19.5, home: true },
    ],
    greetings: {
      0: ['Labas! Ar žinai, kad augalai auga greičiau, kai jiems dainuoji?', 'Koks gražus oras gėlėms!'],
      2: ['Tavo ūkis vis gražėja! Matau, kad tau rūpi augalai.'],
      4: ['Mano mieliausias draugas! Gal kartu pasodinsim ką nors ypatingo?'],
    },
    gifts: { loved: ['lettuce', 'iceberry', 'sunflower'], liked: ['strawberry', 'cabbage', 'kale'], disliked: ['corn'] },
  },
  antanas: {
    name: 'Antanas',
    title: 'senasis ūkininkas',
    look: {
      skin: 0xe8b48a, hair: 0xe0e0e0, shirt: 0x8a6a4a, overall: 0x4a5a3a, boot: 0x3a2a1a,
      hat: { color: 0x5a4a3a, band: 0x3a2a1a }, beard: 0xf0f0f0, longHair: false,
    },
    home: { cottage: { x: 43, y: 23 }, door: { x: 44, y: 25 }, roof: [0x9a7a5a, 0x5e4630] },
    schedule: [
      { hour: 7, at: { x: 23, y: 27 } },
      { hour: 10, at: { x: 31, y: 26 } },
      { hour: 16, at: { x: 45, y: 26 } },
      { hour: 19, home: true },
    ],
    greetings: {
      0: ['Hm... Ši žemė prisimena daug metų.', 'Labas, vaikeli. Dirbk, dirbk – žemė tingių nemėgsta.'],
      2: ['Matau, kad tavo ūkis gyvas. Marija būtų patenkinta.'],
      4: ['Ačiū, kad sugrąžinai šiam ūkiui gyvybę.'],
    },
    gifts: { loved: ['pumpkin', 'radish'], liked: ['carrot', 'beet', 'garlic'], disliked: ['iceberry'] },
  },
};

// Reakcijos į dovanas (bendros visiems; {name} pakeičiamas NPC vardu)
export const GIFT_REACTIONS = {
  golden: 'Auksinis?! Tokios dovanos dar niekas man nedavė! Ačiū!',
  loved: 'Oho! Būtent tai, ką labiausiai mėgstu!',
  liked: 'Ačiū, labai malonu!',
  neutral: 'Ačiū... pravers.',
  disliked: 'Hm... na, ačiū, bet aš to nevalgau.',
  already: 'Ačiū, bet šiandien jau gavau dovaną. Užsuk rytoj!',
};

// ---------------------------------------------------------------------
// UŽDUOTYS
//   giver       – kas duoda užduotį; turnIn – kam atiduoti (numatytai giver)
//   title       – pavadinimas; summary – trumpas aprašymas žurnale
//   chain       – (nebūtina) užduočių grandinės pavadinimas
//   requires    – kada užduotis pasiūloma: { friendship, level, quests: [...] }
//   goal        – ką padaryti:
//                   { type: 'deliver', item: 'crop_carrot', amount: 8 } – atnešti daiktų
//                   { type: 'harvest', crop: 'any' | 'carrot', amount: 12 } – nuimti derlių
//   reward      – { coins, xp, points, items: { daiktas: kiekis }, friendship,
//                   friendshipWith: { npcId: kiekis } }
//   dialog      – offer (pasiūlymas, keli puslapiai), progress (klausiant, kaip sekasi),
//                 complete (atidavus)
// Užduotys siūlomos tokia tvarka, kokia surašytos.
// ---------------------------------------------------------------------
export const QUESTS = {
  // ----- Ona -----
  ona_carrots: {
    giver: 'ona',
    title: 'Šviežios morkos',
    summary: 'Atnešk Onai 8 morkas.',
    goal: { type: 'deliver', item: 'crop_carrot', amount: 8 },
    reward: { coins: 120, xp: 30, points: 15, friendship: 40 },
    dialog: {
      offer: ['Klientai vis klausia šviežių morkų, o mano lentynos tuščios.', 'Atneši man 8 morkas? Gerai atsilyginsiu.'],
      progress: 'Kaip sekasi su morkomis? Man reikia aštuonių.',
      complete: ['Nuostabios morkos! Štai tavo užmokestis.'],
    },
  },
  ona_sunflowers: {
    giver: 'ona',
    title: 'Saulėta vitrina',
    summary: 'Atnešk Onai 4 saulėgrąžas parduotuvės vitrinai.',
    requires: { friendship: 1 },
    goal: { type: 'deliver', item: 'crop_sunflower', amount: 4 },
    reward: { coins: 150, xp: 40, points: 20, friendship: 40, items: { seed_melon: 2 } },
    dialog: {
      offer: ['Noriu papuošti parduotuvės vitriną.', 'Gal užaugintum 4 saulėgrąžas? Duosiu retų melionų sėklų.'],
      progress: 'Vitrina vis dar laukia saulėgrąžų!',
      complete: ['Kaip gražu! Dabar visi užeis pasižiūrėti. Imk šias melionų sėklas.'],
    },
  },
  ona_winter: {
    giver: 'ona',
    title: 'Žiemos atsargos',
    summary: 'Atnešk Onai 5 žieminius česnakus.',
    requires: { friendship: 1 },
    goal: { type: 'deliver', item: 'crop_garlic', amount: 5 },
    reward: { coins: 200, xp: 40, points: 25, friendship: 40, items: { seed_iceberry: 2 } },
    dialog: {
      offer: ['Žiemą visi serga, o česnakas – geriausi vaistai.', 'Atneši 5 žieminius česnakus?'],
      progress: 'Česnakų dar nėra? Jie auga tik žiemą.',
      complete: ['Dabar kaimas išgyvens bet kokią žiemą! Štai ledo uogų sėklos – jų niekur nerasi.'],
    },
  },
  ona_big_order: {
    giver: 'ona',
    title: 'Didelis užsakymas',
    summary: 'Atnešk Onai 6 kukurūzus dideliam miesto užsakymui.',
    requires: { friendship: 2, quests: ['ona_sunflowers'] },
    goal: { type: 'deliver', item: 'crop_corn', amount: 6 },
    reward: { coins: 500, xp: 80, points: 40, friendship: 60 },
    dialog: {
      offer: ['Gavau didelį užsakymą iš miesto!', 'Reikia 6 kukurūzų. Pasitikiu tik tavimi.'],
      progress: 'Miestas laukia kukurūzų!',
      complete: ['Užsakymas įvykdytas! Tu – geriausias tiekėjas.'],
    },
  },

  // ----- Jonas -----
  jonas_lunch: {
    giver: 'jonas',
    title: 'Žvejo pietūs',
    summary: 'Atnešk Jonui 3 pomidorus pietums.',
    goal: { type: 'deliver', item: 'crop_tomato', amount: 3 },
    reward: { coins: 80, xp: 25, points: 10, friendship: 40, items: { seed_pepper: 3 } },
    dialog: {
      offer: ['Visą dieną prie ežero – o pietums tik duona.', 'Atneštum 3 pomidorus? Duosiu paprikų sėklų.'],
      progress: 'Pilvas gurgia... Pomidorų dar nėra?',
      complete: ['Ak, kokie sultingi! Imk paprikų sėklas – jos mėgsta vasarą.'],
    },
  },
  jonas_melon: {
    giver: 'jonas',
    title: 'Melionų vakaras',
    summary: 'Atnešk Jonui 2 melionus žvejų vakarui.',
    requires: { friendship: 1 },
    goal: { type: 'deliver', item: 'crop_melon', amount: 2 },
    reward: { coins: 300, xp: 60, points: 30, friendship: 50 },
    dialog: {
      offer: ['Rengiu žvejų vakarą prie ežero.', 'Be melionų – ne vakaras! Reikia dviejų.'],
      progress: 'Žvejai jau renkasi, o melionų vis nėra!',
      complete: ['Dabar tai bus vakaras! Ačiū, kaimyne.'],
    },
  },
  jonas_harvest: {
    giver: 'jonas',
    title: 'Gausus derlius',
    summary: 'Nuimk 15 bet kokių derlių – Jonas nori pamatyti, ką moki.',
    requires: { friendship: 2 },
    goal: { type: 'harvest', crop: 'any', amount: 15 },
    reward: { coins: 250, xp: 50, points: 30, friendship: 40, items: { seed_pumpkin: 3 } },
    dialog: {
      offer: ['Žvejyboje svarbiausia kantrybė. Ūkyje, manau, irgi.', 'Nuimk 15 derlių – tada pakalbėsim.'],
      progress: 'Na, kaip tavo derlius? Skaičiuoji?',
      complete: ['Kantrybė atsiperka! Štai moliūgų sėklos – rudenį pasodink.'],
    },
  },

  // ----- Rūta -----
  ruta_lettuce: {
    giver: 'ruta',
    title: 'Pavasario salotos',
    summary: 'Atnešk Rūtai 4 salotas.',
    goal: { type: 'deliver', item: 'crop_lettuce', amount: 4 },
    reward: { coins: 100, xp: 30, points: 12, friendship: 40, items: { seed_strawberry: 4 } },
    dialog: {
      offer: ['Mano daržą sugraužė kiškiai!', 'Gal turėtum 4 salotas? Atsidėkosiu braškių sėklomis.'],
      progress: 'Kiškiai vis dar čia... ar salotos jau auga?',
      complete: ['Ačiū! Štai braškių sėklos – jos derės ne kartą.'],
    },
  },
  ruta_jam: {
    giver: 'ruta',
    title: 'Braškių uogienė',
    summary: 'Atnešk Rūtai 8 braškes uogienei.',
    requires: { friendship: 1 },
    goal: { type: 'deliver', item: 'crop_strawberry', amount: 8 },
    reward: { coins: 220, xp: 45, points: 20, friendship: 50 },
    dialog: {
      offer: ['Noriu išvirti uogienės visam kaimui.', 'Reikės 8 braškių. Padėsi?'],
      progress: 'Puodas jau verda – laukiu braškių!',
      complete: ['Mmm, kvepia vasara! Ačiū tau.'],
    },
  },
  ruta_tea: {
    giver: 'ruta',
    title: 'Ledo uogų arbata',
    summary: 'Atnešk Rūtai 4 ledo uogas.',
    requires: { friendship: 3 },
    goal: { type: 'deliver', item: 'crop_iceberry', amount: 4 },
    reward: { coins: 400, xp: 70, points: 40, friendship: 60, items: { seed_iceberry: 4 } },
    dialog: {
      offer: ['Močiutė mokė mane virti ledo uogų arbatą.', 'Atneši 4 ledo uogas? Jos auga tik žiemą.'],
      progress: 'Arbatinukas laukia ledo uogų.',
      complete: ['Nuostabi arbata! Imk – tai sėklos iš mano slapto sodo.'],
    },
  },

  // ----- Antanas: grandinė „Senojo ūkio paslaptis“ -----
  antanas_1: {
    giver: 'antanas',
    chain: 'Senojo ūkio paslaptis',
    title: '1. Pirmasis derlius',
    summary: 'Atnešk Antanui 5 ridikus – įrodyk, kad žemė tau paklūsta.',
    goal: { type: 'deliver', item: 'crop_radish', amount: 5 },
    reward: { coins: 60, xp: 20, points: 10, friendship: 40 },
    dialog: {
      offer: [
        'Ak, naujasis ūkininkas... Šią žemę kadaise dirbau aš su savo Marija.',
        'Įrodyk, kad žemė tau paklūsta – atnešk man 5 ridikus.',
      ],
      progress: 'Ridikai auga greitai. Penkių pakaks.',
      complete: ['Tikri ridikai! Marija būtų apsidžiaugusi.', 'Užsuk vėliau – turiu tau ką papasakoti.'],
    },
  },
  antanas_2: {
    giver: 'antanas',
    chain: 'Senojo ūkio paslaptis',
    title: '2. Rankos prisimena',
    summary: 'Nuimk 12 bet kokių derlių, kaip mokė Marija.',
    requires: { quests: ['antanas_1'] },
    goal: { type: 'harvest', crop: 'any', amount: 12 },
    reward: { coins: 120, xp: 40, points: 20, friendship: 40, items: { seed_pumpkin: 2 } },
    dialog: {
      offer: [
        'Marija sakydavo: tikras ūkininkas augina ne vieną daržovę, o visą sodą.',
        'Nuimk 12 derlių – ir pamatysi, kaip auga ne tik augalai, bet ir tu.',
      ],
      progress: 'Na, kiek derlių jau nuėmei?',
      complete: [
        'Matau – tavo rankos jau žino darbą.',
        'Marija turėjo paslaptį... auksinį moliūgą. Imk šias moliūgų sėklas – jų dar prireiks.',
      ],
    },
  },
  antanas_3: {
    giver: 'antanas',
    turnIn: 'jonas',
    chain: 'Senojo ūkio paslaptis',
    title: '3. Senas dėkingumas',
    summary: 'Nunešk Jonui (prie ežero) 5 morkas nuo Antano.',
    requires: { quests: ['antanas_2'] },
    goal: { type: 'deliver', item: 'crop_carrot', amount: 5 },
    reward: { coins: 100, xp: 40, points: 20, friendship: 30, friendshipWith: { jonas: 30 } },
    dialog: {
      offer: [
        'Kai Marija sirgo, Jonas kasdien nešdavo mums žuvies.',
        'Niekada jam tinkamai nepadėkojau. Nunešk jam 5 morkas nuo manęs. Jis žvejoja ežere, šiaurėje.',
      ],
      progress: 'Jonas žvejoja prie ežero šiaurėje. Morkos – nuo manęs.',
      complete: [
        'Morkos nuo Antano? Na, senis... Perduok jam ačiū.',
        'Ir pasakyk – aš niekada nepamiršau Marijos auksinio moliūgo pyrago.',
      ],
    },
  },
  antanas_4: {
    giver: 'antanas',
    chain: 'Senojo ūkio paslaptis',
    title: '4. Auksinis moliūgas',
    summary: 'Užaugink ir atnešk Antanui auksinį moliūgą.',
    requires: { quests: ['antanas_3'], friendship: 2 },
    goal: { type: 'deliver', item: 'crop_pumpkin_gold', amount: 1 },
    reward: { coins: 1000, xp: 200, points: 150, friendship: 100, items: { seed_pumpkin: 6, seed_melon: 4 } },
    dialog: {
      offer: [
        'Jonas taip pasakė? Ech... senas žvejys.',
        'Marija kasmet užaugindavo vieną auksinį moliūgą. Sakydavo – tai ūkio širdis.',
        'Jei užauginsi auksinį moliūgą, šis ūkis vėl taps tikru ūkiu. Pabandysi?',
      ],
      progress: 'Auksinis moliūgas užauga tik iš kantrybės... ir truputėlio sėkmės. Rudenį sodink daug moliūgų.',
      complete: [
        'Auksinis... Lygiai toks, kaip tada, prieš daugelį metų.',
        'Imk šias sėklas – jos iš Marijos skrynios. Dabar šis ūkis tikrai tavo.',
      ],
    },
  },
};
