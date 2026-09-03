import Phaser from 'phaser';
import { COMBAT_RULES } from '../data/combat.js';

const OPPOSITE_DIRECTION = Object.freeze({
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
});

export default class LegacyMonster {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.typeName = options.typeName ?? 'MON_Unknown';
    this.name = options.name ?? 'Monster';
    this.maxLife = options.maxLife ?? 4;
    this.life = options.life ?? this.maxLife;
    this.attack = options.attack ?? 1;
    this.defense = options.defense ?? 0;
    this.exp = options.exp ?? 0;
    this.knockBackPower = options.knockBackPower ?? 0;
    this.speed = options.speed ?? 60;
    this.baseSpeed = this.speed;
    this.baseAttack = this.attack;
    this.detectionRange = options.detectionRange ?? 240;
    this.attackRange = options.attackRange ?? 60;
    this.attackCooldown = options.attackCooldown ?? 900;
    this.attackWindupDuration = options.attackWindupDuration ?? 420;
    this.attackTextureKeys = options.attackTextureKeys ?? null;
    this.baseAttackTextureKeys = this.attackTextureKeys;
    this.dropTypeName = options.dropTypeName === undefined ? 'OBJ_Coin_Bronze' : options.dropTypeName;
    this.collisionBox = options.collisionBox ?? { x: -18, y: -12, width: 36, height: 30 };
    this.animationKey = options.animationKey ?? `legacy-monster-${this.typeName.toLowerCase()}-idle`;
    this.textureKey1 = options.textureKey ?? null;
    this.textureKey2 = options.textureKey2 ?? null;
    this.baseTextureKey1 = this.textureKey1;
    this.baseTextureKey2 = this.textureKey2;
    this.phase2TextureKeys = options.phase2TextureKeys ?? null;
    this.phase2TextureKey = options.phase2TextureKey ?? this.phase2TextureKeys?.down?.[0] ?? null;
    this.phase2TextureKey2 = options.phase2TextureKey2 ?? this.phase2TextureKeys?.down?.[1] ?? null;
    this.phase2AttackTextureKeys = options.phase2AttackTextureKeys ?? null;
    this.phase2AttackMultiplier = options.phase2AttackMultiplier ?? 1;
    this.phase2SpeedBonus = options.phase2SpeedBonus ?? 0;
    this.usePathfinding = options.usePathfinding ?? false;
    this.pathfindingRange = options.pathfindingRange ?? 12;
    this.scale = options.scale ?? 3;
    this.depth = options.depth ?? 18;
    this.boss = options.boss ?? false;
    this.sleep = options.sleep ?? false;
    this.inPhase2 = false;

    this.defeated = false;
    this.dying = false;
    this.removed = false;
    this.staggeredUntil = 0;
    this.offBalanceUntil = 0;
    this.invulnerableUntil = 0;
    this.experienceGranted = false;
    this.nextAttackAt = 0;
    this.attackWindup = null;
    this.knockbackState = null;
    this.facing = 'down';

    this.sprite = options.sprite ?? scene.physics.add.sprite(options.x ?? 0, options.y ?? 0, this.textureKey1);
    this.sprite.setOrigin(0.5);
    this.sprite.setScale(this.scale);
    this.sprite.setDepth(this.depth);
    this.sprite.body?.setSize(options.bodyWidth ?? 36, options.bodyHeight ?? 30, true);
    this.sprite.body?.setCollideWorldBounds(true);
    this.sprite.setData('monsterType', this.typeName);

    this.attackSprite = this.attackTextureKeys
      ? scene.add.image(this.sprite.x, this.sprite.y, this.attackTextureKeys.down?.[0])
        .setOrigin(0.5)
        .setScale(this.scale)
        .setDepth(this.depth + 1)
        .setVisible(false)
      : null;

    this.ensureAnimations();
    if (this.sprite.anims?.isPlaying) {
      this.sprite.play(this.animationKey, true);
    } else {
      this.sprite.play(this.animationKey);
    }
  }

  getHitbox() {
    return this.getCollisionBounds();
  }

  getCollisionBounds() {
    return new Phaser.Geom.Rectangle(
      this.sprite.x + this.collisionBox.x,
      this.sprite.y + this.collisionBox.y,
      this.collisionBox.width,
      this.collisionBox.height,
    );
  }

  update(player, time, delta) {
    if (this.defeated || this.dying || this.removed) {
      return;
    }

    if (this.sleep) {
      this.sprite.setVelocity(0, 0);
      this.sprite.play(this.animationKey, true);
      return;
    }

    if (this.knockbackState) {
      this.updateKnockback(delta);
      return;
    }

    if (this.staggeredUntil > time) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (this.attackWindup) {
      this.attackWindup.elapsed += delta;
      const progress = Math.min(
        1,
        this.attackWindup.elapsed / this.attackWindup.duration,
      );
      this.updateAttackVisual(progress);

      if (this.attackWindup.elapsed >= this.attackWindup.duration) {
        const windup = this.attackWindup;
        const result = player.receiveDamage(this.attack, windup.direction, this);
        this.scene.addCombatMessage(this.getAttackMessage(result));
        this.attackWindup = null;
        this.nextAttackAt = time + this.attackCooldown;
        this.clearAttackVisual();
      }

      return;
    }

    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);
    if (distance <= this.attackRange && time >= this.nextAttackAt) {
      this.attackWindup = {
        direction: this.getDirectionTo(player),
        elapsed: 0,
        duration: this.attackWindupDuration,
      };
      this.facing = this.attackWindup.direction;
      this.sprite.setTint(0xffd166);
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (distance <= this.detectionRange) {
      this.moveTowardPlayer(player, delta);
      this.sprite.play(this.animationKey, true);
      return;
    }

    this.sprite.setVelocity(0, 0);
    this.sprite.play(this.animationKey, true);
  }

  moveTowardPlayer(player, delta) {
    if (this.usePathfinding && this.scene.pathFinder) {
      const start = this.getGridPosition();
      const goal = player.getGridPosition?.() ?? this.getPlayerGridPosition(player);
      const nextStep = this.scene.pathFinder.getNextStep(start, goal, {
        maxSearchRange: this.pathfindingRange,
      });

      if (nextStep) {
        const targetX = nextStep.col * this.scene.tileSize + this.scene.tileSize / 2;
        const targetY = nextStep.row * this.scene.tileSize + this.scene.tileSize / 2;
        const dx = targetX - this.sprite.x;
        const dy = targetY - this.sprite.y;
        const length = Math.hypot(dx, dy) || 1;
        const distance = this.speed * (delta / 1000);

        this.facing = Math.abs(dx) > Math.abs(dy)
          ? (dx < 0 ? 'left' : 'right')
          : (dy < 0 ? 'up' : 'down');

        this.scene.moveEnemy(this, (dx / length) * distance, (dy / length) * distance);
        return;
      }
    }

    const dx = player.x - this.sprite.x;
    const dy = player.y - this.sprite.y;
    const length = Math.hypot(dx, dy) || 1;
    const distance = this.speed * (delta / 1000);
    const stepX = (dx / length) * distance;
    const stepY = (dy / length) * distance;

    this.facing = Math.abs(dx) > Math.abs(dy)
      ? (dx < 0 ? 'left' : 'right')
      : (dy < 0 ? 'up' : 'down');

    this.scene.moveEnemy(this, stepX, stepY);
  }

  getGridPosition() {
    const bounds = this.getCollisionBounds();
    return {
      col: Math.floor(bounds.centerX / this.scene.tileSize),
      row: Math.floor(bounds.centerY / this.scene.tileSize),
    };
  }

  getPlayerGridPosition(player) {
    return {
      col: Math.floor(player.x / this.scene.tileSize),
      row: Math.floor(player.y / this.scene.tileSize),
    };
  }

  takeDamage(rawAttack, direction, knockBackPower, attackType = 'melee') {
    if (this.defeated || this.sleep || this.scene.time.now < this.invulnerableUntil) {
      return;
    }

    const counterAttack = attackType !== 'environment' && this.isOffBalance();
    const counterMultiplier = counterAttack ? COMBAT_RULES.counterAttackMultiplier : 1;
    const damage = Math.max(0, rawAttack * counterMultiplier - this.defense);
    this.life = Math.max(0, this.life - damage);
    this.scene.audio?.playSfx('sfx-hit-monster', { volume: 0.5 });
    this.invulnerableUntil = this.scene.time.now + 220;
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (!this.defeated && !this.removed) {
        if (this.isOffBalance()) {
          this.sprite.setTint(0x9ee7ff);
        } else {
          this.sprite.clearTint();
        }
      }
    });

    if (knockBackPower > 0) {
      this.startKnockback(direction, knockBackPower);
    }

    this.scene.addCombatMessage(
      counterAttack
        ? `${damage} damage to ${this.name} (counter x${counterMultiplier})`
        : `${damage} damage to ${this.name}`,
    );

    if (this.life <= 0) {
      this.defeated = true;
      this.dying = true;
      this.attackWindup = null;
      this.knockbackState = null;
      this.offBalanceUntil = 0;
      this.sprite.setVelocity(0, 0);
      this.attackSprite?.setVisible(false);
      this.sprite.body?.setEnable(false);
      this.sprite.clearTint();
      this.scene.handleEnemyDefeated?.(this);
      this.playDeathAnimation();
    } else if (this.shouldEnterPhase2()) {
      this.enterPhase2();
    }
  }

  playDeathAnimation() {
    const sprite = this.sprite;
    sprite.setTint(0xffffff);
    this.scene.add.timeline([
      { at: 0, tween: { targets: sprite, alpha: 0.2, duration: 45 } },
      { at: 45, tween: { targets: sprite, alpha: 1, duration: 45 } },
      { at: 90, tween: { targets: sprite, alpha: 0.2, duration: 45 } },
      {
        at: 135,
        tween: {
          targets: sprite,
          alpha: 0,
          duration: 90,
          ease: 'Linear',
        },
      },
      {
        at: 230,
        run: () => {
          if (this.dropTypeName) {
            this.scene.createDrop(sprite.x, sprite.y, this.dropTypeName);
          }
          this.removed = true;
          this.attackSprite?.destroy();
          sprite.clearTint();
          sprite.destroy();
          this.scene.removeEnemy(this);
        },
        once: true,
      },
    ]).play();
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
    this.scene.moveEnemy(
      this,
      velocity.x === 0 ? 0 : Math.sign(velocity.x) * distance,
      velocity.y === 0 ? 0 : Math.sign(velocity.y) * distance,
    );
    this.knockbackState.remaining -= distance;

    if (this.knockbackState.remaining <= 0) {
      this.knockbackState = null;
      this.sprite.setVelocity(0, 0);
    }
  }

  stagger(duration) {
    const staggerDuration = duration ?? COMBAT_RULES.staggerDurationMs;
    this.staggeredUntil = this.scene.time.now + staggerDuration;
    this.offBalanceUntil = this.staggeredUntil;
    this.attackWindup = null;
    this.clearAttackVisual();
    this.sprite.setTint(0x9ee7ff);
    this.scene.time.delayedCall(220, () => {
      if (!this.defeated && !this.removed && this.isOffBalance()) {
        this.sprite.setTint(0x9ee7ff);
      }
    });
    this.scene.time.delayedCall(staggerDuration, () => {
      if (!this.defeated && !this.removed && !this.isOffBalance()) {
        this.sprite.clearTint();
      }
    });
  }

  isOffBalance(time = this.scene.time.now) {
    return this.offBalanceUntil > time;
  }

  updateAttackVisual(progress) {
    const isImpactPhase = progress >= 0.68;
    this.sprite.setTint(isImpactPhase ? 0xff7b7b : 0xffd166);

    if (!this.attackSprite) {
      const pulse = isImpactPhase
        ? 1 + Math.sin(progress * Math.PI * 8) * 0.04
        : 1;
      this.sprite.setScale(this.scale * pulse);
      return;
    }

    if (progress < 0.42) {
      this.attackSprite.setVisible(false);
      this.sprite.setVisible(true);
      return;
    }

    this.sprite.setVisible(false);
    this.attackSprite.setVisible(true);
    this.renderAttackFrame(progress >= 0.72 ? 2 : 1);
    this.attackSprite.setTint(isImpactPhase ? 0xffb4b4 : 0xffd166);
  }

  renderAttackFrame(frame) {
    if (!this.attackSprite) {
      return;
    }

    const frames = this.attackTextureKeys?.[this.facing]
      ?? this.attackTextureKeys?.down
      ?? [];
    const textureKey = frames[frame - 1] ?? frames[0];
    const offsets = {
      up: { x: 0, y: -this.scene.tileSize / 2 },
      down: { x: 0, y: this.scene.tileSize / 2 },
      left: { x: -this.scene.tileSize / 2, y: 0 },
      right: { x: this.scene.tileSize / 2, y: 0 },
    };
    const offset = offsets[this.facing] ?? offsets.down;

    this.attackSprite
      .setTexture(textureKey)
      .setPosition(this.sprite.x + offset.x, this.sprite.y + offset.y);
  }

  clearAttackVisual() {
    this.sprite.setVisible(true).setScale(this.scale).clearTint();
    this.attackSprite?.setVisible(false).clearTint();
  }

  wake() {
    this.sleep = false;
    this.nextAttackAt = this.scene.time.now + this.attackCooldown;
    this.sprite.clearTint();
    this.sprite.play(this.animationKey, true);
  }

  shouldEnterPhase2() {
    return Boolean(
      this.boss
      && !this.inPhase2
      && this.phase2TextureKey
      && this.life > 0
      && this.life < this.maxLife / 2,
    );
  }

  enterPhase2() {
    this.inPhase2 = true;
    this.textureKey1 = this.getPhase2TextureKey(this.facing, 0);
    this.textureKey2 = this.getPhase2TextureKey(this.facing, 1);
    this.attackTextureKeys = this.phase2AttackTextureKeys ?? this.baseAttackTextureKeys;
    this.attack = Math.max(this.attack, this.baseAttack * this.phase2AttackMultiplier);
    this.speed = this.baseSpeed + this.phase2SpeedBonus;
    this.animationKey = `${this.animationKey}-phase2`;
    this.ensureAnimations();
    this.sprite.setTexture(this.textureKey1);
    this.sprite.play(this.animationKey, true);
    this.sprite.setTint(0xff7777);
    this.scene.time.delayedCall(260, () => {
      if (!this.defeated && !this.removed) {
        this.sprite.clearTint();
      }
    });
    this.scene.addCombatMessage?.(`${this.name} enters phase two!`);
  }

  getPhase2TextureKey(direction, index) {
    const directionalTexture = this.phase2TextureKeys?.[direction]?.[index];
    if (directionalTexture) {
      return directionalTexture;
    }

    return index === 0 ? this.phase2TextureKey : this.phase2TextureKey2;
  }

  getAttackMessage(result) {
    if (result.result === 'parry') {
      return 'Enemy staggered. Counter window open.';
    }
    if (result.result === 'block') {
      return `Blocked ${result.damage} damage`;
    }
    return `Took ${result.damage} damage`;
  }

  getDirectionTo(player) {
    const dx = player.x - this.sprite.x;
    const dy = player.y - this.sprite.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx < 0 ? 'left' : 'right';
    }

    return dy < 0 ? 'up' : 'down';
  }

  ensureAnimations() {
    if (!this.textureKey1) {
      return;
    }

    if (this.scene.anims.exists(this.animationKey)) {
      this.sprite.play(this.animationKey);
      return;
    }

    const frames = [{ key: this.textureKey1 }];
    if (this.textureKey2) {
      frames.push({ key: this.textureKey2 });
    }

    this.scene.anims.create({
      key: this.animationKey,
      frames,
      frameRate: this.textureKey2 ? 4 : 1,
      repeat: -1,
    });
    this.sprite.play(this.animationKey);
  }
}
