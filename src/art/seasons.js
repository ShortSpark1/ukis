// =====================================================================
//  SEZONŲ IŠVAIZDA
//  Kiekvienam sezonui – savos žolės, lapų ir gėlių spalvos.
//  Sezoniniai piešiniai turi raktus su priesaga, pvz. 'grass_0@winter'.
//  Vasaros spalvos – tokios pat, kaip buvo iki sezonų atsiradimo.
// =====================================================================

export const SEASON_KEYS = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_LOOK = {
  spring: {
    grass: 0x62ab3e, grassDark: 0x427f2a, grassLight: 0x8fd060, blade1: 0x3b7526, blade2: 0x8ad05c,
    leaves: 0x55ad44, blossom: 0xffb7d5, bush: 0x45963a, flowers: 1, snow: false,
  },
  summer: {
    grass: 0x5a9c3a, grassDark: 0x3f7f2a, grassLight: 0x7cc04f, blade1: 0x3b7526, blade2: 0x86c95a,
    leaves: 0x3f8f36, bush: 0x3b8a35, flowers: 0.7, snow: false,
  },
  autumn: {
    grass: 0x8f9a40, grassDark: 0x6a7028, grassLight: 0xb8b45a, blade1: 0x6a6a24, blade2: 0xc2b25a,
    leaves: 0xd2702a, leaves2: 0xe8a33a, bush: 0xb0652a, flowers: 0.35, snow: false,
  },
  winter: {
    grass: 0xe9eff6, grassDark: 0xc3d0e0, grassLight: 0xffffff, blade1: 0x5f7f52, blade2: 0xd6e2ee,
    leaves: null, bush: 0xe9eff6, flowers: 0, snow: true,
  },
};

// Sezoninio piešinio raktas, pvz. sk('grass_0', 'winter') → 'grass_0@winter'
export const sk = (base, season) => `${base}@${season}`;
