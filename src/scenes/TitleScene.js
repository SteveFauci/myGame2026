import Phaser from 'phaser';
import { loadProgress, resetProgress } from '../data/progress.js';
import { resetPlayerState } from '../data/playerState.js';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';

const TITLE_OPTIONS = Object.freeze([
  { key: 'new-game', label: 'NEW GAME' },
  { key: 'load-game', label: 'LOAD GAME' },
  { key: 'credits', label: 'CREDITS', unlockedOnly: true },
  { key: 'quit', label: 'QUIT' },
]);

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
    this.progress = null;
    this.menuEntries = [];
    this.menuCursor = 0;
    this.statusMessage = '';
    this.statusTimer = null;
  }

  init(data = {}) {
    this.launchData = data;
  }

  preload() {
    preloadAudio(this.load);
    this.load.image('title-boy-1', '/player/boy_down_1.png');
    this.load.image('title-boy-2', '/player/boy_down_2.png');
  }

  create() {
    this.progress = loadProgress();
    this.menuCursor = 0;
    this.statusMessage = '';
    this.cameras.main.setBackgroundColor('#000000');

    this.audio = new AudioManager(this);
    this.audio.playMusic('music-overworld');

    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      confirm: 'ENTER',
      interact: 'F',
    });

    this.createAnimations();
    this.createUi();
    this.layoutUi();

    this.scale.on('resize', this.layoutUi, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  createAnimations() {
    if (this.anims.exists('title-boy-idle')) {
      return;
    }

    this.anims.create({
      key: 'title-boy-idle',
      frames: [
        { key: 'title-boy-1' },
        { key: 'title-boy-2' },
      ],
      frameRate: 4,
      repeat: -1,
    });
  }

  createUi() {
    const titleStyle = {
      fontFamily: 'MaruMonica',
      fontSize: '78px',
      color: '#f8fafc',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 8,
    };
    const menuStyle = {
      fontFamily: 'MaruMonica',
      fontSize: '42px',
      color: '#f8fafc',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    };
    const statusStyle = {
      fontFamily: 'MaruMonica',
      fontSize: '20px',
      color: '#cbd5e1',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    };

    this.titleShadow = this.add.text(0, 0, 'Blue Boy Adventure', {
      ...titleStyle,
      color: '#000000',
    }).setOrigin(0.5).setAlpha(0.9);

    this.titleText = this.add.text(0, 0, 'Blue Boy Adventure', titleStyle)
      .setOrigin(0.5);

    this.heroSprite = this.add.sprite(0, 0, 'title-boy-1')
      .setOrigin(0.5)
      .setScale(3.5);
    this.heroSprite.play('title-boy-idle');
    this.tweens.add({
      targets: this.heroSprite,
      y: '+=4',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const availableEntries = TITLE_OPTIONS.filter((option) => (
      !option.unlockedOnly || this.progress?.bossTreasureCollected
    ));

    this.menuEntries = availableEntries.map((option) => ({
      ...option,
      text: this.add.text(0, 0, option.label, menuStyle)
        .setOrigin(0.5),
    }));

    this.menuCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '40px',
      color: '#f8fafc',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.statusText = this.add.text(0, 0, '', statusStyle)
      .setOrigin(0.5)
      .setVisible(false);

    this.menuEntries.forEach((entry) => {
      entry.text.setInteractive({ useHandCursor: true });
      entry.text.on('pointerover', () => {
        const index = this.menuEntries.indexOf(entry);
        if (index !== -1) {
          this.menuCursor = index;
          this.updateCursor();
        }
      });
      entry.text.on('pointerdown', () => {
        const index = this.menuEntries.indexOf(entry);
        if (index !== -1) {
          this.menuCursor = index;
          this.updateCursor();
          this.activateSelection();
        }
      });
    });

    this.updateCursor();
  }

  layoutUi() {
    const centerX = this.scale.width / 2;
    const titleY = Math.round(this.scale.height * 0.22);
    const heroY = Math.round(this.scale.height * 0.43);
    const menuStartY = Math.round(this.scale.height * 0.60);
    const menuGap = 52;

    this.titleShadow?.setPosition(centerX + 6, titleY + 6);
    this.titleText?.setPosition(centerX, titleY);
    this.heroSprite?.setPosition(centerX, heroY);

    this.menuEntries.forEach((entry, index) => {
      entry.text?.setPosition(centerX, menuStartY + index * menuGap);
    });

    if (this.menuEntries.length > 0) {
      this.updateCursor();
    } else {
      this.menuCursorText?.setVisible(false);
    }

    this.statusText?.setPosition(centerX, this.scale.height - 22);
  }

  updateCursor() {
    if (!this.menuEntries.length) {
      return;
    }

    this.menuCursor = Phaser.Math.Wrap(this.menuCursor, 0, this.menuEntries.length);
    this.menuEntries.forEach((entry, index) => {
      entry.text.setColor(index === this.menuCursor ? '#ffffff' : '#dbe4f0');
    });

    const selectedBounds = this.menuEntries[this.menuCursor].text.getBounds();
    this.menuCursorText?.setVisible(true);
    this.menuCursorText?.setPosition(
      Math.floor(selectedBounds.x - 38),
      Math.floor(selectedBounds.y + selectedBounds.height / 2 + 2),
    );
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.menuCursor -= 1;
      this.updateCursor();
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) {
      this.menuCursor += 1;
      this.updateCursor();
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
    }

    if (this.consumeConfirmInput()) {
      this.activateSelection();
    }
  }

  consumeConfirmInput() {
    return (
      Phaser.Input.Keyboard.JustDown(this.keys.confirm)
      || Phaser.Input.Keyboard.JustDown(this.keys.interact)
    );
  }

  activateSelection() {
    const selected = this.menuEntries[this.menuCursor];
    if (!selected) {
      return;
    }

    switch (selected.key) {
      case 'new-game':
        this.startNewGame();
        break;
      case 'load-game':
        this.loadGame();
        break;
      case 'credits':
        this.openCredits();
        break;
      case 'quit':
        this.showStatus('Quit is unavailable in this browser.');
        this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
        break;
      default:
        break;
    }
  }

  startNewGame() {
    resetProgress();
    resetPlayerState();
    this.audio?.stopMusic();
    this.scene.start('WorldMapScene', {
      returnNodeId: 'village',
    });
  }

  loadGame() {
    this.audio?.stopMusic();
    this.scene.start('WorldMapScene', {
      returnNodeId: 'village',
    });
  }

  openCredits() {
    this.scene.pause();
    this.scene.launch('CreditsScene', {
      returnSceneKey: 'TitleScene',
      returnMode: 'resume',
      returnSceneData: {},
    });
  }

  showStatus(message, duration = 2000) {
    if (!this.statusText) {
      return;
    }

    if (this.statusTimer) {
      this.statusTimer.remove(false);
      this.statusTimer = null;
    }

    this.statusMessage = message;
    this.statusText.setText(message);
    this.statusText.setVisible(Boolean(message));

    if (!message || duration <= 0) {
      return;
    }

    this.statusTimer = this.time.delayedCall(duration, () => {
      this.statusText?.setVisible(false);
      this.statusMessage = '';
      this.statusTimer = null;
    });
  }

  onCreditsReturn(data = {}) {
    if (data?.bannerText) {
      this.showStatus(data.bannerText, 2600);
    }
  }

  handleShutdown() {
    this.scale.off('resize', this.layoutUi, this);

    if (this.statusTimer) {
      this.statusTimer.remove(false);
      this.statusTimer = null;
    }
  }
}
