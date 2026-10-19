// =====================================================================
//  PERSONAŽŲ „GYVUMAS“ STOVINT (bendra žaidėjui ir kaimynams)
// =====================================================================

// Stovint personažas kartais sumirksi: kas BLINK_EVERY ms – BLINK_MS ms užmerktos akys.
// offset – kad visi personažai nemirksėtų kartu. Jei tavo player.png neturi
// mirksėjimo kadro, tiesiog rodomas pirmasis kadras.
const BLINK_EVERY = 3900;
const BLINK_MS = 140;
export function idleFrame(sprite, facing, now, offset) {
  const blink = (now + offset) % BLINK_EVERY < BLINK_MS && sprite.texture.has(`${facing}_blink`);
  return blink ? `${facing}_blink` : `${facing}_0`;
}
