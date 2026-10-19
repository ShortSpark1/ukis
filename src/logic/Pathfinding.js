import { isWalkable } from './WorldMap.js';

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
export function findPath(map, start, isGoal, maxNodes = 20000) {
  if (isGoal(start.x, start.y)) return [];

  const key = (x, y) => `${x},${y}`;
  const cameFrom = new Map([[key(start.x, start.y), null]]);
  const queue = [start];

  while (queue.length && cameFrom.size < maxNodes) {
    const cur = queue.shift();
    for (const { dx, dy } of STEPS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = key(nx, ny);
      if (cameFrom.has(k) || !isWalkable(map, nx, ny)) continue;
      cameFrom.set(k, cur);

      if (isGoal(nx, ny)) {
        // Atsekame kelią atgal iki pradžios
        const path = [{ x: nx, y: ny }];
        let prev = cur;
        while (prev && !(prev.x === start.x && prev.y === start.y)) {
          path.unshift(prev);
          prev = cameFrom.get(key(prev.x, prev.y));
        }
        return path;
      }
      queue.push({ x: nx, y: ny });
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
