import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';
import './style.css';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1020',
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [GameScene],
};

new Phaser.Game(config);
