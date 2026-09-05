import { parseLegacyMap } from './LegacyMapParser.js';
import { isLegacyTileSolid } from './tiles.js';

const TILE_CONFIGS = Object.freeze([
  [0, 'voidimg', 'Void 0'],
  [1, 'voidimg', 'Void 1'],
  [2, 'stairs1', 'Stairs 1'],
  [3, 'stairs2', 'Stairs 2'],
  [4, 'spike', 'Spike'],
  [5, 'grass00', 'Grass 00 A'],
  [6, 'grass00', 'Grass 00 B'],
  [7, 'grass00', 'Grass 00 C'],
  [8, 'grass00', 'Grass 00 D'],
  [9, 'grass00', 'Grass 00 E'],
  [10, 'grass00', 'Grass 00 F'],
  [11, 'grass01', 'Grass 01'],
  [12, 'water00', 'Water 00'],
  [13, 'water01', 'Water 01'],
  [14, 'water02', 'Water 02'],
  [15, 'water03', 'Water 03'],
  [16, 'water04', 'Water 04'],
  [17, 'water05', 'Water 05'],
  [18, 'water06', 'Water 06'],
  [19, 'water07', 'Water 07'],
  [20, 'water08', 'Water 08'],
  [21, 'water09', 'Water 09'],
  [22, 'water10', 'Water 10'],
  [23, 'water11', 'Water 11'],
  [24, 'water12', 'Water 12'],
  [25, 'water13', 'Water 13'],
  [26, 'road00', 'Road 00'],
  [27, 'road01', 'Road 01'],
  [28, 'road02', 'Road 02'],
  [29, 'road03', 'Road 03'],
  [30, 'road04', 'Road 04'],
  [31, 'road05', 'Road 05'],
  [32, 'road06', 'Road 06'],
  [33, 'road07', 'Road 07'],
  [34, 'road08', 'Road 08'],
  [35, 'road09', 'Road 09'],
  [36, 'road10', 'Road 10'],
  [37, 'road11', 'Road 11'],
  [38, 'road12', 'Road 12'],
  [39, 'earth', 'Earth'],
  [40, 'wall', 'Wall'],
  [41, 'tree', 'Tree'],
  [42, 'hut', 'Hut'],
  [43, 'floor01', 'Floor 01'],
  [44, 'table01', 'Table 01'],
  [45, 'table02', 'Table 02'],
]);

export const LEGACY_TILE_DEFINITIONS = Object.freeze(
  TILE_CONFIGS.map(([id, assetName, label]) => Object.freeze({
    id,
    assetName,
    label,
    path: `/tiles/${assetName}.png`,
    solid: isLegacyTileSolid(id),
  })),
);

export const LEGACY_MAP_PRESETS = Object.freeze([
  Object.freeze({ key: 'worldV3', label: 'worldV3.txt', path: '/maps/worldV3.txt' }),
  Object.freeze({ key: 'mydungeon01', label: 'mydungeon01.txt', path: '/maps/mydungeon01.txt' }),
  Object.freeze({ key: 'mydungeon02', label: 'mydungeon02.txt', path: '/maps/mydungeon02.txt' }),
  Object.freeze({ key: 'blank', label: 'Blank map', path: null }),
]);

const ENTITY_CONFIGS = Object.freeze([
  {
    typeName: 'OBJ_Coin_Bronze',
    category: 'OBJ',
    label: 'Bronze Coin',
    path: '/objects/coin_bronze.png',
    previewScale: 0.9,
  },
  {
    typeName: 'OBJ_Heart',
    category: 'OBJ',
    label: 'Heart',
    path: '/objects/heart_full.png',
    previewScale: 0.9,
  },
  {
    typeName: 'OBJ_ManaCrystal',
    category: 'OBJ',
    label: 'Mana Crystal',
    path: '/objects/manacrystal_full.png',
    previewScale: 0.9,
  },
  {
    typeName: 'OBJ_Key',
    category: 'OBJ',
    label: 'Key',
    path: '/objects/key.png',
    previewScale: 0.9,
  },
  {
    typeName: 'OBJ_Potion_Red',
    category: 'OBJ',
    label: 'Red Potion',
    path: '/objects/potion_red.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Axe',
    category: 'OBJ',
    label: 'Axe',
    path: '/objects/axe.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Pickaxe',
    category: 'OBJ',
    label: 'Pickaxe',
    path: '/objects/pickaxe.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Lantern',
    category: 'OBJ',
    label: 'Lantern',
    path: '/objects/lantern.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Shield_Blue',
    category: 'OBJ',
    label: 'Blue Shield',
    path: '/objects/shield_blue.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Shield_Wood',
    category: 'OBJ',
    label: 'Wood Shield',
    path: '/objects/shield_wood.png',
    previewScale: 0.95,
  },
  {
    typeName: 'OBJ_Tent',
    category: 'OBJ',
    label: 'Tent',
    path: '/objects/tent.png',
    previewScale: 1,
  },
  {
    typeName: 'OBJ_Blueheart',
    category: 'OBJ',
    label: 'Blue Heart',
    path: '/objects/blueheart.png',
    previewScale: 1,
  },
  {
    typeName: 'OBJ_Door',
    category: 'OBJ',
    label: 'Door',
    path: '/objects/door.png',
    previewScale: 1,
  },
  {
    typeName: 'OBJ_Door_Iron',
    category: 'OBJ',
    label: 'Iron Door',
    path: '/objects/door_iron.png',
    previewScale: 1,
  },
  {
    typeName: 'OBJ_FieldShopHut',
    category: 'OBJ',
    label: 'Field Shop Hut',
    path: '/tiles/hut.png',
    previewScale: 1,
    extraMode: 'shopId',
    defaultExtra: 'fieldShop',
  },
  {
    typeName: 'OBJ_Chest',
    category: 'OBJ',
    label: 'Chest',
    path: '/objects/chest.png',
    previewScale: 1,
    extraMode: 'dropItem',
    defaultExtra: 'OBJ_Key',
    extraOptions: [
      'OBJ_Key',
      'OBJ_Tent',
      'OBJ_Potion_Red',
      'OBJ_Axe',
      'OBJ_Pickaxe',
      'OBJ_Lantern',
      'OBJ_Shield_Blue',
      'OBJ_Shield_Wood',
      'OBJ_Heart',
      'OBJ_ManaCrystal',
      'OBJ_Blueheart',
      'OBJ_Coin_Bronze',
    ],
  },
  {
    typeName: 'OBJ_AirWall',
    category: 'OBJ',
    label: 'Air Wall',
    path: '/objects/airwall.png',
    previewScale: 1,
  },
  {
    typeName: 'OBJ_Rock',
    category: 'OBJ',
    label: 'Rock',
    path: '/npc/bigrock.png',
    previewScale: 1.05,
  },
  {
    typeName: 'NPC_OldMan',
    category: 'NPC',
    label: 'Old Man',
    path: '/npc/oldman_down_1.png',
    previewScale: 1,
  },
  {
    typeName: 'NPC_BigRock',
    category: 'NPC',
    label: 'Big Rock',
    path: '/npc/bigrock.png',
    previewScale: 1.05,
  },
  {
    typeName: 'MON_GreenSlime',
    category: 'MON',
    label: 'Green Slime',
    path: '/monsters/greenslime_down_1.png',
    previewScale: 1,
  },
  {
    typeName: 'MON_RedSlime',
    category: 'MON',
    label: 'Red Slime',
    path: '/monsters/redslime_down_1.png',
    previewScale: 1,
  },
  {
    typeName: 'MON_Bat',
    category: 'MON',
    label: 'Bat',
    path: '/monsters/bat_down_1.png',
    previewScale: 1,
  },
  {
    typeName: 'MON_Orc',
    category: 'MON',
    label: 'Orc',
    path: '/monsters/orc_down_1.png',
    previewScale: 1.05,
  },
  {
    typeName: 'MON_SkeletonLord',
    category: 'MON',
    label: 'Skeleton Lord',
    path: '/monsters/skeletonlord_down_1.png',
    previewScale: 1.25,
  },
  {
    typeName: 'IT_DryTree',
    category: 'IT',
    label: 'Dry Tree',
    path: '/interactive/drytree.png',
    previewScale: 1,
  },
  {
    typeName: 'IT_DestructibleWall',
    category: 'IT',
    label: 'Destructible Wall',
    path: '/interactive/destructibleWall.png',
    previewScale: 1,
  },
  {
    typeName: 'IT_MetalPlate',
    category: 'IT',
    label: 'Metal Plate',
    path: '/interactive/metalplate.png',
    previewScale: 1,
  },
]);

export const LEGACY_ENTITY_DEFINITIONS = Object.freeze(
  Object.fromEntries(ENTITY_CONFIGS.map((definition) => [definition.typeName, Object.freeze({ ...definition })])),
);

export const LEGACY_ENTITY_GROUPS = Object.freeze([
  Object.freeze({
    category: 'OBJ',
    label: 'Objects',
    types: Object.freeze([
      'OBJ_Coin_Bronze',
      'OBJ_Heart',
      'OBJ_ManaCrystal',
      'OBJ_Key',
      'OBJ_Potion_Red',
      'OBJ_Axe',
      'OBJ_Pickaxe',
      'OBJ_Lantern',
      'OBJ_Shield_Blue',
      'OBJ_Shield_Wood',
      'OBJ_Tent',
      'OBJ_Blueheart',
      'OBJ_Door',
      'OBJ_Door_Iron',
      'OBJ_FieldShopHut',
      'OBJ_Chest',
      'OBJ_AirWall',
      'OBJ_Rock',
    ]),
  }),
  Object.freeze({
    category: 'NPC',
    label: 'NPC',
    types: Object.freeze([
      'NPC_OldMan',
      'NPC_BigRock',
    ]),
  }),
  Object.freeze({
    category: 'MON',
    label: 'Monsters',
    types: Object.freeze([
      'MON_GreenSlime',
      'MON_RedSlime',
      'MON_Bat',
      'MON_Orc',
      'MON_SkeletonLord',
    ]),
  }),
  Object.freeze({
    category: 'IT',
    label: 'Interactive',
    types: Object.freeze([
      'IT_DryTree',
      'IT_DestructibleWall',
      'IT_MetalPlate',
    ]),
  }),
]);

export const LEGACY_CHEST_DROP_OPTIONS = Object.freeze(
  LEGACY_ENTITY_DEFINITIONS.OBJ_Chest.extraOptions,
);

export const DEFAULT_LEVEL_EDITOR_MAP_WIDTH = 50;
export const DEFAULT_LEVEL_EDITOR_MAP_HEIGHT = 50;
export const DEFAULT_LEVEL_EDITOR_FILL_TILE_ID = 5;

export function getLegacyTileDefinition(tileId) {
  return LEGACY_TILE_DEFINITIONS.find((definition) => definition.id === Number(tileId)) ?? LEGACY_TILE_DEFINITIONS[0];
}

export function getLegacyTileAssetPath(tileId) {
  return getLegacyTileDefinition(tileId)?.path ?? LEGACY_TILE_DEFINITIONS[0].path;
}

export function getLegacyTileLabel(tileId) {
  return getLegacyTileDefinition(tileId)?.label ?? `Tile ${tileId}`;
}

export function getLegacyEntityDefinition(typeName) {
  return LEGACY_ENTITY_DEFINITIONS[typeName] ?? null;
}

export function getLegacyEntityGroup(category) {
  return LEGACY_ENTITY_GROUPS.find((group) => group.category === category) ?? null;
}

export function createBlankLegacyMap(
  width = DEFAULT_LEVEL_EDITOR_MAP_WIDTH,
  height = DEFAULT_LEVEL_EDITOR_MAP_HEIGHT,
  fillTileId = DEFAULT_LEVEL_EDITOR_FILL_TILE_ID,
) {
  const safeWidth = positiveIntegerOr(width, DEFAULT_LEVEL_EDITOR_MAP_WIDTH);
  const safeHeight = positiveIntegerOr(height, DEFAULT_LEVEL_EDITOR_MAP_HEIGHT);
  const safeFill = Number.isInteger(Number(fillTileId)) ? Number(fillTileId) : DEFAULT_LEVEL_EDITOR_FILL_TILE_ID;

  return {
    width: safeWidth,
    height: safeHeight,
    tileRows: Array.from({ length: safeHeight }, () => Array.from({ length: safeWidth }, () => safeFill)),
    entities: [],
  };
}

export function normalizeLegacyMap(input) {
  const source = input && typeof input === 'object' ? input : {};
  const width = positiveIntegerOr(source.width, DEFAULT_LEVEL_EDITOR_MAP_WIDTH);
  const height = positiveIntegerOr(source.height, DEFAULT_LEVEL_EDITOR_MAP_HEIGHT);
  const tileRows = Array.isArray(source.tileRows)
    ? normalizeTileRows(source.tileRows, width, height)
    : createBlankLegacyMap(width, height).tileRows;
  const entities = Array.isArray(source.entities)
    ? source.entities.map((entity, index) => normalizeLegacyEntity(entity, index))
    : [];

  return {
    width,
    height,
    tileRows,
    entities,
  };
}

export function normalizeLegacyEntity(entity, index = 0) {
  const typeName = typeof entity?.typeName === 'string' && entity.typeName
    ? entity.typeName
    : 'OBJ_Coin_Bronze';
  const definition = getLegacyEntityDefinition(typeName) ?? LEGACY_ENTITY_DEFINITIONS.OBJ_Coin_Bronze;
  const extra = typeof entity?.extra === 'string'
    ? entity.extra
    : typeof definition.defaultExtra === 'string'
      ? definition.defaultExtra
      : '';

  return {
    id: typeof entity?.id === 'string' && entity.id
      ? entity.id
      : `entity-${index + 1}`,
    category: typeof entity?.category === 'string' && entity.category
      ? entity.category
      : definition.category,
    typeName,
    x: positiveIntegerOr(entity?.x, 0),
    y: positiveIntegerOr(entity?.y, 0),
    extra,
  };
}

export function normalizeTileRows(tileRows, width, height) {
  return Array.from({ length: height }, (_, row) => {
    const sourceRow = Array.isArray(tileRows[row]) ? tileRows[row] : [];
    return Array.from({ length: width }, (_, col) => normalizeTileId(sourceRow[col]));
  });
}

export function normalizeTileId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_LEVEL_EDITOR_FILL_TILE_ID;
  }

  return parsed;
}

export function serializeLegacyMap(layout) {
  const normalized = normalizeLegacyMap(layout);
  const lines = normalized.tileRows.map((row) => row.map((tileId) => normalizeTileId(tileId)).join(' '));

  lines.push('#Entity');
  normalized.entities.forEach((entity) => {
    const parts = [
      entity.category,
      entity.typeName,
      String(entity.x),
      String(entity.y),
    ];

    if (typeof entity.extra === 'string' && entity.extra.trim().length > 0) {
      parts.push(entity.extra.trim());
    }

    lines.push(parts.join(','));
  });

  return lines.join('\n');
}

export function loadLegacyMapFromText(text) {
  return normalizeLegacyMap(parseLegacyMap(text));
}

function positiveIntegerOr(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
