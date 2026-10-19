# Kaip paskelbti žaidimą internete (GitHub Pages)

Šis aprašymas skirtas tiems, kas su git ir GitHub dirba pirmą kartą. Kai viskas bus atlikta,
žaidimas turės savo nuorodą, pvz. `https://tavovardas.github.io/ukis/`, ir ją galėsi
nusiųsti draugams. Paskelbimas nemokamas.

**Kaip tai veikia:** kodą įkeli į GitHub, o GitHub pats paleidžia `npm run build` ir paskelbia
gautą `dist/` aplanką. Tai daro failas `.github/workflows/deploy.yml`, jau paruoštas projekte.
Vėliau užteks įkelti pakeitimus, ir žaidimas internete atsinaujins pats.

---

## 0. Perkelk projektą į nuolatinį aplanką

Dabar `ukis` aplankas yra laikiname aplanke, kurį programa sukūrė šiam pokalbiui. Jei
pokalbis bus ištrintas, išnyks ir aplankas. Todėl pirmiausia perkelk visą `ukis` aplanką
į nuolatinę vietą, pvz. `Dokumentai\ukis`.

Toliau visos komandos rašomos **tame `ukis` aplanke** (kur yra `package.json`).

## 1. Įsidiek Git

1. Atsisiųsk Git iš <https://git-scm.com/downloads> (Windows versiją).
2. Diegdamas visur gali spausti **Next**. Numatytieji nustatymai tinka.
3. Patikrink: atidaryk **PowerShell** (Start meniu įrašyk „PowerShell“) ir parašyk:

   ```
   git --version
   ```

   Jei parašo kažką panašaus į `git version 2.47.0`, viskas gerai.

4. Prisistatyk git'ui (tik vieną kartą). Vardas ir el. paštas bus matomi prie tavo pakeitimų:

   ```
   git config --global user.name "Tavo Vardas"
   git config --global user.email "tavo@pastas.lt"
   ```

## 2. Susikurk GitHub paskyrą

1. Eik į <https://github.com> ir spausk **Sign up**.
2. Įvesk el. paštą, slaptažodį ir **vartotojo vardą** (username). Vardas bus tavo žaidimo
   nuorodoje (`vardas.github.io`), todėl rinkis trumpą, be tarpų.
3. Patvirtink el. paštą (GitHub atsiųs laišką su kodu).

## 3. Sukurk repozitoriją

Repozitorija (repo) – tai projekto aplankas GitHub'e.

1. Prisijungęs spausk **+** viršuje dešinėje → **New repository**.
2. **Repository name:** pvz. `ukis`. Šis pavadinimas bus nuorodos gale.
3. Pasirink **Public**. Nemokamas GitHub Pages veikia tik su viešomis repozitorijomis.
4. **Nieko nežymėk** apačioje (jokio README, .gitignore ar licencijos). Projekte jie jau yra.
5. Spausk **Create repository**. Atsidarys puslapis su nuoroda, pvz.
   `https://github.com/tavovardas/ukis.git`. Jos prireiks kitame žingsnyje.

## 4. Įkelk kodą

PowerShell'e nueik į projekto aplanką (pakeisk kelią į savo):

```
cd "$HOME\Documents\ukis"
```

Tada paeiliui įvykdyk šias komandas:

```
git init
git add .
git commit -m "Pirmoji žaidimo versija"
git branch -M main
git remote add origin https://github.com/tavovardas/ukis.git
git push -u origin main
```

Ką jos daro:

| Komanda | Ką daro |
|---|---|
| `git init` | Paverčia aplanką git repozitorija (vieną kartą) |
| `git add .` | Pažymi visus failus įkėlimui (`node_modules` ir `dist` praleidžiami, žr. `.gitignore`) |
| `git commit -m "..."` | Išsaugo „nuotrauką“ su aprašymu |
| `git branch -M main` | Pagrindinę šaką pavadina `main` |
| `git remote add origin ...` | Nurodo, kur yra tavo GitHub repozitorija (vieną kartą) |
| `git push -u origin main` | Nusiunčia kodą į GitHub |

**Prisijungimas.** Per pirmą `git push` atsidarys langas „Connect to GitHub“. Spausk
**Sign in with your browser** ir naršyklėje patvirtink. Slaptažodžio į terminalą rašyti nereikia.
Git jį prisimins.

Atnaujink repozitorijos puslapį GitHub'e. Turėtum matyti savo failus.

## 5. Įjunk GitHub Pages

1. Repozitorijoje spausk **Settings** (krumpliaratis viršuje).
2. Kairėje spausk **Pages**.
3. Ties **Build and deployment → Source** pasirink **GitHub Actions**.

Daugiau nieko spausti nereikia.

## 6. Palauk, kol žaidimas bus paskelbtas

1. Repozitorijoje atidaryk skirtuką **Actions**.
2. Matysi darbą **„Paskelbti žaidimą“**:
   - geltonas taškas – vyksta (užtrunka 1–2 minutes);
   - žalia varnelė – paskelbta;
   - raudonas kryželis – nepavyko.
3. **Jei pirmas kartas su raudonu kryželiu** – greičiausiai kodą įkėlei anksčiau, nei įjungei
   Pages (5 žingsnis). Tai nieko blogo: spausk **„Paskelbti žaidimą“** kairėje → **Run workflow** →
   **Run workflow**, ir jis pasileis iš naujo.

## 7. Žaisk!

Tavo žaidimo nuoroda:

```
https://tavovardas.github.io/ukis/
```

(vietoj `tavovardas` – tavo GitHub vardas, vietoj `ukis` – repozitorijos pavadinimas).
Ją rasi ir **Settings → Pages** viršuje, ir prie žalios varnelės Actions skirtuke.

Išsaugojimai saugomi kiekvieno žaidėjo naršyklėje, todėl kiekvienas draugas turės savo ūkį.

---

## Kaip įkelti pakeitimus vėliau

Pakeitei kodą ar `config.js`? PowerShell'e projekto aplanke:

```
git add .
git commit -m "Trumpai, ką pakeitei"
git push
```

Po 1–2 minučių nauja versija bus internete. Jei naršyklė rodo seną versiją, perkrauk
puslapį su **Ctrl+F5**.

Naudinga komanda: `git status` parodo, kokie failai pakeisti, bet dar neįkelti.

## Kaip nustatyti atsiliepimų formą

1. Eik į <https://forms.google.com> ir sukurk formą (pvz. klausimai „Kas patiko?“,
   „Kas trukdė?“, „Ką pridėtum?“).
2. Spausk **Send** (Siųsti) → nuorodos ikona 🔗 → (gali pažymėti **Shorten URL**) → **Copy**.
3. Atidaryk `src/config.js` ir įklijuok nuorodą:

   ```js
   FEEDBACK_URL: 'https://forms.gle/tavoNuoroda',
   ```

4. Įkelk pakeitimą (`git add .`, `git commit -m "Atsiliepimų forma"`, `git push`).

Atsakymus matysi Google Forms skirtuke **Responses**.

## Jei kas nors nepavyksta

| Bėda | Ką daryti |
|---|---|
| `git` neatpažįstamas | Uždaryk ir vėl atidaryk PowerShell po Git įdiegimo |
| `remote origin already exists` | Nuoroda jau nustatyta – praleisk tą komandą |
| `failed to push some refs` | GitHub repozitorijoje yra failų, kurių nėra pas tave (pvz. sukūrei README). Paprasčiausia: ištrink repozitoriją (Settings → apačioje Delete) ir sukurk iš naujo be jokių žymėjimų |
| Actions: klaida ties „Įdiegti priklausomybes“ | Patikrink, ar įkeltas `package-lock.json` |
| Puslapis baltas | Paspausk F12 → Console ir pažiūrėk klaidą. Dažniausiai padeda Ctrl+F5 |
| 404 puslapis | Palauk kelias minutes po pirmo paskelbimo ir patikrink, ar nuorodos gale teisingas repozitorijos pavadinimas |
