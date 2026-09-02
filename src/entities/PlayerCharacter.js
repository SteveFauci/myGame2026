import Phaser from 'phaser';
import { ITEM_TYPES, getItemDefinition } from '../data/items.js';
import Inventory from '../systems/Inventory.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];

const OPPOSITE_DIRECTION = Object.freeze({
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
});

export default class PlayerCharacter {
  constructor(scene, x, y) {
    this.scene = scene;
    this.tileSize = scene.tileSize;
    this.speed = 220;
    this.facing = 'down';

    this.stats = {
      level: 1,
      maxLife: 6,
      life: 6,
      maxMana: 4,
      mana: 4,
      strength: 5,
      dexterity: 1,
      coin: 500,
    };

    this.inventory = new Inventory(20);
    this.currentWeaponId = 'normalSword';
    this.currentShieldId = 'woodShield';
    this.inventory.add('normalSword');
    this.inventory.add('woodShield');
    this.inventory.add('key');
    this.inventory.add('redPotion', 2);

    this.sprite = scene.physics.add.sprite(x, y, 'playerDown1');
    this.sprite.setOrigin(0.5);
    this.sprite.body.setSize(16, 16, true);
    this.sprite.setScale(3);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(20);

    this.attackSprite = scene.add.image(x, y, 'playerAttackDown1');
    this.attackSprite.setOrigin(0.5);
    this.attackSprite.setScale(3);
    this.attackSprite.setDepth(21);
    this.attackSprite.setVisible(false);

    this.attackState = null;
    this.guarding = false;
    this.guardElapsed = 0;
    this.invulnerableUntil = 0;
    this.knockbackState = null;

    this.ensureAnimations();
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  get attackPower() {
    const weapon = this.getCurrentWeapon();
    return this.stats.strength * (weapon.attackValue ?? 0);
  }

  get defense() {
    const shield = this.getCurrentShield();
    return this.stats.dexterity * (shield.defenseValue ?? 0);
  }

  getCurrentWeapon() {
    return getItemDefinition(this.currentWeaponId);
  }

  getCurrentShield() {
    return getItemDefinition(this.currentShieldId);
  }

  update(input, enemies, delta) {
    if (this.knockbackState) {
      this.updateKnockback(delta);
      return;
    }

    if (this.attackState) {
      this.updateAttack(enemies, delta);
      return;
    }

    if (input.attackJustDown) {
      this.startAttack();
      return;
    }

    if (input.guardDown) {
      this.updateGuard(delta);
      return;
    }

    this.stopGuarding();
    this.updateMovement(input);
  }

  updateMovement(input) {
    let vx = 0;
    let vy = 0;

    if (input.left) {
      vx -= 1;
      this.facing = 'left';
    }
    if (input.right) {
      vx += 1;
      this.facing = 'right';
    }
    if (input.up) {
      vy -= 1;
      this.facing = 'up';
    }
    if (input.down) {
      vy += 1;
      this.facing = 'down';
    }

    if (vx === 0 && vy === 0) {
      this.sprite.setVelocity(0, 0);
      this.sprite.stop();
      this.sprite.setTexture(this.getStandingTexture());
      return;
    }

    const length = Math.hypot(vx, vy);
    this.sprite.setVelocity((vx / length) * this.speed, (vy / length) * this.speed);
    this.sprite.play(`${this.facing}-walk`, true);
  }

  updateGuard(delta) {
    if (!this.guarding) {
      this.guarding = true;
      this.guardElapsed = 0;
    }

    this.guardElapsed += delta;
    this.sprite.setVelocity(0, 0);
    this.sprite.stop();
    this.sprite.setTexture(`playerGuard${this.capitalize(this.facing)}`);
  }

  stopGuarding() {
    if (!this.guarding) {
      return;
    }

    this.guarding = false;
    this.guardElapsed = 0;
    this.sprite.setTexture(this.getStandingTexture());
  }

  startAttack() {
    if (this.guarding) {
      return;
    }

    this.attackState = {
      elapsed: 0,
      hitApplied: false,
    };
    this.sprite.setVelocity(0, 0);
    this.sprite.stop();
    this.sprite.setVisible(false);
    this.attackSprite.setVisible(true);
    this.renderAttackFrame(1);
  }

  updateAttack(enemies, delta) {
    this.attackState.elapsed += delta;

    if (this.attackState.elapsed < 80) {
      this.renderAttackFrame(1);
    } else {
      this.renderAttackFrame(2);
    }

    if (this.attackState.elapsed >= 80 && !this.attackState.hitApplied) {
      this.attackState.hitApplied = true;
      const attackBounds = this.getAttackBounds();

      enemies.forEach((enemy) => {
        if (!enemy.defeated && Phaser.Geom.Intersects.RectangleToRectangle(attackBounds, enemy.getHitbox())) {
          enemy.takeDamage(this.attackPower, this.facing, this.getCurrentWeapon().knockBackPower);
        }
      });
    }

    if (this.attackState.elapsed >= 240) {
      this.finishAttack();
    }
  }

  finishAttack() {
    this.attackState = null;
    this.attackSprite.setVisible(false);
    this.sprite.setVisible(true);
    this.sprite.setTexture(this.getStandingTexture());
  }

  getAttackBounds() {
    const attackWidth = this.getCurrentWeapon().attackWidth;
    const attackHeight = this.getCurrentWeapon().attackHeight;
    const range = this.tileSize;

    switch (this.facing) {
      case 'up':
        return new Phaser.Geom.Rectangle(
          this.x - attackWidth / 2,
          this.y - this.tileSize / 2 - range,
          attackWidth,
          range,
        );
      case 'down':
        return new Phaser.Geom.Rectangle(
          this.x - attackWidth / 2,
          this.y + this.tileSize / 2,
          attackWidth,
          range,
        );
      case 'left':
        return new Phaser.Geom.Rectangle(
          this.x - this.tileSize / 2 - range,
          this.y - attackHeight / 2,
          range,
          attackHeight,
        );
      case 'right':
        return new Phaser.Geom.Rectangle(
          this.x + this.tileSize / 2,
          this.y - attackHeight / 2,
          range,
          attackHeight,
        );
      default:
        return new Phaser.Geom.Rectangle(this.x, this.y, 0, 0);
    }
  }

  receiveDamage(rawAttack, attackerDirection, attacker) {
    if (this.scene.time.now < this.invulnerableUntil) {
      return { damage: 0, result: 'invulnerable' };
    }

    let damage = Math.max(1, rawAttack - this.defense);
    const canParryFrom = OPPOSITE_DIRECTION[attackerDirection];
    let result = 'hit';

    if (this.guarding && this.facing === canParryFrom) {
      if (this.guardElapsed < 170) {
        damage = 0;
        result = 'parry';
        attacker?.stagger(900);
      } else {
        damage = Math.floor(damage / 3);
        result = 'block';
      }
    }

    if (damage > 0) {
      this.stats.life = Math.max(0, this.stats.life - damage);
      this.startKnockback(attackerDirection, attacker?.knockBackPower ?? 0);
    }

    this.invulnerableUntil = this.scene.time.now + 650;
    this.sprite.setTint(result === 'hit' ? 0xff7777 : 0x9ee7ff);
    this.scene.time.delayedCall(180, () => this.sprite.clearTint());

    return { damage, result };
  }

  startKnockback(direction, power) {
    this.knockbackState = {
      direction,
      remaining: 80 + power * 12,
    };
  }

  updateKnockback(delta) {
    const knockbackSpeed = 240;
    const velocity = { x: 0, y: 0 };

    if (this.knockbackState.direction === 'up') {
      velocity.y = -knockbackSpeed;
    }
    if (this.knockbackState.direction === 'down') {
      velocity.y = knockbackSpeed;
    }
    if (this.knockbackState.direction === 'left') {
      velocity.x = -knockbackSpeed;
    }
    if (this.knockbackState.direction === 'right') {
      velocity.x = knockbackSpeed;
    }

    this.sprite.setVelocity(velocity.x, velocity.y);
    this.knockbackState.remaining -= (delta / 1000) * knockbackSpeed;

    if (this.knockbackState.remaining <= 0) {
      this.knockbackState = null;
      this.sprite.setVelocity(0, 0);
      this.sprite.setTexture(this.getStandingTexture());
    }
  }

  selectInventoryItem(index) {
    const slot = this.inventory.get(index);

    if (!slot) {
      return 'Empty slot';
    }

    const item = getItemDefinition(slot.itemId);

    if (item.type === ITEM_TYPES.weapon) {
      this.currentWeaponId = item.id;
      return `Equipped ${item.name}`;
    }

    if (item.type === ITEM_TYPES.shield) {
      this.currentShieldId = item.id;
      return `Equipped ${item.name}`;
    }

    if (item.type === ITEM_TYPES.consumable) {
      this.stats.life = Math.min(this.stats.maxLife, this.stats.life + item.value);
      this.inventory.removeOne(index);
      return `Used ${item.name}`;
    }

    return item.name;
  }

  getStandingTexture() {
    return `player${this.capitalize(this.facing)}1`;
  }

  ensureAnimations() {
    DIRECTIONS.forEach((direction) => {
      const animationKey = `${direction}-walk`;
      if (this.scene.anims.exists(animationKey)) {
        return;
      }

      this.scene.anims.create({
        key: animationKey,
        frames: [
          { key: `player${this.capitalize(direction)}1` },
          { key: `player${this.capitalize(direction)}2` },
        ],
        frameRate: 6,
        repeat: -1,
      });
    });
  }

  renderAttackFrame(frame) {
    const textureKey = `playerAttack${this.capitalize(this.facing)}${frame}`;
    const offsets = {
      up: { x: 0, y: -this.tileSize / 2 },
      down: { x: 0, y: this.tileSize / 2 },
      left: { x: -this.tileSize / 2, y: 0 },
      right: { x: this.tileSize / 2, y: 0 },
    };
    const offset = offsets[this.facing];

    this.attackSprite
      .setTexture(textureKey)
      .setPosition(this.x + offset.x, this.y + offset.y);
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
