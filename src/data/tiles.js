const SOLID_TILE_IDS = new Set([
  0,
  1,
  ...Array.from({ length: 14 }, (_, index) => index + 12),
  40,
  41,
  43,
  44,
]);

export function isLegacyTileSolid(tileId) {
  return SOLID_TILE_IDS.has(Number(tileId));
}
