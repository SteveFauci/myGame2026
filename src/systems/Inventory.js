import { getItemDefinition } from '../data/items.js';

export default class Inventory {
  constructor(maxSlots = 20) {
    this.maxSlots = maxSlots;
    this.slots = [];
    this.nextSlotId = 1;
  }

  load(slots = []) {
    this.slots = [];
    this.nextSlotId = 1;

    slots.forEach((slot) => {
      this.add(slot.itemId, slot.amount ?? 1, slot.slotId ?? null);
    });

    return this;
  }

  toJSON() {
    return this.slots.map((slot) => ({
      itemId: slot.itemId,
      amount: slot.amount,
      slotId: slot.slotId,
    }));
  }

  add(itemId, amount = 1, slotId = null) {
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

    const resolvedSlotId = slotId ?? this.createSlotId(itemId);
    this.slots.push({ itemId, amount, slotId: resolvedSlotId });
    this.syncSlotIdCounter(resolvedSlotId);
    return true;
  }

  canAdd(itemId) {
    const definition = getItemDefinition(itemId);

    if (!definition) {
      return false;
    }

    return Boolean(
      definition.stackable && this.slots.some((slot) => slot.itemId === itemId)
        || this.slots.length < this.maxSlots,
    );
  }

  get(index) {
    return this.slots[index] ?? null;
  }

  count(itemId) {
    return this.slots.reduce((total, slot) => (
      slot.itemId === itemId ? total + slot.amount : total
    ), 0);
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

  removeItem(itemId, amount = 1) {
    if (amount <= 0) {
      return true;
    }

    for (let index = 0; index < this.slots.length && amount > 0; index += 1) {
      const slot = this.slots[index];

      if (slot.itemId !== itemId) {
        continue;
      }

      const removed = Math.min(slot.amount, amount);
      slot.amount -= removed;
      amount -= removed;

      if (slot.amount <= 0) {
        this.slots.splice(index, 1);
        index -= 1;
      }
    }

    return amount === 0;
  }

  createSlotId(itemId) {
    const safeItemId = String(itemId ?? 'slot').replace(/[^a-zA-Z0-9_-]/g, '') || 'slot';
    return `${safeItemId}-${this.nextSlotId++}`;
  }

  syncSlotIdCounter(slotId) {
    const match = String(slotId ?? '').match(/-(\d+)$/);

    if (!match) {
      return;
    }

    this.nextSlotId = Math.max(this.nextSlotId, Number(match[1]) + 1);
  }
}
