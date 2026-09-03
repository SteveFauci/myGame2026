import { ITEM_TYPES, getItemDefinition } from './items.js';
import { PLAYER_PROGRESSION } from './progression.js';

const STORAGE_KEY = 'myGame2026.player.v1';
const MAX_INVENTORY_SLOTS = 20;

const DEFAULT_PLAYER_STATE = Object.freeze({
  stats: Object.freeze({
    level: PLAYER_PROGRESSION.initialLevel,
    exp: PLAYER_PROGRESSION.initialExperience,
    nextLevelExp: PLAYER_PROGRESSION.initialNextLevelExperience,
    maxLife: 6,
    life: 6,
    maxMana: 4,
    mana: 4,
    strength: 5,
    dexterity: 1,
    coin: 500,
  }),
  inventory: Object.freeze([
    Object.freeze({ itemId: 'normalSword', amount: 1 }),
    Object.freeze({ itemId: 'woodShield', amount: 1 }),
    Object.freeze({ itemId: 'key', amount: 1 }),
    Object.freeze({ itemId: 'redPotion', amount: 2 }),
  ]),
  currentWeaponId: 'normalSword',
  currentWeaponSlotId: null,
  currentShieldId: 'woodShield',
  currentShieldSlotId: null,
  currentLightId: null,
  currentLightSlotId: null,
});

let cachedState = null;

export function createDefaultPlayerState() {
  return cloneState(normalizePlayerState(DEFAULT_PLAYER_STATE));
}

export function loadPlayerState() {
  if (cachedState) {
    return cloneState(cachedState);
  }

  const fallback = createDefaultPlayerState();

  if (typeof window === 'undefined' || !window.localStorage) {
    cachedState = fallback;
    return cloneState(cachedState);
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    cachedState = normalizePlayerState(saved ?? fallback);
  } catch {
    cachedState = fallback;
  }

  return cloneState(cachedState);
}

export function savePlayerState(playerState) {
  cachedState = normalizePlayerState(playerState);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
    } catch {
      // Player persistence is helpful, but the game can run without browser storage.
    }
  }

  return cloneState(cachedState);
}

export function resetPlayerState() {
  cachedState = createDefaultPlayerState();

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures; callers still receive a clean in-memory state.
    }
  }

  return cloneState(cachedState);
}

function normalizePlayerState(playerState) {
  const normalized = {
    stats: normalizeStats(playerState?.stats),
    inventory: normalizeInventory(playerState?.inventory),
    currentWeaponId: playerState?.currentWeaponId,
    currentWeaponSlotId: playerState?.currentWeaponSlotId ?? null,
    currentShieldId: playerState?.currentShieldId,
    currentShieldSlotId: playerState?.currentShieldSlotId ?? null,
    currentLightId: playerState?.currentLightId ?? null,
    currentLightSlotId: playerState?.currentLightSlotId ?? null,
  };

  ensureInventoryItem(normalized.inventory, 'normalSword');
  ensureInventoryItem(normalized.inventory, 'woodShield');

  const weaponSlot = resolveEquippedSlot(
    normalized.inventory,
    normalized.currentWeaponId,
    normalized.currentWeaponSlotId,
    ITEM_TYPES.weapon,
    'normalSword',
  );
  normalized.currentWeaponId = weaponSlot?.itemId ?? 'normalSword';
  normalized.currentWeaponSlotId = weaponSlot?.slotId ?? findFirstSlotId(normalized.inventory, 'normalSword');

  const shieldSlot = resolveEquippedSlot(
    normalized.inventory,
    normalized.currentShieldId,
    normalized.currentShieldSlotId,
    ITEM_TYPES.shield,
    'woodShield',
  );
  normalized.currentShieldId = shieldSlot?.itemId ?? 'woodShield';
  normalized.currentShieldSlotId = shieldSlot?.slotId ?? findFirstSlotId(normalized.inventory, 'woodShield');

  const lightSlot = resolveEquippedSlot(
    normalized.inventory,
    normalized.currentLightId,
    normalized.currentLightSlotId,
    ITEM_TYPES.light,
    null,
  );
  normalized.currentLightId = lightSlot?.itemId ?? null;
  normalized.currentLightSlotId = lightSlot?.slotId ?? null;

  return normalized;
}

function normalizeStats(stats = {}) {
  const defaults = DEFAULT_PLAYER_STATE.stats;
  const normalized = {};

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    const value = Number(stats?.[key]);
    normalized[key] = Number.isFinite(value) ? value : defaultValue;
  });

  normalized.level = Math.max(1, Math.floor(normalized.level));
  normalized.exp = Math.max(0, Math.floor(normalized.exp));
  normalized.nextLevelExp = Math.max(1, Math.floor(normalized.nextLevelExp));
  normalized.maxLife = Math.max(1, Math.floor(normalized.maxLife));
  normalized.life = PhaserMathClamp(Math.floor(normalized.life), 0, normalized.maxLife);
  normalized.maxMana = Math.max(0, Math.floor(normalized.maxMana));
  normalized.mana = PhaserMathClamp(Math.floor(normalized.mana), 0, normalized.maxMana);
  normalized.coin = Math.max(0, Math.floor(normalized.coin));

  return normalized;
}

function normalizeInventory(slots = []) {
  const normalizedSlots = [];
  let nextSlotId = 1;

  const createSlotId = (itemId) => {
    const safeItemId = String(itemId ?? 'slot').replace(/[^a-zA-Z0-9_-]/g, '') || 'slot';
    return `${safeItemId}-${nextSlotId++}`;
  };
  const syncSlotIdCounter = (slotId) => {
    const match = String(slotId ?? '').match(/-(\d+)$/);
    if (!match) {
      return;
    }

    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      nextSlotId = Math.max(nextSlotId, value + 1);
    }
  };

  (Array.isArray(slots) ? slots : DEFAULT_PLAYER_STATE.inventory).forEach((slot) => {
    const definition = getItemDefinition(slot?.itemId);
    const amount = Math.max(1, Math.floor(Number(slot?.amount ?? 1)));
    const slotId = typeof slot?.slotId === 'string' && slot.slotId.length > 0
      ? slot.slotId
      : createSlotId(definition?.id);

    if (!definition) {
      return;
    }

    if (definition.stackable) {
      const existing = normalizedSlots.find((normalizedSlot) => normalizedSlot.itemId === definition.id);

      if (existing) {
        existing.amount += amount;
        return;
      }
    }

    if (normalizedSlots.length >= MAX_INVENTORY_SLOTS) {
      return;
    }

    normalizedSlots.push({ itemId: definition.id, amount, slotId });
    syncSlotIdCounter(slotId);
  });

  return normalizedSlots;
}

function ensureInventoryItem(slots, itemId) {
  if (slots.some((slot) => slot.itemId === itemId)) {
    return;
  }

  if (slots.length >= MAX_INVENTORY_SLOTS) {
    slots.splice(slots.length - 1, 1);
  }

  slots.push({ itemId, amount: 1, slotId: createSlotIdForSlots(slots, itemId) });
}

function createSlotIdForSlots(slots, itemId) {
  const prefix = String(itemId ?? 'slot').replace(/[^a-zA-Z0-9_-]/g, '') || 'slot';
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  const highest = slots.reduce((currentMax, slot) => {
    const match = String(slot?.slotId ?? '').match(pattern);
    if (!match) {
      return currentMax;
    }

    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(currentMax, value) : currentMax;
  }, 0);

  return `${prefix}-${highest + 1}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findFirstSlotId(slots, itemId) {
  return slots.find((slot) => slot.itemId === itemId)?.slotId ?? null;
}

function resolveEquippedSlot(slots, itemId, slotId, expectedType, fallbackItemId = null) {
  const bySlotId = slotId
    ? slots.find((slot) => slot.slotId === slotId && getItemDefinition(slot.itemId)?.type === expectedType)
    : null;
  if (bySlotId) {
    return bySlotId;
  }

  const byItemId = itemId
    ? slots.find((slot) => slot.itemId === itemId && getItemDefinition(slot.itemId)?.type === expectedType)
    : null;
  if (byItemId) {
    return byItemId;
  }

  if (!fallbackItemId) {
    return null;
  }

  return slots.find((slot) => slot.itemId === fallbackItemId && getItemDefinition(slot.itemId)?.type === expectedType) ?? null;
}

function isEquippedItemValid(slots, itemId, expectedType) {
  if (!itemId) {
    return false;
  }

  const definition = getItemDefinition(itemId);
  return Boolean(
    definition?.type === expectedType
      && slots.some((slot) => slot.itemId === itemId),
  );
}

function cloneState(playerState) {
  return {
    stats: { ...playerState.stats },
    inventory: playerState.inventory.map((slot) => ({ ...slot })),
    currentWeaponId: playerState.currentWeaponId,
    currentWeaponSlotId: playerState.currentWeaponSlotId ?? null,
    currentShieldId: playerState.currentShieldId,
    currentShieldSlotId: playerState.currentShieldSlotId ?? null,
    currentLightId: playerState.currentLightId ?? null,
    currentLightSlotId: playerState.currentLightSlotId ?? null,
  };
}

function PhaserMathClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
