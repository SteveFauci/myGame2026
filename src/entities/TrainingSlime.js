import Phaser from 'phaser';

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
    this.knockBackPower = 0;
    this.defeated = false;
    this.staggeredUntil = 0;
    this.invulnerableUntil = 0;
    this.nextAttackAt = 0;
    this.attackWindup = null;
    this.knockbackState = null;

    this.ensureAnimations();
  }

  getHitbox() {
    return new Phaser.Geom.Rectangle(this.sprite.x - 18, this.sprite.y - 18, 36, 36);
  }

  update(player, time, delta) {
    if (this.defeated) {
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

      if (this.attackWindup.elapsed >= 350) {
        const result = player.receiveDamage(this.attack, this.attackWindup.direction, this);
        this.scene.addCombatMessage(this.getAttackMessage(result));
        this.attackWindup = null;
        this.sprite.clearTint();
        this.nextAttackAt = time + 900;
      }

      return;
    }

    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y);
    if (distance <= 86 && time >= this.nextAttackAt) {
      this.attackWindup = {
        direction: this.getDirectionTo(player),
        elapsed: 0,
      };
      this.sprite.setTint(0xffd166);
    }
  }

  takeDamage(rawAttack, direction, knockBackPower) {
    if (this.defeated || this.scene.time.now < this.invulnerableUntil) {
      return;
    }

    const damage = Math.max(0, rawAttack - this.defense);
    this.life = Math.max(0, this.life - damage);
    this.invulnerableUntil = this.scene.time.now + 250;
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(120, () => {
      if (!this.defeated) {
        this.sprite.clearTint();
      }
    });

    if (knockBackPower > 0) {
      this.startKnockback(direction, knockBackPower);
    }

    this.scene.addCombatMessage(`${damage} damage to ${this.name}`);

    if (this.life <= 0) {
      this.defeated = true;
      this.attackWindup = null;
      this.sprite.setVelocity(0, 0);
      this.sprite.setTint(0x777777);
      this.scene.addCombatMessage(`Defeated ${this.name}`);
    }
  }

  startKnockback(direction, power) {
    this.knockbackState = {
      direction,
      remaining: 80 + power * 12,
    };
  }

  stagger(duration) {
    this.staggeredUntil = this.scene.time.now + duration;
    this.attackWindup = null;
    this.sprite.clearTint();
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
      return 'Perfect parry!';
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
