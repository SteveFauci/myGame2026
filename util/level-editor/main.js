import {
  DEFAULT_LEVEL_EDITOR_FILL_TILE_ID,
  DEFAULT_LEVEL_EDITOR_MAP_HEIGHT,
  DEFAULT_LEVEL_EDITOR_MAP_WIDTH,
  LEGACY_CHEST_DROP_OPTIONS,
  LEGACY_ENTITY_DEFINITIONS,
  LEGACY_ENTITY_GROUPS,
  LEGACY_MAP_PRESETS,
  LEGACY_TILE_DEFINITIONS,
  createBlankLegacyMap,
  getLegacyEntityDefinition,
  getLegacyTileAssetPath,
  getLegacyTileDefinition,
  getLegacyTileLabel,
  loadLegacyMapFromText,
  normalizeLegacyMap,
  normalizeTileId,
  serializeLegacyMap,
} from '../../src/data/levelEditorCatalog.js';
import './style.css';

const STORAGE_PREFIX = 'myGame2026.levelEditor';
const TILE_SIZE = 32;
const TILE_PALETTE_GROUPS = Object.freeze([
  Object.freeze({ label: 'Terrain', ids: Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) }),
  Object.freeze({ label: 'Water', ids: Object.freeze([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]) }),
  Object.freeze({ label: 'Road', ids: Object.freeze([26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37]) }),
  Object.freeze({ label: 'Decor', ids: Object.freeze([38, 39, 40, 41, 42, 43, 44, 45]) }),
]);

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="editor">
    <header class="toolbar">
      <div class="toolbar-group">
        <button type="button" data-action="tile-mode">Tile Mode</button>
        <button type="button" data-action="entity-mode">Entity Mode</button>
        <button type="button" data-action="erase">Eraser</button>
        <button type="button" data-action="fill-map">Fill Map</button>
        <button type="button" data-action="clear-map">Clear Map</button>
      </div>
      <div class="toolbar-group">
        <button type="button" data-action="undo">Undo</button>
        <button type="button" data-action="redo">Redo</button>
        <label>Brush <input type="range" data-setting="brush-size" min="1" max="5" step="1" value="1" /></label>
        <label><input type="checkbox" data-setting="grid" checked /> Grid</label>
        <label><input type="checkbox" data-setting="labels" checked /> Labels</label>
      </div>
      <div class="toolbar-group">
        <button type="button" data-action="new-blank">New Blank</button>
        <button type="button" data-action="save-draft">Save Draft</button>
        <button type="button" data-action="download-txt">Download TXT</button>
        <button type="button" data-action="copy-txt">Copy TXT</button>
        <label class="file-button">
          Open TXT
          <input type="file" data-action="import-file" accept=".txt,text/plain" />
        </label>
      </div>
      <div class="toolbar-group">
        <label>Map
          <select data-setting="map-select">
            ${LEGACY_MAP_PRESETS.map((preset) => `<option value="${escapeAttr(preset.key)}">${escapeHtml(preset.label)}</option>`).join('')}
          </select>
        </label>
      </div>
    </header>

    <main class="workspace">
      <section class="map-shell">
        <div class="viewport" id="viewport">
          <div id="stage" class="stage">
            <div id="tileLayer" class="tile-layer"></div>
            <div id="gridOverlay" class="grid-overlay"></div>
            <div id="entityLayer" class="entity-layer"></div>
            <div id="selectionLayer" class="selection-layer">
              <div id="selectionBox" class="selection-box"></div>
            </div>
          </div>
        </div>
        <div class="footer">
          <div><strong id="modeText">Tile Mode</strong> <span id="statusText"></span></div>
          <div id="mapInfoText">Loading...</div>
        </div>
      </section>

      <aside class="sidebar">
        <section class="panel">
          <h2>Map</h2>
          <div id="mapMeta" class="map-info"></div>
        </section>

        <section class="panel">
          <h2>Tile Palette</h2>
          <div id="tilePalette" class="palette"></div>
        </section>

        <section class="panel">
          <h2>Entity Palette</h2>
          <div id="entityPalette" class="palette"></div>
        </section>

        <section class="panel">
          <h2>Entities</h2>
          <div id="entityList" class="list"></div>
        </section>

        <section class="panel">
          <h2>Selection</h2>
          <div id="selectionSummary" class="summary">No selection.</div>
        </section>

        <section class="panel">
          <h2>Properties</h2>
          <div id="propertyPanel"></div>
        </section>

        <section class="panel">
          <h2>Raw TXT</h2>
          <textarea id="output" class="output" readonly></textarea>
        </section>
      </aside>
    </main>
  </div>
`;

const refs = {
  viewport: document.querySelector('#viewport'),
  stage: document.querySelector('#stage'),
  tileLayer: document.querySelector('#tileLayer'),
  gridOverlay: document.querySelector('#gridOverlay'),
  entityLayer: document.querySelector('#entityLayer'),
  selectionBox: document.querySelector('#selectionBox'),
  tilePalette: document.querySelector('#tilePalette'),
  entityPalette: document.querySelector('#entityPalette'),
  entityList: document.querySelector('#entityList'),
  selectionSummary: document.querySelector('#selectionSummary'),
  propertyPanel: document.querySelector('#propertyPanel'),
  output: document.querySelector('#output'),
  statusText: document.querySelector('#statusText'),
  modeText: document.querySelector('#modeText'),
  mapInfoText: document.querySelector('#mapInfoText'),
  mapMeta: document.querySelector('#mapMeta'),
  mapSelect: document.querySelector('[data-setting="map-select"]'),
  brushSizeInput: document.querySelector('[data-setting="brush-size"]'),
  gridToggle: document.querySelector('[data-setting="grid"]'),
  labelsToggle: document.querySelector('[data-setting="labels"]'),
};

let layout = createBlankLegacyMap(DEFAULT_LEVEL_EDITOR_MAP_WIDTH, DEFAULT_LEVEL_EDITOR_MAP_HEIGHT, DEFAULT_LEVEL_EDITOR_FILL_TILE_ID);
let activeMapKey = 'worldV3';
let activeMapLabel = 'worldV3.txt';
let selectedTileId = DEFAULT_LEVEL_EDITOR_FILL_TILE_ID;
let selectedCell = null;
let selectedEntityId = null;
let selectedEntityType = LEGACY_ENTITY_GROUPS[0].types[0];
let placementExtraValue = getDefaultEntityExtra(selectedEntityType);
let mode = 'tile';
let gridVisible = true;
let labelsVisible = true;
let brushSize = 1;
let history = [];
let historyIndex = -1;
let paintSession = null;
let dragSession = null;
let nextEntityId = 1;
let statusMessage = 'Loading map...';

bindToolbar();
bindStage();
bindKeyboard();
await boot();

async function boot() {
  try {
    const lastMapKey = window.localStorage.getItem(storageKey('last-map')) ?? 'worldV3';
    await loadMapByKey(lastMapKey, { preferDraft: true });
    setStatus('Ready.');
  } catch (error) {
    layout = createBlankLegacyMap();
    activeMapKey = 'blank';
    activeMapLabel = 'Blank map';
    history = [serializeLegacyMap(layout)];
    historyIndex = 0;
    setStatus(`Loaded blank map after a startup error: ${error?.message ?? 'unknown error'}.`);
  }

  renderAll();
}

function bindToolbar() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
  });

  refs.mapSelect.addEventListener('change', async () => {
    await loadMapByKey(refs.mapSelect.value, { preferDraft: true });
    renderAll();
  });

  refs.gridToggle.addEventListener('change', () => {
    gridVisible = refs.gridToggle.checked;
    renderStage();
    updateToolbarState();
  });

  refs.labelsToggle.addEventListener('change', () => {
    labelsVisible = refs.labelsToggle.checked;
    renderAll();
  });

  refs.brushSizeInput.addEventListener('input', () => {
    brushSize = Math.max(1, Number(refs.brushSizeInput.value) || 1);
    updateToolbarState();
  });

  document.querySelector('[data-action="import-file"]').addEventListener('change', importFile);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveDraftNow();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedEntityId) {
        event.preventDefault();
        deleteSelectedEntity();
      }
      return;
    }
  });

  window.addEventListener('beforeunload', persistDraft);
}

function bindStage() {
  refs.stage.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  refs.stage.addEventListener('pointerdown', handleStagePointerDown);
  refs.stage.addEventListener('pointermove', handleStagePointerMove);
  refs.stage.addEventListener('pointerup', handleStagePointerUp);
  refs.stage.addEventListener('pointercancel', handleStagePointerUp);
}

function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    if (event.key === '1') {
      setMode('tile');
    } else if (event.key === '2') {
      setMode('entity');
    }
  });
}

function handleAction(action) {
  switch (action) {
    case 'tile-mode':
      setMode('tile');
      break;
    case 'entity-mode':
      setMode('entity');
      break;
    case 'erase':
      setMode('tile');
      selectedTileId = 0;
      setStatus('Eraser selected.');
      renderAll();
      break;
    case 'fill-map':
      fillMap(selectedTileId);
      break;
    case 'clear-map':
      fillMap(0);
      break;
    case 'new-blank':
      loadNewBlankMap();
      break;
    case 'save-draft':
      saveDraftNow();
      break;
    case 'download-txt':
      downloadTxt();
      break;
    case 'copy-txt':
      copyTxt();
      break;
    case 'undo':
      undo();
      break;
    case 'redo':
      redo();
      break;
    default:
      break;
  }
}

async function loadMapByKey(mapKey, options = {}) {
  const key = mapKey || 'worldV3';
  const preset = LEGACY_MAP_PRESETS.find((item) => item.key === key) ?? LEGACY_MAP_PRESETS[0];
  const draft = options.preferDraft ? loadDraft(key) : null;

  if (draft) {
    setLayout(normalizeLegacyMap(draft), key, preset?.label ?? key, `Loaded draft for ${preset?.label ?? key}.`);
    return;
  }

  if (key === 'blank') {
    setLayout(createBlankLegacyMap(DEFAULT_LEVEL_EDITOR_MAP_WIDTH, DEFAULT_LEVEL_EDITOR_MAP_HEIGHT, selectedTileId), key, 'Blank map', 'Loaded a new blank map.');
    return;
  }

  if (!preset?.path) {
    setLayout(createBlankLegacyMap(), key, 'Blank map', 'Loaded a blank map.');
    return;
  }

  const response = await fetch(preset.path);
  if (!response.ok) {
    throw new Error(`Failed to load ${preset.path}`);
  }

  const text = await response.text();
  setLayout(loadLegacyMapFromText(text), key, preset.label, `Loaded ${preset.label}.`);
}

function loadNewBlankMap() {
  setLayout(createBlankLegacyMap(DEFAULT_LEVEL_EDITOR_MAP_WIDTH, DEFAULT_LEVEL_EDITOR_MAP_HEIGHT, selectedTileId), 'blank', 'Blank map', 'Created a new blank map.');
  refs.mapSelect.value = 'blank';
}

function setLayout(nextLayout, mapKey, mapLabel, message = 'Map loaded.') {
  layout = normalizeLegacyMap(nextLayout);
  activeMapKey = mapKey;
  activeMapLabel = mapLabel;
  selectedCell = layout.tileRows[0] ? { col: 0, row: 0 } : null;
  selectedEntityId = layout.entities[0]?.id ?? null;
  if (selectedEntityId) {
    const selected = findEntity(selectedEntityId);
    if (selected) {
      selectedEntityType = selected.typeName;
      placementExtraValue = getDefaultEntityExtra(selectedEntityType);
    }
  }
  refreshNextEntityId();
  history = [serializeLegacyMap(layout)];
  historyIndex = 0;
  window.localStorage.setItem(storageKey('last-map'), activeMapKey);
  persistDraft();
  setStatus(message);
  renderAll();
}

function refreshNextEntityId() {
  const maxId = layout.entities.reduce((max, entity) => {
    const match = typeof entity.id === 'string' ? entity.id.match(/^entity-(\d+)$/) : null;
    if (!match) {
      return max;
    }
    return Math.max(max, Number(match[1]));
  }, 0);
  nextEntityId = maxId + 1;
}

function loadDraft(mapKey) {
  try {
    const raw = window.localStorage.getItem(storageKey(`draft.${mapKey}`));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistDraft() {
  try {
    window.localStorage.setItem(storageKey(`draft.${activeMapKey}`), JSON.stringify(layout));
    refs.statusText.textContent = statusMessage;
  } catch {
    refs.statusText.textContent = 'Draft not saved';
  }
}

function saveDraftNow() {
  pushHistory('Saved draft.');
  persistDraft();
}

function copyTxt() {
  navigator.clipboard?.writeText(serializeLegacyMap(layout));
  setStatus('TXT copied to clipboard.');
}

function downloadTxt() {
  const blob = new Blob([serializeLegacyMap(layout)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeMapKey === 'blank' ? 'level' : activeMapKey}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus('TXT downloaded.');
}

function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const text = String(reader.result ?? '');
      const mapKey = createFileMapKey(file.name);
      const mapLabel = file.name;
      setLayout(loadLegacyMapFromText(text), mapKey, mapLabel, `Imported ${file.name}.`);
      refs.mapSelect.value = 'blank';
    } catch {
      setStatus('Import failed. The file was not a valid legacy txt map.');
      renderAll();
    }
  });
  reader.readAsText(file);
  event.target.value = '';
}

function createFileMapKey(fileName) {
  return `file:${String(fileName).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}`;
}

function setMode(nextMode) {
  mode = nextMode;
  selectedEntityId = null;
  paintSession = null;
  dragSession = null;
  setStatus(mode === 'tile' ? 'Tile mode.' : 'Entity mode.');
  renderAll();
}

function renderAll() {
  renderStage();
  renderTilePalette();
  renderEntityPalette();
  renderEntityList();
  renderSelectionSummary();
  renderPropertiesPanel();
  renderOutput();
  renderMapMeta();
  updateToolbarState();
  persistDraft();
}

function renderStage() {
  const widthPx = layout.width * TILE_SIZE;
  const heightPx = layout.height * TILE_SIZE;
  refs.stage.style.width = `${widthPx}px`;
  refs.stage.style.height = `${heightPx}px`;
  refs.stage.classList.toggle('is-entity-mode', mode === 'entity');
  refs.gridOverlay.classList.toggle('is-hidden', !gridVisible);
  refs.mapInfoText.textContent = `${layout.width} x ${layout.height} tiles • ${layout.entities.length} entities`;
  renderTileLayer();
  renderEntityLayer();
  renderSelectionBox();
}

function renderTileLayer() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < layout.height; row += 1) {
    for (let col = 0; col < layout.width; col += 1) {
      const tileId = normalizeTileId(layout.tileRows[row]?.[col]);
      const definition = getLegacyTileDefinition(tileId);
      const cell = document.createElement('div');
      cell.className = `tile-cell${definition.solid ? ' is-solid' : ''}`;
      if (selectedCell && selectedCell.col === col && selectedCell.row === row) {
        cell.classList.add('is-selected');
      }
      cell.style.left = `${col * TILE_SIZE}px`;
      cell.style.top = `${row * TILE_SIZE}px`;
      cell.style.backgroundImage = `url("${getLegacyTileAssetPath(tileId)}")`;
      cell.title = `${col}, ${row} • ${definition.label}`;
      fragment.appendChild(cell);
    }
  }

  refs.tileLayer.innerHTML = '';
  refs.tileLayer.appendChild(fragment);
}

function renderEntityLayer() {
  const fragment = document.createDocumentFragment();
  layout.entities.forEach((entity) => {
    const definition = getLegacyEntityDefinition(entity.typeName) ?? LEGACY_ENTITY_DEFINITIONS.OBJ_Coin_Bronze;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `entity-item${entity.id === selectedEntityId ? ' is-selected' : ''}${definition.category === 'MON' ? ' is-monster' : ''}${definition.category === 'IT' ? ' is-item' : ''}`;
    item.dataset.entityId = entity.id;
    item.style.left = `${entity.x * TILE_SIZE + TILE_SIZE / 2}px`;
    item.style.top = `${entity.y * TILE_SIZE + TILE_SIZE / 2}px`;
    item.title = `${definition.label} (${entity.x}, ${entity.y})`;

    const size = Math.round(TILE_SIZE * (definition.previewScale ?? 1));
    item.innerHTML = `
      <span class="entity-frame" style="width:${size}px;height:${size}px">
        <img alt="" src="${escapeAttr(definition.path)}" width="${size}" height="${size}" />
      </span>
      ${labelsVisible ? `<span class="entity-label">${escapeHtml(definition.label)}</span>` : ''}
    `;

    item.addEventListener('click', (event) => {
      event.stopPropagation();
      selectEntity(entity.id);
    });

    item.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      beginEntityDrag(event, entity.id);
    });

    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
      removeEntityById(entity.id);
    });

    fragment.appendChild(item);
  });

  refs.entityLayer.innerHTML = '';
  refs.entityLayer.appendChild(fragment);
}

function renderSelectionBox() {
  const cell = resolveSelectedCell();
  if (!cell) {
    refs.selectionBox.style.display = 'none';
    return;
  }

  refs.selectionBox.style.display = 'block';
  refs.selectionBox.style.left = `${cell.col * TILE_SIZE}px`;
  refs.selectionBox.style.top = `${cell.row * TILE_SIZE}px`;
  refs.selectionBox.style.width = `${TILE_SIZE}px`;
  refs.selectionBox.style.height = `${TILE_SIZE}px`;
}

function renderTilePalette() {
  refs.tilePalette.innerHTML = TILE_PALETTE_GROUPS.map((group) => `
    <section class="palette-group">
      <h3>${escapeHtml(group.label)}</h3>
      <div class="palette-grid">
        ${group.ids.map((tileId) => {
          const definition = getLegacyTileDefinition(tileId);
          return `
            <button type="button" class="palette-item${selectedTileId === tileId ? ' is-selected' : ''}" data-tile-id="${tileId}">
              <img alt="" src="${escapeAttr(definition.path)}" />
              <div class="palette-label">${escapeHtml(definition.label)}</div>
              <small>#${tileId}${definition.solid ? ' solid' : ''}</small>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `).join('');

  refs.tilePalette.querySelectorAll('[data-tile-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedTileId = Number(button.dataset.tileId);
      setMode('tile');
      setStatus(`Tile selected: ${getLegacyTileLabel(selectedTileId)}.`);
      renderAll();
    });
  });
}

function renderEntityPalette() {
  refs.entityPalette.innerHTML = LEGACY_ENTITY_GROUPS.map((group) => `
    <section class="palette-group">
      <h3>${escapeHtml(group.label)}</h3>
      <div class="palette-grid">
        ${group.types.map((typeName) => {
          const definition = getLegacyEntityDefinition(typeName);
          if (!definition) {
            return '';
          }

          const size = Math.round(44 * (definition.previewScale ?? 1));
          return `
            <button type="button" class="palette-item${selectedEntityType === typeName ? ' is-selected' : ''}" data-entity-type="${escapeAttr(typeName)}">
              <img alt="" src="${escapeAttr(definition.path)}" width="${size}" height="${size}" />
              <div class="palette-label">${escapeHtml(definition.label)}</div>
              <small>${escapeHtml(typeName)}</small>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `).join('');

  refs.entityPalette.querySelectorAll('[data-entity-type]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedEntityType = button.dataset.entityType;
      placementExtraValue = getDefaultEntityExtra(selectedEntityType);
      selectedEntityId = null;
      setMode('entity');
      setStatus(`Entity template selected: ${selectedEntityType}.`);
      renderAll();
    });
  });
}

function renderEntityList() {
  if (!layout.entities.length) {
    refs.entityList.innerHTML = '<div class="hint">No entities yet.</div>';
    return;
  }

  refs.entityList.innerHTML = layout.entities.map((entity) => {
    const definition = getLegacyEntityDefinition(entity.typeName);
    return `
      <button type="button" class="${entity.id === selectedEntityId ? 'is-selected' : ''}" data-entity-id="${escapeAttr(entity.id)}">
        <span>${escapeHtml(definition?.label ?? entity.typeName)}</span>
        <small>${entity.x}, ${entity.y}</small>
      </button>
    `;
  }).join('');

  refs.entityList.querySelectorAll('[data-entity-id]').forEach((button) => {
    button.addEventListener('click', () => selectEntity(button.dataset.entityId));
  });
}

function renderSelectionSummary() {
  if (selectedEntityId) {
    const entity = findEntity(selectedEntityId);
    const definition = entity ? getLegacyEntityDefinition(entity.typeName) : null;
    refs.selectionSummary.textContent = entity
      ? `${definition?.label ?? entity.typeName} @ (${entity.x}, ${entity.y})`
      : 'Selected entity not found.';
    return;
  }

  if (selectedCell) {
    const tileId = normalizeTileId(layout.tileRows[selectedCell.row]?.[selectedCell.col]);
    const tileDefinition = getLegacyTileDefinition(tileId);
    refs.selectionSummary.textContent = `Cell (${selectedCell.col}, ${selectedCell.row}) • ${tileDefinition.label}`;
    return;
  }

  refs.selectionSummary.textContent = 'No selection.';
}

function renderPropertiesPanel() {
  if (selectedEntityId) {
    const entity = findEntity(selectedEntityId);
    if (entity) {
      refs.propertyPanel.innerHTML = renderEntityForm(entity);
      bindEntityForm();
      return;
    }
  }

  if (mode === 'entity') {
    refs.propertyPanel.innerHTML = renderEntityTemplateForm();
    bindTemplateForm();
    return;
  }

  if (selectedCell) {
    refs.propertyPanel.innerHTML = renderTileForm(selectedCell);
    bindTileForm();
    return;
  }

  refs.propertyPanel.innerHTML = '<div class="hint">Pick a tile cell or entity on the map.</div>';
}

function renderTileForm(cell) {
  const tileId = normalizeTileId(layout.tileRows[cell.row]?.[cell.col]);
  const definition = getLegacyTileDefinition(tileId);

  return `
    <form id="tileForm" class="form-grid">
      <div class="field">
        <label>Cell X</label>
        <input name="col" type="number" value="${cell.col}" />
      </div>
      <div class="field">
        <label>Cell Y</label>
        <input name="row" type="number" value="${cell.row}" />
      </div>
      <div class="field">
        <label>Tile Id</label>
        <input name="tileId" type="number" value="${tileId}" />
      </div>
      <div class="field">
        <label>Tile Name</label>
        <input value="${escapeAttr(definition.label)}" disabled />
      </div>
      <div class="field full">
        <label>Solid</label>
        <input value="${definition.solid ? 'Yes' : 'No'}" disabled />
      </div>
    </form>
  `;
}

function renderEntityTemplateForm() {
  const definition = getLegacyEntityDefinition(selectedEntityType);
  return `
    <form id="entityTemplateForm" class="form-grid">
      <div class="field full">
        <label>Type</label>
        ${renderEntityTypeSelect(selectedEntityType, 'typeName')}
      </div>
      <div class="field">
        <label>Category</label>
        <input value="${escapeAttr(definition?.category ?? '')}" disabled />
      </div>
      <div class="field">
        <label>Extra</label>
        ${renderEntityExtraInput({
          typeName: selectedEntityType,
          value: placementExtraValue,
          name: 'extra',
        })}
      </div>
      <div class="field full">
        <label>Label</label>
        <input value="${escapeAttr(definition?.label ?? selectedEntityType)}" disabled />
      </div>
    </form>
  `;
}

function renderEntityForm(entity) {
  const definition = getLegacyEntityDefinition(entity.typeName);
  return `
    <form id="entityForm" class="form-grid">
      <div class="field full">
        <label>Type</label>
        ${renderEntityTypeSelect(entity.typeName, 'typeName')}
      </div>
      <div class="field">
        <label>Category</label>
        <input value="${escapeAttr(definition?.category ?? entity.category)}" disabled />
      </div>
      <div class="field">
        <label>X</label>
        <input name="x" type="number" value="${entity.x}" />
      </div>
      <div class="field">
        <label>Y</label>
        <input name="y" type="number" value="${entity.y}" />
      </div>
      <div class="field full">
        <label>Extra</label>
        ${renderEntityExtraInput({
          typeName: entity.typeName,
          value: entity.extra ?? '',
          name: 'extra',
        })}
      </div>
      <div class="field full checks">
        <button type="button" data-action="duplicate-entity">Duplicate</button>
        <button type="button" data-action="delete-entity">Delete</button>
      </div>
      <div class="field full">
        <label>Label</label>
        <input value="${escapeAttr(definition?.label ?? entity.typeName)}" disabled />
      </div>
    </form>
  `;
}

function renderEntityTypeSelect(currentTypeName, name) {
  return `
    <select name="${escapeAttr(name)}">
      ${LEGACY_ENTITY_GROUPS.map((group) => `
        <optgroup label="${escapeAttr(group.label)}">
          ${group.types.map((typeName) => {
            const definition = getLegacyEntityDefinition(typeName);
            if (!definition) {
              return '';
            }
            return `<option value="${escapeAttr(typeName)}"${typeName === currentTypeName ? ' selected' : ''}>${escapeHtml(definition.label)}</option>`;
          }).join('')}
        </optgroup>
      `).join('')}
    </select>
  `;
}

function renderEntityExtraInput({ typeName, value, name }) {
  const definition = getLegacyEntityDefinition(typeName);
  if (definition?.extraMode === 'dropItem') {
    return `
      <select name="${escapeAttr(name)}">
        ${LEGACY_CHEST_DROP_OPTIONS.map((option) => `<option value="${escapeAttr(option)}"${option === (value || definition.defaultExtra) ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}
      </select>
    `;
  }

  if (definition?.extraMode === 'shopId') {
    return `<input name="${escapeAttr(name)}" value="${escapeAttr(value || definition.defaultExtra || '')}" placeholder="fieldShop" />`;
  }

  return `<input value="${escapeAttr(value || 'None')}" disabled />`;
}

function bindTileForm() {
  const form = document.querySelector('#tileForm');
  if (!form) {
    return;
  }

  form.addEventListener('input', handleTileFormInput);
}

function bindTemplateForm() {
  const form = document.querySelector('#entityTemplateForm');
  if (!form) {
    return;
  }

  form.addEventListener('input', handleEntityTemplateInput);
  form.addEventListener('change', handleEntityTemplateInput);
}

function bindEntityForm() {
  const form = document.querySelector('#entityForm');
  if (!form) {
    return;
  }

  form.addEventListener('input', handleEntityFormInput);
  form.addEventListener('change', handleEntityFormInput);

  form.querySelector('[data-action="duplicate-entity"]')?.addEventListener('click', duplicateSelectedEntity);
  form.querySelector('[data-action="delete-entity"]')?.addEventListener('click', deleteSelectedEntity);
}

function handleTileFormInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  if (!selectedCell) {
    selectedCell = { col: 0, row: 0 };
  }

  switch (target.name) {
    case 'col':
      selectedCell.col = clampCell(Number(target.value), layout.width);
      renderAll();
      break;
    case 'row':
      selectedCell.row = clampCell(Number(target.value), layout.height);
      renderAll();
      break;
    case 'tileId':
      selectedTileId = normalizeTileId(target.value);
      layout.tileRows[selectedCell.row][selectedCell.col] = selectedTileId;
      setStatus('Updated tile.');
      pushHistory('Updated tile');
      renderAll();
      break;
    default:
      break;
  }
}

function handleEntityTemplateInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  if (target.name === 'typeName') {
    selectedEntityType = target.value;
    placementExtraValue = getDefaultEntityExtra(selectedEntityType);
    setStatus(`Entity template selected: ${selectedEntityType}.`);
    renderAll();
    return;
  }

  if (target.name === 'extra') {
    placementExtraValue = target.value;
    setStatus('Updated entity template extra.');
    renderAll();
  }
}

function handleEntityFormInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  const entity = findEntity(selectedEntityId);
  if (!entity) {
    return;
  }

  switch (target.name) {
    case 'typeName':
      updateEntityType(entity, target.value);
      break;
    case 'x':
      entity.x = clampCell(Number(target.value), layout.width);
      setStatus('Entity moved.');
      pushHistory('Moved entity');
      renderAll();
      break;
    case 'y':
      entity.y = clampCell(Number(target.value), layout.height);
      setStatus('Entity moved.');
      pushHistory('Moved entity');
      renderAll();
      break;
    case 'extra':
      entity.extra = target.value;
      setStatus('Entity extra updated.');
      pushHistory('Updated entity');
      renderAll();
      break;
    default:
      break;
  }
}

function updateEntityType(entity, typeName) {
  const definition = getLegacyEntityDefinition(typeName);
  if (!definition) {
    return;
  }

  entity.typeName = typeName;
  entity.category = definition.category;
  entity.extra = typeof definition.defaultExtra === 'string' ? definition.defaultExtra : '';
  selectedEntityType = typeName;
  placementExtraValue = getDefaultEntityExtra(typeName);
  pushHistory('Changed entity type');
  renderAll();
}

function handleStagePointerDown(event) {
  if (event.button !== 0 || event.target.closest('.entity-item')) {
    return;
  }

  const cell = getCellFromPointer(event);
  if (!cell) {
    return;
  }

  if (mode === 'tile') {
    paintSession = {
      pointerId: event.pointerId,
      lastCell: cell,
      changed: false,
    };
    refs.stage.setPointerCapture(event.pointerId);
    paintBrushAtCell(cell.col, cell.row, selectedTileId);
    paintSession.changed = true;
    selectedCell = { ...cell };
    renderStage();
    return;
  }

  placeEntityAtCell(cell.col, cell.row, selectedEntityType, placementExtraValue);
  selectedCell = { ...cell };
  refs.stage.setPointerCapture(event.pointerId);
}

function handleStagePointerMove(event) {
  if (mode === 'tile' && paintSession && paintSession.pointerId === event.pointerId) {
    const cell = getCellFromPointer(event);
    if (!cell) {
      return;
    }

    if (paintSession.lastCell && paintSession.lastCell.col === cell.col && paintSession.lastCell.row === cell.row) {
      return;
    }

    paintLine(paintSession.lastCell, cell, selectedTileId);
    paintSession.lastCell = cell;
    paintSession.changed = true;
    selectedCell = { ...cell };
    renderStage();
    return;
  }

  if (dragSession && dragSession.pointerId === event.pointerId) {
    const cell = getCellFromPointer(event);
    if (!cell) {
      return;
    }

    moveEntityDuringDrag(cell.col, cell.row);
    selectedCell = { ...cell };
    renderStage();
  }
}

function handleStagePointerUp(event) {
  if (paintSession && paintSession.pointerId === event.pointerId) {
    if (paintSession.changed) {
      pushHistory('Painted tiles');
    }
    paintSession = null;
    renderAll();
  }

  if (dragSession && dragSession.pointerId === event.pointerId) {
    if (dragSession.moved) {
      pushHistory('Moved entity');
    }
    dragSession = null;
    renderAll();
  }
}

function beginEntityDrag(event, entityId) {
  const entity = findEntity(entityId);
  if (!entity) {
    return;
  }

  event.preventDefault();
  selectedEntityId = entityId;
  selectedEntityType = entity.typeName;
  placementExtraValue = getDefaultEntityExtra(entity.typeName);
  mode = 'entity';
  dragSession = {
    pointerId: event.pointerId,
    entityId,
    moved: false,
  };
  refs.stage.setPointerCapture(event.pointerId);
  renderAll();
}

function moveEntityDuringDrag(col, row) {
  if (!dragSession) {
    return;
  }

  const entity = findEntity(dragSession.entityId);
  if (!entity) {
    return;
  }

  const nextCol = clampCell(col, layout.width);
  const nextRow = clampCell(row, layout.height);
  if (entity.x === nextCol && entity.y === nextRow) {
    return;
  }

  entity.x = nextCol;
  entity.y = nextRow;
  dragSession.moved = true;
  selectedEntityId = entity.id;
}

function placeEntityAtCell(col, row, typeName, extra) {
  const definition = getLegacyEntityDefinition(typeName);
  if (!definition) {
    return;
  }

  const nextCol = clampCell(col, layout.width);
  const nextRow = clampCell(row, layout.height);
  removeEntitiesAtCell(nextCol, nextRow, true);
  const entity = {
    id: `entity-${nextEntityId++}`,
    category: definition.category,
    typeName,
    x: nextCol,
    y: nextRow,
    extra: normalizeEntityExtra(typeName, extra),
  };

  layout.entities.push(entity);
  selectedEntityId = entity.id;
  selectedEntityType = typeName;
  placementExtraValue = getDefaultEntityExtra(typeName);
  setStatus(`Placed ${definition.label}.`);
  pushHistory('Placed entity');
  renderAll();
}

function removeEntitiesAtCell(col, row, silent = false) {
  const before = layout.entities.length;
  layout.entities = layout.entities.filter((entity) => !(entity.x === col && entity.y === row));
  if (!silent && layout.entities.length !== before) {
    setStatus('Removed entity at cell.');
  }
  if (selectedEntityId && !findEntity(selectedEntityId)) {
    selectedEntityId = null;
  }
}

function removeEntityById(entityId) {
  const entity = findEntity(entityId);
  if (!entity) {
    return;
  }

  layout.entities = layout.entities.filter((entry) => entry.id !== entityId);
  if (selectedEntityId === entityId) {
    selectedEntityId = null;
  }
  setStatus(`Removed ${getLegacyEntityDefinition(entity.typeName)?.label ?? entity.typeName}.`);
  pushHistory('Removed entity');
  renderAll();
}

function deleteSelectedEntity() {
  if (!selectedEntityId) {
    return;
  }

  removeEntityById(selectedEntityId);
}

function duplicateSelectedEntity() {
  const entity = findEntity(selectedEntityId);
  if (!entity) {
    return;
  }

  const copy = {
    id: `entity-${nextEntityId++}`,
    category: entity.category,
    typeName: entity.typeName,
    x: clampCell(entity.x + 1, layout.width),
    y: clampCell(entity.y + 1, layout.height),
    extra: entity.extra,
  };

  layout.entities.push(copy);
  selectedEntityId = copy.id;
  selectedEntityType = copy.typeName;
  placementExtraValue = getDefaultEntityExtra(copy.typeName);
  setStatus('Duplicated entity.');
  pushHistory('Duplicated entity');
  renderAll();
}

function paintLine(firstCell, secondCell, tileId) {
  if (!firstCell || !secondCell) {
    return;
  }

  const points = getLineCells(firstCell.col, firstCell.row, secondCell.col, secondCell.row);
  points.forEach((point) => {
    paintBrushAtCell(point.col, point.row, tileId, true);
  });
}

function paintBrushAtCell(col, row, tileId, silent = false) {
  const radius = Math.floor(brushSize / 2);
  for (let y = row - radius; y <= row + radius; y += 1) {
    for (let x = col - radius; x <= col + radius; x += 1) {
      if (!isInsideMap(x, y)) {
        continue;
      }
      layout.tileRows[y][x] = normalizeTileId(tileId);
    }
  }

  selectedCell = { col, row };
  if (!silent) {
    setStatus(`Painted ${getLegacyTileLabel(tileId)}.`);
  }
}

function fillMap(tileId) {
  const normalized = normalizeTileId(tileId);
  for (let row = 0; row < layout.height; row += 1) {
    for (let col = 0; col < layout.width; col += 1) {
      layout.tileRows[row][col] = normalized;
    }
  }

  selectedCell = { col: 0, row: 0 };
  setStatus(`Filled map with ${getLegacyTileLabel(normalized)}.`);
  pushHistory('Filled map');
  renderAll();
}

function undo() {
  if (historyIndex <= 0) {
    setStatus('Nothing to undo.');
    return;
  }

  historyIndex -= 1;
  layout = normalizeLegacyMap(JSON.parse(history[historyIndex]));
  refreshNextEntityId();
  normalizeSelectionAfterLoad();
  setStatus('Undid last change.');
  renderAll();
}

function redo() {
  if (historyIndex >= history.length - 1) {
    setStatus('Nothing to redo.');
    return;
  }

  historyIndex += 1;
  layout = normalizeLegacyMap(JSON.parse(history[historyIndex]));
  refreshNextEntityId();
  normalizeSelectionAfterLoad();
  setStatus('Redid change.');
  renderAll();
}

function pushHistory(message) {
  const snapshot = serializeLegacyMap(layout);
  if (history[historyIndex] === snapshot) {
    setStatus(message);
    persistDraft();
    return;
  }

  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);
  historyIndex = history.length - 1;
  setStatus(message);
  persistDraft();
}

function normalizeSelectionAfterLoad() {
  if (selectedEntityId && !findEntity(selectedEntityId)) {
    selectedEntityId = null;
  }

  if (selectedCell && !isInsideMap(selectedCell.col, selectedCell.row)) {
    selectedCell = null;
  }

  if (!selectedCell && layout.tileRows[0]) {
    selectedCell = { col: 0, row: 0 };
  }
}

function selectEntity(entityId) {
  const entity = findEntity(entityId);
  if (!entity) {
    return;
  }

  selectedEntityId = entityId;
  selectedEntityType = entity.typeName;
  placementExtraValue = getDefaultEntityExtra(entity.typeName);
  selectedCell = { col: entity.x, row: entity.y };
  mode = 'entity';
  setStatus(`Selected ${getLegacyEntityDefinition(entity.typeName)?.label ?? entity.typeName}.`);
  renderAll();
}

function findEntity(entityId) {
  return layout.entities.find((entity) => entity.id === entityId) ?? null;
}

function resolveSelectedCell() {
  if (selectedEntityId) {
    const entity = findEntity(selectedEntityId);
    if (entity) {
      return { col: entity.x, row: entity.y };
    }
  }

  return selectedCell;
}

function getCellFromPointer(event) {
  const rect = refs.stage.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const col = Math.floor(x / TILE_SIZE);
  const row = Math.floor(y / TILE_SIZE);

  if (!isInsideMap(col, row)) {
    return null;
  }

  return { col, row };
}

function isInsideMap(col, row) {
  return (
    Number.isInteger(col)
    && Number.isInteger(row)
    && col >= 0
    && row >= 0
    && col < layout.width
    && row < layout.height
  );
}

function clampCell(value, limit) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(parsed), 0), Math.max(0, limit - 1));
}

function getLineCells(x0, y0, x1, y1) {
  const points = [];
  let currentX = x0;
  let currentY = y0;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ col: currentX, row: currentY });
    if (currentX === x1 && currentY === y1) {
      break;
    }
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      currentX += sx;
    }
    if (doubled <= dx) {
      error += dx;
      currentY += sy;
    }
  }

  return points;
}

function getDefaultEntityExtra(typeName) {
  const definition = getLegacyEntityDefinition(typeName);
  return typeof definition?.defaultExtra === 'string' ? definition.defaultExtra : '';
}

function normalizeEntityExtra(typeName, value) {
  const definition = getLegacyEntityDefinition(typeName);
  if (!definition) {
    return '';
  }

  if (definition.extraMode === 'dropItem') {
    return LEGACY_CHEST_DROP_OPTIONS.includes(value) ? value : definition.defaultExtra ?? '';
  }

  if (definition.extraMode === 'shopId') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : (definition.defaultExtra ?? '');
  }

  return typeof value === 'string' ? value : '';
}

function updateToolbarState() {
  document.querySelectorAll('[data-action="tile-mode"], [data-action="entity-mode"]').forEach((button) => {
    button.classList.toggle('active', button.dataset.action === `${mode}-mode`);
  });
  refs.gridToggle.checked = gridVisible;
  refs.labelsToggle.checked = labelsVisible;
  refs.brushSizeInput.value = String(brushSize);
  refs.mapSelect.value = LEGACY_MAP_PRESETS.some((preset) => preset.key === activeMapKey) ? activeMapKey : 'blank';
  refs.modeText.textContent = mode === 'tile' ? 'Tile Mode' : 'Entity Mode';
}

function renderMapMeta() {
  refs.mapMeta.innerHTML = `
    <div><strong>Map</strong> ${escapeHtml(activeMapLabel)}</div>
    <div><strong>Size</strong> ${layout.width} x ${layout.height}</div>
    <div><strong>Tiles</strong> ${layout.width * layout.height}</div>
    <div><strong>Entities</strong> ${layout.entities.length}</div>
    <div><strong>Brush</strong> ${brushSize} x ${brushSize}</div>
  `;
}

function renderOutput() {
  refs.output.value = serializeLegacyMap(layout);
}

function setStatus(message) {
  statusMessage = message;
  refs.statusText.textContent = message;
}

function storageKey(suffix) {
  return `${STORAGE_PREFIX}.${suffix}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}
