import { CONFIG } from '../config.js';

// =====================================================================
//  GARSAI IR MUZIKA
//  Visi garsai sukuriami kodu per naršyklės Web Audio API (kaip ir
//  grafika), todėl jokių garso failų nereikia.
//
//  Kaip tai veikia: „osciliatorius“ sukuria toną (sinusas, trikampis ir
//  pan.), „triukšmas“ – šnaresį (kasimui, laistymui). Garsumas („gain“)
//  greitai pakyla ir lėtai nuslopsta – taip gaunasi natūralus garsas.
//
//  Naršyklės leidžia groti garsą tik po pirmo paspaudimo ar klavišo,
//  todėl unlock() kviečiamas iš main.js po pirmo žaidėjo veiksmo.
// =====================================================================

const MUTE_KEY = 'ukis_muted';

// Natos (Hz): C-dur pentatonika – visos natos tarpusavyje skamba gražiai
const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5,
};

// Muzikos akordai (kiekvienas – 2 taktai): C – Am – F – G
const CHORDS = [
  ['C3', 'E4', 'G4'],
  ['A3', 'C4', 'E4'],
  ['F4', 'A3', 'C4'],
  ['G3', 'D4', 'G4'],
];
// Melodijai – natos iš pentatonikos
const MELODY_NOTES = ['C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5'];

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* nieko */ }
    this.night = false;
    this.lastStep = 0;
  }

  // Sukuria garso sistemą (tik po žaidėjo veiksmo – taip reikalauja naršyklės)
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return; // labai sena naršyklė – žaidžiame be garso
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.gainNode(CONFIG.SOUND.sfxVolume, this.master);
    this.musicBus = this.gainNode(CONFIG.SOUND.musicVolume, this.master);
    // Švelnus aidas melodijai (atrodo „erdviau“)
    this.echo = this.ctx.createDelay(1);
    this.echo.delayTime.value = 0.32;
    const feedback = this.gainNode(0.28, this.echo);
    this.echo.connect(feedback);
    this.echo.connect(this.musicBus);
    this.noiseBuffer = this.makeNoise();
    if (CONFIG.SOUND.music) this.startMusic();
  }

  gainNode(value, destination) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    if (destination) g.connect(destination);
    return g;
  }

  // Baltas triukšmas (1 sekundė) – iš jo daromi šnaresiai
  makeNoise() {
    const len = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // ---------- Įjungti / išjungti ----------
  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* nieko */ }
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // Naktį muzika tylesnė ir retesnė
  setNight(night) {
    if (night === this.night || !this.musicBus) {
      this.night = night;
      return;
    }
    this.night = night;
    const v = CONFIG.SOUND.musicVolume * (night ? 0.55 : 1);
    this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 2);
  }

  // ---------- Statybiniai blokai ----------

  // Vienas tonas: dažnis (arba [nuo, iki] – slenkantis), trukmė, forma, garsumas, pradžia
  tone(freq, dur, { type = 'sine', vol = 0.5, at = 0, attack = 0.005, bus = this.sfxBus } = {}) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Šnaresys: triukšmas per filtrą (lowpass – duslus, bandpass – „šliūkštelėjimas“)
  noise(dur, { filter = 'lowpass', freq = 800, freqEnd = null, q = 1, vol = 0.5, at = 0 } = {}) {
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- Garso efektai ----------
  play(name) {
    if (!this.ready || this.muted) return;
    const fx = SFX[name];
    if (fx) fx(this);
  }

  // Žingsniai – ne dažniau kaip kas CONFIG.SOUND.stepMs
  step(now, onPath) {
    if (now - this.lastStep < CONFIG.SOUND.stepMs) return;
    this.lastStep = now;
    if (!this.ready || this.muted) return;
    this.noise(0.07, { filter: 'lowpass', freq: onPath ? 1400 : 700, vol: 0.12 });
  }

  // ---------- Muzika ----------
  // Muzika „groja“ planuodama natas truputį į priekį (kas 100 ms
  // patikriname, ar reikia suplanuoti kitas natas). Taip ji neplaukia,
  // net jei žaidimas trumpam sulėtėja.
  startMusic() {
    if (this.musicTimer) return;
    this.beat = 60 / CONFIG.SOUND.musicBpm; // vieno takto dalies (ketvirtinės) trukmė sekundėmis
    this.nextTime = this.ctx.currentTime + 0.3;
    this.step16 = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 100);
  }

  scheduleMusic() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      this.playMusicStep(this.step16, this.nextTime - this.ctx.currentTime);
      this.nextTime += this.beat / 2; // aštuntinės
      this.step16 = (this.step16 + 1) % 64;
    }
  }

  // Vienas muzikos žingsnis (aštuntinė). 64 žingsniai = 4 akordai po 2 taktus.
  playMusicStep(step, at) {
    const bus = this.musicBus;
    const chord = CHORDS[Math.floor(step / 16)];
    // Akordo „pagalvė“ – akordo pradžioje, ilgai skamba
    if (step % 16 === 0) {
      for (const n of chord) {
        this.tone(NOTE[n], this.beat * 8, { type: 'sine', vol: 0.09, at, attack: 0.6, bus });
      }
      this.tone(NOTE[chord[0]] / 2, this.beat * 8, { type: 'triangle', vol: 0.08, at, attack: 0.3, bus });
    }
    // Melodija: pastovus „atsitiktinis“ raštas, naktį – retesnis
    const r = Math.sin(step * 12.9898 + 4.1) * 43758.5453;
    const rnd = r - Math.floor(r);
    const chance = this.night ? 0.18 : 0.42;
    if (step % 2 === 0 && rnd < chance) {
      const note = MELODY_NOTES[Math.floor(rnd * 100) % MELODY_NOTES.length];
      this.tone(NOTE[note], this.beat * 1.6, { type: 'triangle', vol: 0.07, at, attack: 0.02, bus: this.echo });
      this.tone(NOTE[note], this.beat * 1.6, { type: 'sine', vol: 0.05, at, attack: 0.02, bus });
    }
  }
}

// Kiekvieno efekto „receptas“
const SFX = {
  till: (s) => {
    s.noise(0.16, { filter: 'lowpass', freq: 500, vol: 0.55 });
    s.tone([110, 60], 0.14, { type: 'sine', vol: 0.4 });
  },
  clear: (s) => {
    s.noise(0.22, { filter: 'bandpass', freq: 900, freqEnd: 300, q: 0.8, vol: 0.5 });
  },
  water: (s) => {
    s.noise(0.45, { filter: 'bandpass', freq: 2400, freqEnd: 700, q: 1.2, vol: 0.35 });
    s.tone([900, 500], 0.1, { type: 'sine', vol: 0.12, at: 0.05 });
  },
  plant: (s) => {
    s.tone([520, 300], 0.09, { type: 'sine', vol: 0.35 });
    s.noise(0.08, { filter: 'lowpass', freq: 900, vol: 0.2 });
  },
  harvest: (s) => {
    s.noise(0.12, { filter: 'highpass', freq: 2500, vol: 0.15 });
    s.tone(NOTE.E5, 0.18, { type: 'triangle', vol: 0.3 });
    s.tone(NOTE.A5, 0.25, { type: 'triangle', vol: 0.3, at: 0.07 });
  },
  golden: (s) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => s.tone(f, 0.4, { type: 'triangle', vol: 0.3, at: i * 0.07 }));
    s.tone(NOTE.C6 * 2, 0.6, { type: 'sine', vol: 0.12, at: 0.3 });
  },
  coin: (s) => {
    s.tone(NOTE.C6 * 0.75, 0.08, { type: 'square', vol: 0.09 });
    s.tone(NOTE.C6, 0.22, { type: 'square', vol: 0.09, at: 0.07 });
  },
  levelup: (s) => {
    [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6].forEach((f, i) => s.tone(f, 0.3, { type: 'triangle', vol: 0.32, at: i * 0.09 }));
  },
  click: (s) => {
    s.tone([1600, 1100], 0.04, { type: 'sine', vol: 0.18 });
  },
  open: (s) => {
    s.noise(0.18, { filter: 'bandpass', freq: 600, freqEnd: 1800, q: 0.7, vol: 0.18 });
  },
  error: (s) => {
    s.tone([330, 300], 0.12, { type: 'triangle', vol: 0.18 });
    s.tone([260, 220], 0.16, { type: 'triangle', vol: 0.18, at: 0.1 });
  },
  talk: (s) => {
    s.tone([600, 760], 0.07, { type: 'sine', vol: 0.2 });
    s.tone([700, 900], 0.07, { type: 'sine', vol: 0.18, at: 0.08 });
  },
  sleep: (s) => {
    [NOTE.G5, NOTE.E5, NOTE.C5, NOTE.G4].forEach((f, i) => s.tone(f, 0.6, { type: 'sine', vol: 0.22, at: i * 0.22 }));
  },
  morning: (s) => {
    [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5].forEach((f, i) => s.tone(f, 0.35, { type: 'triangle', vol: 0.2, at: i * 0.12 }));
  },
};

// Vienas bendras garso „grotuvas“ visam žaidimui
export const Sound = new SoundSystem();
