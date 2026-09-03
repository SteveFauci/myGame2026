import Phaser from 'phaser';

const DEFAULT_TEXTURE_KEYS = Object.freeze({
  up: ['fireballUp1', 'fireballUp2'],
  down: ['fireballDown1', 'fireballDown2'],
  left: ['fireballLeft1', 'fireballLeft2'],
  right: ['fireballRight1', 'fireballRight2'],
});

const DIRECTION_VECTORS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

export default class Projectile {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.owner = options.owner ?? null;
    this.direction = options.direction ?? 'down';
    this.damage = options.damage ?? 1;
    this.knockBackPower = options.knockBackPower ?? 0;
    this.speed = options.speed ?? 360;
    this.lightRadius = options.lightRadius ?? 0;
    this.maxLife = options.maxLife ?? 1200;
    this.life = this.maxLife;
    this.alive = true;
    this.textureKeys = options.textureKeys ?? DEFAULT_TEXTURE_KEYS;
    this.scale = options.scale ?? 3;
    this.depth = options.depth ?? 22;
    this.frameElapsed = 0;
    this.frameIndex = 0;

    const spawn = this.getSpawnPosition(options.x ?? 0, options.y ?? 0, options.offset ?? 22);
    this.sprite = scene.add.image(spawn.x, spawn.y, this.getTextureKey())
      .setOrigin(0.5)
      .setScale(this.scale)
      .setDepth(this.depth);
  }

  getSpawnPosition(x, y, offset) {
    const vector = DIRECTION_VECTORS[this.direction] ?? DIRECTION_VECTORS.down;

    return {
      x: x + vector.x * offset,
      y: y + vector.y * offset,
    };
  }

  getTextureKey() {
    const frames = this.textureKeys[this.direction] ?? this.textureKeys.down ?? DEFAULT_TEXTURE_KEYS.down;
    return frames[this.frameIndex] ?? frames[0];
  }

  getHitbox() {
    return new Phaser.Geom.Rectangle(this.sprite.x - 12, this.sprite.y - 12, 24, 24);
  }

  update(time, delta, enemies = []) {
    if (!this.alive) {
      return;
    }

    this.frameElapsed += delta;
    if (this.frameElapsed >= 120) {
      this.frameElapsed = 0;
      this.frameIndex = this.frameIndex === 0 ? 1 : 0;
      this.sprite.setTexture(this.getTextureKey());
    }

    const vector = DIRECTION_VECTORS[this.direction] ?? DIRECTION_VECTORS.down;
    const distance = this.speed * (delta / 1000);
    const nextX = this.sprite.x + vector.x * distance;
    const nextY = this.sprite.y + vector.y * distance;

    if (
      nextX < 0
      || nextY < 0
      || nextX > this.scene.worldWidth
      || nextY > this.scene.worldHeight
      || !this.scene.canProjectileOccupy(nextX, nextY)
    ) {
      this.destroy();
      return;
    }

    this.sprite.x = nextX;
    this.sprite.y = nextY;

    if (
      this.sprite.x < -this.scene.tileSize
      || this.sprite.y < -this.scene.tileSize
      || this.sprite.x > this.scene.worldWidth + this.scene.tileSize
      || this.sprite.y > this.scene.worldHeight + this.scene.tileSize
    ) {
      this.destroy();
      return;
    }

    const hitbox = this.getHitbox();
    for (const enemy of enemies) {
      if (!enemy || enemy === this.owner || enemy.defeated || enemy.dying || enemy.removed) {
        continue;
      }

      const enemyBounds = enemy.getHitbox?.() ?? enemy.getCollisionBounds?.();
      if (!enemyBounds) {
        continue;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, enemyBounds)) {
        enemy.takeDamage?.(this.damage, this.direction, this.knockBackPower);
        this.destroy();
        return;
      }
    }

    this.life -= delta;
    if (this.life <= 0) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.alive) {
      return;
    }

    this.alive = false;
    this.sprite?.destroy();
    this.scene?.removeProjectile?.(this);
  }
}
