export const WORLD_MAP_HIDDEN_LABEL = 'Undiscovered';

export function normalizeWorldMapHiddenLabel(value) {
  return typeof value === 'string' && value.length > 0 ? value : WORLD_MAP_HIDDEN_LABEL;
}

const WORLD_NODE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'village',
    label: 'Newbie Village',
    x: 360,
    y: 470,
    icon: 'world-hut',
    unlockedByDefault: true,
    discoveredByDefault: true,
    chapterId: 'newbieVillage',
    chapterName: 'Newbie Village',
    spawn: Object.freeze({ col: 23, row: 21 }),
  }),
  Object.freeze({
    id: 'slimeGrove',
    label: 'Slime Grove',
    x: 730,
    y: 470,
    icon: 'world-slime-1',
    unlockedByDefault: true,
    discoveredByDefault: true,
    chapterId: 'slimeGrove',
    chapterName: 'Slime Grove',
    spawn: Object.freeze({ col: 20, row: 36 }),
  }),
  Object.freeze({
    id: 'fieldShop',
    label: 'Field Shop',
    hiddenLabel: WORLD_MAP_HIDDEN_LABEL,
    x: 252,
    y: 612,
    icon: 'world-hut',
    unlockedByDefault: false,
    discoveredByDefault: false,
    entry: Object.freeze({
      type: 'shop',
      scene: 'ShopScene',
      shopId: 'fieldShop',
    }),
  }),
  Object.freeze({
    id: 'dungeon',
    label: 'Dungeon',
    x: 1118,
    y: 470,
    icon: 'world-stairs',
    unlockedByDefault: false,
    discoveredByDefault: true,
    chapterId: 'dungeon',
    chapterName: 'Dungeon',
    spawn: Object.freeze({ col: 9, row: 41 }),
  }),
  Object.freeze({
    id: 'bossGate',
    label: 'Boss Gate',
    x: 1320,
    y: 696,
    icon: 'world-door-iron',
    unlockedByDefault: false,
    discoveredByDefault: true,
    chapterId: 'bossGate',
    chapterName: 'Boss Gate',
    spawn: Object.freeze({ col: 26, row: 41 }),
  }),
]);

const WORLD_PATH_DEFINITIONS = Object.freeze([
  Object.freeze(['village', 'fieldShop']),
  Object.freeze(['village', 'slimeGrove']),
  Object.freeze(['fieldShop', 'slimeGrove']),
  Object.freeze(['slimeGrove', 'dungeon']),
  Object.freeze(['dungeon', 'bossGate']),
]);

const WORLD_MARKER_DEFINITIONS = Object.freeze([]);

export const WORLD_MAP_WIDTH = 1536;
export const WORLD_MAP_HEIGHT = 960;
export const WORLD_MAP_TILE_SIZE = 48;

export const WORLD_NODES = WORLD_NODE_DEFINITIONS;
export const WORLD_PATHS = WORLD_PATH_DEFINITIONS;
export const WORLD_MARKERS = WORLD_MARKER_DEFINITIONS;

export function createWorldMapLayout() {
  return {
    width: WORLD_MAP_WIDTH,
    height: WORLD_MAP_HEIGHT,
    tileSize: WORLD_MAP_TILE_SIZE,
    nodes: WORLD_NODE_DEFINITIONS.map((node) => structuredClone(node)),
    paths: WORLD_PATH_DEFINITIONS.map((path) => [...path]),
    markers: WORLD_MARKER_DEFINITIONS.map((marker) => structuredClone(marker)),
  };
}

export function getWorldNode(nodeId) {
  return WORLD_NODE_DEFINITIONS.find((node) => node.id === nodeId) ?? null;
}
