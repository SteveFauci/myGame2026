import { getItemDefinition } from '../data/items.js';
import Inventory from './Inventory.js';

export default class ShopInventory {
  constructor(shopDefinition, playerState) {
    this.shopDefinition = shopDefinition;
    this.stats = { ...playerState.stats };
    this.inventory = new Inventory(20).load(playerState.inventory);
    this.currentWeaponId = playerState.currentWeaponId;
    this.currentWeaponSlotId = playerState.currentWeaponSlotId ?? null;
    this.currentShieldId = playerState.currentShieldId;
    this.currentShieldSlotId = playerState.currentShieldSlotId ?? null;
    this.currentLightId = playerState.currentLightId ?? null;
    this.currentLightSlotId = playerState.currentLightSlotId ?? null;
  }

  getPlayerState() {
    return {
      stats: { ...this.stats },
      inventory: this.inventory.toJSON(),
      currentWeaponId: this.currentWeaponId,
      currentWeaponSlotId: this.currentWeaponSlotId,
      currentShieldId: this.currentShieldId,
      currentShieldSlotId: this.currentShieldSlotId,
      currentLightId: this.currentLightId,
      currentLightSlotId: this.currentLightSlotId,
    };
  }

  getStockSlot(index) {
    return this.shopDefinition.stock[index] ?? null;
  }

  buy(index) {
    const stockSlot = this.getStockSlot(index);
    const item = getItemDefinition(stockSlot?.itemId);

    if (!item) {
      return { ok: false, message: 'Nothing selected.' };
    }

    if (item.price > this.stats.coin) {
      return { ok: false, message: 'You need more coins to buy that!' };
    }

    if (!this.inventory.canAdd(item.id)) {
      return { ok: false, message: 'You cannot carry anymore!' };
    }

    this.stats.coin -= item.price;
    this.inventory.add(item.id, stockSlot.amount ?? 1);

    return { ok: true, message: `Bought ${item.name}.` };
  }

  sell(index) {
    const slot = this.inventory.get(index);
    const item = getItemDefinition(slot?.itemId);

    if (!item) {
      return { ok: false, message: 'Nothing selected.' };
    }

    if (this.isEquippedSlot(slot?.slotId)) {
      return { ok: false, message: 'You cannot sell an equipped item!' };
    }

    if (item.sellable === false) {
      return { ok: false, message: 'This treasure cannot be sold.' };
    }

    const price = this.getSellPrice(index);
    if (!this.inventory.removeOne(index)) {
      return { ok: false, message: 'Nothing selected.' };
    }

    this.stats.coin += price;
    return { ok: true, message: `Sold ${item.name}.` };
  }

  getBuyPrice(index) {
    const item = getItemDefinition(this.getStockSlot(index)?.itemId);
    return item?.price ?? null;
  }

  getSellPrice(index) {
    const item = getItemDefinition(this.inventory.get(index)?.itemId);
    return item && item.sellable !== false ? Math.floor(item.price / 2) : null;
  }

  isEquippedSlot(slotId) {
    return Boolean(
      slotId
        && (slotId === this.currentWeaponSlotId
          || slotId === this.currentShieldSlotId
          || slotId === this.currentLightSlotId),
    );
  }

  isEquipped(itemId) {
    return Boolean(
      itemId
      && this.inventory.slots.some((slot) => slot.itemId === itemId && this.isEquippedSlot(slot.slotId)),
    );
  }
}
