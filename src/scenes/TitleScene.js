import Phaser from 'phaser';
import { loadProgress } from '../data/progress.js';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';

const MENU_OPTIONS = Object.freeze(['Continue Adventure', 'Credits']);
const TILE_SIZE = 48;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
    this.menuCursor = 0;
    this.bannerText = '';
  }

  init(data = {}) {
    const progress = loadProgress();
    this.bannerText = data.bannerText ?? (progress.bossTreasureCollected ? 'The Blue Heart has been claimed.' : '');
    this.menuCursor = 0;
  }

  preload() {
    preloadAudio(this.load);
    this.load.image('title-grass', '/tiles/grass00.png');
    this.load.image('title-grass-alt', '/tiles/grass01.png');
    this.load.image('title-road', '/tiles/road00.png');
    this.load.image('title-water', '/tiles/water00.png');
    this.load.image('title-tree', '/tiles/tree.png');
    this.load.image('title-hut', '/tiles/hut.png');
    this.load.image('title-earth', '/tiles/earth.png');
    this.load.image('title-wall', '/tiles/wall.png');
    this.load.image('title-stairs', '/tiles/stairs1.png');
    this.load.image('title-door-iron', '/objects/door_iron.png');
    this.load.image('title-player-down-1', '/player/boy_down_1.png');
    this.load.image('title-player-down-2', '/player/boy_down_2.png');
    this.load.image('title-slime-1', '/monsters/greenslime_down_1.png');
    this.load.image('title-slime-2', '/monsters/greenslime_down_2.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#07111d');
    this.audio = new AudioManager(this);
    this.audio.playMusic('music-overworld');
    this.createInput();

    this.createBackdrop();
    this.createAnimations();
    this.createTitleBlock();
    this.createMenu();
    this.layout();

    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      ['keydown-ENTER', 'keydown-F'].forEach((eventName) => {
        this.input.keyboard.removeAllListeners(eventName);
      });
    });
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      confirm: 'ENTER',
      interact: 'F',
    });
    this.pendingConfirm = false;

    ['keydown-ENTER', 'keydown-F'].forEach((eventName) => {
      this.input.keyboard.removeAllListeners(eventName);
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      this.pendingConfirm = true;
    });
    this.input.keyboard.on('keydown-F', () => {
      this.pendingConfirm = true;
    });
  }

  createBackdrop() {
    this.grassLayer = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'title-grass')
      .setOrigin(0)
      .setDepth(0);
    this.altGrassLayer = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'title-grass-alt')
      .setOrigin(0)
      .setAlpha(0.12)
      .setDepth(1);

    this.darkOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x020617, 0.34)
      .setOrigin(0)
      .setDepth(2);
    this.hazeOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0f172a, 0.18)
      .setOrigin(0)
      .setDepth(3);

    this.drawScenicPath();

    this.player = this.add.sprite(this.scale.width * 0.28, this.scale.height * 0.69, 'title-player-down-1')
      .setScale(3)
      .setDepth(8);
    this.player.play('title-player-idle');

    this.slime = this.add.sprite(this.scale.width * 0.78, this.scale.height * 0.58, 'title-slime-1')
      .setScale(3)
      .setDepth(8);
    this.slime.play('title-slime-idle');
  }

  drawScenicPath() {
    const roadTiles = [
      [3, 12], [4, 12], [5, 12], [6, 12], [7, 11], [8, 11], [9, 10], [10, 10],
      [11, 9], [12, 9], [13, 8], [14, 8], [15, 7], [16, 7], [17, 7], [18, 7],
      [19, 8], [20, 8], [21, 9],
    ];

    roadTiles.forEach(([col, row]) => {
      this.placeTile(col, row, 'title-road', 4);
    });

    [
      [5, 9], [6, 8], [7, 8], [8, 7],
      [16, 4], [17, 4], [18, 5], [19, 5],
      [24, 10], [25, 10],
    ].forEach(([col, row]) => {
      this.placeTile(col, row, 'title-water', 1);
    });

    [
      [4, 8], [6, 10], [12, 6], [14, 5], [20, 5], [22, 6], [26, 8],
      [7, 14], [10, 13], [17, 12], [23, 12], [27, 14],
    ].forEach(([col, row]) => {
      this.placeTile(col, row, 'title-tree', 5);
    });

    this.placeTile(6, 13, 'title-hut', 6);
    this.placeTile(12, 8, 'title-stairs', 6);
    this.placeTile(24, 8, 'title-door-iron', 6);
    this.placeTile(21, 4, 'title-earth', 2);
    this.placeTile(22, 4, 'title-earth', 2);
    this.placeTile(21, 5, 'title-wall', 6);
    this.placeTile(22, 5, 'title-wall', 6);
  }

  createAnimations() {
    if (!this.anims.exists('title-player-idle')) {
      this.anims.create({
        key: 'title-player-idle',
        frames: [
          { key: 'title-player-down-1' },
          { key: 'title-player-down-2' },
        ],
        frameRate: 3,
        repeat: -1,
      });
    }

    if (!this.anims.exists('title-slime-idle')) {
      this.anims.create({
        key: 'title-slime-idle',
        frames: [
          { key: 'title-slime-1' },
          { key: 'title-slime-2' },
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  createTitleBlock() {
    this.titlePanel = this.add.container(0, 0).setDepth(20);

    this.titleBackdrop = this.add.rectangle(0, 0, 1, 1, 0x0f172a, 0.78).setOrigin(0);
    this.titleFrame = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.88).setOrigin(0);
    this.gameTitle = this.add.text(0, 0, 'Blue Boy Adventure', {
      fontFamily: 'MaruMonica',
      fontSize: '72px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 7,
    }).setOrigin(0, 0.5);

    this.bannerTextView = this.add.text(0, 0, this.bannerText, {
      fontFamily: 'MaruMonica',
      fontSize: '25px',
      color: '#fde68a',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    this.subtitle = this.add.text(0, 0, 'A legacy web remake', {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#cbd5e1',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);

    this.menuOptions = MENU_OPTIONS.map((option) => this.add.text(0, 0, option, {
      fontFamily: 'MaruMonica',
      fontSize: '30px',
      color: '#f8fafc',
    }).setOrigin(0, 0.5));
    this.menuCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '30px',
      color: '#fde68a',
    }).setOrigin(0.5);

    this.controlHint = this.add.text(0, 0, 'W / S  Move   F / Enter  Confirm', {
      fontFamily: 'MaruMonica',
      fontSize: '22px',
      color: '#94a3b8',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.titlePanel.add([
      this.titleBackdrop,
      this.titleFrame,
      this.gameTitle,
      this.bannerTextView,
      this.subtitle,
      ...this.menuOptions,
      this.menuCursorText,
      this.controlHint,
    ]);
  }

  layout() {
    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(760, Math.max(520, width * 0.46));
    const panelHeight = Math.min(430, Math.max(340, height * 0.66));
    const panelX = Math.floor(width * 0.07);
    const panelY = Math.floor((height - panelHeight) / 2);

    this.grassLayer?.setSize(width, height);
    this.altGrassLayer?.setSize(width, height);
    this.darkOverlay?.setSize(width, height);
    this.hazeOverlay?.setSize(width, height);
    this.player?.setPosition(width * 0.28, height * 0.69);
    this.slime?.setPosition(width * 0.78, height * 0.58);

    this.titleBackdrop?.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.titleFrame?.setPosition(panelX + 10, panelY + 10).setSize(panelWidth - 20, panelHeight - 20);
    this.gameTitle?.setPosition(panelX + 34, panelY + 54);
    this.bannerTextView?.setPosition(panelX + 36, panelY + 122);
    this.bannerTextView?.setVisible(Boolean(this.bannerText));
    this.subtitle?.setPosition(panelX + 36, panelY + 156);

    this.menuOptions.forEach((option, index) => {
      option.setPosition(panelX + 72, panelY + 230 + index * 58);
    });

    this.controlHint?.setPosition(panelX + panelWidth / 2, panelY + panelHeight - 30);

    this.updateMenuCursor();
  }

  update(time, delta) {
    this.grassLayer.tilePositionX += delta * 0.01;
    this.grassLayer.tilePositionY += delta * 0.004;
    this.altGrassLayer.tilePositionX -= delta * 0.006;

    if (this.player) {
      this.player.y = this.scale.height * 0.69 + Math.sin(time / 340) * 3;
    }

    if (this.slime) {
      this.slime.y = this.scale.height * 0.58 + Math.sin(time / 280 + 0.8) * 4;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
      || Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.down)
    ) {
      this.menuCursor = this.menuCursor === 0 ? 1 : 0;
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
      this.updateMenuCursor();
    }

    if (!this.consumeConfirmInput()) {
      return;
    }

    if (this.menuCursor === 0) {
      this.startAdventure();
      return;
    }

    this.openCredits();
  }

  consumeConfirmInput() {
    const confirm = (
      Phaser.Input.Keyboard.JustDown(this.keys.confirm)
      || Phaser.Input.Keyboard.JustDown(this.keys.interact)
      || this.pendingConfirm
    );
    this.pendingConfirm = false;
    return confirm;
  }

  startAdventure() {
    this.audio?.stopMusic();
    this.scene.start('WorldMapScene', {
      returnNodeId: 'village',
      worldMessage: this.bannerText || '',
    });
  }

  openCredits() {
    this.scene.pause();
    this.scene.launch('CreditsScene', {
      returnSceneKey: this.scene.key,
      returnSceneData: {
        bannerText: this.bannerText,
      },
    });
  }

  onCreditsReturn(data = {}) {
    this.bannerText = data.bannerText ?? this.bannerText;
    this.bannerTextView?.setText(this.bannerText);
    this.bannerTextView?.setVisible(Boolean(this.bannerText));
    this.audio?.playMusic('music-overworld');
  }

  updateMenuCursor() {
    if (!this.menuOptions?.length) {
      return;
    }

    const selectedBounds = this.menuOptions[this.menuCursor].getBounds();
    this.menuCursorText.setPosition(
      Math.floor(selectedBounds.x - 22),
      Math.floor(selectedBounds.y + selectedBounds.height / 2),
    );

    this.menuOptions.forEach((option, index) => {
      option.setColor(index === this.menuCursor ? '#fde68a' : '#f8fafc');
    });
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
}
