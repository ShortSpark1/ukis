# PLANAS 3 – multiplayer

Žaidimas tampa multiplayer: žaidėjai mato vieni kitus ir gali susitikti bendrame pasaulyje.

**Darbo taisyklės**

- Dirbama etapais. Po kiekvieno etapo sustojama, kad galėčiau išbandyti.
- Kodas komentuojamas lietuviškai.
- Po kiekvieno etapo trumpai paaiškinama, kas padaryta. Su serveriais dirbu pirmą kartą.

**Technologijos**

- Node.js serveris su Colyseus (biblioteka multiplayer žaidimams).
- SQLite duomenų bazė.
- Klientas lieka Phaser + Vite.

## ETAPAS 1. Didesnis pasaulis

- Pasaulis apie 200x200 langelių, suskirstytas į zonas:
  - **Miestas centre:** aikštė, parduotuvė, NPC namai, skelbimų lenta, fontanas ar kita susitikimo vieta.
  - **Ūkių zona aplink miestą:** daug vienodo dydžio sklypų (pvz. 20x20), kiekvienas su tvora ir vartais.
  - **Gamta tarp zonų:** miškai, ežerai, upė su tiltais, takai.
- Žemėlapis generuojamas su fiksuotu seed'u ir visiems žaidėjams vienodas. Generavimo kodas bendras serveriui ir klientui.
- Kamera, minimapas ir greitis turi veikti su dideliu žemėlapiu: piešiama tik matoma dalis (chunk'ais).
- Kol kas viskas veikia vienam žaidėjui, kad būtų galima patikrinti naują žemėlapį.

## ETAPAS 2. Serveris ir paskyros

- Express + SQLite serveris aplanke `server/`.
- Registracija ir prisijungimas (vardas ir slaptažodis, bcrypt), prisijungimo ekranas žaidime.
- Kiekvienam naujam žaidėjui automatiškai priskiriamas laisvas ūkio sklypas.
- Serveryje, ne localStorage, saugoma: inventorius, monetos, XP, taškai, augalai, užduotys ir draugystė su NPC.
- Serveris tikrina svarbius veiksmus. Negalima:
  - nuimti neužaugusio augalo;
  - ūkininkauti svetimame sklype;
  - parduoti daiktų, kurių neturi.
- Žaidimo laikas, sezonai ir oras skaičiuojami serveryje ir visiems vienodi.

## ETAPAS 3. Žaidėjai mato vienas kitą

- Colyseus kambarys: visi prisijungę žaidėjai realiu laiku mato kitų personažus su vardais virš galvų.
- Sklandus kitų žaidėjų judėjimas (interpoliacija), kad nebūtų trūkčiojimų.
- Siunčiami tik netoliese esantys žaidėjai, kad serveris neapsikrautų.
- Į kitų žaidėjų ūkius galima užeiti ir juos apžiūrėti, bet ne keisti.
- Pokalbiai:
  - burbulas virš galvos artimiems žaidėjams (klavišas Enter);
  - bendras pokalbių langas;
  - paprastas keiksmažodžių filtras;
  - apribojimas, kiek žinučių galima siųsti per minutę.
- Žaidėjų sąrašas: kas prisijungęs ir mygtukas „Nueiti pas jį“ (teleportas prie jo ūkio vartų).
- Jei ryšys nutrūksta, žaidimas bando prisijungti iš naujo ir parodo pranešimą.

## ETAPAS 4. Bendravimas

- Prekyba tarp žaidėjų: priėjus prie kito žaidėjo galima pasiūlyti mainus. Abu turi patvirtinti, viskas vykdoma serveryje.
- Emocijos (pamojuoti, nusijuokti, šokti) klavišais 1–4.
- Draugų sąrašas ir galimybė leisti draugams laistyti tavo augalus.
- Lyderių lentelė mieste, ant skelbimų lentos.

## ETAPAS 5. Paskelbimas

- Serveris paruošiamas paskelbti Render nemokamame plane (arba Railway). Aplinkos kintamieji laikomi `.env` faile, pavyzdys – `.env.example`.
- Klientas lieka GitHub Pages ir jungiasi prie serverio adreso, nurodyto konfigūracijoje.
- Žingsnis po žingsnio paaiškinama lietuviškai, ką turiu padaryti pats.
- Atnaujinamas README:
  - kaip paleisti serverį ir klientą kompiuteryje;
  - kaip išbandyti su keliais žaidėjais (pvz. atidarius du naršyklės langus);
  - kaip paskelbti.

## Saugumas

- Jokių slaptažodžių ar raktų kode.
- `.env` įrašytas į `.gitignore`.
- Serveris niekada nepasitiki kliento atsiųstais skaičiais (monetomis, kiekiais, laiku).

---

## Kas padaryta

### 1 etapas – padaryta

- **Bendras kodas `shared/`** (be Phaser, tinka ir Node.js serveriui):
  - `worldConfig.js` – dydis 200x200, seed'as, sklypai, miško tankis;
  - `WorldMap.js` – generavimas, zonos, sklypai `PLOTS`, vietos `PLACES`, langelių taisyklės;
  - `Random.js`.
- **Zonos:**
  - miestas centre: aikštė, fontanas, skelbimų lenta, parduotuvė, 3 kaimynų nameliai;
  - 24 sklypai po 20x20 (6 grupės po 4) su tvora, vartais, nameliu ir dirva;
  - gamta: miškas už žiedinio kelio, giraitės, ežeras, tvenkinys, upė su 3 tiltais.
- **Chunk'ai:** `src/scenes/ChunkRenderer.js` piešia tik 16x16 langelių kvadratus prie kameros. Žemės paveikslėliai pernaudojami, kliūtys sujungiamos.
- **Kelio paieška** (BFS) perrašyta su skaičių masyvais.
- **Kaimynai** eina į vietas pagal pavadinimus (`at: 'lake_dock'`).
- **Žaidėjo sklypas** `state.plotId` (kol kas `DEFAULT_PLOT_ID: 10`):
  - kasti galima tik savo sklype;
  - miegoti – tik savo namelyje.
- **Žemėlapis (M):** mažas → didelis per ekraną → paslėptas. Geltonu rėmeliu pažymėtas savo sklypas.
- **Išsaugojimo migracija v6 → v7:** laukeliai perkeliami į savo sklypo dirvą.
- **Patikrinta:**
  - apkeliavus visą pasaulį aktyvių chunk'ų – ne daugiau 12;
  - FPS ~170;
  - visos vietos, durys ir sklypų vartai pasiekiami pėsčiomis.
