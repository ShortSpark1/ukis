import { CONFIG } from '../config.js';
import { NPCS } from '../data/npcs.js';
import { findPath } from '../logic/Pathfinding.js';
import { isWalkable } from '../logic/WorldMap.js';
import { availableQuestFor, readyQuestFor } from '../logic/Quests.js';
import { PLAYER_DIRS, WALK_FRAMES, textStyle } from '../art/SpriteLibrary.js';

const T = CONFIG.TILE_SIZE;
const SPEED = CONFIG.NPC_SPEED * T;

// =====================================================================
//  KAIMYNŲ (NPC) VALDYMAS
//  Kiekvienas NPC turi tvarkaraštį (src/data/npcs.js): nuo kurios valandos
//  kur būti. Kai ateina laikas, NPC suranda kelią (BFS) ir nueina.
//  Vakare grįžta prie savo durų ir „užeina vidun“ – iki ryto jo nesimato.
//  NPC vietos neišsaugomos: jos visada apskaičiuojamos iš laiko.
// =====================================================================
export class NpcManager {
  // depthOf(y) – kaip GameScene skaičiuoja objektų gylį pagal Y
  constructor(scene, map, depthOf, textDepth) {
    this.scene = scene;
    this.map = map;
    this.depthOf = depthOf;
    this.npcs = Object.entries(NPCS).map(([id, data]) => this.createNpc(id, data, textDepth));
    this.validateSchedules();
  }

  createNpc(id, data, textDepth) {
    const key = `npc_${id}`;
    for (const dir of PLAYER_DIRS) {
      const anim = `${key}_walk_${dir}`;
      if (!this.scene.anims.exists(anim)) {
        this.scene.anims.create({
          key: anim,
          frames: Array.from({ length: WALK_FRAMES }, (_, f) => ({ key, frame: `${dir}_${f}` })),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
    const shadow = this.scene.add.image(0, 0, 'shadow');
    const sprite = this.scene.add.sprite(0, 0, key, 'down_0').setOrigin(0.5, 0.9);
    const label = this.scene.add.text(0, 0, data.name, textStyle(12, '#fff4dc')).setOrigin(0.5, 1).setDepth(textDepth);
    const bubble = this.scene.add.text(0, 0, '', textStyle(22, '#ffd54f')).setOrigin(0.5, 1).setDepth(textDepth);
    this.scene.tweens.add({ targets: bubble, scale: 1.2, duration: 450, yoyo: true, repeat: -1 });
    return { id, data, key, sprite, shadow, label, bubble, path: null, goalKey: null, goingHome: false, hidden: false, facing: 'down' };
  }

  // Įspėja konsolėje, jei duomenų faile nurodyta vieta, į kurią nueiti negalima
  validateSchedules() {
    for (const npc of this.npcs) {
      for (const s of npc.data.schedule) {
        if (s.at && !isWalkable(this.map, s.at.x, s.at.y)) {
          console.warn(`[NPC] ${npc.data.name}: vieta (${s.at.x}, ${s.at.y}) ${s.hour} val. – nepraeinama!`);
        }
      }
    }
  }

  // Kur NPC turi būti šiuo metu: { home: true } arba { at: {x, y} }
  scheduleGoal(npc, minutes) {
    const hour = minutes / 60;
    let goal = { home: true }; // anksti ryte – dar namie
    for (const entry of npc.data.schedule) {
      if (entry.hour <= hour) goal = entry;
    }
    return goal;
  }

  tileToPos(tile) {
    return { x: tile.x * T + T / 2, y: tile.y * T + T / 2 + 6 };
  }

  tileOf(npc) {
    return { x: Math.floor(npc.sprite.x / T), y: Math.floor((npc.sprite.y - 6) / T) };
  }

  setPos(npc, pos) {
    npc.sprite.setPosition(pos.x, pos.y);
  }

  setHidden(npc, hidden) {
    npc.hidden = hidden;
    for (const obj of [npc.sprite, npc.shadow, npc.label, npc.bubble]) obj.setVisible(!hidden);
  }

  // Iš karto (be ėjimo) pastato visus NPC ten, kur jie turi būti dabar.
  // Kviečiama įkėlus žaidimą ir po miego.
  placeAll(minutes) {
    for (const npc of this.npcs) {
      const goal = this.scheduleGoal(npc, minutes);
      npc.path = null;
      npc.goalKey = goal.home ? 'home' : `${goal.at.x},${goal.at.y}`;
      npc.goingHome = false;
      this.setPos(npc, this.tileToPos(goal.home ? npc.data.home.door : goal.at));
      this.setHidden(npc, !!goal.home);
      npc.facing = 'down';
      npc.sprite.anims.stop();
      npc.sprite.setFrame('down_0');
      this.updateVisuals(npc);
    }
  }

  // Kiekvieną kadrą. frozenId – NPC, su kuriuo dabar kalbamasi (jis stovi)
  update(delta, minutes, frozenId = null) {
    for (const npc of this.npcs) {
      const goal = this.scheduleGoal(npc, minutes);
      const goalKey = goal.home ? 'home' : `${goal.at.x},${goal.at.y}`;

      // Pasikeitė tikslas – ieškome naujo kelio
      if (goalKey !== npc.goalKey) {
        npc.goalKey = goalKey;
        if (npc.hidden && !goal.home) {
          // ryte išeina pro duris
          this.setPos(npc, this.tileToPos(npc.data.home.door));
          this.setHidden(npc, false);
        }
        const target = goal.home ? npc.data.home.door : goal.at;
        const from = this.tileOf(npc);
        npc.path = findPath(this.map, from, (x, y) => x === target.x && y === target.y) ?? [];
        npc.goingHome = !!goal.home;
        if (npc.path.length === 0 && npc.goingHome) this.setHidden(npc, true);
      }

      if (!npc.hidden && npc.id !== frozenId) this.followPath(npc, delta);
      else if (npc.id === frozenId) this.idle(npc);
      this.updateVisuals(npc);
    }
  }

  followPath(npc, delta) {
    if (!npc.path || npc.path.length === 0) {
      this.idle(npc);
      return;
    }
    const target = this.tileToPos(npc.path[0]);
    const dx = target.x - npc.sprite.x;
    const dy = target.y - npc.sprite.y;
    const dist = Math.hypot(dx, dy);
    const step = (SPEED * delta) / 1000;

    if (dist <= step) {
      this.setPos(npc, target);
      npc.path.shift();
      if (npc.path.length === 0 && npc.goingHome) {
        this.setHidden(npc, true); // užėjo į namus
        npc.goingHome = false;
      }
      return;
    }
    npc.sprite.x += (dx / dist) * step;
    npc.sprite.y += (dy / dist) * step;
    if (Math.abs(dx) >= Math.abs(dy)) npc.facing = dx > 0 ? 'right' : 'left';
    else npc.facing = dy > 0 ? 'down' : 'up';
    npc.sprite.anims.play(`${npc.key}_walk_${npc.facing}`, true);
  }

  idle(npc) {
    npc.sprite.anims.stop();
    npc.sprite.setFrame(`${npc.facing}_0`);
  }

  updateVisuals(npc) {
    const { x, y } = npc.sprite;
    npc.sprite.setDepth(this.depthOf(y + 1));
    npc.shadow.setPosition(x, y - 3).setDepth(npc.sprite.depth - 0.5);
    npc.label.setPosition(x, y - 46);
    npc.bubble.setPosition(x, y - 60);
  }

  // „!“ – turi užduotį, „?“ – galima atiduoti įvykdytą užduotį
  refreshBubbles(state) {
    for (const npc of this.npcs) {
      if (readyQuestFor(state, npc.id)) npc.bubble.setText('?').setColor('#9cff7a');
      else if (availableQuestFor(state, npc.id)) npc.bubble.setText('!').setColor('#ffd54f');
      else npc.bubble.setText('');
    }
  }

  // Artimiausias matomas NPC šalia taško (pasaulio koordinatės)
  nearest(x, y) {
    let best = null;
    let bestDist = CONFIG.NPC_TALK_DISTANCE * T;
    for (const npc of this.npcs) {
      if (npc.hidden) continue;
      const d = Math.hypot(npc.sprite.x - x, npc.sprite.y - y);
      if (d <= bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  }

  // NPC, ant kurio paspausta pele (pagal piešinio ribas)
  npcAt(x, y) {
    return this.npcs.find((npc) => !npc.hidden && npc.sprite.getBounds().contains(x, y)) ?? null;
  }

  get(id) {
    return this.npcs.find((n) => n.id === id);
  }

  // NPC pasisuka į žaidėją (pokalbio metu)
  faceToward(npc, x, y) {
    const dx = x - npc.sprite.x;
    const dy = y - npc.sprite.y;
    if (Math.abs(dx) >= Math.abs(dy)) npc.facing = dx > 0 ? 'right' : 'left';
    else npc.facing = dy > 0 ? 'down' : 'up';
    this.idle(npc);
  }
}
