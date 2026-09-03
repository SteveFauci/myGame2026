import Phaser from 'phaser';
import {
  WORLD_MAP_HEIGHT as WORLD_HEIGHT,
  WORLD_MAP_HIDDEN_LABEL,
  WORLD_MAP_TILE_SIZE as TILE_SIZE,
  WORLD_MAP_WIDTH as WORLD_WIDTH,
  WORLD_NODES,
  WORLD_PATHS,
  normalizeWorldMapHiddenLabel,
} from '../data/worldMap.js';
import { isNodeDiscovered, isNodeUnlocked, loadProgress } from '../data/progress.js';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';

const NODE_RADIUS = 48;

const WORLD_LAKES = Object.freeze([
  { centerX: 1180, centerY: 205, radiusX: 185, radiusY: 95 },
  { centerX: 555, centerY: 720, radiusX: 145, radiusY: 82 },
]);

const DUNGEON_FORTRESS = Object.freeze({
  startCol: 21,
  startRow: 8,
  width: 8,
  height: 9,
});

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
    this.currentNodeId = 'village';
    this.nearNode = null;
    this.arrivalMessage = '';
    this.progress = null;
  }

  init(data = {}) {
    this.currentNodeId = data.returnNodeId ?? this.currentNodeId ?? 'village';
    this.arrivalMessage = data.worldMessage ?? '';
    this.progress = loadProgress();
  }

  preload() {
    preloadAudio(this.load);
    this.load.image('world-player-down-1', '/player/boy_down_1.png');
    this.load.image('world-player-down-2', '/player/boy_down_2.png');
    this.load.image('world-player-up-1', '/player/boy_up_1.png');
    this.load.image('world-player-up-2', '/player/boy_up_2.png');
    this.load.image('world-player-left-1', '/player/boy_left_1.png');
    this.load.image('world-player-left-2', '/player/boy_left_2.png');
    this.load.image('world-player-right-1', '/player/boy_right_1.png');
    this.load.image('world-player-right-2', '/player/boy_right_2.png');
    this.load.image('world-grass', '/tiles/grass00.png');
    this.load.image('world-grass-alt', '/tiles/grass01.png');
    this.load.image('world-earth', '/tiles/earth.png');
    this.load.image('world-road', '/tiles/road00.png');
    this.load.image('world-water', '/tiles/water00.png');
    this.load.image('world-tree', '/tiles/tree.png');
    this.load.image('world-wall', '/tiles/wall.png');
    this.load.image('world-spike', '/tiles/spike.png');
    this.load.image('world-hut', '/tiles/hut.png');
    this.load.image('world-stairs', '/tiles/stairs1.png');
    this.load.image('world-stairs-2', '/tiles/stairs2.png');
    this.load.image('world-chest', '/objects/chest.png');
    this.load.image('world-door-iron', '/objects/door_iron.png');
    this.load.image('world-lantern', '/objects/lantern.png');
    this.load.image('world-tent', '/objects/tent.png');
    this.load.image('world-slime-1', '/monsters/greenslime_down_1.png');
    this.load.image('world-slime-2', '/monsters/greenslime_down_2.png');
  }

  create() {
    this.progress = loadProgress();
    this.cameras.main.setBackgroundColor('#102a22');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createInput();
    this.audio = new AudioManager(this);
    this.audio.playMusic('music-overworld');
    this.createAnimations();
    this.drawWorld();
    this.createNodes();
    this.createHud();

    const startNode = this.getNode(this.currentNodeId) ?? this.getNode('village');
    this.player = this.physics.add.sprite(startNode.x, startNode.y + 64, 'world-player-down-1');
    this.player.setScale(3);
    this.player.setDepth(30);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(16, 16, true);
    this.facing = 'down';
    this.speed = 190;

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.updateNearbyNode(true);

    if (this.arrivalMessage) {
      this.statusText.setText(this.arrivalMessage);
      this.time.delayedCall(2400, () => this.updateNearbyNode(true));
    }
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      left: 'A',
      down: 'S',
      right: 'D',
      interact: 'F',
      confirm: 'ENTER',
    });
  }

  createAnimations() {
    ['up', 'down', 'left', 'right'].forEach((direction) => {
      const key = `world-${direction}-walk`;
      if (this.anims.exists(key)) {
        return;
      }

      this.anims.create({
        key,
        frames: [
          { key: `world-player-${direction}-1` },
          { key: `world-player-${direction}-2` },
        ],
        frameRate: 6,
        repeat: -1,
      });
    });

    if (!this.anims.exists('world-slime-idle')) {
      this.anims.create({
        key: 'world-slime-idle',
        frames: [{ key: 'world-slime-1' }, { key: 'world-slime-2' }],
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  drawWorld() {
    this.roadCells = new Set();
    this.drawGroundTiles();
    WORLD_LAKES.forEach((lake) => this.drawLake(lake));
    this.drawVillageClearing();
    this.drawRoads();
    this.drawDungeonFortress();
    this.drawForests();
    this.drawLandmarkDetails();
  }

  drawGroundTiles() {
    const cols = Math.ceil(WORLD_WIDTH / TILE_SIZE);
    const rows = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const variation = (col * 17 + row * 31) % 11 === 0;
        this.placeTile(col, row, variation ? 'world-grass-alt' : 'world-grass', 0);
      }
    }
  }

  drawRoads() {
    const nodeById = new Map(WORLD_NODES.map((node) => [node.id, node]));

    WORLD_PATHS.forEach(([fromId, toId]) => {
      const from = nodeById.get(fromId);
      const to = nodeById.get(toId);
      this.drawRoadBetween(from, to);
    });
  }

  drawRoadBetween(from, to) {
    const distance = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const steps = Math.ceil(distance / (TILE_SIZE * 0.35));

    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      const x = Phaser.Math.Linear(from.x, to.x, t);
      const y = Phaser.Math.Linear(from.y, to.y, t);
      const col = Math.floor(x / TILE_SIZE);
      const row = Math.floor(y / TILE_SIZE);

      this.placeRoadTile(col, row);

      if (Math.abs(from.x - to.x) > Math.abs(from.y - to.y)) {
        this.placeRoadTile(col, row + 1);
      } else {
        this.placeRoadTile(col + 1, row);
      }
    }
  }

  drawLake({ centerX, centerY, radiusX, radiusY }) {
    const cols = Math.ceil(WORLD_WIDTH / TILE_SIZE);
    const rows = Math.ceil(WORLD_HEIGHT / TILE_SIZE);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const normalized = ((x - centerX) ** 2) / (radiusX ** 2)
          + ((y - centerY) ** 2) / (radiusY ** 2);

        if (normalized <= 1) {
          this.placeTile(col, row, 'world-water', 1);
        }
      }
    }
  }

  drawVillageClearing() {
    [
      [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
      [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9],
      [5, 10], [6, 10], [7, 10], [8, 10], [9, 10],
      [5, 11], [6, 11], [7, 11], [8, 11], [9, 11],
      [6, 12], [7, 12], [8, 12],
    ].forEach(([col, row]) => this.placeTile(col, row, 'world-road', 1));

    this.placeTile(6, 8, 'world-hut', 4);
    this.placeTile(5, 10, 'world-tent', 4);
    this.placeTile(9, 10, 'world-lantern', 4);
  }

  drawDungeonFortress() {
    const { startCol, startRow, width, height } = DUNGEON_FORTRESS;

    this.drawTileRect(startCol, startRow, width, height, 'world-earth', 1);
    this.drawTileBorder(startCol, startRow, width, height, 'world-wall', 4);
    [
      [0, 2], [1, 2], [2, 2],
      [2, 3], [3, 3], [4, 3],
      [4, 4], [4, 5], [4, 6],
      [5, 6], [6, 6], [7, 6],
    ].forEach(([offsetCol, offsetRow]) => {
      this.placeTile(startCol + offsetCol, startRow + offsetRow, 'world-road', 5);
    });

    this.placeTile(startCol + 1, startRow + 1, 'world-stairs-2', 5);
    this.placeTile(startCol + 2, startRow + 2, 'world-spike', 5);
    this.placeTile(startCol + 5, startRow + 6, 'world-door-iron', 5);
    this.placeTile(startCol + 6, startRow + 6, 'world-stairs', 5);
  }

  drawForests() {
    [
      [4, 6], [5, 5], [7, 5], [10, 6], [11, 8], [4, 12], [5, 13], [10, 13],
      [12, 11], [13, 13], [14, 14], [15, 15], [17, 14], [18, 13], [19, 14],
      [11, 16], [12, 17], [14, 17], [16, 17], [18, 16], [20, 15],
      [25, 6], [26, 6], [27, 7], [28, 8], [29, 9], [30, 10],
      [20, 4], [21, 3], [23, 3], [24, 4], [29, 4], [30, 5],
      [3, 16], [4, 17], [6, 17], [7, 18], [9, 17],
    ].forEach(([col, row]) => {
      if (this.canPlaceDecoration(col, row)) {
        this.placeTile(col, row, 'world-tree', 5);
      }
    });
  }

  drawLandmarkDetails() {
    this.placeTile(15, 10, 'world-grass-alt', 4);
    this.placeTile(15, 11, 'world-grass-alt', 4);
    this.placeTile(16, 10, 'world-grass-alt', 4);
    this.placeTile(15, 5, 'world-chest', 4);
  }

  placeRoadTile(col, row) {
    if (!this.isInsideWorld(col, row)) {
      return;
    }

    const key = `${col},${row}`;
    if (this.roadCells.has(key)) {
      return;
    }

    this.roadCells.add(key);
    this.placeTile(col, row, 'world-road', 3);
  }

  drawTileRect(startCol, startRow, width, height, key, depth) {
    for (let row = startRow; row < startRow + height; row += 1) {
      for (let col = startCol; col < startCol + width; col += 1) {
        this.placeTile(col, row, key, depth);
      }
    }
  }

  drawTileBorder(startCol, startRow, width, height, key, depth) {
    for (let col = startCol; col < startCol + width; col += 1) {
      this.placeTile(col, startRow, key, depth);
      this.placeTile(col, startRow + height - 1, key, depth);
    }

    for (let row = startRow + 1; row < startRow + height - 1; row += 1) {
      this.placeTile(startCol, row, key, depth);
      this.placeTile(startCol + width - 1, row, key, depth);
    }
  }

  placeTile(col, row, key, depth = 0) {
    return this.add.image(
      col * TILE_SIZE + TILE_SIZE / 2,
      row * TILE_SIZE + TILE_SIZE / 2,
      key,
    )
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(depth);
  }

  isInsideWorld(col, row) {
    return (
      col >= 0
      && row >= 0
      && col < Math.ceil(WORLD_WIDTH / TILE_SIZE)
      && row < Math.ceil(WORLD_HEIGHT / TILE_SIZE)
    );
  }

  canPlaceDecoration(col, row) {
    if (!this.isInsideWorld(col, row)) {
      return false;
    }

    const center = {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };

    if (this.roadCells.has(`${col},${row}`)) {
      return false;
    }

    if (this.isInsideDungeonFortress(col, row) || this.isInsideVillageClearing(col, row)) {
      return false;
    }

    if (WORLD_LAKES.some((lake) => this.isPointInLake(center.x, center.y, lake, 1.22))) {
      return false;
    }

    return !WORLD_NODES.some((node) => (
      Phaser.Math.Distance.Between(center.x, center.y, node.x, node.y) < NODE_RADIUS + 38
    ));
  }

  isPointInLake(x, y, lake, scale = 1) {
    return ((x - lake.centerX) ** 2) / ((lake.radiusX * scale) ** 2)
      + ((y - lake.centerY) ** 2) / ((lake.radiusY * scale) ** 2) <= 1;
  }

  isInsideVillageClearing(col, row) {
    return col >= 4 && col <= 10 && row >= 8 && row <= 12;
  }

  isInsideDungeonFortress(col, row) {
    const { startCol, startRow, width, height } = DUNGEON_FORTRESS;

    return (
      col >= startCol
      && col < startCol + width
      && row >= startRow
      && row < startRow + height
    );
  }

  createNodes() {
    this.nodeViews = new Map();

    WORLD_NODES.forEach((node) => {
      const marker = this.add.circle(node.x, node.y, NODE_RADIUS, 0x56606b, 0.95)
        .setStrokeStyle(4, 0x1f2937)
        .setDepth(8);
      const icon = this.add.sprite(node.x, node.y - 4, node.icon)
        .setScale(node.icon === 'world-hut' ? 1.6 : 2.6)
        .setDepth(9);
      const label = this.add.text(node.x, node.y + 62, this.getNodeDisplayLabel(node), {
        fontFamily: 'MaruMonica',
        fontSize: '25px',
        color: '#94a3b8',
        stroke: '#0f172a',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(10);

      if (node.icon === 'world-slime-1') {
        icon.play('world-slime-idle');
      }

      this.nodeViews.set(node.id, { marker, icon, label });
      this.refreshNodeView(node.id, false);
    });
  }

  createHud() {
    this.titleText = this.add.text(24, 20, 'World Map', {
      fontFamily: 'MaruMonica',
      fontSize: '34px',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setScrollFactor(0).setDepth(40);

    this.statusText = this.add.text(24, 62, '', {
      fontFamily: 'MaruMonica',
      fontSize: '23px',
      color: '#fde68a',
      stroke: '#0f172a',
      strokeThickness: 5,
    }).setScrollFactor(0).setDepth(40);
  }

  update() {
    const input = {
      left: this.cursors.left.isDown || this.keys.left.isDown,
      right: this.cursors.right.isDown || this.keys.right.isDown,
      up: this.cursors.up.isDown || this.keys.up.isDown,
      down: this.cursors.down.isDown || this.keys.down.isDown,
    };

    this.updateMovement(input);
    this.updateNearbyNode();

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.interact)
      || Phaser.Input.Keyboard.JustDown(this.keys.confirm)
    ) {
      this.enterNearbyNode();
    }
  }

  updateMovement(input) {
    let vx = 0;
    let vy = 0;

    if (input.left) {
      vx -= 1;
      this.facing = 'left';
    }
    if (input.right) {
      vx += 1;
      this.facing = 'right';
    }
    if (input.up) {
      vy -= 1;
      this.facing = 'up';
    }
    if (input.down) {
      vy += 1;
      this.facing = 'down';
    }

    if (vx === 0 && vy === 0) {
      this.player.setVelocity(0, 0);
      this.player.stop();
      this.player.setTexture(`world-player-${this.facing}-1`);
      return;
    }

    const length = Math.hypot(vx, vy);
    this.player.setVelocity((vx / length) * this.speed, (vy / length) * this.speed);
    this.player.play(`world-${this.facing}-walk`, true);
  }

  updateNearbyNode(force = false) {
    const previousNode = this.nearNode;
    this.nearNode = WORLD_NODES
      .filter((node) => Phaser.Math.Distance.Between(this.player.x, this.player.y, node.x, node.y) <= 92)
      .sort((first, second) => (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, first.x, first.y)
        - Phaser.Math.Distance.Between(this.player.x, this.player.y, second.x, second.y)
      ))[0] ?? null;

    if (!force && previousNode?.id === this.nearNode?.id) {
      return;
    }

    this.nodeViews.forEach((view, nodeId) => {
      const node = this.getNode(nodeId);
      const selected = this.nearNode?.id === nodeId;
      this.refreshNodeView(nodeId, selected);
    });

    if (!this.nearNode) {
      this.statusText.setText('Choose a place to visit.');
    } else if (!this.isDiscovered(this.nearNode)) {
      this.statusText.setText(this.getNodeDisplayLabel(this.nearNode));
    } else if (!this.isUnlocked(this.nearNode)) {
      this.statusText.setText(`${this.nearNode.label} is locked.`);
    } else {
      this.statusText.setText(this.nearNode.label);
    }
  }

  enterNearbyNode() {
    if (!this.nearNode) {
      this.statusText.setText('Move closer to a map node.');
      return;
    }

    if (!this.isDiscovered(this.nearNode)) {
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
      this.statusText.setText(this.getNodeDisplayLabel(this.nearNode));
      return;
    }

    if (!this.isUnlocked(this.nearNode)) {
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
      this.statusText.setText(`${this.nearNode.label} is locked.`);
      return;
    }

    if (this.nearNode.message) {
      this.statusText.setText(this.nearNode.message);
      return;
    }

    const entry = this.nearNode.entry ?? (
      this.nearNode.chapterId ? { type: 'chapter', scene: 'GameScene' } : null
    );

    if (!entry) {
      return;
    }

    this.audio?.playSfx(
      entry.type === 'shop' ? 'sfx-unlock' : 'sfx-stairs',
      { volume: 0.55 },
    );

    if (entry.type === 'shop') {
      this.scene.pause();
      this.scene.launch(entry.scene ?? 'ShopScene', {
        shopId: entry.shopId,
        returnSceneKey: this.scene.key,
        returnNodeId: entry.returnNodeId ?? this.nearNode.id,
      });
      return;
    }

    if (entry.type !== 'chapter') {
      this.statusText.setText('Nothing happens yet.');
      return;
    }

    this.scene.start(entry.scene ?? 'GameScene', {
      chapterId: this.nearNode.chapterId,
      chapterName: this.nearNode.chapterName,
      returnNodeId: this.nearNode.id,
      spawn: this.nearNode.spawn,
    });
  }

  onShopReturn(_playerState, returnMessage = '') {
    this.progress = loadProgress();
    this.audio?.playMusic('music-overworld');

    if (returnMessage) {
      this.arrivalMessage = returnMessage;
      this.statusText.setText(returnMessage);
      this.time.delayedCall(2400, () => this.updateNearbyNode(true));
      return;
    }

    this.updateNearbyNode(true);
  }

  getNode(nodeId) {
    return WORLD_NODES.find((node) => node.id === nodeId) ?? null;
  }

  refreshNodeView(nodeId, selected = false) {
    const node = this.getNode(nodeId);
    const view = this.nodeViews?.get(nodeId);

    if (!node || !view) {
      return;
    }

    const discovered = this.isDiscovered(node);
    const unlocked = this.isUnlocked(node);
    const fillColor = !discovered ? 0x334155 : unlocked ? 0xead08b : 0x56606b;
    const strokeColor = selected ? 0xfde68a : unlocked ? 0x5b3b1d : 0x1f2937;
    const labelColor = selected ? '#fde68a' : unlocked ? '#f8fafc' : '#94a3b8';

    view.marker
      .setFillStyle(fillColor, discovered ? 0.95 : 0.78)
      .setStrokeStyle(selected ? 6 : 4, strokeColor);
    view.label
      .setText(this.getNodeDisplayLabel(node))
      .setColor(labelColor);
    view.icon.setAlpha(discovered ? 1 : 0.55);

    if (!discovered || !unlocked) {
      view.icon.setTint(0x64748b);
    } else {
      view.icon.clearTint();
    }
  }

  getNodeDisplayLabel(node) {
    if (!node) {
      return '';
    }

    return this.isDiscovered(node) ? node.label : normalizeWorldMapHiddenLabel(node.hiddenLabel ?? WORLD_MAP_HIDDEN_LABEL);
  }

  isDiscovered(node) {
    return isNodeDiscovered(this.progress, node);
  }

  isUnlocked(node) {
    return isNodeUnlocked(this.progress, node);
  }
}
