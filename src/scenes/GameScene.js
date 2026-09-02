export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.image('playerDown1', '/player/boy_down_1.png');
    this.load.image('playerDown2', '/player/boy_down_2.png');
    this.load.image('playerUp1', '/player/boy_up_1.png');
    this.load.image('playerUp2', '/player/boy_up_2.png');
    this.load.image('playerLeft1', '/player/boy_left_1.png');
    this.load.image('playerLeft2', '/player/boy_left_2.png');
    this.load.image('playerRight1', '/player/boy_right_1.png');
    this.load.image('playerRight2', '/player/boy_right_2.png');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');

    this.worldWidth = 3200;
    this.worldHeight = 2400;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.drawGrid();

    this.player = this.physics.add.sprite(480, 360, 'playerDown1');
    this.player.setCollideWorldBounds(true);
    this.player.setOrigin(0.5, 0.5);
    this.player.body.setSize(24, 30, true);

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

  drawGrid() {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x1f2a44, 1);

    for (let x = 0; x <= this.worldWidth; x += 64) {
      graphics.lineBetween(x, 0, x, this.worldHeight);
    }

    for (let y = 0; y <= this.worldHeight; y += 64) {
      graphics.lineBetween(0, y, this.worldWidth, y);
    }
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
      this.player.setTexture(`player${this.currentFacing[0].toUpperCase()}${this.currentFacing.slice(1)}1`);
    }

  }
}
