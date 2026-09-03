export const CHAPTER_DEFINITIONS = Object.freeze({
  newbieVillage: {
    id: 'newbieVillage',
    name: 'Newbie Village',
    mapKey: 'worldV3',
    objectiveTitle: 'Meet the Old Man',
    objectiveText: 'Talk to the old man beside the road.',
    clearTitle: 'Village Errand Done',
    clearText: 'The old man points you toward the grove.',
    type: 'talkNpc',
    npcTypeName: 'NPC_OldMan',
    unlocks: [],
  },
  slimeGrove: {
    id: 'slimeGrove',
    name: 'Slime Grove',
    mapKey: 'worldV3',
    objectiveTitle: 'Clear the Grove',
    objectiveText: 'Defeat the three slimes near the southern grove.',
    clearTitle: 'Grove Cleared',
    clearText: 'The path to the dungeon is now open.',
    type: 'defeatMarkedEnemies',
    enemyTargets: Object.freeze([
      { typeName: 'MON_GreenSlime', x: 21, y: 38 },
      { typeName: 'MON_GreenSlime', x: 23, y: 42 },
      { typeName: 'MON_GreenSlime', x: 24, y: 37 },
    ]),
    unlocks: ['dungeon'],
  },
  dungeon: {
    id: 'dungeon',
    name: 'Dungeon',
    mapKey: 'mydungeon01',
    objectiveTitle: 'Open the Iron Gate',
    objectiveText: 'Push the three big rocks onto the metal plates, then take the stairs deeper.',
    clearTitle: 'Dungeon Cleared',
    clearText: 'The boss gate begins to stir.',
    type: 'platePuzzle',
    lightingMode: 'permanentNight',
    unlocks: ['bossGate'],
  },
  bossGate: {
    id: 'bossGate',
    name: 'Boss Gate',
    mapKey: 'mydungeon02',
    objectiveTitle: 'Defeat the Skeleton Lord',
    objectiveText: 'Find the Skeleton Lord, survive the duel, then claim the Blue Heart.',
    clearTitle: 'Gate Cleared',
    clearText: 'The boss is no more.',
    type: 'bossEncounter',
    lightingMode: 'permanentNight',
    enemyTargets: Object.freeze([
      { typeName: 'MON_SkeletonLord', x: 23, y: 16 },
    ]),
    unlocks: [],
  },
});

export function getChapterDefinition(chapterId) {
  return CHAPTER_DEFINITIONS[chapterId] ?? null;
}
