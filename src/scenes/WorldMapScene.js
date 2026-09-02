import {
  CHAPTERS,
  createDefaultProgress,
  getChapterIndex,
} from '../data/chapters.js';

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
  }

  create(data = {}) {
    this.cameras.main.setBackgroundColor('#08111f');

    this.progress = this.registry.get('chapterProgress');
    if (!this.progress) {
      this.progress = createDefaultProgress();
      this.registry.set('chapterProgress', this.progress);
    }

    const requestedIndex = getChapterIndex(data.focusChapterId);
    this.currentIndex =
      requestedIndex >= 0 && this.progress[CHAPTERS[requestedIndex].id]
        ? requestedIndex
        : this.firstUnlockedIndex();

    this.graphics = this.add.graphics();
    this.avatar = this.add.rectangle(0, 0, 18, 18, 0xfbbf24);
    this.avatar.setStrokeStyle(2, 0xffffff);

    this.chapterNameText = this.add.text(24, 20, '', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#e5e7eb',
    });

    this.hintText = this.add.text(24, 48, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#94a3b8',
    });

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      enter: 'ENTER',
      space: 'SPACE',
      a: 'A',
      d: 'D',
    });

    this.redraw();
    this.moveAvatar(false);
    this.refreshText();
  }

  firstUnlockedIndex() {
    return CHAPTERS.findIndex((chapter) => this.progress[chapter.id]);
  }

  redraw() {
    this.graphics.clear();

    this.graphics.fillStyle(0x0f172a, 1);
    this.graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    this.graphics.lineStyle(6, 0x334155, 1);
    for (let i = 0; i < CHAPTERS.length - 1; i += 1) {
      const from = CHAPTERS[i];
      const to = CHAPTERS[i + 1];
      this.graphics.lineBetween(from.x, from.y, to.x, to.y);
    }

    for (let i = 0; i < CHAPTERS.length; i += 1) {
      const chapter = CHAPTERS[i];
      const unlocked = Boolean(this.progress[chapter.id]);
      const selected = i === this.currentIndex;

      this.graphics.fillStyle(unlocked ? 0x2563eb : 0x475569, 1);
      this.graphics.fillCircle(chapter.x, chapter.y, selected ? 18 : 14);

      if (selected) {
        this.graphics.lineStyle(4, 0xfbbf24, 1);
        this.graphics.strokeCircle(chapter.x, chapter.y, 24);
      }

      this.graphics.lineStyle(2, 0xe2e8f0, 1);
      this.graphics.strokeCircle(chapter.x, chapter.y, 14);
    }
  }

  refreshText() {
    const chapter = CHAPTERS[this.currentIndex];
    const unlocked = Boolean(this.progress[chapter.id]);
    this.chapterNameText.setText(chapter.name);
    this.hintText.setText(unlocked ? 'Enter' : '');
  }

  moveAvatar(animate = true) {
    const chapter = CHAPTERS[this.currentIndex];

    if (!animate) {
      this.avatar.setPosition(chapter.x, chapter.y - 34);
      return;
    }

    if (this.avatarTween) {
      this.avatarTween.stop();
    }

    this.avatarTween = this.tweens.add({
      targets: this.avatar,
      x: chapter.x,
      y: chapter.y - 34,
      duration: 160,
      ease: 'Sine.easeOut',
    });
  }

  moveSelection(direction) {
    let nextIndex = this.currentIndex;

    if (direction > 0) {
      for (let i = this.currentIndex + 1; i < CHAPTERS.length; i += 1) {
        if (this.progress[CHAPTERS[i].id]) {
          nextIndex = i;
          break;
        }
      }
    } else {
      for (let i = this.currentIndex - 1; i >= 0; i -= 1) {
        if (this.progress[CHAPTERS[i].id]) {
          nextIndex = i;
          break;
        }
      }
    }

    if (nextIndex !== this.currentIndex) {
      this.currentIndex = nextIndex;
      this.redraw();
      this.moveAvatar(true);
      this.refreshText();
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.right) || Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      this.moveSelection(1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.left) || Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      this.moveSelection(-1);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      const chapter = CHAPTERS[this.currentIndex];
      if (this.progress[chapter.id]) {
        this.scene.start('LevelScene', { chapterId: chapter.id });
      }
    }
  }
}
