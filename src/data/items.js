export const ITEM_TYPES = Object.freeze({
  weapon: 'weapon',
  shield: 'shield',
  consumable: 'consumable',
  key: 'key',
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
  key: {
    id: 'key',
    name: 'Key',
    type: ITEM_TYPES.key,
    textureKey: 'item-key',
    stackable: true,
    description: 'It opens a door.',
    price: 20,
  },
});

export function getItemDefinition(itemId) {
  return ITEM_DEFINITIONS[itemId] ?? null;
}
