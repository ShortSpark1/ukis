# PLANAS 2 – naujos žaidimo funkcijos

Šis failas skirtas būsimoms darbo sesijoms: perskaityk jį prieš tęsdamas darbą.

## Bendros taisyklės

- Dirbti **etapais** ir po kiekvieno sustoti, kad žaidėjas galėtų išbandyti.
- Kodą komentuoti **lietuviškai**, po kiekvieno etapo trumpai paaiškinti, kas padaryta.
- **Visi nauji skaičiai** (laikai, kainos, tikimybės) laikomi `src/config.js`.
- **Seni išsaugojimai neturi užlūžti**: jei trūksta naujų laukų, užpildyti numatytomis reikšmėmis
  (žr. `src/logic/Migration.js` ir `createNewState()` faile `src/logic/GameState.js`).
- Po kiekvieno etapo patikrinti, ar žaidimas pasileidžia be klaidų (`npm run dev`), ir atnaujinti `README.md`.

## Būsena

| Etapas | Būsena |
|---|---|
| 1. Geresnė grafika (sprite'ų sistema) | ✅ padaryta (žaidėjo sprendimu – glotni grafika, ne pixel art) |
| 2. Dienos ir nakties ciklas bei sezonai | ✅ padaryta, žaidėjas patikrino |
| 3. Daugiau augalų | ✅ padaryta, žaidėjas patikrino |
| 4. NPC ir užduotys | ✅ padaryta – laukia žaidėjo patikrinimo |

## ETAPAS 1. Geresnė grafika

- Sukurti sprite'ų sistemą, kurioje visa grafika ateina iš vieno modulio, kad vėliau būtų lengva pakeisti.
- Numatytai nupiešti pixel art programiškai (16x16 arba 32x32, piešiama į canvas ir paverčiama Phaser
  tekstūromis): žolė su variacijomis, žemė, suarta žemė, laistyta žemė, vanduo su animacija, takai,
  medžiai, krūmai, akmenys, tvoros, parduotuvės pastatas.
- Personažas su ėjimo animacija 4 kryptimis.
- Kiekvieno augalo kiekviena augimo stadija atrodo skirtingai.
- Jei aplanke `public/assets/` yra žaidėjo įdėtų sprite'ų (pvz., Kenney paketas), naudoti juos vietoj
  sugeneruotų. README paaiškinti, kokie failų pavadinimai ir dydžiai reikalingi.
- Pixel art turi atrodyti ryškiai: įjungti Phaser `pixelArt` režimą, kad vaizdas nebūtų išsiliejęs.

**Kaip padaryta:** `src/art/SpriteLibrary.js` – vienintelis modulis, iš kurio scenos gauna grafiką.
Jis iškviečia piešimo failus (`src/art/terrain.js`, `objects.js`, `characters.js`, `crops.js`,
`icons.js`, `ui.js`) ir pagal sąrašą `OVERRIDES` pakeičia piešinius žaidėjo failais iš
`public/assets/`. Failų sąrašą pateikia Vite įskiepis faile `vite.config.js` (virtualus modulis
`virtual:user-assets`). Ūkio zoną juosia tvora su vartais (`TILE.FENCE` faile `WorldMap.js`).

**SVARBU – žaidėjo sprendimas:** pixel art (16x16, `pixelArt: true`) buvo padarytas, bet žaidėjui
labiau patiko ankstesnė **glotni Canvas grafika su gradientais**, todėl ji grąžinta, o pixel art
kodas pašalintas. **Nedaryti pixel art ir neįjungti `pixelArt` režimo**, nebent žaidėjas paprašys.
Nauja grafika (sezonai, NPC ir kt.) turi būti tokio pat glotnaus stiliaus kaip `src/art/` failuose.

## ETAPAS 2. Dienos ir nakties ciklas bei sezonai

- Žaidimo diena trunka apie 10 realių minučių (konfigūruojama); ekrane laikrodis ir dienos numeris.
- Vakare ir naktį ekranas palaipsniui tamsėja, naktį dega šviesos prie pastatų.
- Žaidėjas turi energiją: veiksmai ją naudoja, o miegojimas lovoje namelyje ją atstato ir perkelia į kitą rytą.
- 4 sezonai (pavasaris, vasara, ruduo, žiema), kiekvienas po 7 žaidimo dienas.
- Sezonas keičia žemėlapio išvaizdą: žolės spalvą, medžių lapus, žiemą sniegą.
- Kiekvienas augalas auga tik tam tikrais sezonais; pasikeitus sezonui netinkami augalai nuvysta.
- Augalai auga pagal žaidimo dienas, o ne realų laiką; augalą reikia laistyti kasdien, nebent lyja.
- Atsitiktinis oras: saulėta, lietinga (augalai palaistomi automatiškai), žiemą sninga.

**Kaip padaryta:**
- `src/logic/Time.js` – `state.time = { day, minutes, weather }`, sezonai, laikrodis, oras
  (`rollWeather` – pagal dienos numerį ir seed'ą), tamsos skaičiavimas (`getDarkness`).
- `src/logic/DayCycle.js` – `endDay(state, fainted)`: nauja diena, oras, augimas, energija.
- `src/logic/Energy.js` – energijos kainos (`CONFIG.ENERGY_COST`), atstatymas miegant.
- `src/logic/Farming.js` – laukelis `{ crop, daysGrown, watered, dead }`; `startNewDay()` augina
  palaistytus augalus ir pažymi nuvytusius; `clearDead()` – išrovimas kapliu.
- `src/logic/Migration.js` – v3 → v4 (growthMs → daysGrown) ir `fillDefaults()` trūkstamiems laukams.
- `src/scenes/Environment.js` – tamsos sluoksnis su „ištrintomis“ šviesomis, lietus, sniegas.
- Namelis su lova: `TILE.HOUSE`, `HOUSE_POS` / `HOUSE_DOOR` faile `WorldMap.js`. Miegama spaudus ant
  namelio arba E prie durų (UI klausimas „Eiti miegoti?“). 2:00 nakties – nualpimas.
- Sezoninė grafika: `src/art/seasons.js` (spalvos), raktai su priesaga `@sezonas`
  (pvz. `grass_0@winter`, `tree_1@autumn`); `GameScene.applySeasonVisuals()` iškepa žemę iš naujo.
- UI: laikrodis / sezonas / oras / energija po minimapu; parduotuvėje – augimo dienos ir sezonai.

## ETAPAS 3. Daugiau augalų

- Bent 12 augalų, po 3–4 kiekvienam sezonui (žiemai keli specialūs).
- Skirtingos savybės: augimo laikas, kaina, pardavimo vertė, kai kurie duoda derlių kelis kartus
  (pvz., pomidorai), kai kurie atrakinami tik pasiekus tam tikrą lygį.
- Retas „auksinis“ derlius su maža tikimybe, vertas daugiau.
- Parduotuvėje sėklų asortimentas priklauso nuo sezono.

**Kaip padaryta:**
- `CONFIG.CROPS` – 15 augalų (pavasaris 5, vasara 5, ruduo 5, žiema 3 specialūs); laukai
  `growDays`, `regrowDays` (kartotinis derlius), `seasons`, `unlockLevel`, `goldenName`, `art`, `shape`.
- `CONFIG.GOLDEN` – auksinio derliaus tikimybė, kainos ir XP daugikliai, papildomi taškai.
- `Farming.harvest(state, x, y, random)` – auksinis derlius (`crop_<id>_gold`) ir kartotinis derlius
  (augalas lieka, `daysGrown = growDays - regrowDays`).
- `Economy.seedsForSale()` – tik šio sezono sėklos; `sellCrop(state, itemId, amount)` priima ir auksinius.
- Inventorius: `state.selectedItem` (ne langelio numeris), greitoji juosta `getHotbarItems(state)` –
  įrankiai + turimos sėklos (7 langeliai), kuprinė (`I`) – visi turimi daiktai (`getOwnedItems`).
- Migracija v4 → v5: `selectedSlot` → `selectedItem`.
- Grafika: nauji augalų tipai `leafy`, `ground`, `flower` ir vaisių formos (`src/art/crops.js`),
  auksinės ikonos ir kuprinės ikona (`src/art/icons.js`).
- Parduotuvė – dviejų stulpelių: sezono sėklos ir turimas derlius (puslapiais po 6).

*Pastabos 4 etapui:* daiktų dovanojimui NPC galima naudoti `getOwnedItems()` ir `removeItem()`;
užduočiai „Užaugink auksinį moliūgą“ tinka `harvest()` rezultatas `{ itemId, golden }` arba
inventoriaus daiktas `crop_pumpkin_gold`.

## ETAPAS 4. NPC ir užduotys

- 3–4 NPC su vardais (lietuviškais), savo išvaizda ir vieta žemėlapyje; jie vaikšto pagal dienos
  tvarkaraštį ir naktį eina namo.
- Priėjus ir paspaudus E atsidaro dialogo langas su tekstu.
- Užduočių sistema: NPC duoda užduotis (pvz., „Atnešk 10 morkų“, „Užaugink auksinį moliūgą“), už jas
  gaunama monetų, XP, taškų arba retų sėklų.
- Užduočių žurnalas, kurį galima atidaryti klavišu (pvz., J).
- Draugystės lygis su kiekvienu NPC, kuris kyla atliekant užduotis ir dovanojant daiktus; aukštesnis
  lygis atrakina naujas užduotis ir nuolaidas.
- Bent viena ilgesnė užduočių grandinė su istorija.
- Dialogai ir užduotys saugomi atskirame duomenų faile, kad būtų lengva pridėti naujų.

**Kaip padaryta:**
- `src/data/npcs.js` – 4 NPC (Ona, Jonas, Rūta, Antanas): išvaizda, namelis, tvarkaraštis,
  pasisveikinimai pagal draugystę, mėgstamos dovanos; 14 užduočių su dialogais; grandinė
  „Senojo ūkio paslaptis“ (antanas_1 … antanas_4, 3 dalis atiduodama Jonui).
- `src/logic/Quests.js` – užduotys (`deliver`, `harvest`), draugystė (širdelės), dovanos kartą
  per dieną, Onos nuolaida (`shopDiscount`, naudoja `Economy.seedPriceOf`).
- `CONFIG.NPC_SPEED`, `CONFIG.NPC_TALK_DISTANCE`, `CONFIG.FRIENDSHIP`.
- Žemėlapis: `TILE.COTTAGE`, `COTTAGES` faile `WorldMap.js` (namelių vietos – iš duomenų failo).
- `src/scenes/NpcManager.js` – vaikščiojimas pagal tvarkaraštį (BFS), „!“ / „?“ ženkliukai.
- `src/scenes/DialogController.js` + `UIScene.showDialog` – pokalbio langas; `UIScene.renderJournal` – J.
- Būsena: `quests`, `friendship`, `giftsDay`; migracija v5 → v6 ir `cleanQuestState()`.
- Grafika: `makeCharacter(scene, key, look)` (skrybėlė / plaukai, barzda, ilgi plaukai),
  kaimynų nameliai su skirtingų spalvų stogais; tavo failai `npc_<id>.png`, `cottage_<id>.png`.

## Visi PLANAS_2 etapai padaryti

Tolimesnės idėjos – README skyriuje „5 idėjos, ką pridėti toliau“.

## Paskelbimas (po PLANAS_2)

- `vite.config.js`: `base: './'`, `build.assetsDir: 'static'`; `.github/workflows/deploy.yml` – GitHub Pages.
- Pradžios ekranas `TitleScene.js`, atsiliepimo mygtukas (`CONFIG.FEEDBACK_URL`, `widgets.js`),
  telefono pranešimas `mobileCheck.js`.
- Instrukcija pradedantiesiems – [SKELBIMAS.md](SKELBIMAS.md).
