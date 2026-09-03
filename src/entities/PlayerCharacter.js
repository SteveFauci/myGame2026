import Phaser from 'phaser';
import { COMBAT_RULES } from '../data/combat.js';
import { ITEM_TYPES, getItemDefinition } from '../data/items.js';
import { PLAYER_PROGRESSION } from '../data/progression.js';
import { loadPlayerState } from '../data/playerState.js';
import Inventory from '../systems/Inventory.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];

const OPPOSITE_DIRECTION = Object.freeze({
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
});

const MANA_REGEN_INTERVAL_MS = 2500;

export default class PlayerCharacter {
  constructor(scene, x, y, playerState = loadPlayerState()) {
    this.scene = scene;
    this.tileSize = scene.tileSize;
    this.speed = 220;
    this.facing = 'down';
    const state = playerState ?? loadPlayerState();

    this.stats = { ...state.stats };

    this.inventory = new Inventory(20).load(state.inventory);
    this.currentWeaponId = state.currentWeaponId;
    this.currentWeaponSlotId = state.currentWeaponSlotId ?? null;
    this.currentShieldId = state.currentShieldId;
    this.currentShieldSlotId = state.currentShieldSlotId ?? null;
    this.currentLightId = state.currentLightId ?? null;
    this.currentLightSlotId = state.currentLightSlotId ?? null;

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
    this.guardPressedAt = -Infinity;
    this.invulnerableUntil = 0;
    this.knockbackState = null;
    this.dead = false;
    this.rangedAttackCooldownUntil = 0;
    this.manaRegenElapsed = 0;

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

  getCurrentLight() {
    return getItemDefinition(this.currentLightId);
  }

  getGridPosition() {
    return {
      col: Math.floor(this.x / this.tileSize),
      row: Math.floor(this.y / this.tileSize),
    };
  }

  isSlotEquipped(slotId) {
    return Boolean(
      slotId
      && (
        slotId === this.currentWeaponSlotId
        || slotId === this.currentShieldSlotId
        || slotId === this.currentLightSlotId
      ),
    );
  }

  toState() {
    return {
      stats: { ...this.stats },
      inventory: this.inventory.toJSON(),
      currentWeaponId: this.currentWeaponId,
      currentWeaponSlotId: this.currentWeaponSlotId,
      currentShieldId: this.currentShieldId,
      currentShieldSlotId: this.currentShieldSlotId,
      currentLightId: this.currentLightId,
      currentLightSlotId: this.currentLightSlotId,
    };
  }

  applyState(playerState = loadPlayerState()) {
    const state = playerState ?? loadPlayerState();

    this.stats = { ...state.stats };
    this.inventory.load(state.inventory);
    this.currentWeaponId = state.currentWeaponId;
    this.currentWeaponSlotId = state.currentWeaponSlotId ?? null;
    this.currentShieldId = state.currentShieldId;
    this.currentShieldSlotId = state.currentShieldSlotId ?? null;
    this.currentLightId = state.currentLightId ?? null;
    this.currentLightSlotId = state.currentLightSlotId ?? null;

    return this;
  }

  update(input, enemies, delta) {
    if (this.dead) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    this.updateManaRegen(delta);

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

    if (input.rangedAttackJustDown) {
      this.startRangedAttack();
      return;
    }

    if (input.guardDown) {
      this.updateGuard(delta, input.guardJustDown);
      return;
    }

    this.stopGuarding();
    this.updateMovement(input, delta);
  }

  updateMovement(input, delta) {
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
    const distance = this.speed * (delta / 1000);
    this.scene.movePlayer(
      this,
      (vx / length) * distance,
      (vy / length) * distance,
    );
    this.sprite.play(`${this.facing}-walk`, true);
  }

  updateGuard(delta, justDown = false) {
    if (!this.guarding || justDown) {
      this.guarding = true;
      this.guardElapsed = 0;
      this.guardPressedAt = this.scene.time.now;
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
    this.guardPressedAt = -Infinity;
    this.sprite.setTexture(this.getStandingTexture());
  }

  startAttack() {
    if (this.guarding) {
      return;
    }

    this.scene.audio?.playSfx('sfx-swing-weapon', { volume: 0.55 });
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
          enemy.takeDamage(
            this.attackPower,
            this.facing,
            this.getCurrentWeapon().knockBackPower,
            'melee',
          );
        }
      });
      this.scene.damageInteractiveEntities(attackBounds, this.currentWeaponId);
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

  startRangedAttack() {
    if (this.scene.time.now < this.rangedAttackCooldownUntil) {
      return;
    }

    const fireballCost = 1;
    if (this.stats.mana < fireballCost) {
      this.scene.addCombatMessage('Not enough mana.');
      return;
    }

    const projectile = this.scene.spawnProjectile({
      owner: this,
      x: this.x,
      y: this.y,
      direction: this.facing,
      damage: Math.max(2, this.stats.level * 2),
      knockBackPower: 5,
      speed: 420,
      lightRadius: 125,
      maxLife: 1200,
      textureKeys: {
        up: ['fireballUp1', 'fireballUp2'],
        down: ['fireballDown1', 'fireballDown2'],
        left: ['fireballLeft1', 'fireballLeft2'],
        right: ['fireballRight1', 'fireballRight2'],
      },
    });

    if (!projectile) {
      return;
    }

    this.stats.mana = Math.max(0, this.stats.mana - fireballCost);
    this.manaRegenElapsed = 0;
    this.rangedAttackCooldownUntil = this.scene.time.now + 450;
    this.scene.audio?.playSfx('sfx-burning', { volume: 0.45 });
    this.scene.addCombatMessage('Fireball!');
  }

  gainExperience(amount) {
    const gainedExperience = Math.max(0, Math.floor(Number(amount) || 0));
    if (gainedExperience <= 0) {
      return 0;
    }

    this.stats.exp += gainedExperience;
    this.scene.addCombatMessage(`Exp + ${gainedExperience}`);

    let levelsGained = 0;
    while (this.stats.exp >= this.stats.nextLevelExp) {
      this.stats.level += 1;
      this.stats.nextLevelExp *= PLAYER_PROGRESSION.nextLevelMultiplier;
      this.stats.maxLife += PLAYER_PROGRESSION.maxLifePerLevel;
      this.stats.maxMana += PLAYER_PROGRESSION.maxManaPerLevel;
      this.stats.strength += PLAYER_PROGRESSION.strengthPerLevel;
      this.stats.dexterity += PLAYER_PROGRESSION.dexterityPerLevel;
      this.stats.life = this.stats.maxLife;
      this.stats.mana = this.stats.maxMana;
      levelsGained += 1;
    }

    if (levelsGained > 0) {
      this.scene.audio?.playSfx('sfx-level-up', { volume: 0.65 });
      this.scene.addCombatMessage(
        `Level ${this.stats.level}! Max HP +${PLAYER_PROGRESSION.maxLifePerLevel}, `
        + `Max MP +${PLAYER_PROGRESSION.maxManaPerLevel}.`,
      );
    }

    return levelsGained;
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

    const invincible = Boolean(this.scene?.developerMode?.invincible);
    let damage = Math.max(1, rawAttack - this.defense);
    const canParryFrom = OPPOSITE_DIRECTION[attackerDirection];
    let result = 'hit';
    const guardAge = this.scene.time.now - this.guardPressedAt;
    const perfectGuard = (
      this.guarding
      && this.facing === canParryFrom
      && guardAge >= 0
      && guardAge <= COMBAT_RULES.perfectGuardWindowMs
    );

    if (perfectGuard) {
      damage = 0;
      result = 'parry';
      attacker?.stagger(COMBAT_RULES.staggerDurationMs);
    } else if (this.guarding && this.facing === canParryFrom) {
      damage = Math.floor(damage / COMBAT_RULES.blockDamageDivisor);
      result = 'block';
    }

    if (damage > 0) {
      this.stats.life = invincible
        ? Math.max(1, this.stats.life - damage)
        : Math.max(0, this.stats.life - damage);
      this.scene.audio?.playSfx('sfx-receive-damage', { volume: 0.55 });
      this.startKnockback(attackerDirection, attacker?.knockBackPower ?? 0);

      if (this.stats.life <= 0 && !invincible) {
        this.dead = true;
        this.scene.enterGameOver();
      }
    }

    this.invulnerableUntil = this.scene.time.now + COMBAT_RULES.playerInvulnerabilityMs;
    this.sprite.setTint(result === 'hit' ? 0xff7777 : 0x9ee7ff);
    this.scene.time.delayedCall(180, () => {
      if (!this.dead) {
        this.sprite.clearTint();
      }
    });
    this.scene.showCombatFeedback?.(result);

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

    const distance = (delta / 1000) * knockbackSpeed;
    this.scene.movePlayer(
      this,
      velocity.x === 0 ? 0 : Math.sign(velocity.x) * distance,
      velocity.y === 0 ? 0 : Math.sign(velocity.y) * distance,
    );
    this.knockbackState.remaining -= distance;

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
    const slotId = slot.slotId ?? null;

    if (item.type === ITEM_TYPES.weapon) {
      this.currentWeaponId = item.id;
      this.currentWeaponSlotId = slotId;
      return `Equipped ${item.name}`;
    }

    if (item.type === ITEM_TYPES.shield) {
      this.currentShieldId = item.id;
      this.currentShieldSlotId = slotId;
      return `Equipped ${item.name}`;
    }

    if (item.type === ITEM_TYPES.light) {
      if (this.currentLightSlotId === slotId) {
        this.currentLightId = null;
        this.currentLightSlotId = null;
        return `${item.name} off`;
      }

      this.currentLightId = item.id;
      this.currentLightSlotId = slotId;
      return `Equipped ${item.name}`;
    }

    if (item.type === ITEM_TYPES.consumable) {
      if (item.id === 'tent') {
        this.stats.life = this.stats.maxLife;
        this.stats.mana = this.stats.maxMana;
        this.scene.startSleepSequence?.();
        return 'You sleep until morning';
      } else {
        this.stats.life = Math.min(this.stats.maxLife, this.stats.life + item.value);
      }
      this.inventory.removeOne(index);
      return `Used ${item.name}`;
    }

    return item.name;
  }

  getStandingTexture() {
    return `player${this.capitalize(this.facing)}1`;
  }

  updateManaRegen(delta) {
    if (this.stats.mana >= this.stats.maxMana || this.stats.maxMana <= 0) {
      this.manaRegenElapsed = 0;
      return;
    }

    this.manaRegenElapsed += Math.max(0, delta);
    while (
      this.manaRegenElapsed >= MANA_REGEN_INTERVAL_MS
      && this.stats.mana < this.stats.maxMana
    ) {
      this.stats.mana += 1;
      this.manaRegenElapsed -= MANA_REGEN_INTERVAL_MS;
    }
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
    const attackPrefix = this.currentWeaponId === 'axe'
      ? 'playerAxe'
      : this.currentWeaponId === 'pickaxe'
        ? 'playerPick'
        : 'playerAttack';
    const textureKey = `${attackPrefix}${this.capitalize(this.facing)}${frame}`;
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
