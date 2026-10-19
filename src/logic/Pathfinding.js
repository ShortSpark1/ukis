import { isWalkable } from '../../shared/WorldMap.js';

// =====================================================================
//  KELIO PAIEŠKA (gryna logika)
//  Naudojame BFS („paieška į plotį“): nuo personažo langelio tikriname
//  kaimynus, tada jų kaimynus ir t.t., kol randame tikslą. Taip visada
//  randamas TRUMPIAUSIAS kelias, apeinantis vandenį, medžius ir namus.
// =====================================================================

const STEPS = [
  { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
];

// Grąžina langelių masyvą nuo pirmo žingsnio iki tikslo (be pradžios).
// [] – jau esame tiksle, null – kelio nėra.
// isGoal(x, y) – funkcija, kuri pasako, ar langelis tinka tikslui.
// maxNodes – kiek daugiausia langelių patikrinti (numatyta – visas pasaulis).
//
// Greičiui (pasaulis – 40 000 langelių) langelius žymime skaičiais
// (y * plotis + x), o „iš kur atėjome“ laikome skaičių masyve.
export function findPath(map, start, isGoal, maxNodes = Infinity) {
  if (isGoal(start.x, start.y)) return [];

  const w = map[0].length;
  const cameFrom = new Int32Array(w * map.length).fill(-1);
  const startId = start.y * w + start.x;
  cameFrom[startId] = startId;
  const queue = [startId];

  for (let head = 0; head < queue.length && head < maxNodes; head++) {
    const cur = queue[head];
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const { dx, dy } of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(map, nx, ny)) continue;
      const id = ny * w + nx;
      if (cameFrom[id] !== -1) continue;
      cameFrom[id] = cur;

      if (isGoal(nx, ny)) {
        // Atsekame kelią atgal iki pradžios
        const path = [];
        for (let p = id; p !== startId; p = cameFrom[p]) path.push({ x: p % w, y: Math.floor(p / w) });
        return path.reverse();
      }
      queue.push(id);
    }
  }
  return null;
}

// Ar du langeliai liečiasi (įskaitant įstrižai ir tą patį langelį)?
export function isWithinReach(a, b) {
  return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
}

// Kelias į patį langelį (jei ant jo galima užlipti), kitaip – šalia jo
export function pathToTile(map, start, target) {
  if (isWalkable(map, target.x, target.y)) {
    return findPath(map, start, (x, y) => x === target.x && y === target.y);
  }
  return pathNextTo(map, start, target);
}

// Kelias į bet kurį langelį šalia tikslo (iš kur jį galima pasiekti ranka)
export function pathNextTo(map, start, target) {
  return findPath(map, start, (x, y) => isWithinReach({ x, y }, target));
}
