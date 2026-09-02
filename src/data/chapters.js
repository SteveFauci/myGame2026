export const CHAPTERS = [
  {
    id: 'village',
    name: '新手村',
    x: 220,
    y: 280,
    nextId: 'shop',
    startUnlocked: true,
  },
  {
    id: 'shop',
    name: '商店',
    x: 400,
    y: 220,
    nextId: 'dungeon',
    startUnlocked: false,
  },
  {
    id: 'dungeon',
    name: '地牢',
    x: 600,
    y: 300,
    nextId: 'boss',
    startUnlocked: false,
  },
  {
    id: 'boss',
    name: 'Boss 关',
    x: 820,
    y: 220,
    nextId: null,
    startUnlocked: false,
  },
];

export const CHAPTER_BY_ID = Object.fromEntries(
  CHAPTERS.map((chapter) => [chapter.id, chapter]),
);

export function createDefaultProgress() {
  return Object.fromEntries(
    CHAPTERS.map((chapter) => [chapter.id, Boolean(chapter.startUnlocked)]),
  );
}

export function getChapterIndex(chapterId) {
  return CHAPTERS.findIndex((chapter) => chapter.id === chapterId);
}

export function getNextChapterId(chapterId) {
  return CHAPTER_BY_ID[chapterId]?.nextId ?? null;
}
