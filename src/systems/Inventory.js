import { getItemDefinition } from '../data/items.js';

export default class Inventory {
  constructor(maxSlots = 20) {
    this.maxSlots = maxSlots;
    this.slots = [];
  }

  add(itemId, amount = 1) {
    const definition = getItemDefinition(itemId);

    if (!definition || amount <= 0) {
      return false;
    }

    if (definition.stackable) {
      const existing = this.slots.find((slot) => slot.itemId === itemId);

      if (existing) {
        existing.amount += amount;
        return true;
      }
    }

    if (this.slots.length >= this.maxSlots) {
      return false;
    }

    this.slots.push({ itemId, amount });
    return true;
  }

  get(index) {
    return this.slots[index] ?? null;
  }

  removeOne(index) {
    const slot = this.get(index);

    if (!slot) {
      return false;
    }

    slot.amount -= 1;
    if (slot.amount <= 0) {
      this.slots.splice(index, 1);
    }

    return true;
  }
}
