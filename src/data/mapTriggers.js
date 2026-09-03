export const MAP_TRIGGER_DEFINITIONS = Object.freeze({
  worldV3: Object.freeze([
    Object.freeze({
      id: 'dungeon-entrance',
      kind: 'chapter-entry',
      col: 12,
      row: 9,
      allowedChapterIds: Object.freeze(['newbieVillage', 'slimeGrove']),
      targetChapterId: 'dungeon',
      requiredNodeId: 'dungeon',
      bypassUnlock: true,
      discoverNodeId: 'dungeon',
      spawn: Object.freeze({ col: 9, row: 41 }),
      prompt: 'F: enter the dungeon',
    }),
  ]),
  mydungeon01: Object.freeze([
    Object.freeze({
      id: 'dungeon-return',
      kind: 'return-world-map',
      col: 9,
      row: 41,
      allowedChapterIds: Object.freeze(['dungeon']),
      prompt: 'F: return to the world map',
    }),
    Object.freeze({
      id: 'dungeon-exit',
      kind: 'complete-chapter',
      col: 8,
      row: 7,
      allowedChapterIds: Object.freeze(['dungeon']),
      requiresSolvedPuzzle: true,
      prompt: 'F: continue onward',
      lockedMessage: 'The iron gate is still closed.',
    }),
  ]),
  mydungeon02: Object.freeze([
    Object.freeze({
      id: 'boss-return-dungeon',
      kind: 'chapter-entry',
      col: 26,
      row: 41,
      allowedChapterIds: Object.freeze(['bossGate']),
      targetChapterId: 'dungeon',
      bypassUnlock: true,
      spawn: Object.freeze({ col: 8, row: 7 }),
      prompt: 'F: return to the dungeon',
    }),
    Object.freeze({
      id: 'skeleton-lord-cutscene',
      kind: 'boss-cutscene',
      col: 25,
      row: 26,
      allowedChapterIds: Object.freeze(['bossGate']),
      activation: 'touch',
    }),
  ]),
});

export function getMapTriggers(mapKey) {
  return MAP_TRIGGER_DEFINITIONS[mapKey] ?? [];
}
