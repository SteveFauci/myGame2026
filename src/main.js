import Phaser from 'phaser';
import TitleScene from './scenes/TitleScene.js';
import WorldMapScene from './scenes/WorldMapScene.js';
import LevelScene from './scenes/LevelScene.js';
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
    antialias: true,
    pixelArt: false,
  },
  scene: [TitleScene, WorldMapScene, LevelScene],
};

new Phaser.Game(config);
