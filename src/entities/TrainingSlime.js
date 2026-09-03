import Phaser from 'phaser';
import { COMBAT_RULES } from '../data/combat.js';

export default class TrainingSlime {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'slimeDown1');
    this.sprite.setScale(3);
    this.sprite.setDepth(18);
    this.sprite.body.setSize(14, 12, true);

    this.name = 'Green Slime';
    this.maxLife = 4;
    this.life = this.maxLife;
    this.attack = 2;
    this.defense = 0;
    this.exp = 2;
    this.knockBackPower = 0;
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
    this.attackWindupDuration = 350;
    this.usePathfinding = true;
    this.pathfindingRange = 18;

    this.ensureAnimations();
  }

  getHitbox() {
    return new Phaser.Geom.Rectangle(this.sprite.x - 18, this.sprite.y - 18, 36, 36);
  }

  getCollisionBounds() {
    return new Phaser.Geom.Rectangle(this.sprite.x - 18, this.sprite.y - 12, 36, 30);
  }

  update(player, time, delta) {
    if (this.defeated || this.dying || this.removed) {
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
      this.updateAttackTelegraph(progress);

      if (this.attackWindup.elapsed >= this.attackWindup.duration) {
        const windup = this.attackWindup;
        const result = player.receiveDamage(this.attack, windup.direction, this);
        this.scene.addCombatMessage(this.getAttackMessage(result));
        this.attackWindup = null;
        this.sprite.setScale(3).clearTint();
        this.nextAttackAt = time + 900;
      }

      return;
    }

    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);
    if (distance <= 86 && time >= this.nextAttackAt) {
      this.attackWindup = {
        direction: this.getDirectionTo(player),
        elapsed: 0,
        duration: this.attackWindupDuration,
      };
      this.sprite.setTint(0xffd166);
      return;
    }

    if (distance <= 320 && this.scene.pathFinder) {
      const start = this.getGridPosition();
      const goal = this.getPlayerGridPosition(player);
      const nextStep = this.scene.pathFinder.getNextStep(start, goal, {
        maxSearchRange: this.pathfindingRange,
      });

      if (nextStep) {
        const targetX = nextStep.col * this.scene.tileSize + this.scene.tileSize / 2;
        const targetY = nextStep.row * this.scene.tileSize + this.scene.tileSize / 2;
        const dx = targetX - this.sprite.x;
        const dy = targetY - this.sprite.y;
        const length = Math.hypot(dx, dy) || 1;
        const speed = 70;
        const step = (delta / 1000) * speed;
        this.scene.moveEnemy(this, (dx / length) * step, (dy / length) * step);
      }
    }
  }

  takeDamage(rawAttack, direction, knockBackPower, attackType = 'melee') {
    if (this.defeated || this.scene.time.now < this.invulnerableUntil) {
      return;
    }

    const counterAttack = attackType !== 'environment' && this.isOffBalance();
    const counterMultiplier = counterAttack ? COMBAT_RULES.counterAttackMultiplier : 1;
    const damage = Math.max(0, rawAttack * counterMultiplier - this.defense);
    this.life = Math.max(0, this.life - damage);
    this.scene.audio?.playSfx('sfx-hit-monster', { volume: 0.5 });
    this.invulnerableUntil = this.scene.time.now + 250;
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(120, () => {
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
      this.sprite.body.enable = false;
      this.sprite.clearTint();
      this.scene.handleEnemyDefeated?.(this);
      this.scene.addCombatMessage(`Defeated ${this.name}`);
      this.playDeathAnimation();
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
          this.scene.createDrop(sprite.x, sprite.y);
          this.removed = true;
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

  stagger(duration) {
    const staggerDuration = duration ?? COMBAT_RULES.staggerDurationMs;
    this.staggeredUntil = this.scene.time.now + staggerDuration;
    this.offBalanceUntil = this.staggeredUntil;
    this.attackWindup = null;
    this.sprite.setScale(3).setTint(0x9ee7ff);
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

  updateAttackTelegraph(progress) {
    const isImpactPhase = progress >= 0.68;
    this.sprite.setTint(isImpactPhase ? 0xff7b7b : 0xffd166);
    this.sprite.setScale(
      isImpactPhase
        ? 3 + Math.sin(progress * Math.PI * 8) * 0.12
        : 3,
    );
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
    }
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

  getGridPosition() {
    return {
      col: Math.floor(this.sprite.x / this.scene.tileSize),
      row: Math.floor(this.sprite.y / this.scene.tileSize),
    };
  }

  getPlayerGridPosition(player) {
    return {
      col: Math.floor(player.x / this.scene.tileSize),
      row: Math.floor(player.y / this.scene.tileSize),
    };
  }

  ensureAnimations() {
    if (this.scene.anims.exists('slime-walk')) {
      this.sprite.play('slime-walk');
      return;
    }

    this.scene.anims.create({
      key: 'slime-walk',
      frames: [{ key: 'slimeDown1' }, { key: 'slimeDown2' }],
      frameRate: 4,
      repeat: -1,
    });
    this.sprite.play('slime-walk');
  }
}
