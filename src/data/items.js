export const ITEM_TYPES = Object.freeze({
  weapon: 'weapon',
  shield: 'shield',
  consumable: 'consumable',
  key: 'key',
  light: 'light',
  treasure: 'treasure',
});

export const ITEM_DEFINITIONS = Object.freeze({
  normalSword: {
    id: 'normalSword',
    name: 'Normal Sword',
    type: ITEM_TYPES.weapon,
    textureKey: 'item-normal-sword',
    attackValue: 1,
    attackWidth: 36,
    attackHeight: 36,
    knockBackPower: 2,
    description: 'An old sword.',
    price: 75,
  },
  axe: {
    id: 'axe',
    name: "Woodcutter's Axe",
    type: ITEM_TYPES.weapon,
    textureKey: 'item-axe',
    attackValue: 2,
    attackWidth: 30,
    attackHeight: 30,
    knockBackPower: 10,
    description: 'A bit rusty, but still useful.',
    price: 75,
  },
  pickaxe: {
    id: 'pickaxe',
    name: 'Pickaxe',
    type: ITEM_TYPES.weapon,
    textureKey: 'item-pickaxe',
    attackValue: 1,
    attackWidth: 30,
    attackHeight: 30,
    knockBackPower: 4,
    description: 'Breaks stone walls.',
    price: 120,
  },
  woodShield: {
    id: 'woodShield',
    name: 'Wood Shield',
    type: ITEM_TYPES.shield,
    textureKey: 'item-wood-shield',
    defenseValue: 1,
    description: 'A simple wooden shield.',
    price: 100,
  },
  blueShield: {
    id: 'blueShield',
    name: 'Blue Shield',
    type: ITEM_TYPES.shield,
    textureKey: 'item-blue-shield',
    defenseValue: 2,
    description: 'A shiny blue shield.',
    price: 50,
  },
  redPotion: {
    id: 'redPotion',
    name: 'Red Potion',
    type: ITEM_TYPES.consumable,
    textureKey: 'item-red-potion',
    value: 5,
    stackable: true,
    description: 'Restores 5 life.',
    price: 20,
  },
  tent: {
    id: 'tent',
    name: 'Tent',
    type: ITEM_TYPES.consumable,
    textureKey: 'item-tent',
    stackable: true,
    description: 'Restores life and mana.',
    price: 300,
  },
  lantern: {
    id: 'lantern',
    name: 'Lantern',
    type: ITEM_TYPES.light,
    textureKey: 'item-lantern',
    lightRadius: 350,
    description: 'Illuminates your surroundings.',
    price: 200,
  },
  key: {
    id: 'key',
    name: 'Key',
    type: ITEM_TYPES.key,
    textureKey: 'item-key',
    stackable: true,
    description: 'It opens a door.',
    price: 20,
  },
  blueHeart: {
    id: 'blueHeart',
    name: 'Blue Heart',
    type: ITEM_TYPES.treasure,
    textureKey: 'item-blue-heart',
    description: 'The legendary treasure of the Skeleton Lord.',
    price: 0,
    sellable: false,
  },
});

export const ITEM_ASSET_NAMES = Object.freeze({
  'item-normal-sword': 'sword_normal',
  'item-wood-shield': 'shield_wood',
  'item-blue-shield': 'shield_blue',
  'item-red-potion': 'potion_red',
  'item-key': 'key',
  'item-axe': 'axe',
  'item-pickaxe': 'pickaxe',
  'item-tent': 'tent',
  'item-lantern': 'lantern',
  'item-blue-heart': 'blueheart',
});

export function getItemAssetPath(itemOrTextureKey) {
  const textureKey = typeof itemOrTextureKey === 'string'
    ? itemOrTextureKey
    : itemOrTextureKey?.textureKey;
  const assetName = ITEM_ASSET_NAMES[textureKey];

  return assetName ? `/objects/${assetName}.png` : null;
}

export function getItemDefinition(itemId) {
  return ITEM_DEFINITIONS[itemId] ?? null;
}
