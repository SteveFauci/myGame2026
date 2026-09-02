export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add
      .text(width / 2, height / 2 - 28, 'myGame2026', {
        fontFamily: 'Arial',
        fontSize: '52px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 34, 'Enter', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);

    const startGame = () => {
      this.scene.start('WorldMapScene');
    };

    this.input.keyboard.once('keydown-ENTER', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.once('pointerdown', startGame);
  }
}
