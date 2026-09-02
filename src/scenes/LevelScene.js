import { CHAPTER_BY_ID, createDefaultProgress, getNextChapterId } from '../data/chapters.js';

export default class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  init(data = {}) {
    this.chapterId = data.chapterId ?? 'village';
  }

  create() {
    this.cameras.main.setBackgroundColor('#111827');

    this.progress = this.registry.get('chapterProgress');
    if (!this.progress) {
      this.progress = createDefaultProgress();
      this.registry.set('chapterProgress', this.progress);
    }

    this.chapter = CHAPTER_BY_ID[this.chapterId];
    this.nextChapterId = getNextChapterId(this.chapterId);

    const { width, height } = this.scale;
    const roomWidth = Math.min(width - 120, 780);
    const roomHeight = Math.min(height - 140, 360);
    const roomX = width / 2 - roomWidth / 2;
    const roomY = height / 2 - roomHeight / 2;

    this.add
      .text(24, 20, this.chapter.name, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setDepth(2);

    this.room = this.add.rectangle(
      width / 2,
      height / 2,
      roomWidth,
      roomHeight,
      0x1f2937,
    );
    this.room.setStrokeStyle(4, 0x475569);

    this.player = this.add.rectangle(roomX + 70, roomY + roomHeight / 2, 22, 22, 0x60a5fa);
    this.player.setStrokeStyle(2, 0xffffff);

    this.exit = this.add.circle(roomX + roomWidth - 60, roomY + 70, 16, 0x22c55e);
    this.exit.setStrokeStyle(2, 0xffffff);

    this.statusText = this.add.text(24, 50, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cbd5e1',
    });

    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      enter: 'ENTER',
      escape: 'ESC',
      upArrow: 'UP',
      downArrow: 'DOWN',
      leftArrow: 'LEFT',
      rightArrow: 'RIGHT',
    });

    this.roomBounds = {
      left: roomX + 20,
      right: roomX + roomWidth - 20,
      top: roomY + 20,
      bottom: roomY + roomHeight - 20,
    };

    this.moveSpeed = 220;
    this.refreshStatus();
  }

  refreshStatus() {
    const nextLabel = this.nextChapterId ? CHAPTER_BY_ID[this.nextChapterId].name : '无后续章节';
    this.statusText.setText(`Exit -> ${nextLabel}`);
  }

  completeChapter() {
    if (this.nextChapterId) {
      this.progress[this.nextChapterId] = true;
      this.registry.set('chapterProgress', this.progress);
    }

    this.scene.start('WorldMapScene', {
      focusChapterId: this.nextChapterId ?? this.chapterId,
    });
  }

  update(time, delta) {
    const step = (this.moveSpeed * delta) / 1000;
    let dx = 0;
    let dy = 0;

    if (this.keys.left.isDown || this.keys.leftArrow.isDown) dx -= 1;
    if (this.keys.right.isDown || this.keys.rightArrow.isDown) dx += 1;
    if (this.keys.up.isDown || this.keys.upArrow.isDown) dy -= 1;
    if (this.keys.down.isDown || this.keys.downArrow.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      this.player.x += (dx / length) * step;
      this.player.y += (dy / length) * step;
    }

    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      this.roomBounds.left,
      this.roomBounds.right,
    );
    this.player.y = Phaser.Math.Clamp(
      this.player.y,
      this.roomBounds.top,
      this.roomBounds.bottom,
    );

    const nearExit = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.exit.x,
      this.exit.y,
    ) < 36;

    if (nearExit) {
      this.exit.setFillStyle(0x4ade80);
      if (
        Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.keys.space)
      ) {
        this.completeChapter();
      }
    } else {
      this.exit.setFillStyle(0x22c55e);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.escape)) {
      this.scene.start('WorldMapScene', { focusChapterId: this.chapterId });
    }
  }
}
