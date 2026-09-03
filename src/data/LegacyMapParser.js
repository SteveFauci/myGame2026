const ENTITY_CATEGORIES = new Set(['OBJ', 'NPC', 'MON', 'IT']);

export function parseLegacyMap(text) {
  const tileRows = [];
  const entities = [];
  let readingEntities = false;

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      return;
    }

    if (line === '#Entity') {
      readingEntities = true;
      return;
    }

    if (line.startsWith('#')) {
      return;
    }

    if (!readingEntities) {
      const tileIds = line.split(/\s+/).map(Number);

      if (tileIds.length > 0 && tileIds.every(Number.isInteger)) {
        tileRows.push(tileIds);
      }
      return;
    }

    const parts = line.split(',').map((part) => part.trim());
    const [category, typeName, xValue, yValue, extra = null] = parts;
    const x = Number(xValue);
    const y = Number(yValue);

    if (
      !ENTITY_CATEGORIES.has(category)
      || !typeName
      || !Number.isInteger(x)
      || !Number.isInteger(y)
    ) {
      return;
    }

    entities.push({
      category,
      typeName,
      x,
      y,
      extra: extra || null,
    });
  });

  return {
    tileRows,
    width: tileRows.reduce((width, row) => Math.max(width, row.length), 0),
    height: tileRows.length,
    entities,
  };
}
