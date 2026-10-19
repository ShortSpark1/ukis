# Ūkis – 2D ūkininkavimo žaidimo prototipas

Naršyklinis ūkininkavimo žaidimas, įkvėptas *Stardew Valley* ir *Pixels*.
Sukurtas su **Phaser 3** ir **Vite**, parašytas paprastu **JavaScript**.
Visa grafika (personažas su ėjimo animacija, medžiai, vanduo, augalai, sąsaja)
piešiama kodu naršyklės Canvas 2D API su gradientais ir šešėliais, todėl jokių
paveikslėlių failų nereikia. Jei nori, gali įdėti savo sprite'us (pvz. Kenney paketą)
į `public/assets/`, ir žaidimas naudos juos.

Tolesnių darbų planas – [PLANAS_2.md](PLANAS_2.md) (padarytas) ir [PLANAS_3.md](PLANAS_3.md) (multiplayer, daroma etapais).
Kaip paskelbti žaidimą internete – [SKELBIMAS.md](SKELBIMAS.md).

## Kaip paleisti

Reikia [Node.js](https://nodejs.org/) (18 ar naujesnės versijos).

```bash
cd ukis
npm install
npm run dev
```

Atsidaryk naršyklėje adresą, kurį parodys terminalas (dažniausiai `http://localhost:5173`).

Kitos komandos:

- `npm run build` – sukuria paruoštą versiją `dist/` aplanke
- `npm run preview` – paleidžia tą paruoštą versiją peržiūrai

## Paskelbimas internete

Žaidimas paruoštas **GitHub Pages**. Žingsnis po žingsnio (pradedantiesiems) –
[SKELBIMAS.md](SKELBIMAS.md). Trumpai:

- `vite.config.js` turi `base: './'`: visi keliai santykiniai, todėl žaidimas veikia bet kokiu
  adresu, pvz. `https://vardas.github.io/ukis/`. Tavo `public/assets/` failai irgi randami.
- Kodo failai `dist/` aplanke dedami į `dist/static/` (`assetsDir`), kad nesusimaišytų su
  tavo `public/assets/` paveikslėliais (jie lieka `dist/assets/`).
- `.github/workflows/deploy.yml` – po kiekvieno `git push` į `main` GitHub pats paleidžia
  `npm ci` ir `npm run build`, o `dist/` paskelbia. Eiga matosi skirtuke **Actions**.

**Atsiliepimų forma.** Žaidime (ir pradžios ekrane) yra mygtukas **„Atsiliepimas“**. Sukurk
Google Forms formą ir jos nuorodą įrašyk į `FEEDBACK_URL` faile `src/config.js`. Kol nuorodos
nėra, mygtukas parodo, kur ją įrašyti.

**Telefonai.** Žaidimas sukurtas kompiuteriui (klaviatūra ir pelė). Telefone (`src/mobileCheck.js`
atpažįsta jutiklinį ekraną be pelės arba mažą ekraną) parodomas pranešimas „Žaisk
kompiuteryje“ su mygtuku „Vis tiek bandyti“. Pirštu vaikščioti ir dirbti galima, bet vaizdas
labai mažas, o E, I, J klavišų nėra.

## Kaip žaisti

Atsidarius žaidimą rodomas **pradžios ekranas**: pavadinimas, trumpas valdymo paaiškinimas ir
mygtukai **„Tęsti“** (jei yra išsaugotas žaidimas; po juo matosi diena, lygis ir monetos),
**„Naujas žaidimas“** (jei yra išsaugojimas, pirma paklausia) ir **„Atsiliepimas“**.

| Valdymas | Veiksmas |
|---|---|
| **Kairys pelės mygtukas** | Paspausk langelį: žmogeliukas pats nueina ir panaudoja pasirinktą daiktą (sukasa, pasodina, palaisto, nuima derlių). Jei ten nieko daryti negalima – tiesiog nueina |
| **Dešinys pelės mygtukas** | Tik nueiti į langelį (nieko nedarant) |
| Paspausti ant parduotuvės | Nueiti ir atidaryti parduotuvę |
| WASD arba rodyklės | Vaikščioti |
| Tarpas | Panaudoti pasirinktą daiktą ant langelio priešais (baltas rėmelis) |
| 1–7 / pelės ratukas / pelės paspaudimas | Pasirinkti daiktą greitojoje juostoje |
| I (arba kuprinės langelis juostos gale) | Atidaryti kuprinę – visi daiktai, tarp jų derlius |
| E | Pakalbinti kaimyną, atidaryti parduotuvę arba eiti miegoti (stovint šalia) |
| Paspausti ant kaimyno | Prieiti ir pakalbinti |
| J | Užduočių žurnalas ir draugystė su kaimynais (arba mygtukas „Užduotys“ kairėje viršuje) |
| Mygtukas „Atsiliepimas“ | Nuoroda į atsiliepimų formą |
| Esc | Uždaryti parduotuvę |
| K | Išsaugoti rankiniu būdu (žaidimas ir taip saugomas kas 10 s) |
| N | Pradėti naują žaidimą |
| H | Paslėpti / parodyti pagalbą |
| M | Žemėlapis: mažas kampe → didelis ekrano viduryje → paslėptas |
| G (arba mygtukas „Garsas“) | Įjungti / išjungti garsą ir muziką |
| Paspausti žemėlapyje | Nueiti į tą pasaulio vietą |

Taikiklio (kampuoto rėmelio) spalva parodo, kas nutiks paspaudus:
**žalia** – galima atlikti veiksmą, **geltona** – parduotuvė ar tavo namelis, **raudona** – nepraeinama, **balta** – tiesiog nueisi.

**Pasaulis** yra 200×200 langelių (ekrane matosi 20×15), o kamera seka personažą.

- **Miestas centre:** grįsta aikštė su fontanu, suoliukais, turgaus prekystaliais, gėlynais ir
  skelbimų lenta. Aplink aikštę – parduotuvė ir kaimynų nameliai. Vakare užsidega žibintai.
- **Ūkių zona aplink miestą:** 24 vienodi sklypai po 20×20 langelių. Kiekvienas sklypas turi
  tvorą su vartais, žibintą, lentelę su numeriu, namelį su lova (kiekvieno sklypo – kitos
  spalvos stogas) ir dirvą. Sklypai sugrupuoti po 4, tarp jų eina takai.
- **Tavo ūkis** – sklypas 10, iškart į vakarus nuo miesto (virš vartų užrašas „Tavo ūkis“).
  Kasti ir sodinti galima tik savo sklype, miegoti – tik savo namelyje. Kol kas (1 etapas)
  kiti sklypai tušti, bet juos jau galima apžiūrėti.
- **Gamta tarp zonų:** giraitės, ežeras šiaurėje, tvenkinys pietuose. Už žiedinio kelio – tankus
  miškas ir upė, per kurią keliai eina **tiltais**.

**Gamta.** Už žiedinio kelio auga daugiausia eglės, tarp zonų – ąžuolai, obelys ir beržai, visi
truputį skirtingo dydžio. Pievose matyti žolės kuokšteliai, akmenukai, dobilai ir grybai (rudenį
jų daugiau), prie krantų – nendrės, ežere – vandens lelijos. Žolė nuspalvinta netolygiai, todėl
pieva neatrodo kaip iš vienodų kvadratėlių.

**Apšvietimas.** Rytą dangus rausvas, prieš saulėlydį viskas nusidažo auksine spalva, per lietų
vaizdas pilkšvesnis, o naktį mirga gatvių žibintai ir šviečia namų langai.

**Žmogeliukai** nupiešti detaliai: drabužiai su šešėliais, akys su vyzdžiais, antakiai, kišenės.
Stovėdami jie kartais sumirksi, o kaimynai lengvai „kvėpuoja“.

**Gyvybė ir garsai.** Dieną pavasarį ir vasarą skraido drugeliai, naktį šviečia jonvabaliai,
rudenį krenta lapai, o pavasarį – žiedlapiai. Kiekvienas veiksmas turi savo garsą (kasimas,
laistymas, derlius, monetos, naujas lygis), o fone groja rami muzika, naktį – tyliau. Visi garsai
sukuriami kodu, failų nereikia. Garsą išjungsi klavišu **G**.

Dešiniajame viršutiniame kampe yra žemėlapis: raudonas taškas rodo tave, baltas rėmelis –
matomą plotą, geltonas – tavo sklypą. Paspaudus **M** jis padidėja per visą ekraną: ten matyti
vietų pavadinimai (miestas, ežeras, tvenkinys, upė, miškas) ir kaimynai (violetiniai taškai). Po žemėlapiu –
laikrodis, sezonas, oras ir energija.

**Kaimynai.** Kaime gyvena keturi kaimynai:

| Kaimynas | Kas jis | Kur jį rasti |
|---|---|---|
| Ona | parduotuvininkė | ryte ir po pietų – prie parduotuvės, vidurdienį – prie vakarų ūkių |
| Jonas | žvejys | prie ežero šiaurėje, po pietų – prie tvenkinio pietuose |
| Rūta | sodininkė | ryte – prie vakarų ūkių, prieš pietus – prie fontano, po pietų – prie skelbimų lentos |
| Antanas | senasis ūkininkas | ryte – kryžkelėje į šiaurę nuo miesto, dieną – prie rytų ūkių, vakare – prie fontano |

Jie vaikšto pagal savo dienos tvarkaraštį, o vakare grįžta į savo namelius (naktį jų nesimato).
Virš kaimyno galvos **„!“** reiškia, kad jis turi tau užduotį, o **„?“** – kad užduotį jau gali
atiduoti. Priėjęs paspausk **E** arba spustelėk ant kaimyno pele.

**Užduotys.** Kaimynai prašo atnešti derliaus (pvz. „Atnešk 8 morkas“) arba nuimti tam tikrą
kiekį derlių. Už tai gausi monetų, XP, taškų, o kartais ir retų sėklų (melionų, moliūgų, ledo
uogų), kurių kitaip dar negalėtum nusipirkti. Antanas turi 4 dalių istoriją **„Senojo ūkio
paslaptis“** – apie jo žmoną Mariją ir jos auksinį moliūgą.

**Draugystė** (iki 5 širdelių) kyla atliekant užduotis ir dovanojant derlių: pasirink derlių
kuprinėje (I) ir pokalbyje spausk „Dovanoti“. Kiekvienam kaimynui galima dovanoti kartą per
dieną. Mėgstama dovana duoda daugiau draugystės, nemėgstama – sumažina, o auksinis derlius
patinka visiems. Daugiau širdelių atrakina naujas užduotis, o Ona už kiekvieną širdelę duoda
3 % nuolaidą sėkloms.

**Diena ir naktis.** Žaidimo diena trunka 10 realių minučių: nuo 6:00 ryto iki 2:00 nakties.
Vakare ekranas palaipsniui tamsėja, naktį šviečia namų langai, o aplink tave matosi nedidelis
šviesos ratas. Kol atidarytas langas (parduotuvė, miego klausimas), laikas sustoja.

**Energija.** Kiekvienas darbas jos kainuoja (kasimas 4, laistymas 2, sodinimas 1, derliaus
nuėmimas 1, nuvytusio augalo išrovimas 3). Kai energijos neužtenka, eik į namelį ir miegok:
spausk ant namelio pele arba E prie jo durų. Miegas perkelia į kitą rytą su pilna energija. Jei
neužmigsi iki 2:00, nualpsi ir atsibusi prie namelio tik su puse energijos.

**Sezonai.** Pavasaris → vasara → ruduo → žiema, kiekvienas po 7 dienas. Pavasarį žydi medžiai,
rudenį lapai oranžiniai, o žiemą viskas po sniegu. Kiekvienas augalas auga tik savo sezonais:
pasodinti ne sezono augalo nepavyks, o pasikeitus sezonui netinkami augalai **nuvysta** (išrauk
juos kapliu).

**Oras** keičiasi kasdien: saulėta arba lietus (pavasarį 30 %, vasarą 15 %, rudenį 35 %), o žiemą
dažnai sninga. **Lietus pats palaisto visus augalus.**

**Ūkio ciklas:**

1. **Kaplys (1)** – sukask rudą dirvą.
2. **Sėkla** – pasodink ją sukastoje žemėje. Greitojoje juostoje matosi įrankiai ir turimos sėklos, o visi daiktai – kuprinėje (I).
3. **Laistytuvas (2)** – palaistyk (žemė patamsėja). Augalas paauga viena diena kiekvieną rytą, jei vakar buvo palaistytas, todėl **laistyk kasdien** (nebent lyja).
4. Kai augalas subręsta, prie jo sužiba **auksinė žvaigždutė**. Paspausk tarpą su bet kuriuo daiktu ir nuimsi derlių.
5. Derlių parduok **parduotuvėje**, o už monetas nusipirk naujų sėklų. Parduotuvė parduoda tik **šio sezono** sėklas.

**Kartotinis derlius.** Braškės, pomidorai, paprikos ir ledo uogos po derliaus nenunyksta: palaistyk
juos toliau, ir jie vėl duos derlių po kelių dienų (žr. lentelę).

**Auksinis derlius.** Kiekvieną kartą nuimant derlių yra 6 % tikimybė gauti **auksinį** vaisių. Jis
parduodamas 3 kartus brangiau ir duoda dvigubai XP bei papildomų taškų.

| Augalas | Sėkla | Kaina | Auga | Vėl derlius | Sezonai | Nuo lygio |
|---|---|---|---|---|---|---|
| Ridikas | 8 | 16 | 2 d. | – | pavasaris | 1 |
| Morka | 10 | 25 | 3 d. | – | pavasaris, ruduo | 1 |
| Salotos | 15 | 34 | 4 d. | – | pavasaris | 1 |
| Braškė | 40 | 22 | 4 d. | kas 2 d. | pavasaris | 2 |
| Pomidoras | 30 | 28 | 5 d. | kas 3 d. | pavasaris, vasara | 2 |
| Saulėgrąža | 20 | 48 | 5 d. | – | vasara | 2 |
| Kukurūzas | 50 | 115 | 6 d. | – | vasara, ruduo | 3 |
| Paprika | 35 | 26 | 5 d. | kas 2 d. | vasara | 3 |
| Melionas | 60 | 150 | 6 d. | – | vasara | 4 |
| Burokėlis | 15 | 32 | 4 d. | – | ruduo | 2 |
| Kopūstas | 30 | 72 | 5 d. | – | ruduo | 3 |
| Moliūgas | 70 | 190 | 6 d. | – | ruduo | 4 |
| Žieminis česnakas | 20 | 46 | 4 d. | – | žiema | 2 |
| Garbanotieji kopūstai | 25 | 55 | 4 d. | – | žiema | 2 |
| Ledo uogos | 80 | 45 | 5 d. | kas 2 d. | žiema | 4 |

## Kaip veikia kodas

```
shared/               – BENDRAS KODAS klientui ir (nuo 2 etapo) serveriui, be Phaser
├─ worldConfig.js     – pasaulio dydis, seed'as, sklypų dydis, miško tankis
├─ WorldMap.js        – pasaulio generavimas su seed'u, zonos, sklypai, vietos, langelių taisyklės
└─ Random.js          – atsitiktinumas su seed'u ir „triukšmas“ (value noise)
src/
├─ main.js            – sukuria Phaser žaidimą ir užregistruoja scenas
├─ config.js          – VISI skaičiai: kainos, augimo laikai, XP, lygiai (+ pavadinimas, FEEDBACK_URL)
├─ mobileCheck.js     – telefono atpažinimas ir pranešimas „Žaisk kompiuteryje“
├─ audio/
│  └─ Sound.js        – garso efektai ir muzika, sukurti kodu (Web Audio API)
├─ EventBus.js        – „radijas“, per kurį scenos siunčia žinutes viena kitai
├─ data/
│  └─ npcs.js         – KAIMYNAI, jų tvarkaraščiai, DIALOGAI ir UŽDUOTYS (tik duomenys)
├─ logic/             – GRYNA LOGIKA (be Phaser)
│  ├─ Migration.js    – senų išsaugojimų pakėlimas iki naujos versijos
│  ├─ Time.js         – žaidimo laikas, sezonai, oras, tamsos skaičiavimas
│  ├─ DayCycle.js     – dienos pabaiga: nauja diena, oras, augimas, energija
│  ├─ Energy.js       – energijos išlaidos ir atstatymas
│  ├─ GameState.js    – žaidimo būsenos objekto šablonas
│  ├─ Inventory.js    – daiktai, jų pavadinimai, greitoji juosta ir kuprinė
│  ├─ Farming.js      – kasimas, sodinimas, laistymas, augimas, derlius
│  ├─ Economy.js      – sezono sėklų pirkimas, derliaus (ir auksinio) pardavimas
│  ├─ Progression.js  – XP, lygiai, taškai (points)
│  ├─ Quests.js       – užduotys, draugystė, dovanos, Onos nuolaida
│  ├─ Pathfinding.js  – kelio paieška (BFS) valdymui pele
│  └─ SaveManager.js  – išsaugojimas ir įkėlimas (localStorage)
├─ art/               – GRAFIKA, piešiama kodu (Canvas 2D)
│  ├─ SpriteLibrary.js – VIENINTELIS modulis, iš kurio scenos gauna grafiką (+ tavo failai)
│  ├─ utils.js        – pagalbinės: spalvos, gradientai, triukšmas, lapai
│  ├─ seasons.js      – kiekvieno sezono spalvos (žolė, lapai, gėlės, sniegas)
│  ├─ terrain.js      – žolė, dirva, takai, vanduo, krantai, tiltai, tvoros, sukasta žemė
│  ├─ objects.js      – medžiai, akmenys, krūmai, parduotuvė, dalelės, debesys
│  ├─ characters.js   – ūkininkas ir kaimynai: 4 kryptys x (4 ėjimo kadrai + mirksėjimas)
│  ├─ nature.js       – eglės, beržai, žolės kuokšteliai, grybai, lelijos, nendrės, žolės dėmės
│  ├─ crops.js        – augalų stadijos ir vaisiai
│  ├─ icons.js        – inventoriaus ir HUD ikonos
│  └─ ui.js           – mediniai skydeliai, mygtukai, teksto stilius
└─ scenes/            – ATVAIZDAVIMAS (Phaser)
   ├─ BootScene.js    – iškviečia art/ funkcijas ir sukuria tekstūras
   ├─ TitleScene.js   – pradžios ekranas: Tęsti / Naujas žaidimas / Atsiliepimas
   ├─ GameScene.js    – personažas, augalai, pelė, miegas; iškviečia logiką
   ├─ ChunkRenderer.js – pasaulio piešimas dalimis (chunk'ais): tik tai, kas prie kameros
   ├─ UIScene.js      – inventoriaus juosta, statistika, laikrodis, parduotuvė, miego langas
   ├─ Environment.js  – naktis, šviesos, lietus ir sniegas
   ├─ Ambience.js     – drugeliai, jonvabaliai, krentantys lapai ir žiedlapiai
   ├─ characterAnim.js – mirksėjimas stovint (žaidėjui ir kaimynams)
   ├─ NpcManager.js   – kaimynų vaikščiojimas pagal tvarkaraštį
   ├─ DialogController.js – ką kaimynas sako ir kokius atsakymus siūlo
   ├─ widgets.js      – bendri mygtukai ir atsiliepimo langas
   └─ layout.js       – bendri ekrano matmenys

.github/workflows/deploy.yml – automatinis paskelbimas GitHub Pages
public/assets/      – (nebūtina) tavo sprite'ai vietoj nupieštų
```

Scenų eiga: `BootScene` (tekstūros) → `TitleScene` (pradžios ekranas) → `GameScene` + `UIScene`.
Klavišas **N** žaidime pradeda naują žaidimą iškart, nerodydamas pradžios ekrano.

### Pagrindinė idėja: logika atskirta nuo vaizdo

- **Visa žaidimo būsena yra viename paprastame objekte** (`state`): monetos, lygis, XP, taškai, inventorius ir sukasti langeliai. Jame nėra jokių Phaser objektų, todėl jį galima paversti JSON ir išsaugoti arba nusiųsti į serverį.
- **`logic/` funkcijos** gauna būseną, ją pakeičia ir grąžina rezultatą tokiu formatu:
  ```js
  { ok: true, message: 'Žemė sukasta!', reward: { xp: 1, points: 1 } }
  ```
  Jos nieko nežino apie ekraną.
- **`GameScene`** veikia kaip „valdiklis“. Paspaudus klavišą ji iškviečia logikos funkciją, pritaiko atlygį (`applyReward`), atnaujina vaizdą ir per `EventBus` praneša `UIScene`, kad reikia perpiešti HUD.
- **`UIScene`** tik rodo informaciją. Paspaudus parduotuvės mygtuką ji pati būsenos nekeičia, o siunčia žinutę `SHOP_ACTION`, kurią apdoroja `GameScene`.

Dėl to vėliau pridėti serverį ir multiplayer bus paprasta: `logic/` failus galima perkelti į Node.js serverį, o naršyklė tik siųs komandas („kask langelį 5,7“) ir gaus atnaujintą būseną.

### Kaip generuojamas pasaulis

Pasaulio kodas yra aplanke **`shared/`**, nes jį naudos ir serveris (2 etapas). Ten nėra Phaser
ir naršyklės dalykų, todėl tą patį failą gali paleisti ir Node.js. Kadangi visi generuoja
pasaulį iš to paties seed'o, visų žaidėjų žemėlapis yra vienodas, o siųsti jo internetu nereikia.

`createWorldMap()` faile `shared/WorldMap.js` pasaulį kuria žingsniais:

1. Viskas užpildoma žole.
2. **Miškas.** Naudojamas „vertės triukšmas“ (`createNoise2D` faile `shared/Random.js`):
   sklandžiai kintantys atsitiktiniai skaičiai, iš kurių gaunasi natūralios medžių dėmės. Už
   žiedinio kelio miškas tankus (`FOREST_DENSITY`), tarp zonų – retos giraitės (`GROVE_DENSITY`).
3. **Ežeras ir tvenkinys** – apskritimai su triukšmu „sugadintu“ krantu. **Upė** teka iš ežero į
   šiaurę, paskui į vakarus ir į pietus iki pasaulio krašto. Kiekvienoje atkarpoje ji švelniai vingiuoja.
4. Išvaloma vieta miestui (`TOWN`), sklypams (`PLOTS`) ir svarbioms vietoms (`PLACES`).
5. **Miestas:** aikštė (`PLAZA`), fontanas (`FOUNTAIN`), skelbimų lenta (`BOARD`), parduotuvė ir
   kaimynų nameliai (`COTTAGES`), gėlynai.
6. **Sklypai:** tvora su vartais, takas nuo vartų, namelis ir dirva.
7. Atsitiktinės dekoracijos: akmenys, krūmai, gėlės.
8. **Keliai ir takai:** du pagrindiniai keliai kertasi aikštėje, žiedinis kelias juosia zonas, o
   takai eina tarp sklypų. Takai iškerta medžius, o per vandenį virsta **tiltu**.

Visos zonų vietos apskaičiuojamos nuo pasaulio centro. Kaimynų tvarkaraščiuose
(`src/data/npcs.js`) vietos nurodytos pavadinimais (`'fountain_n'`, `'lake_dock'` ir t. t.), o jų
koordinatės yra `PLACES` faile `shared/WorldMap.js`.

Pakeisk `SEED` faile `shared/worldConfig.js` ir gausi kitokius miškus ir upės vingius (išsaugotus
laukelius žaidimas pats perkels į tavo sklypą).

### Kamera, pasaulio ribos ir greitis

- `cam.startFollow(player)` – kamera švelniai seka personažą.
- `cam.setBounds(0, 0, pasaulioPlotis, pasaulioAukštis)` – kamera nerodo nieko už krašto.
- `physics.world.setBounds(...)` ir `setCollideWorldBounds(true)` – personažas negali išeiti už
  pasaulio. Be to, kraštus juosia miškas.
- Pelės koordinatės ekrane paverčiamos pasaulio koordinatėmis per
  `cameras.main.getWorldPoint()`, nes kamera būna pasislinkusi.

**Piešimas chunk'ais** (`src/scenes/ChunkRenderer.js`). 200×200 langelių pasaulis yra
9600×9600 pikselių. Tiek vienu metu piešti būtų per lėta, todėl pasaulis padalintas į kvadratus
po 16×16 langelių (`CHUNK_SIZE`):

- sukuriami tik tie chunk'ai, kurie yra ekrane ir šalia jo (`CHUNK_MARGIN_TILES`);
- nutolę daugiau nei `CHUNK_KEEP_TILES` langelių už ekrano chunk'ai ištrinami;
- kiekvieno chunk'o žemė „iškepama“ į vieną paveikslėlį (`DynamicTexture`). Tokie paveikslėliai
  nemetami, o pernaudojami kitiems chunk'ams, todėl atminties naudojimas neauga
  (išbandyta: apkeliavus visą pasaulį – ne daugiau 12 paveikslėlių);
- per vieną kadrą sukuriama ne daugiau `CHUNKS_PER_FRAME` naujų chunk'ų, kad žaidimas nestrigtų;
- gretimos kliūtys (medžiai, tvoros) eilutėje sujungiamos į vieną ilgą fizikos stačiakampį;
- debesų nedaug: jie keliauja kartu su kamera.

**Kelio paieška** (BFS) langelius žymi skaičiais ir saugo juos skaičių masyve, todėl ilgas kelias
per visą pasaulį randamas per kelias milisekundes.

### Senų išsaugojimų migracija

`Migration.js` pakelia seną išsaugojimą iki naujausios versijos (`SAVE_VERSION: 7`):

- **v1 → v2:** personažo vieta buvo pikseliais, todėl ji pamirštama.
- **v2 → v3:** mažas 20×15 žemėlapis tapo dideliu. Laukeliai ir augalai perkeliami į naują ūkio
  zoną, išlaikant jų tarpusavio išdėstymą. Netilpę laukeliai suskaičiuojami ir nurodomi
  pranešime.
- **v3 → v4:** augalai auga nebe sekundėmis, o dienomis. Kiek augalas buvo paaugęs
  (pvz. pusiau), perskaičiuojama į dienas (pusė `growDays`).
- **v5 → v6:** atsirado kaimynai: pridedamos tuščios užduotys (`quests`), draugystė
  (`friendship`) ir dovanų dienos (`giftsDay`). Nežinomos užduotys ar NPC iš išsaugojimo pašalinami.
- **v4 → v5:** inventoriaus juosta nebe pastovi, todėl vietoj langelio numerio (`selectedSlot`)
  įsimenamas pasirinktas daiktas (`selectedItem`, pvz. `seed_carrot`).
- **v6 → v7:** pasaulis tapo 200×200 su miestu ir sklypais. Žaidėjas gauna sklypą (`plotId`), o
  laukeliai ir augalai perkeliami į to sklypo dirvą, išlaikant jų tarpusavio išdėstymą.
  Personažas atsiranda prie savo namelio.
- **Kiekvieną kartą** (`fillDefaults`): jei trūksta naujų laukų (laikas, oras, energija, pasirinktas daiktas) arba jie
  netinkami, įrašomos numatytos reikšmės. Personažas, atsidūręs ant kliūties (pvz. ant naujo
  namelio), perkeliamas į pradžios tašką.
- Jei išsaugojime įrašytas kitas pasaulis (kitas dydis ar seed'as), laukeliai irgi perkeliami.
- Nežinomi augalai pašalinami (laukelis lieka sukastas), o blogos skaičių reikšmės pataisomos.
- Jei išsaugojimas visiškai sugadintas, žaidimas **nelūžta**: pradedamas naujas žaidimas,
  parodomas pranešimas, o senas tekstas išsaugomas `localStorage` rakte `ukis_save_v1_backup`.

### Kaip piešiama grafika

**Viskas per vieną modulį.** Scenos niekada pačios nepiešia: jos naudoja tik tekstūrų raktus ir
funkcijas iš `src/art/SpriteLibrary.js`. Jis iškviečia piešimo failus (`terrain.js`, `objects.js`,
`characters.js`, `crops.js`, `icons.js`, `ui.js`) ir, jei yra, pakeičia piešinius tavo failais iš
`public/assets/`.

Kiekvienas piešinys kuriamas „drobėje“ (`scene.textures.createCanvas`), o Phaser jį naudoja kaip
įprastą paveikslėlį. Kelios gudrybės:

- **Dizaino vienetai.** Piešiame taip, lyg langelis būtų 32x32, o `ctx.scale(S)` padidina iki
  `TILE_SIZE` (dabar 48). Pakeitus `TILE_SIZE` faile `config.js`, visa grafika prisitaiko.
- **Triukšmas** (`noiseRect`) – kiekvienas žolės ar žemės pikselis truputį kitokios spalvos, todėl
  paviršius neatrodo plokščias. Yra keli langelių variantai, kad nesimatytų pasikartojimų.
- **Gradientai** (`radialShade`) – vaisiai, akmenys ir medžių laja nušviesti iš viršaus kairės, todėl
  atrodo apimties.
- **Kraštai** – ten, kur vanduo ribojasi su žeme, uždedama smėlio ir putos juosta. Kur dirva ar takas
  ribojasi su žole, uždedamas žolės kraštas.
- **Tvora** turi 16 variantų: kiekvienas stulpelis skersiniais jungiasi su tomis pusėmis, kuriose
  yra kita tvora.
- **Gylio rūšiavimas** – objektai piešiami pagal Y koordinatę, todėl personažas gali užeiti už medžio
  ar namo.
- **Animacijos** – ūkininko ėjimas (4 kadrai kiekvienai krypčiai), vanduo (4 kadrai), siūbuojantys
  augalai, dalelės (žemė, lašai, lapai, žybsniai), slenkantys debesų šešėliai.

Augalo išvaizda parenkama pagal lauką `art` faile `config.js`: `'root'` – šakniavaisis (kaip
morka), `'bush'` – krūmelis ant atramos (kaip pomidoras), `'tall'` – aukštas augalas (kaip
kukurūzas). Naujam augalui užtenka nurodyti tipą ir `color`.

### Savi sprite'ai (public/assets)

Įdėk `.png` failą su tiksliu pavadinimu į `public/assets/`, ir žaidimas naudos jį vietoj
nupiešto piešinio. Kūrimo režime (`npm run dev`) puslapis persikrauna pats.

- **Kadrų dydis gali būti bet koks** (pvz. Kenney *Tiny Town* 16x16 langeliai). Kadras ištempiamas
  iki žaidimo piešinio dydžio, išlaikant proporcijas, o apačia sulygiuojama su žeme. Maži pixel art
  piešiniai didinami ryškiais „kvadratiniais“ pikseliais.
- Keli kadrai dedami **vienoje eilutėje iš kairės į dešinę** (išskyrus `player.png`).
- **Sezonai:** `grass`, `dirt`, `path`, `flowers`, `grass_edge`, `tree` ir `bush` turi versijas
  kiekvienam sezonui. Bendras failas (pvz. `grass.png`) tinka visiems sezonams, o failas su sezono
  pavadinimu – tik tam sezonui: `grass_spring.png`, `grass_summer.png`, `grass_autumn.png`,
  `grass_winter.png`.
- Jei failo dydis nesidalija į reikiamą kadrų skaičių, failas praleidžiamas, o konsolėje (F12)
  parašoma kodėl.
- Kenney paketai dažniausiai būna vienas didelis „tilemap“ paveikslėlis. Reikiamus langelius
  iškirpk ir sudėk į čia nurodytus failus bet kuria piešimo programa (pvz. Piskel, Aseprite,
  LibreSprite).

Lentelėje nurodytas **rekomenduojamas** vieno kadro dydis.

| Failas | Kadras (px) | Kadrai |
|---|---|---|
| `grass.png` | 16x16 | 4 žolės variantai |
| `dirt.png` | 16x16 | 2 dirvos (nesuartos) variantai |
| `path.png` | 16x16 | 2 tako variantai |
| `soil.png` | 16x16 | suarta (sausa), laistyta |
| `flowers.png` | 16x16 | 3 gėlių variantai (permatomas fonas) |
| `water.png` | 16x16 | 4 vandens animacijos kadrai |
| `shore.png` | 16x16 | kranto kraštai š, r, p, v + vidiniai kampai šv, šr, pr, pv (permatomi, dedami ant vandens) |
| `grass_edge.png` | 16x16 | žolės kraštas ant dirvos / tako: š, r, p, v (permatomas) |
| `bridge.png` | 16x16 | lentos (rytai–vakarai), lentos (šiaurė–pietūs), turėklai š, r, p, v |
| `fence.png` | 16x16 | 16 tvoros variantų pagal kaimynus: kadro nr. = š·1 + r·2 + p·4 + v·8 |
| `tree.png` | 32x48 | 2 medžiai (paprastas, su vaisiais) |
| `pine.png`, `birch.png` | 24x40, 20x38 | eglė ir beržas |
| `bush.png`, `rock.png` | 16x16 | krūmas, akmuo |
| `shop.png`, `house.png` | 32x46 | parduotuvė ir namelis (apačia – 2x2 langelių pagrindas) |
| `plaza.png` | 16x16 | 2 aikštės grindinio variantai |
| `fountain.png` | 64x70 | fontanas (apačia – 4x4 langelių pagrindas) |
| `board.png` | 32x32 | skelbimų lenta (apačia – 2x1 langelių pagrindas) |
| `lamp.png` | 16x42 | gatvės žibintas |
| `bench.png` | 16x16 | suoliukas |
| `stall.png` | 32x30 | 2 turgaus prekystalių variantai (apačia – 2x1 langelių pagrindas) |
| `sign.png` | 16x20 | sklypo lentelė (numeris užrašomas pats) |
| `farmhouse.png` | 32x46 | 6 ūkių namelių variantai (skirtingi stogai) |
| `player.png` | 24x32 | 4 stulpeliai (ėjimo kadrai) x 4 eilutės (kryptys: žemyn, kairėn, dešinėn, aukštyn). Su savo failu personažas nemirksi |
| `crop_<augalas>.png` | 16x24 | tiek kadrų, kiek to augalo `stages` (4 arba 5), pvz. `crop_carrot.png` |
| `crop_dead.png` | 16x24 | nuvytęs augalas |
| `icon_hoe.png`, `icon_watering_can.png` | 16x16 | įrankių ikonos |
| `icon_seed_<augalas>.png`, `icon_crop_<augalas>.png` | 16x16 | sėklų ir derliaus ikonos (pvz. `icon_seed_carrot.png`) |
| `icon_crop_<augalas>_gold.png` | 16x16 | auksinio derliaus ikona (pvz. `icon_crop_carrot_gold.png`) |
| `icon_bag.png` | 16x16 | kuprinės ikona |
| `npc_<id>.png` | 24x32 | kaimynas, kaip `player.png` (pvz. `npc_ona.png`, `npc_jonas.png`, `npc_ruta.png`, `npc_antanas.png`) |
| `cottage_<id>.png` | 32x46 | kaimyno namelis (`cottage_jonas.png`, `cottage_ruta.png`, `cottage_antanas.png`) |
| `icon_coin.png`, `icon_star.png`, `icon_gem.png` | 16x16 | monetos, lygio ir taškų ikonos |

Pridėjus naują augalą `config.js` faile, jam atsiranda ir nauji failų vardai
(`crop_<id>.png` su tiek kadrų, kiek `stages`).

### Kaip veikia valdymas pele

1. Paspaudus langelį `GameScene.onPointerDown` paklausia `getActionPreview()` (Farming.js): ką čia
   padarytų pasirinktas daiktas?
2. Jei veiksmas galimas, `pathNextTo()` (Pathfinding.js) suranda trumpiausią kelią iki langelio
   šalia tikslo. Jei veiksmo nėra, `pathToTile()` randa kelią iki paties langelio.
3. Kelias yra langelių sąrašas. Kiekviename kadre personažas eina link kito langelio centro
   (`followPath`), o atėjęs atlieka suplanuotą veiksmą (`arrive`).
4. Paspaudus klaviatūros rodyklę, kelias atšaukiamas, nes klaviatūra turi pirmenybę.

### Kaip veikia augimas

Kiekvienas sukastas langelis turi `daysGrown` (kiek dienų jau paaugo), `watered` (ar šiandien
palaistytas) ir `dead` (ar nuvyto). Kai einama miegoti, `endDay()` (`DayCycle.js`) iškviečia
`startNewDay()` (`Farming.js`), kuri kiekvienam augalui:

1. jei vakar buvo palaistytas ir tai jo sezonas – prideda vieną dieną;
2. jei prasidėjo sezonas, kuriuo augalas neauga – pažymi jį nuvytusiu;
3. naujam rytui nustato `watered = true`, jei lyja, kitaip – `false`.

### Kaip veikia laikas ir naktis

- `state.time = { day, minutes, weather }` – dienos numeris, minutės nuo vidurnakčio ir oras.
  Sezonas ir metai apskaičiuojami iš dienos numerio (`Time.js`).
- `advanceClock()` kas kadrą prideda laiko pagal `REAL_MINUTES_PER_DAY`.
- Oras parenkamas pagal dienos numerį ir pasaulio seed'ą (`rollWeather`), todėl tą pačią dieną
  jis visada toks pat (svarbu ateityje kuriant serverį).
- `getDarkness()` pagal valandą apskaičiuoja, kiek tamsu. `Environment.js` virš ekrano piešia tamsos
  sluoksnį (`RenderTexture`) ir ties šviesomis „ištrina“ minkštus apskritimus, todėl langai ir
  plotas aplink personažą lieka šviesūs.
- Lietus ir sniegas – dalelių srautai, „priklijuoti“ prie ekrano (`setScrollFactor(0)`).
- Pasikeitus sezonui esamų chunk'ų žemė iškepama iš naujo su to sezono piešiniais
  (`ChunkRenderer.setSeason`), o medžiams ir krūmams pakeičiamas piešinys (raktai su priesaga,
  pvz. `tree_0@winter`). Nauji chunk'ai iškart piešiami su dabartinio sezono piešiniais.

### Kaip piešiama žemė chunk'e (sluoksniais)

1. **Pagrindas:** žolė, dirva, takas arba aikštės grindinys.
2. **Dėmės:** dideli švelnūs šviesūs ir tamsūs ratai (`blob_light`, `blob_dark`) pagal „triukšmą“.
   Jie didesni už langelį, todėl piešiami ir truputį už chunk'o ribos – kaimyninis chunk'as
   nupiešia tą pačią dėmę, ir siūlių nesimato.
3. **Kraštai ir detalės:** krantai, tiltai, žolės kraštas prie takų, gėlės, kuokšteliai, grybai,
   nendrės, lelijos. Detalės parenkamos pagal langelio „hash“, todėl visada tose pačiose vietose.

Medžio rūšis (`treeKind` faile `ChunkRenderer.js`) priklauso tik nuo vietos, todėl visi žaidėjai
mato tą patį mišką.

**Spalvos „nuotaika“** (`MOOD_KEYS` faile `Environment.js`) – permatomas sluoksnis virš pasaulio.
Kiekvienai valandai nurodyta spalva ir stiprumas, o tarp jų spalva sklandžiai pereina.

### Kaip veikia garsas

`src/audio/Sound.js` sukuria visus garsus naršyklės **Web Audio API**:

- **osciliatorius** groja toną (sinusas – švelnus, trikampis – kaip fleita, kvadratas – „žaidimų“ garsas);
- **triukšmas** per filtrą duoda šnaresius (kasimas – duslus, laistymas – „šliūkštelėjimas“);
- garsumas greitai pakyla ir lėtai nuslopsta, todėl garsas skamba natūraliai.

Kiekvienas efektas yra trumpas „receptas“ objekte `SFX` (pvz. `coin` – dvi aukštos natos iš
eilės). **Muzika** groja akordus C – Am – F – G ir atsitiktinę (bet kaskart vienodą) melodiją iš
pentatonikos natų, todėl jos natos visada dera tarpusavyje. Naktį muzika tylesnė ir retesnė.

Naršyklės leidžia groti garsą tik po pirmo paspaudimo ar klavišo, todėl garsas įsijungia po
pirmo veiksmo. Garsumą ir tempą keisk `CONFIG.SOUND` faile `src/config.js`. Ar garsas išjungtas,
įsimenama naršyklėje.

### Taškai (points)

Tai atskiras skaitiklis, kuris tik didėja. Jo neįmanoma išleisti. Taškai gaunami:

- už žemės sukasimą ir sodinimą,
- už derliaus nuėmimą (pagal augalą),
- pardavus derlių (10 % uždirbtų monetų),
- pakilus lygiu (+25).

Kol kas tai tik skaičius, bet ateityje jį būtų galima naudoti airdrop'ui.

### Kaip veikia kaimynai ir užduotys

- **Duomenys** – `src/data/npcs.js`: kiekvieno kaimyno išvaizda, namelis, tvarkaraštis,
  pasisveikinimai ir mėgstamos dovanos, o žemiau – visos užduotys su dialogais.
- **Logika** – `src/logic/Quests.js` (be Phaser): `availableQuestFor` (ką NPC gali pasiūlyti),
  `acceptQuest`, `questProgress`, `completeQuest` (paima daiktus, duoda atlygį), `onHarvest`
  (skaičiuoja „nuimk N derlių“), `giveGift`, `friendshipLevel`, `shopDiscount`.
- **Vaikščiojimas** – `NpcManager.js` kas kadrą tikrina, kur NPC turi būti pagal laikrodį; pasikeitus
  tikslui suranda kelią (BFS, kaip ir žaidėjui) ir nueina. NPC vietos neišsaugomos – jos visada
  apskaičiuojamos iš laiko, todėl po įkėlimo ar miego kaimynai iškart atsiduria savo vietose.
- **Pokalbis** – `DialogController.js` sudaro „ekranus“ (tekstas + atsakymai) ir siunčia juos
  `UIScene` (`EVENTS.DIALOG_SHOW`), o šis grąžina pasirinkimą (`EVENTS.DIALOG_CHOICE`).

**Naujos užduoties pridėjimas** – įrašyk ją į `QUESTS` faile `src/data/npcs.js`:

```js
ona_pumpkins: {
  giver: 'ona',                                     // kas duoda
  title: 'Helovino vitrina',
  summary: 'Atnešk Onai 3 moliūgus.',
  requires: { friendship: 2 },                      // nuo 2 širdelių
  goal: { type: 'deliver', item: 'crop_pumpkin', amount: 3 }, // arba { type: 'harvest', crop: 'any', amount: 10 }
  reward: { coins: 300, xp: 60, points: 30, friendship: 40, items: { seed_melon: 2 } },
  dialog: {
    offer: ['Ruduo – moliūgų metas!', 'Atneši 3 moliūgus?'],
    progress: 'Moliūgų dar nėra?',
    complete: ['Puiku! Vitrina bus nuostabi.'],
  },
},
```

Užduoties grandinei naudok `requires: { quests: ['ankstesnės_id'] }`, o jei užduotį reikia atiduoti
kitam kaimynui – `turnIn: 'jonas'`.

### Kaip keisti balansą

Atidaryk `src/config.js` ir keisk skaičius. Pavyzdžiui, kad morka augtų 2 dienas, pakeisk `growDays: 2`, o kad diena truktų 5 minutes – `REAL_MINUTES_PER_DAY: 5`. Ten pat yra kaimynų greitis (`NPC_SPEED`), draugystės taškai už dovanas ir Onos nuolaida (`FRIENDSHIP`), energijos kainos (`ENERGY_COST`), oro tikimybės (`WEATHER`), sezono ilgis (`DAYS_PER_SEASON`) ir nakties tamsumas. Auksinio derliaus tikimybė ir vertė – `GOLDEN`. Pasaulio dydis, seed'as, sklypų dydis, žaidėjo sklypas (`DEFAULT_PLOT_ID`) ir miško tankis – faile `shared/worldConfig.js`, o chunk'ų ir žemėlapio nustatymai (`CHUNK_SIZE`, `MINIMAP_SCALE`) – `src/config.js`.

**Naujo augalo pridėjimas:** įrašyk naują įrašą į `CROPS` (id – vienas žodis be „_“). Nurodyk
`art` (išvaizdos tipą: `root`, `bush`, `tall`, `leafy`, `ground` ar `flower`), `color` ir, jei
nori, `shape` (ikonos formą). Augimo stadijos, sėklų, derliaus ir auksinės ikonos nupiešiamos
pačios, o parduotuvė augalą rodys jo sezonais. Pakartotiniam derliui pridėk `regrowDays`.
Vieno sezono augalo `growDays` turi būti ne daugiau 6, kad jis spėtų užaugti per sezoną.

Jei pakeisi būsenos struktūrą, padidink `SAVE_VERSION` ir faile `Migration.js` pridėk žingsnį, kuris seną išsaugojimą paverčia nauju. Naujiems laukams užtenka numatytos reikšmės `createNewState()` (`GameState.js`) ir patikros `fillDefaults()` (`Migration.js`).

### Derinimas

Kūrimo režime (`npm run dev`) naršyklės konsolėje pasiekiamas `window.__game`. Pavyzdžiui:

```js
__game.scene.getScene('GameScene').state   // visa žaidimo būsena
```

## 5 idėjos, ką pridėti toliau

1. **Garsai ir muzika.** Kasimo, laistymo, monetų skambesys ir rami fono muzika. Garsus galima sugeneruoti kodu per Web Audio API, kaip ir grafiką.
2. **Namelio vidus.** Įėjus į namelį – atskira scena su lova, skrynia daiktams ir virtuve, kur iš derliaus galima gaminti maistą, atstatantį energiją.
3. **Kaimo šventės.** Kiekvieno sezono paskutinę dieną – šventė aikštėje (pvz. rudens moliūgų konkursas), kur kaimynai susirenka, o už geriausią derlių duodami prizai.
4. **Serveris ir multiplayer.** `logic/` failus perkelk į Node.js serverį (pvz. su Socket.IO arba Colyseus). Serveris saugo būseną duomenų bazėje ir tikrina kiekvieną veiksmą, kad niekas negalėtų „prisisukti“ taškų. Žaidėjai matytų vienas kitą bendrame žemėlapyje.
5. **Įrankių tobulinimas ir amatai (crafting).** Geresnis kaplys sukasa 3 langelius iš karto, didesnis laistytuvas laisto plotą. Iš derliaus galima gaminti produktus (pvz. pomidorų padažą), kurie kainuoja brangiau.
