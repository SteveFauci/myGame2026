import Phaser from 'phaser';

const TILE_NAMES = [
  'voidimg',
  'stairs1',
  'stairs2',
  'spike',
  'grass00',
  'grass01',
  ...Array.from({ length: 14 }, (_, index) => `water${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 13 }, (_, index) => `road${String(index).padStart(2, '0')}`),
  'earth',
  'wall',
  'tree',
  'hut',
  'floor01',
  'table01',
  'table02',
];

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.text('worldV3', '/maps/worldV3.txt');

    this.load.image('playerDown1', '/player/boy_down_1.png');
    this.load.image('playerDown2', '/player/boy_down_2.png');
    this.load.image('playerUp1', '/player/boy_up_1.png');
    this.load.image('playerUp2', '/player/boy_up_2.png');
    this.load.image('playerLeft1', '/player/boy_left_1.png');
    this.load.image('playerLeft2', '/player/boy_left_2.png');
    this.load.image('playerRight1', '/player/boy_right_1.png');
    this.load.image('playerRight2', '/player/boy_right_2.png');

    TILE_NAMES.forEach((tileName) => {
      this.load.image(`tile-${tileName}`, `/tiles/${tileName}.png`);
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');

    this.tileSize = 48;
    this.worldWidth = 50 * this.tileSize;
    this.worldHeight = 50 * this.tileSize;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.drawLegacyMap();

    this.player = this.physics.add.sprite(
      23 * this.tileSize + this.tileSize / 2,
      21 * this.tileSize + this.tileSize / 2,
      'playerDown1',
    );
    this.player.setCollideWorldBounds(true);
    this.player.setOrigin(0.5, 0.5);
    this.player.body.setSize(16, 16, true);
    this.player.setScale(3);
    this.player.setDepth(20);

    this.ensureAnimation('down-walk', ['playerDown1', 'playerDown2']);
    this.ensureAnimation('up-walk', ['playerUp1', 'playerUp2']);
    this.ensureAnimation('left-walk', ['playerLeft1', 'playerLeft2']);
    this.ensureAnimation('right-walk', ['playerRight1', 'playerRight2']);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      left: 'A',
      down: 'S',
      right: 'D',
    });

    this.speed = 220;
    this.currentFacing = 'down';

    this.hud = this.add.text(16, 16, 'WASD / Arrows to move', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#e2e8f0',
    }).setScrollFactor(0).setDepth(10);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  drawLegacyMap() {
    const mapLines = this.cache.text.get('worldV3').split(/\r?\n/).slice(0, 50);

    mapLines.forEach((line, row) => {
      const tileIds = line.trim().split(/\s+/);

      tileIds.forEach((tileId, col) => {
        const tileName = this.getTileName(Number(tileId));
        this.add
          .image(
            col * this.tileSize + this.tileSize / 2,
            row * this.tileSize + this.tileSize / 2,
            `tile-${tileName}`,
          )
          .setDisplaySize(this.tileSize, this.tileSize);
      });
    });
  }

  getTileName(tileId) {
    const tileNameById = [
      'voidimg',
      'voidimg',
      'stairs1',
      'stairs2',
      'spike',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass01',
      'water00',
      'water01',
      'water02',
      'water03',
      'water04',
      'water05',
      'water06',
      'water07',
      'water08',
      'water09',
      'water10',
      'water11',
      'water12',
      'water13',
      'road00',
      'road01',
      'road02',
      'road03',
      'road04',
      'road05',
      'road06',
      'road07',
      'road08',
      'road09',
      'road10',
      'road11',
      'road12',
      'earth',
      'wall',
      'tree',
      'hut',
      'floor01',
      'table01',
      'table02',
    ];

    return tileNameById[tileId] ?? 'voidimg';
  }

  ensureAnimation(key, textureKeys) {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: textureKeys.map((textureKey) => ({ key: textureKey })),
      frameRate: 6,
      repeat: -1,
    });
  }

  update() {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;

    let vx = 0;
    let vy = 0;

    if (left) {
      vx -= 1;
      this.currentFacing = 'left';
    }
    if (right) {
      vx += 1;
      this.currentFacing = 'right';
    }
    if (up) {
      vy -= 1;
      this.currentFacing = 'up';
    }
    if (down) {
      vy += 1;
      this.currentFacing = 'down';
    }

    if (vx !== 0 || vy !== 0) {
      const length = Math.hypot(vx, vy);
      this.player.setVelocity((vx / length) * this.speed, (vy / length) * this.speed);
      this.player.play(`${this.currentFacing}-walk`, true);
    } else {
      this.player.setVelocity(0, 0);
      this.player.stop();
      this.player.setTexture(this.getStandingTexture());
    }

  }

  getStandingTexture() {
    return {
      down: 'playerDown1',
      up: 'playerUp1',
      left: 'playerLeft1',
      right: 'playerRight1',
    }[this.currentFacing];
  }
}
