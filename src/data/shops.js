export const SHOP_DEFINITIONS = Object.freeze({
  fieldShop: Object.freeze({
    id: 'fieldShop',
    name: 'Field Shop',
    merchantName: 'Merchant',
    greeting: Object.freeze([
      'He he, so you found me.',
      'I have some good stuff.',
      'Do you want to trade?',
    ]),
    farewell: 'Come again, hehe!',
    stock: Object.freeze([
      Object.freeze({ itemId: 'redPotion', amount: 1 }),
      Object.freeze({ itemId: 'key', amount: 1 }),
      Object.freeze({ itemId: 'normalSword', amount: 1 }),
      Object.freeze({ itemId: 'axe', amount: 1 }),
      Object.freeze({ itemId: 'woodShield', amount: 1 }),
      Object.freeze({ itemId: 'blueShield', amount: 1 }),
    ]),
  }),
});

export function getShopDefinition(shopId) {
  return SHOP_DEFINITIONS[shopId] ?? null;
}
