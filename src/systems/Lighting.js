import Phaser from 'phaser';

const DAY_STATES = Object.freeze({
  day: 'day',
  dusk: 'dusk',
  night: 'night',
  dawn: 'dawn',
});

const DAY_STATE_LABELS = Object.freeze({
  [DAY_STATES.day]: 'Day',
  [DAY_STATES.dusk]: 'Dusk',
  [DAY_STATES.night]: 'Night',
  [DAY_STATES.dawn]: 'Dawn',
});

export default class Lighting {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.mode = options.mode ?? 'cycle';
    this.permanentNight = this.mode === 'permanentNight';
    this.destroyed = false;
    this.state = this.permanentNight ? DAY_STATES.night : DAY_STATES.day;
    this.stateElapsed = 0;
    this.filterAlpha = this.permanentNight ? 1 : 0;
    this.dayDuration = 10000;
    this.nightDuration = 10000;
    this.transitionDuration = 16667;
    this.textureKey = 'lighting-overlay';

    this.texture = scene.textures.exists(this.textureKey)
      ? scene.textures.get(this.textureKey)
      : scene.textures.createCanvas(
        this.textureKey,
        Math.max(1, Math.floor(scene.scale.width)),
        Math.max(1, Math.floor(scene.scale.height)),
      );
    this.canvas = this.texture.getCanvas();
    this.context = this.texture.getContext();
    this.overlay = scene.add.image(0, 0, this.textureKey)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(80);

    this.scene.scale.on('resize', this.handleResize, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.resize(scene.scale.width, scene.scale.height);
  }

  getStateLabel() {
    return DAY_STATE_LABELS[this.state];
  }

  getCurrentLightRadius() {
    const light = this.scene.player?.getCurrentLight?.();
    return light?.lightRadius ?? 0;
  }

  update(delta) {
    if (this.permanentNight) {
      this.state = DAY_STATES.night;
      this.stateElapsed = 0;
      this.filterAlpha = 1;
      this.redraw();
      return;
    }

    const safeDelta = Math.min(Math.max(delta, 0), 250);
    this.stateElapsed += safeDelta;

    if (this.state === DAY_STATES.day && this.stateElapsed >= this.dayDuration) {
      this.state = DAY_STATES.dusk;
      this.stateElapsed = 0;
    } else if (this.state === DAY_STATES.dusk && this.stateElapsed >= this.transitionDuration) {
      this.state = DAY_STATES.night;
      this.stateElapsed = 0;
    } else if (this.state === DAY_STATES.night && this.stateElapsed >= this.nightDuration) {
      this.state = DAY_STATES.dawn;
      this.stateElapsed = 0;
    } else if (this.state === DAY_STATES.dawn && this.stateElapsed >= this.transitionDuration) {
      this.state = DAY_STATES.day;
      this.stateElapsed = 0;
    }

    this.filterAlpha = this.getFilterAlpha();
    this.redraw();
  }

  getFilterAlpha() {
    if (this.state === DAY_STATES.day) {
      return 0;
    }
    if (this.state === DAY_STATES.night) {
      return 1;
    }
    if (this.state === DAY_STATES.dusk) {
      return Math.min(1, this.stateElapsed / this.transitionDuration);
    }
    return Math.max(0, 1 - this.stateElapsed / this.transitionDuration);
  }

  resetDay() {
    if (this.permanentNight) {
      this.state = DAY_STATES.night;
      this.stateElapsed = 0;
      this.filterAlpha = 1;
      this.redraw();
      return;
    }

    this.state = DAY_STATES.day;
    this.stateElapsed = 0;
    this.filterAlpha = 0;
    this.redraw();
  }

  handleResize(gameSize) {
    this.resize(gameSize.width, gameSize.height);
  }

  resize(width, height) {
    const nextWidth = Math.max(1, Math.floor(width || this.scene.scale.width));
    const nextHeight = Math.max(1, Math.floor(height || this.scene.scale.height));

    this.texture.setSize(nextWidth, nextHeight);
    this.canvas = this.texture.getCanvas();
    this.context = this.texture.getContext();
    this.overlay.setPosition(0, 0).setDisplaySize(nextWidth, nextHeight);
    this.redraw();
  }

  redraw() {
    if (!this.context || !this.canvas) {
      return;
    }

    const width = this.canvas.width;
    const height = this.canvas.height;
    const context = this.context;
    context.clearRect(0, 0, width, height);

    if (this.filterAlpha <= 0.001) {
      this.texture.refresh();
      return;
    }

    const darknessAlpha = Math.min(0.95, this.filterAlpha * 0.95);
    context.fillStyle = `rgba(0, 0, 26, ${darknessAlpha})`;
    context.fillRect(0, 0, width, height);

    const playerRadius = this.getCurrentLightRadius();
    if (playerRadius > 0 && this.scene.player) {
      const camera = this.scene.cameras.main;
      const centerX = this.scene.player.x - camera.scrollX;
      const centerY = this.scene.player.y - camera.scrollY;
      this.drawLightCircle(context, centerX, centerY, playerRadius);
    }

    (this.scene.projectiles ?? []).forEach((projectile) => {
      if (!projectile.alive || projectile.lightRadius <= 0 || !projectile.sprite) {
        return;
      }

      const camera = this.scene.cameras.main;
      this.drawLightCircle(
        context,
        projectile.sprite.x - camera.scrollX,
        projectile.sprite.y - camera.scrollY,
        projectile.lightRadius,
      );
    });

    this.texture.refresh();
  }

  drawLightCircle(context, centerX, centerY, radius) {
    const gradient = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius,
    );

    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
    gradient.addColorStop(0.25, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
    gradient.addColorStop(0.75, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    context.globalCompositeOperation = 'destination-out';
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.scene?.scale) {
      this.scene.scale.off('resize', this.handleResize, this);
    }
    this.overlay?.destroy();
    this.texture?.destroy();
    this.overlay = null;
    this.texture = null;
    this.context = null;
    this.canvas = null;
    this.scene = null;
  }
}
