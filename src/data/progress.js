import { WORLD_NODES } from './worldMap.js';

const STORAGE_KEY = 'myGame2026.progress.v3';
const LEGACY_STORAGE_KEYS = Object.freeze([
  { key: 'myGame2026.progress.v2', hidesUndiscoveredNodes: false },
  { key: 'myGame2026.progress.v1', hidesUndiscoveredNodes: true },
]);
const SCHEMA_VERSION = 3;

function getDefaultProgress() {
  const unlockedNodeIds = WORLD_NODES
    .filter((node) => node.unlockedByDefault)
    .map((node) => node.id);
  const discoveredNodeIds = WORLD_NODES
    .filter((node) => node.discoveredByDefault !== false || node.unlockedByDefault)
    .map((node) => node.id);

  return {
    schemaVersion: SCHEMA_VERSION,
    discoveredNodeIds: unique(discoveredNodeIds),
    unlockedNodeIds: unique(unlockedNodeIds),
    completedChapterIds: [],
    bossDefeated: false,
    bossTreasureCollected: false,
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getWorldNode(nodeId) {
  return WORLD_NODES.find((node) => node.id === nodeId) ?? null;
}

function isHiddenByDefault(nodeId) {
  const node = getWorldNode(nodeId);
  return Boolean(node && node.discoveredByDefault === false && !node.unlockedByDefault);
}

function readSavedProgress() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storage = window.localStorage;
    if (!storage) {
      return null;
    }

    const current = storage.getItem(STORAGE_KEY);
    if (current) {
      return { data: current, isLegacy: false };
    }

    for (const legacyStorage of LEGACY_STORAGE_KEYS) {
      const legacy = storage.getItem(legacyStorage.key);
      if (legacy) {
        return { data: legacy, isLegacy: legacyStorage.hidesUndiscoveredNodes };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeProgress(progress, { isLegacy = false } = {}) {
  const fallback = getDefaultProgress();
  const savedUnlocked = Array.isArray(progress?.unlockedNodeIds) ? progress.unlockedNodeIds : [];
  const savedDiscovered = Array.isArray(progress?.discoveredNodeIds)
    ? progress.discoveredNodeIds
    : savedUnlocked;

  const discoveredNodeIds = unique([
    ...fallback.discoveredNodeIds,
    ...savedDiscovered.filter((nodeId) => !(isLegacy && isHiddenByDefault(nodeId))),
    ...savedUnlocked.filter((nodeId) => !(isLegacy && isHiddenByDefault(nodeId))),
  ]);
  const unlockedNodeIds = unique([
    ...fallback.unlockedNodeIds,
    ...savedUnlocked.filter((nodeId) => !(isLegacy && isHiddenByDefault(nodeId))),
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    discoveredNodeIds: unique([...discoveredNodeIds, ...unlockedNodeIds]),
    unlockedNodeIds,
    completedChapterIds: unique(
      Array.isArray(progress?.completedChapterIds) ? progress.completedChapterIds : [],
    ),
    bossDefeated: Boolean(progress?.bossDefeated),
    bossTreasureCollected: Boolean(progress?.bossTreasureCollected),
  };
}

export function loadProgress() {
  const fallback = getDefaultProgress();
  const saved = readSavedProgress();

  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved.data ?? 'null');

    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    const normalized = normalizeProgress(parsed, { isLegacy: saved.isLegacy });

    if (saved.isLegacy) {
      saveProgress(normalized);
    }

    return normalized;
  } catch {
    return fallback;
  }
}

export function saveProgress(progress) {
  const normalized = normalizeProgress(progress);

  if (typeof window !== 'undefined') {
    try {
      const storage = window.localStorage;
      if (storage) {
        storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch {
      // Progress persistence is optional; gameplay should continue if storage is blocked.
    }
  }

  return normalized;
}

export function completeChapterProgress(chapterId, unlockedNodeIds = [], discoveredNodeIds = unlockedNodeIds) {
  const progress = loadProgress();
  const newlyUnlockedNodeIds = unlockedNodeIds.filter(
    (nodeId) => !progress.unlockedNodeIds.includes(nodeId),
  );
  const newlyDiscoveredNodeIds = discoveredNodeIds.filter(
    (nodeId) => !progress.discoveredNodeIds.includes(nodeId),
  );

  progress.completedChapterIds = unique([
    ...progress.completedChapterIds,
    chapterId,
  ]);
  progress.unlockedNodeIds = unique([
    ...progress.unlockedNodeIds,
    ...unlockedNodeIds,
  ]);
  progress.discoveredNodeIds = unique([
    ...progress.discoveredNodeIds,
    ...discoveredNodeIds,
    ...unlockedNodeIds,
  ]);

  return {
    progress: saveProgress(progress),
    newlyUnlockedNodeIds,
    newlyDiscoveredNodeIds,
  };
}

export function markBossDefeated() {
  const progress = loadProgress();
  progress.bossDefeated = true;
  return saveProgress(progress);
}

export function markBossTreasureCollected() {
  const progress = loadProgress();
  progress.bossDefeated = true;
  progress.bossTreasureCollected = true;
  return saveProgress(progress);
}

export function revealWorldNode(nodeId) {
  const progress = loadProgress();
  const newlyDiscoveredNodeIds = progress.discoveredNodeIds.includes(nodeId) ? [] : [nodeId];
  const newlyUnlockedNodeIds = progress.unlockedNodeIds.includes(nodeId) ? [] : [nodeId];

  progress.discoveredNodeIds = unique([...progress.discoveredNodeIds, nodeId]);
  progress.unlockedNodeIds = unique([...progress.unlockedNodeIds, nodeId]);

  return {
    progress: saveProgress(progress),
    newlyDiscoveredNodeIds,
    newlyUnlockedNodeIds,
  };
}

export function isNodeDiscovered(progress, node) {
  return Boolean(
    node?.discoveredByDefault !== false
    || node?.unlockedByDefault
    || progress?.discoveredNodeIds?.includes(node?.id)
    || progress?.unlockedNodeIds?.includes(node?.id),
  );
}

export function isNodeUnlocked(progress, node) {
  return Boolean(
    node?.unlockedByDefault
    || progress?.unlockedNodeIds?.includes(node?.id),
  );
}
