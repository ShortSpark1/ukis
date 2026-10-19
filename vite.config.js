import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(ROOT, 'public', 'assets');

// ---------------------------------------------------------------------
// Įskiepis „user-assets“: suranda, kokius .png failus įdėjai į
// public/assets/, ir perduoda jų sąrašą žaidimui per virtualų modulį
// `virtual:user-assets`. Taip žaidimas bando įkelti tik esamus failus
// (be 404 klaidų konsolėje). Įdėjus ar ištrynus failą, kūrimo režime
// puslapis persikrauna pats.
// ---------------------------------------------------------------------
function userAssetsPlugin() {
  const id = 'virtual:user-assets';
  const resolved = `\0${id}`;
  const list = () => (fs.existsSync(ASSETS_DIR)
    ? fs.readdirSync(ASSETS_DIR).filter((f) => f.toLowerCase().endsWith('.png'))
    : []);

  return {
    name: 'user-assets',
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(moduleId) {
      return moduleId === resolved ? `export default ${JSON.stringify(list())};` : null;
    },
    configureServer(server) {
      server.watcher.add(ASSETS_DIR);
      // Lyginame tik kelio pabaigą: Windows kartais tą patį aplanką rodo
      // skirtingais keliais (pvz. per nuorodas), todėl pilnas kelias gali nesutapti.
      const inAssets = (file) => path.dirname(file).replace(/\\/g, '/').toLowerCase().endsWith('/public/assets');
      const onChange = (file) => {
        if (!inAssets(file)) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

export default defineConfig({
  // Santykiniai keliai ('./'): paruošta versija veikia bet kuriame aplanke,
  // pvz. GitHub Pages adresu https://vardas.github.io/repozitorija/
  base: './',
  plugins: [userAssetsPlugin()],
  server: { port: 5173, open: false },
  build: {
    // Žaidimo kodas – į dist/static, kad nesimaišytų su tavo sprite'ais (dist/assets)
    assetsDir: 'static',
    // Phaser biblioteka didelė (~1,5 MB), todėl padidiname įspėjimo ribą
    chunkSizeWarningLimit: 2000,
  },
});
