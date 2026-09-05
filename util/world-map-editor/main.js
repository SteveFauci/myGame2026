import {
  WORLD_MAP_HIDDEN_LABEL,
  createWorldMapLayout,
  normalizeWorldMapHiddenLabel,
} from '../../src/data/worldMap.js';
import './style.css';

const STORAGE_KEY = 'myGame2026.worldMapEditor.draft.v1';
const ICON_SOURCES = Object.freeze({
  'world-hut': '/tiles/hut.png',
  'world-tree': '/tiles/tree.png',
  'world-slime-1': '/monsters/greenslime_down_1.png',
  'world-stairs': '/tiles/stairs1.png',
  'world-door-iron': '/objects/door_iron.png',
  'world-chest': '/objects/chest.png',
  'world-tent': '/objects/tent.png',
});
const NODE_ICON_OPTIONS = Object.freeze([
  ['world-hut', 'Hut'],
  ['world-tree', 'Tree'],
  ['world-slime-1', 'Slime'],
  ['world-stairs', 'Stairs'],
  ['world-door-iron', 'Door'],
  ['world-chest', 'Chest'],
  ['world-tent', 'Tent'],
]);
const MARKER_KIND_OPTIONS = Object.freeze([
  ['trigger', 'Trigger'],
  ['discover-node', 'Discover Node'],
  ['warp', 'Warp'],
  ['cutscene', 'Cutscene'],
  ['message', 'Message'],
]);

const app = document.querySelector('#app');

app.innerHTML = `
  <div class="editor">
    <header class="toolbar">
      <div class="toolbar-group">
        <button type="button" data-action="select">Select</button>
        <button type="button" data-action="path">Path</button>
        <button type="button" data-action="add-node">Add Node</button>
        <button type="button" data-action="add-marker">Add Marker</button>
        <button type="button" data-action="duplicate">Duplicate</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
      <div class="toolbar-group">
        <button type="button" data-action="undo">Undo</button>
        <button type="button" data-action="redo">Redo</button>
        <label><input type="checkbox" data-setting="snap" checked /> Snap</label>
        <label><input type="checkbox" data-setting="grid" checked /> Grid</label>
        <label>Grid <input type="number" data-setting="grid-size" min="8" step="8" value="48" /></label>
      </div>
      <div class="toolbar-group">
        <button type="button" data-action="copy-json">Copy JSON</button>
        <button type="button" data-action="download-json">Download JSON</button>
        <button type="button" data-action="reset">Reset</button>
        <label><input type="file" data-action="import-json" accept="application/json,.json" /></label>
      </div>
    </header>

    <main class="workspace">
      <section class="map-shell">
        <div class="stage-wrap">
          <div id="stage" class="stage">
            <svg id="pathsLayer" class="paths-layer"></svg>
            <div id="markersLayer" class="items-layer"></div>
            <div id="nodesLayer" class="items-layer"></div>
          </div>
        </div>
        <div class="footer">
          <div><strong id="modeText">Select</strong> <span id="statusText"></span></div>
          <div id="saveText">Draft saved locally</div>
        </div>
      </section>

      <aside class="sidebar">
        <section class="panel">
          <h2>Selection</h2>
          <div id="selectionSummary" class="summary">No item selected.</div>
        </section>

        <section class="panel">
          <h2>Properties</h2>
          <div id="propertyPanel"></div>
        </section>

        <section class="panel">
          <h2>Paths</h2>
          <div id="pathList" class="list"></div>
        </section>

        <section class="panel">
          <h2>Markers</h2>
          <div id="markerList" class="list"></div>
        </section>

        <textarea id="output" class="output" readonly></textarea>
      </aside>
    </main>
  </div>
`;

const refs = {
  stage: document.querySelector('#stage'),
  pathsLayer: document.querySelector('#pathsLayer'),
  markersLayer: document.querySelector('#markersLayer'),
  nodesLayer: document.querySelector('#nodesLayer'),
  selectionSummary: document.querySelector('#selectionSummary'),
  propertyPanel: document.querySelector('#propertyPanel'),
  pathList: document.querySelector('#pathList'),
  markerList: document.querySelector('#markerList'),
  output: document.querySelector('#output'),
  modeText: document.querySelector('#modeText'),
  statusText: document.querySelector('#statusText'),
  saveText: document.querySelector('#saveText'),
  snapToggle: document.querySelector('[data-setting="snap"]'),
  gridToggle: document.querySelector('[data-setting="grid"]'),
  gridSizeInput: document.querySelector('[data-setting="grid-size"]'),
};

let layout = normalizeLayout(loadDraft() ?? createWorldMapLayout());
let selectedKind = 'node';
let selectedId = layout.nodes[0]?.id ?? null;
let pathAnchorId = null;
let mode = 'select';
let snapEnabled = true;
let gridVisible = true;
let gridSize = layout.tileSize || 48;
let statusMessage = 'Ready.';
let history = [];
let historyIndex = -1;
let commitTimer = null;
let dragState = null;

history = [serializeLayout(layout)];
historyIndex = 0;

bindToolbar();
bindStage();
renderAll();

function bindToolbar() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
  });

  refs.snapToggle.addEventListener('change', () => {
    snapEnabled = refs.snapToggle.checked;
    renderStage();
  });

  refs.gridToggle.addEventListener('change', () => {
    gridVisible = refs.gridToggle.checked;
    renderStage();
  });

  refs.gridSizeInput.addEventListener('change', () => {
    gridSize = Math.max(8, Number(refs.gridSizeInput.value) || 48);
    renderStage();
  });

  document.querySelector('[data-action="import-json"]').addEventListener('change', importJson);

  document.addEventListener('keydown', (event) => {
    if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelected();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelected();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }

    if (event.key.toLowerCase() === 'n') {
      addNode();
      return;
    }

    if (event.key.toLowerCase() === 'm') {
      addMarker();
      return;
    }

    if (event.key.toLowerCase() === 'p') {
      setMode(mode === 'path' ? 'select' : 'path');
      return;
    }

    if (event.key === 'Escape') {
      pathAnchorId = null;
      if (mode === 'path') {
        setMode('select');
        return;
      }
      clearSelection();
      renderAll();
    }
  });

  window.addEventListener('beforeunload', persistDraft);
}

function bindStage() {
  refs.stage.addEventListener('pointerdown', (event) => {
    if (event.target === refs.stage) {
      if (mode === 'path') {
        pathAnchorId = null;
        setStatus('Path selection cleared.');
      } else {
        clearSelection();
      }
      renderAll();
    }
  });
}

function handleAction(action) {
  switch (action) {
    case 'select':
      setMode('select');
      break;
    case 'path':
      setMode('path');
      break;
    case 'add-node':
      addNode();
      break;
    case 'add-marker':
      addMarker();
      break;
    case 'duplicate':
      duplicateSelected();
      break;
    case 'delete':
      deleteSelected();
      break;
    case 'undo':
      undo();
      break;
    case 'redo':
      redo();
      break;
    case 'copy-json':
      copyJson();
      break;
    case 'download-json':
      downloadJson();
      break;
    case 'reset':
      resetLayout();
      break;
    case 'import-json':
      break;
    default:
      break;
  }
}

function setMode(nextMode) {
  mode = nextMode;
  if (mode !== 'path') {
    pathAnchorId = null;
  }
  setStatus(mode === 'path' ? 'Click two nodes to connect or remove a road.' : 'Drag nodes and markers.');
  renderAll();
}

function loadDraft() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    refs.saveText.textContent = 'Draft saved locally';
  } catch {
    refs.saveText.textContent = 'Draft not saved';
  }
}

function serializeLayout(value) {
  return JSON.stringify(value);
}

function cloneLayout(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLayout(input) {
  const fallback = createWorldMapLayout();
  const source = input && typeof input === 'object' ? input : fallback;

  const normalized = {
    width: numberOr(source.width, fallback.width),
    height: numberOr(source.height, fallback.height),
    tileSize: numberOr(source.tileSize, fallback.tileSize),
    nodes: Array.isArray(source.nodes)
      ? source.nodes.map((node, index) => normalizeNode(node, index))
      : cloneLayout(fallback.nodes),
    paths: Array.isArray(source.paths)
      ? source.paths.map((path) => normalizePath(path))
      : cloneLayout(fallback.paths),
    markers: Array.isArray(source.markers)
      ? source.markers.map((marker, index) => normalizeMarker(marker, index))
      : cloneLayout(fallback.markers ?? []),
  };

  normalized.nodes = dedupeById(normalized.nodes, 'node');
  normalized.markers = dedupeById(normalized.markers, 'marker');
  normalized.paths = normalized.paths.filter((path) => path && normalized.nodes.some((node) => node.id === path[0]) && normalized.nodes.some((node) => node.id === path[1]));
  return normalized;
}

function normalizeNode(node, index) {
  const spawn = node?.spawn && Number.isFinite(Number(node.spawn.col)) && Number.isFinite(Number(node.spawn.row))
    ? {
        col: Number(node.spawn.col),
        row: Number(node.spawn.row),
      }
    : null;
  const entry = node?.entry && typeof node.entry === 'object'
    ? {
        type: stringOr(node.entry.type, 'chapter'),
        scene: stringOr(node.entry.scene, ''),
        shopId: stringOr(node.entry.shopId, ''),
        returnNodeId: stringOr(node.entry.returnNodeId, ''),
      }
    : null;

  return {
    id: cleanId(node?.id) || `node-${index + 1}`,
    label: stringOr(node?.label, `Node ${index + 1}`),
    hiddenLabel: normalizeWorldMapHiddenLabel(node?.hiddenLabel),
    x: numberOr(node?.x, 0),
    y: numberOr(node?.y, 0),
    icon: stringOr(node?.icon, 'world-hut'),
    unlockedByDefault: Boolean(node?.unlockedByDefault),
    discoveredByDefault: node?.discoveredByDefault === false ? false : true,
    chapterId: stringOr(node?.chapterId, ''),
    chapterName: stringOr(node?.chapterName, ''),
    spawn,
    entry,
  };
}

function normalizeMarker(marker, index) {
  return {
    id: cleanId(marker?.id) || `marker-${index + 1}`,
    kind: stringOr(marker?.kind, 'trigger'),
    label: stringOr(marker?.label, `Marker ${index + 1}`),
    x: numberOr(marker?.x, 0),
    y: numberOr(marker?.y, 0),
    width: positiveNumberOr(marker?.width, 48),
    height: positiveNumberOr(marker?.height, 48),
    targetNodeId: stringOr(marker?.targetNodeId, ''),
    visible: marker?.visible !== false,
  };
}

function normalizePath(path) {
  if (!Array.isArray(path) || path.length < 2) {
    return null;
  }

  return [cleanId(path[0]), cleanId(path[1])].filter(Boolean);
}

function dedupeById(items, prefix) {
  const seen = new Set();
  const result = [];

  items.forEach((item, index) => {
    if (!item) {
      return;
    }

    let id = item.id || `${prefix}-${index + 1}`;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${item.id || prefix}-${suffix}`;
      suffix += 1;
    }

    seen.add(id);
    result.push({ ...item, id });
  });

  return result;
}

function cleanId(value) {
  return stringOr(value, '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stringOr(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function positiveNumberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function findNode(nodeId) {
  return layout.nodes.find((node) => node.id === nodeId) ?? null;
}

function findMarker(markerId) {
  return layout.markers.find((marker) => marker.id === markerId) ?? null;
}

function getSelectedItem() {
  if (selectedKind === 'marker') {
    return findMarker(selectedId);
  }

  return findNode(selectedId);
}

function clearSelection() {
  selectedKind = null;
  selectedId = null;
  pathAnchorId = null;
  setStatus('Selection cleared.');
}

function selectItem(kind, itemId) {
  selectedKind = kind;
  selectedId = itemId;
  setStatus(`${kind === 'node' ? 'Node' : 'Marker'} selected.`);
}

function renderAll() {
  renderStage();
  renderInspector();
  renderLists();
  renderOutput();
  updateToolbarState();
  persistDraft();
}

function renderStage() {
  refs.stage.style.width = `${layout.width}px`;
  refs.stage.style.height = `${layout.height}px`;
  refs.stage.style.setProperty('--grid-size', `${gridSize}px`);
  refs.stage.classList.toggle('no-grid', !gridVisible);
  refs.pathsLayer.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
  refs.pathsLayer.setAttribute('width', `${layout.width}`);
  refs.pathsLayer.setAttribute('height', `${layout.height}`);
  refs.pathsLayer.innerHTML = '';
  refs.markersLayer.innerHTML = '';
  refs.nodesLayer.innerHTML = '';

  layout.paths.forEach((path) => {
    const [fromId, toId] = path;
    const from = findNode(fromId);
    const to = findNode(toId);
    if (!from || !to) {
      return;
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('class', `path-line${isPathSelected(path) ? ' is-selected' : ''}`);
    refs.pathsLayer.appendChild(line);
  });

  layout.markers.forEach((marker) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `item marker${selectedKind === 'marker' && selectedId === marker.id ? ' is-selected' : ''}`;
    element.style.left = `${marker.x}px`;
    element.style.top = `${marker.y}px`;
    element.style.width = `${marker.width}px`;
    element.style.height = `${marker.height}px`;
    element.innerHTML = `
      <div class="marker-kind">${escapeHtml(marker.kind)}</div>
      <div class="marker-label">${escapeHtml(marker.label)}</div>
    `;
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      if (mode === 'path') {
        return;
      }
      selectItem('marker', marker.id);
      renderAll();
    });
    element.addEventListener('pointerdown', (event) => startDrag(event, 'marker', marker.id));
    refs.markersLayer.appendChild(element);
  });

  layout.nodes.forEach((node) => {
    const element = document.createElement('button');
    element.type = 'button';
    const isSelected = selectedKind === 'node' && selectedId === node.id;
    const isHidden = !isNodeVisible(node);
    const isPathAnchor = pathAnchorId === node.id;
    element.className = `item node${isSelected ? ' is-selected' : ''}${isHidden ? ' hidden' : ''}${isPathAnchor ? ' is-path-anchor' : ''}`;
    element.style.left = `${node.x}px`;
    element.style.top = `${node.y}px`;
    element.innerHTML = `
      <div class="node-chip">
        <img alt="" src="${escapeAttr(getIconSource(node.icon))}" />
      </div>
      <div class="label">${escapeHtml(getNodeLabel(node))}</div>
    `;
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      if (mode === 'path') {
        togglePathAnchor(node.id);
        return;
      }
      selectItem('node', node.id);
      renderAll();
    });
    element.addEventListener('pointerdown', (event) => startDrag(event, 'node', node.id));
    refs.nodesLayer.appendChild(element);
  });
}

function renderInspector() {
  const selected = getSelectedItem();
  const summaryParts = [
    `Mode: ${mode}`,
    `Nodes: ${layout.nodes.length}`,
    `Markers: ${layout.markers.length}`,
    `Paths: ${layout.paths.length}`,
  ];
  refs.selectionSummary.textContent = selected
    ? `${selectedKind === 'node' ? 'Node' : 'Marker'}: ${selected.id}`
    : 'No item selected.';
  refs.modeText.textContent = mode === 'path' ? 'Path mode' : 'Select mode';

  if (!selected) {
    refs.propertyPanel.innerHTML = `
      <div class="hint">Pick a node or marker on the map. Drag in select mode. In path mode, click two nodes to connect or remove a road.</div>
    `;
    refs.statusText.textContent = `${statusMessage} • ${summaryParts.join(' • ')}`;
    return;
  }

  if (selectedKind === 'marker') {
    refs.propertyPanel.innerHTML = renderMarkerForm(selected);
    bindMarkerForm();
  } else {
    refs.propertyPanel.innerHTML = renderNodeForm(selected);
    bindNodeForm();
  }

  refs.statusText.textContent = `${statusMessage} • ${summaryParts.join(' • ')}`;
}

function renderNodeForm(node) {
  return `
    <form id="nodeForm" class="form-grid">
      <div class="field">
        <label>Id</label>
        <input name="id" value="${escapeAttr(node.id)}" />
      </div>
      <div class="field">
        <label>Icon</label>
        <select name="icon">
          ${NODE_ICON_OPTIONS.map(([value, label]) => (
            `<option value="${escapeAttr(value)}"${value === node.icon ? ' selected' : ''}>${escapeHtml(label)}</option>`
          )).join('')}
        </select>
      </div>
      <div class="field full">
        <label>Label</label>
        <input name="label" value="${escapeAttr(node.label)}" />
      </div>
      <div class="field full">
        <label>Hidden Label</label>
        <input name="hiddenLabel" value="${escapeAttr(node.hiddenLabel ?? '')}" />
      </div>
      <div class="field">
        <label>X</label>
        <input name="x" type="number" value="${node.x}" />
      </div>
      <div class="field">
        <label>Y</label>
        <input name="y" type="number" value="${node.y}" />
      </div>
      <div class="field full checks">
        <label><input name="unlockedByDefault" type="checkbox"${node.unlockedByDefault ? ' checked' : ''} />Unlocked by default</label>
        <label><input name="discoveredByDefault" type="checkbox"${node.discoveredByDefault !== false ? ' checked' : ''} />Discovered by default</label>
      </div>
      <div class="field">
        <label>Chapter Id</label>
        <input name="chapterId" value="${escapeAttr(node.chapterId ?? '')}" />
      </div>
      <div class="field">
        <label>Chapter Name</label>
        <input name="chapterName" value="${escapeAttr(node.chapterName ?? '')}" />
      </div>
      <div class="field">
        <label>Spawn Col</label>
        <input name="spawnCol" type="number" value="${node.spawn?.col ?? ''}" />
      </div>
      <div class="field">
        <label>Spawn Row</label>
        <input name="spawnRow" type="number" value="${node.spawn?.row ?? ''}" />
      </div>
      <div class="field">
        <label>Entry Type</label>
        <select name="entryType">
          <option value=""${node.entry ? '' : ' selected'}>None</option>
          <option value="chapter"${node.entry?.type === 'chapter' ? ' selected' : ''}>Chapter</option>
          <option value="shop"${node.entry?.type === 'shop' ? ' selected' : ''}>Shop</option>
        </select>
      </div>
      <div class="field">
        <label>Entry Scene</label>
        <input name="entryScene" value="${escapeAttr(node.entry?.scene ?? '')}" />
      </div>
      <div class="field">
        <label>Shop Id</label>
        <input name="entryShopId" value="${escapeAttr(node.entry?.shopId ?? '')}" />
      </div>
      <div class="field full">
        <label>Summary</label>
        <textarea readonly>${escapeHtml(JSON.stringify(node, null, 2))}</textarea>
      </div>
    </form>
  `;
}

function renderMarkerForm(marker) {
  return `
    <form id="markerForm" class="form-grid">
      <div class="field">
        <label>Id</label>
        <input name="id" value="${escapeAttr(marker.id)}" />
      </div>
      <div class="field">
        <label>Kind</label>
        <select name="kind">
          ${MARKER_KIND_OPTIONS.map(([value, label]) => (
            `<option value="${escapeAttr(value)}"${value === marker.kind ? ' selected' : ''}>${escapeHtml(label)}</option>`
          )).join('')}
        </select>
      </div>
      <div class="field full">
        <label>Label</label>
        <input name="label" value="${escapeAttr(marker.label)}" />
      </div>
      <div class="field full">
        <label>Target Node Id</label>
        <input name="targetNodeId" value="${escapeAttr(marker.targetNodeId ?? '')}" />
      </div>
      <div class="field">
        <label>X</label>
        <input name="x" type="number" value="${marker.x}" />
      </div>
      <div class="field">
        <label>Y</label>
        <input name="y" type="number" value="${marker.y}" />
      </div>
      <div class="field">
        <label>Width</label>
        <input name="width" type="number" value="${marker.width}" />
      </div>
      <div class="field">
        <label>Height</label>
        <input name="height" type="number" value="${marker.height}" />
      </div>
      <div class="field full checks">
        <label><input name="visible" type="checkbox"${marker.visible ? ' checked' : ''} />Visible</label>
      </div>
      <div class="field full">
        <label>Summary</label>
        <textarea readonly>${escapeHtml(JSON.stringify(marker, null, 2))}</textarea>
      </div>
    </form>
  `;
}

function renderLists() {
  refs.pathList.innerHTML = layout.paths.length
    ? layout.paths.map((path, index) => {
      const [fromId, toId] = path;
      return `
        <button type="button" data-path-index="${index}">
          <span>${escapeHtml(labelForId(fromId))} <small>→</small> ${escapeHtml(labelForId(toId))}</span>
          <small>Delete</small>
        </button>
      `;
    }).join('')
    : '<div class="hint">No roads yet.</div>';

  refs.markerList.innerHTML = layout.markers.length
    ? layout.markers.map((marker) => `
        <button type="button" data-marker-id="${escapeAttr(marker.id)}">
          <span>${escapeHtml(marker.label)}</span>
          <small>${escapeHtml(marker.kind)}</small>
        </button>
      `).join('')
    : '<div class="hint">No markers yet.</div>';

  refs.pathList.querySelectorAll('[data-path-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.pathIndex);
      const removed = layout.paths.splice(index, 1);
      if (removed.length) {
        pushHistory('Removed road');
      }
      renderAll();
    });
  });

  refs.markerList.querySelectorAll('[data-marker-id]').forEach((button) => {
    button.addEventListener('click', () => {
      selectItem('marker', button.dataset.markerId);
      renderAll();
    });
  });
}

function renderOutput() {
  refs.output.value = JSON.stringify(layout, null, 2);
}

function updateToolbarState() {
  document.querySelectorAll('[data-action="select"], [data-action="path"]').forEach((button) => {
    button.classList.toggle('active', button.dataset.action === mode);
  });
  refs.snapToggle.checked = snapEnabled;
  refs.gridToggle.checked = gridVisible;
  refs.gridSizeInput.value = String(gridSize);
}

function bindNodeForm() {
  const form = document.querySelector('#nodeForm');
  if (!form) {
    return;
  }

  form.addEventListener('input', handleNodeFormInput);
}

function bindMarkerForm() {
  const form = document.querySelector('#markerForm');
  if (!form) {
    return;
  }

  form.addEventListener('input', handleMarkerFormInput);
}

function handleNodeFormInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  const node = findNode(selectedId);
  if (!node) {
    return;
  }

  const field = target.name;
  const oldId = node.id;

  switch (field) {
    case 'id':
      renameNode(oldId, cleanId(target.value));
      break;
    case 'label':
    case 'hiddenLabel':
    case 'chapterId':
    case 'chapterName':
    case 'icon':
      node[field] = target.value;
      break;
    case 'x':
    case 'y':
      node[field] = Number(target.value) || 0;
      break;
    case 'unlockedByDefault':
    case 'discoveredByDefault':
      node[field] = target.checked;
      break;
    case 'spawnCol':
    case 'spawnRow': {
      const nextValue = Number(target.value);
      if (!node.spawn) {
        node.spawn = { col: 0, row: 0 };
      }
      node.spawn[field === 'spawnCol' ? 'col' : 'row'] = Number.isFinite(nextValue) ? nextValue : 0;
      break;
    }
    case 'entryType':
      updateNodeEntry(node, target.value);
      break;
    case 'entryScene':
      if (!node.entry) {
        node.entry = { type: 'chapter', scene: '', shopId: '', returnNodeId: '' };
      }
      node.entry.scene = target.value;
      break;
    case 'entryShopId':
      if (!node.entry) {
        node.entry = { type: 'shop', scene: 'ShopScene', shopId: '', returnNodeId: '' };
      }
      node.entry.shopId = target.value;
      break;
    default:
      break;
  }

  queueCommit('Updated node');
  renderStage();
  renderOutput();
  updateToolbarState();
}

function handleMarkerFormInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
    return;
  }

  const marker = findMarker(selectedId);
  if (!marker) {
    return;
  }

  switch (target.name) {
    case 'id':
      renameMarker(marker.id, cleanId(target.value));
      break;
    case 'kind':
    case 'label':
    case 'targetNodeId':
      marker[target.name] = target.value;
      break;
    case 'x':
    case 'y':
    case 'width':
    case 'height':
      marker[target.name] = Number(target.value) || 0;
      break;
    case 'visible':
      marker.visible = target.checked;
      break;
    default:
      break;
  }

  queueCommit('Updated marker');
  renderStage();
  renderOutput();
  updateToolbarState();
}

function updateNodeEntry(node, entryType) {
  if (!entryType) {
    node.entry = null;
    return;
  }

  if (!node.entry) {
    node.entry = { type: entryType, scene: '', shopId: '', returnNodeId: '' };
  } else {
    node.entry.type = entryType;
  }

  if (entryType === 'shop') {
    node.entry.scene = node.entry.scene || 'ShopScene';
  }

  if (entryType === 'chapter') {
    node.entry.scene = node.entry.scene || 'GameScene';
  }
}

function renameNode(oldId, nextId) {
  const cleanNextId = nextId || makeUniqueId('node', layout.nodes, 'id');
  if (!cleanNextId || cleanNextId === oldId) {
    return;
  }

  if (layout.nodes.some((node) => node.id === cleanNextId)) {
    setStatus(`Node id "${cleanNextId}" already exists.`);
    return;
  }

  layout.nodes.forEach((node) => {
    if (node.id === oldId) {
      node.id = cleanNextId;
    }
  });

  layout.paths = layout.paths.map(([from, to]) => [from === oldId ? cleanNextId : from, to === oldId ? cleanNextId : to]);
  layout.markers.forEach((marker) => {
    if (marker.targetNodeId === oldId) {
      marker.targetNodeId = cleanNextId;
    }
  });

  selectedId = cleanNextId;
  queueCommit('Renamed node');
}

function renameMarker(oldId, nextId) {
  const cleanNextId = nextId || makeUniqueId('marker', layout.markers, 'id');
  if (!cleanNextId || cleanNextId === oldId) {
    return;
  }

  if (layout.markers.some((marker) => marker.id === cleanNextId)) {
    setStatus(`Marker id "${cleanNextId}" already exists.`);
    return;
  }

  layout.markers.forEach((marker) => {
    if (marker.id === oldId) {
      marker.id = cleanNextId;
    }
  });

  selectedId = cleanNextId;
  queueCommit('Renamed marker');
}

function makeUniqueId(prefix, items, key = 'id') {
  const base = cleanId(prefix) || 'item';
  let candidate = base;
  let index = 2;

  while (items.some((item) => item[key] === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function togglePathAnchor(nodeId) {
  if (!pathAnchorId) {
    pathAnchorId = nodeId;
    selectItem('node', nodeId);
    setStatus(`Path anchor: ${labelForId(nodeId)}`);
    renderStage();
    return;
  }

  if (pathAnchorId === nodeId) {
    pathAnchorId = null;
    setStatus('Path anchor cleared.');
    renderStage();
    return;
  }

  const existingIndex = layout.paths.findIndex((path) => samePath(path, [pathAnchorId, nodeId]));
  if (existingIndex >= 0) {
    layout.paths.splice(existingIndex, 1);
    setStatus(`Removed path between ${labelForId(pathAnchorId)} and ${labelForId(nodeId)}.`);
  } else {
    layout.paths.push([pathAnchorId, nodeId]);
    setStatus(`Linked ${labelForId(pathAnchorId)} to ${labelForId(nodeId)}.`);
  }
  pathAnchorId = null;
  pushHistory('Updated path');
  renderAll();
}

function samePath(first, second) {
  return (
    (first[0] === second[0] && first[1] === second[1])
    || (first[0] === second[1] && first[1] === second[0])
  );
}

function isPathSelected(path) {
  if (!pathAnchorId) {
    return false;
  }

  return path.includes(pathAnchorId);
}

function addNode() {
  const seedX = selectedKind === 'node' ? (findNode(selectedId)?.x ?? layout.width / 2) + gridSize : layout.width / 2;
  const seedY = selectedKind === 'node' ? (findNode(selectedId)?.y ?? layout.height / 2) + gridSize : layout.height / 2;
  const nextNode = normalizeNode({
    id: makeUniqueId('node', layout.nodes),
    label: 'New Node',
    hiddenLabel: WORLD_MAP_HIDDEN_LABEL,
    x: snapPosition(seedX),
    y: snapPosition(seedY),
    icon: 'world-hut',
    discoveredByDefault: true,
    unlockedByDefault: false,
  }, layout.nodes.length);

  layout.nodes.push(nextNode);
  selectedKind = 'node';
  selectedId = nextNode.id;
  queueCommit('Added node');
  renderAll();
}

function addMarker() {
  const seedX = layout.width / 2;
  const seedY = layout.height / 2;
  const nextMarker = normalizeMarker({
    id: makeUniqueId('marker', layout.markers),
    kind: 'trigger',
    label: 'Marker',
    x: snapPosition(seedX),
    y: snapPosition(seedY),
    width: 64,
    height: 64,
    visible: true,
    targetNodeId: '',
  }, layout.markers.length);

  layout.markers.push(nextMarker);
  selectedKind = 'marker';
  selectedId = nextMarker.id;
  queueCommit('Added marker');
  renderAll();
}

function duplicateSelected() {
  const selected = getSelectedItem();
  if (!selected) {
    return;
  }

  if (selectedKind === 'marker') {
    const copy = normalizeMarker({
      ...cloneLayout(selected),
      id: makeUniqueId('marker', layout.markers),
      x: snapPosition(selected.x + gridSize),
      y: snapPosition(selected.y + gridSize),
      label: `${selected.label} copy`,
    }, layout.markers.length);
    layout.markers.push(copy);
    selectedId = copy.id;
    queueCommit('Duplicated marker');
    renderAll();
    return;
  }

  const copy = normalizeNode({
    ...cloneLayout(selected),
    id: makeUniqueId('node', layout.nodes),
    x: snapPosition(selected.x + gridSize),
    y: snapPosition(selected.y + gridSize),
    label: `${selected.label} copy`,
  }, layout.nodes.length);
  layout.nodes.push(copy);
  selectedId = copy.id;
  queueCommit('Duplicated node');
  renderAll();
}

function deleteSelected() {
  const selected = getSelectedItem();
  if (!selected) {
    return;
  }

  if (selectedKind === 'marker') {
    layout.markers = layout.markers.filter((marker) => marker.id !== selected.id);
    if (selectedId === selected.id) {
      selectedId = layout.nodes[0]?.id ?? null;
      selectedKind = 'node';
    }
  } else {
    layout.nodes = layout.nodes.filter((node) => node.id !== selected.id);
    layout.paths = layout.paths.filter((path) => !path.includes(selected.id));
    layout.markers.forEach((marker) => {
      if (marker.targetNodeId === selected.id) {
        marker.targetNodeId = '';
      }
    });
    if (selectedId === selected.id) {
      selectedId = layout.nodes[0]?.id ?? null;
    }
  }

  pathAnchorId = null;
  queueCommit('Deleted item');
  renderAll();
}

function startDrag(event, kind, id) {
  if (mode !== 'select' || event.button !== 0) {
    return;
  }

  const item = kind === 'marker' ? findMarker(id) : findNode(id);
  if (!item) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectItem(kind, id);
  renderAll();

  const origin = {
    x: item.x,
    y: item.y,
  };

  dragState = {
    kind,
    id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    origin,
    moved: false,
  };

  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
  window.addEventListener('pointercancel', onDragEnd, { once: true });
}

function onDragMove(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) {
    return;
  }

  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  const nextX = dragState.origin.x + dx;
  const nextY = dragState.origin.y + dy;
  const target = dragState.kind === 'marker' ? findMarker(dragState.id) : findNode(dragState.id);
  if (!target) {
    return;
  }

  target.x = snapEnabled ? snapPosition(nextX) : Math.round(nextX);
  target.y = snapEnabled ? snapPosition(nextY) : Math.round(nextY);
  dragState.moved = true;
  renderStage();
}

function onDragEnd(event) {
  if (!dragState) {
    return;
  }

  if (event.pointerId !== dragState.pointerId) {
    return;
  }

  window.removeEventListener('pointermove', onDragMove);

  if (dragState.moved) {
    queueCommit(`Moved ${dragState.kind}`);
    renderAll();
  }

  dragState = null;
}

function snapPosition(value) {
  return Math.round(value / gridSize) * gridSize;
}

function copyJson() {
  navigator.clipboard?.writeText(JSON.stringify(layout, null, 2));
  setStatus('JSON copied to clipboard.');
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'worldMap.layout.json';
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Downloaded layout JSON.');
}

function resetLayout() {
  layout = normalizeLayout(createWorldMapLayout());
  selectedKind = 'node';
  selectedId = layout.nodes[0]?.id ?? null;
  pathAnchorId = null;
  history = [serializeLayout(layout)];
  historyIndex = 0;
  setStatus('Reset to current game layout.');
  renderAll();
}

function undo() {
  if (historyIndex <= 0) {
    setStatus('Nothing to undo.');
    return;
  }

  historyIndex -= 1;
  layout = normalizeLayout(JSON.parse(history[historyIndex]));
  ensureSelection();
  setStatus('Undid last change.');
  renderAll();
}

function redo() {
  if (historyIndex >= history.length - 1) {
    setStatus('Nothing to redo.');
    return;
  }

  historyIndex += 1;
  layout = normalizeLayout(JSON.parse(history[historyIndex]));
  ensureSelection();
  setStatus('Redid change.');
  renderAll();
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      layout = normalizeLayout(JSON.parse(String(reader.result)));
      selectedKind = 'node';
      selectedId = layout.nodes[0]?.id ?? null;
      pathAnchorId = null;
      history = [serializeLayout(layout)];
      historyIndex = 0;
      setStatus(`Imported ${file.name}.`);
      renderAll();
    } catch {
      setStatus('Import failed: invalid JSON.');
      renderAll();
    }
  });
  reader.readAsText(file);
  event.target.value = '';
}

function ensureSelection() {
  if (selectedKind === 'node' && findNode(selectedId)) {
    return;
  }

  if (selectedKind === 'marker' && findMarker(selectedId)) {
    return;
  }

  if (layout.nodes.length) {
    selectedKind = 'node';
    selectedId = layout.nodes[0].id;
    return;
  }

  if (layout.markers.length) {
    selectedKind = 'marker';
    selectedId = layout.markers[0].id;
    return;
  }

  selectedKind = null;
  selectedId = null;
}

function queueCommit(message) {
  clearTimeout(commitTimer);
  commitTimer = window.setTimeout(() => {
    pushHistory(message);
    persistDraft();
  }, 120);
}

function pushHistory(message) {
  const snapshot = serializeLayout(layout);
  if (history[historyIndex] === snapshot) {
    setStatus(message);
    return;
  }

  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);
  historyIndex = history.length - 1;
  setStatus(message);
}

function setStatus(message) {
  statusMessage = message;
  refs.statusText.textContent = statusMessage;
}

function getIconSource(iconKey) {
  return ICON_SOURCES[iconKey] ?? '/tiles/hut.png';
}

function getNodeLabel(node) {
  return isNodeVisible(node) ? node.label : normalizeWorldMapHiddenLabel(node.hiddenLabel ?? WORLD_MAP_HIDDEN_LABEL);
}

function isNodeVisible(node) {
  return node.discoveredByDefault !== false || node.unlockedByDefault;
}

function labelForId(id) {
  return findNode(id)?.label ?? id;
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
