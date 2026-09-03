import Phaser from 'phaser';
import CreditsScene from './scenes/CreditsScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import WorldMapScene from './scenes/WorldMapScene.js';
import './style.css';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1020',
  width: 960,
  height: 540,
  scale: {
    // Resize the render surface itself instead of scaling a low-resolution canvas.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
    autoRound: true,
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
  scene: [WorldMapScene, ShopScene, GameScene, CreditsScene],
};

const game = new Phaser.Game(config);

window.__MYGAME2026__ = game;
