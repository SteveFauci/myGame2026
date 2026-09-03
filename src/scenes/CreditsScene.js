import Phaser from 'phaser';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';

const STORY_LINES = Object.freeze([
  'After a fierce battle with the Skeleton Lord,',
  'the Blue Boy finally found the legendary treasure.',
  'But his journey does not end here.',
  'The true adventure has just begun.',
]);

const CREDIT_LINES = Object.freeze([
  'DEVELOPMENT TEAM',
  'Zhang Chi (@QzlabQ)  Huang Haicheng (@CodeAstronauth)',
  'Hu Yunfan (@Qwqwqwert)  Fu Qi (@SteveFauci)',
  '',
  'Lead Engine Architect & Project Manager',
  'Zhang Chi (@QzlabQ)',
  '',
  'Core Gameplay Implementation',
  'Huang Haicheng (@CodeAstronauth)',
  '',
  'Tools Developer & System Polish',
  'Hu Yunfan (@Qwqwqwert)',
  '',
  'Level Design & Boss Mechanics',
  'Fu Qi (@SteveFauci)',
  '',
  'ACKNOWLEDGEMENT',
  '',
  'Original Tutorial & Assets',
  'RyiSnow (YouTube)',
  '',
  'SPECIAL THANKS',
  '',
  'Tester Name 1',
  'Tester Name 2',
  '',
  'Thank you for playing!',
  '',
  'December 2025',
  '',
  'Beihang University, School of Software',
]);

export default class CreditsScene extends Phaser.Scene {
  constructor() {
    super('CreditsScene');
    this.returnSceneKey = 'TitleScene';
    this.returnSceneData = {};
    this.phase = 'story';
    this.elapsed = 0;
  }

  init(data = {}) {
    this.returnSceneKey = data.returnSceneKey ?? 'TitleScene';
    this.returnSceneData = data.returnSceneData ?? {};
    this.phase = 'story';
    this.elapsed = 0;
  }

  preload() {
    preloadAudio(this.load);
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.audio = new AudioManager(this);
    this.audio.stopMusic();
    this.audio.playSfx('sfx-fanfare', { volume: 0.7 });

    this.keys = this.input.keyboard.addKeys({
      confirm: 'ENTER',
      interact: 'F',
      cancel: 'ESC',
    });

    this.storyText = this.add.text(0, 0, STORY_LINES.join('\n'), {
      fontFamily: 'MaruMonica',
      fontSize: '36px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 16,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    this.titleText = this.add.text(0, 0, 'Blue Boy Adventure', {
      fontFamily: 'MaruMonica',
      fontSize: '72px',
      color: '#f8fafc',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.creditText = this.add.text(0, 0, CREDIT_LINES.join('\n'), {
      fontFamily: 'MaruMonica',
      fontSize: '28px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 13,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0);

    this.exitHint = this.add.text(0, 0, 'F / Enter: return to Title Screen', {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#94a3b8',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 1);

    this.layout();
    this.scale.on('resize', this.layout, this);

    this.tweens.add({
      targets: this.storyText,
      alpha: 1,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
  }

  layout() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.storyText?.setPosition(centerX, centerY - 16);
    this.storyText?.setWordWrapWidth(Math.min(820, this.scale.width - 48));
    this.titleText?.setPosition(centerX, centerY);
    this.creditText?.setPosition(centerX, this.scale.height);
    this.creditText?.setWordWrapWidth(Math.min(900, this.scale.width - 48));
    this.exitHint?.setPosition(centerX, this.scale.height - 22);
  }

  update(_time, delta) {
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.confirm)
      || Phaser.Input.Keyboard.JustDown(this.keys.interact)
      || Phaser.Input.Keyboard.JustDown(this.keys.cancel)
    ) {
      this.returnToReturnScene();
      return;
    }

    this.elapsed += delta;

    if (this.phase === 'story' && this.elapsed > 6200) {
      this.phase = 'title';
      this.elapsed = 0;
      this.tweens.add({
        targets: this.storyText,
        alpha: 0,
        duration: 700,
        ease: 'Cubic.easeIn',
      });
      this.tweens.add({
        targets: this.titleText,
        alpha: 1,
        duration: 900,
        delay: 500,
        ease: 'Cubic.easeOut',
      });
      this.audio.playMusic('music-overworld');
      return;
    }

    if (this.phase === 'title' && this.elapsed > 3600) {
      this.phase = 'credits';
      this.elapsed = 0;
      this.tweens.add({
        targets: this.titleText,
        alpha: 0,
        duration: 500,
        ease: 'Cubic.easeIn',
      });
      return;
    }

    if (this.phase === 'credits') {
      this.creditText.y -= delta * 0.035;
      if (this.creditText.y + this.creditText.height < 96) {
        this.creditText.y = this.scale.height;
      }
    }
  }

  returnToReturnScene() {
    const returnScene = this.returnSceneKey ? this.scene.get(this.returnSceneKey) : null;

    if (returnScene) {
      returnScene.onCreditsReturn?.(this.returnSceneData);
      this.scene.resume(this.returnSceneKey);
      this.scene.stop();
      return;
    }

    this.scene.start(this.returnSceneKey ?? 'TitleScene', this.returnSceneData);
  }
}
