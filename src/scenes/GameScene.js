import Phaser from 'phaser';
import { ITEM_DEFINITIONS, getItemDefinition } from '../data/items.js';
import PlayerCharacter from '../entities/PlayerCharacter.js';
import TrainingSlime from '../entities/TrainingSlime.js';

const TILE_NAMES = [
  'voidimg',
  'stairs1',
  'stairs2',
  'spike',
  'grass00',
  'grass01',
  ...Array.from({ length: 14 }, (_, index) => `water${String(index).padStart(2, '0')}`),
  ...Array.from({ length: 13 }, (_, index) => `road${String(index).padStart(2, '0')}`),
  'earth',
  'wall',
  'tree',
  'hut',
  'floor01',
  'table01',
  'table02',
];

const ITEM_ASSET_NAMES = Object.freeze({
  'item-normal-sword': 'sword_normal',
  'item-wood-shield': 'shield_wood',
  'item-blue-shield': 'shield_blue',
  'item-red-potion': 'potion_red',
  'item-key': 'key',
});

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.combatMessages = [];
  }

  preload() {
    this.load.text('worldV3', '/maps/worldV3.txt');

    this.load.image('playerDown1', '/player/boy_down_1.png');
    this.load.image('playerDown2', '/player/boy_down_2.png');
    this.load.image('playerUp1', '/player/boy_up_1.png');
    this.load.image('playerUp2', '/player/boy_up_2.png');
    this.load.image('playerLeft1', '/player/boy_left_1.png');
    this.load.image('playerLeft2', '/player/boy_left_2.png');
    this.load.image('playerRight1', '/player/boy_right_1.png');
    this.load.image('playerRight2', '/player/boy_right_2.png');

    ['up', 'down', 'left', 'right'].forEach((direction) => {
      this.load.image(
        `playerAttack${this.capitalize(direction)}1`,
        `/player/boy_attack_${direction}_1.png`,
      );
      this.load.image(
        `playerAttack${this.capitalize(direction)}2`,
        `/player/boy_attack_${direction}_2.png`,
      );
      this.load.image(
        `playerGuard${this.capitalize(direction)}`,
        `/player/boy_guard_${direction}.png`,
      );
    });

    this.load.image('slimeDown1', '/monsters/greenslime_down_1.png');
    this.load.image('slimeDown2', '/monsters/greenslime_down_2.png');

    Object.values(ITEM_DEFINITIONS).forEach((item) => {
      this.load.image(item.textureKey, `/objects/${ITEM_ASSET_NAMES[item.textureKey]}.png`);
    });

    TILE_NAMES.forEach((tileName) => {
      this.load.image(`tile-${tileName}`, `/tiles/${tileName}.png`);
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');

    this.tileSize = 48;
    this.worldWidth = 50 * this.tileSize;
    this.worldHeight = 50 * this.tileSize;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.drawLegacyMap();
    this.createInput();

    this.player = new PlayerCharacter(
      this,
      23 * this.tileSize + this.tileSize / 2,
      21 * this.tileSize + this.tileSize / 2,
    );
    this.enemies = [
      new TrainingSlime(
        this,
        25 * this.tileSize + this.tileSize / 2,
        21 * this.tileSize + this.tileSize / 2,
      ),
    ];

    this.createHud();
    this.createCharacterPanel();
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      left: 'A',
      down: 'S',
      right: 'D',
      attack: 'ENTER',
      guard: 'SPACE',
      inventory: 'C',
      cancel: 'ESC',
    });
    this.pendingAttack = false;

    this.input.keyboard.on('keydown-C', this.toggleCharacterPanel, this);
    this.input.keyboard.on('keydown-ESC', this.closeCharacterPanel, this);
    this.input.keyboard.on('keydown-ENTER', () => {
      this.pendingAttack = true;
    });
  }

  createHud() {
    this.hud = this.add.text(16, 16, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#f8fafc',
      lineSpacing: 4,
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(90);

    this.messageHud = this.add.text(16, 116, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#fde68a',
      lineSpacing: 5,
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(90);

    this.updateHud();
  }

  createCharacterPanel() {
    this.characterPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.panelBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.82).setOrigin(0);
    this.panelFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 1).setOrigin(0);
    this.panelTitle = this.add.text(0, 0, 'Character & Inventory', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.panelStats = this.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#cbd5e1',
      lineSpacing: 6,
    });
    this.panelDescription = this.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#f8fafc',
      wordWrap: { width: 300 },
      lineSpacing: 6,
    });
    this.panelHint = this.add.text(0, 0, 'Arrows: select    Enter: equip/use    C / Esc: close', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#94a3b8',
    });

    this.panelSlots = [];
    this.panelIcons = [];
    this.panelAmounts = [];
    this.characterPanel.add([this.panelBackdrop, this.panelFrame]);

    for (let index = 0; index < 20; index += 1) {
      const slot = this.add.rectangle(0, 0, 48, 48, 0x0f172a, 1)
        .setStrokeStyle(2, 0x475569);
      const icon = this.add.image(0, 0, 'item-normal-sword').setScale(3).setVisible(false);
      const amount = this.add.text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 3,
      }).setVisible(false);

      this.panelSlots.push(slot);
      this.panelIcons.push(icon);
      this.panelAmounts.push(amount);
      this.characterPanel.add([slot, icon, amount]);
    }

    this.characterPanel.add([
      this.panelTitle,
      this.panelStats,
      this.panelDescription,
      this.panelHint,
    ]);

    this.layoutCharacterPanel();
    this.scale.on('resize', this.layoutCharacterPanel, this);
  }

  layoutCharacterPanel() {
    if (!this.characterPanel) {
      return;
    }

    const panelWidth = Math.min(900, this.scale.width - 32);
    const panelHeight = Math.min(620, this.scale.height - 32);
    const panelX = Math.floor((this.scale.width - panelWidth) / 2);
    const panelY = Math.floor((this.scale.height - panelHeight) / 2);
    const slotSize = 64;
    const gridX = panelX + 32;
    const gridY = panelY + 112;

    this.panelBackdrop.setSize(this.scale.width, this.scale.height);
    this.panelFrame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.panelTitle.setPosition(panelX + 32, panelY + 24);
    this.panelStats.setPosition(panelX + 410, panelY + 112);
    this.panelDescription.setPosition(panelX + 410, panelY + 430);
    this.panelHint.setPosition(panelX + 32, panelY + panelHeight - 32);

    this.panelSlots.forEach((slot, index) => {
      const col = index % 5;
      const row = Math.floor(index / 5);
      const x = gridX + col * slotSize;
      const y = gridY + row * slotSize;

      slot.setPosition(x, y);
      this.panelIcons[index].setPosition(x, y);
      this.panelAmounts[index].setPosition(x + 18, y + 13);
    });
  }

  openCharacterPanel() {
    this.characterPanel.setVisible(true);
    this.player.inventoryCursor = this.player.inventoryCursor ?? 0;
    this.refreshCharacterPanel();
  }

  closeCharacterPanel() {
    if (this.characterPanel) {
      this.characterPanel.setVisible(false);
    }
  }

  updateCharacterPanelInput() {
    const cursor = this.player.inventoryCursor ?? 0;
    let nextCursor = cursor;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      nextCursor = Math.max(0, cursor - 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      nextCursor = Math.min(19, cursor + 1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      nextCursor = Math.max(0, cursor - 5);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      nextCursor = Math.min(19, cursor + 5);
    }

    this.player.inventoryCursor = nextCursor;

    if (this.consumeAttackInput()) {
      const message = this.player.selectInventoryItem(nextCursor);
      this.addCombatMessage(message);
    }

    this.refreshCharacterPanel();
  }

  refreshCharacterPanel() {
    const selectedIndex = this.player.inventoryCursor ?? 0;
    const selectedSlot = this.player.inventory.get(selectedIndex);

    this.panelStats.setText([
      `Level ${this.player.stats.level}`,
      `Life ${this.player.stats.life}/${this.player.stats.maxLife}`,
      `Mana ${this.player.stats.mana}/${this.player.stats.maxMana}`,
      `Strength ${this.player.stats.strength}`,
      `Dexterity ${this.player.stats.dexterity}`,
      `Attack ${this.player.attackPower}`,
      `Defense ${this.player.defense}`,
      `Coin ${this.player.stats.coin}`,
      '',
      `Weapon: ${this.player.getCurrentWeapon().name}`,
      `Shield: ${this.player.getCurrentShield().name}`,
    ].join('\n'));

    if (selectedSlot) {
      const selectedItem = getItemDefinition(selectedSlot.itemId);
      this.panelDescription.setText(
        `${selectedItem.name}\n\n${selectedItem.description}`,
      );
    } else {
      this.panelDescription.setText('Empty slot');
    }

    for (let index = 0; index < 20; index += 1) {
      const slot = this.player.inventory.get(index);
      const selected = index === selectedIndex;
      const equipped = slot && (
        slot.itemId === this.player.currentWeaponId ||
        slot.itemId === this.player.currentShieldId
      );

      this.panelSlots[index]
        .setFillStyle(selected ? 0x334155 : equipped ? 0x604b22 : 0x0f172a)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xf8fafc : 0x475569);

      if (slot) {
        const item = getItemDefinition(slot.itemId);
        this.panelIcons[index].setTexture(item.textureKey).setVisible(true);
        this.panelAmounts[index]
          .setText(slot.amount > 1 ? String(slot.amount) : '')
          .setVisible(slot.amount > 1);
      } else {
        this.panelIcons[index].setVisible(false);
        this.panelAmounts[index].setVisible(false);
      }
    }
  }

  addCombatMessage(message) {
    this.combatMessages.unshift({
      text: message,
      expiresAt: this.time.now + 1800,
    });
    this.combatMessages = this.combatMessages.slice(0, 3);
  }

  updateHud() {
    if (!this.hud || !this.player) {
      return;
    }

    this.hud.setText([
      `HP ${this.player.stats.life}/${this.player.stats.maxLife}`,
      `ATK ${this.player.attackPower}   DEF ${this.player.defense}`,
      `Weapon: ${this.player.getCurrentWeapon().name}`,
      '[Enter] Attack   [Space] Guard   [C] Inventory',
    ].join('\n'));

    this.combatMessages = this.combatMessages.filter(
      (message) => message.expiresAt > this.time.now,
    );
    this.messageHud.setText(this.combatMessages.map((message) => message.text).join('\n'));
  }

  update(time, delta) {
    if (this.characterPanel.visible) {
      this.updateCharacterPanelInput();
      this.updateHud();
      return;
    }

    this.player.update({
      left: this.cursors.left.isDown || this.keys.left.isDown,
      right: this.cursors.right.isDown || this.keys.right.isDown,
      up: this.cursors.up.isDown || this.keys.up.isDown,
      down: this.cursors.down.isDown || this.keys.down.isDown,
      guardDown: this.keys.guard.isDown,
      attackJustDown: this.consumeAttackInput(),
    }, this.enemies, delta);

    this.enemies.forEach((enemy) => enemy.update(this.player, time, delta));
    this.updateHud();
  }

  consumeAttackInput() {
    const keyboardAttack = Phaser.Input.Keyboard.JustDown(this.keys.attack);
    const attackJustDown = this.pendingAttack || keyboardAttack;
    this.pendingAttack = false;
    return attackJustDown;
  }

  toggleCharacterPanel() {
    if (this.characterPanel.visible) {
      this.closeCharacterPanel();
    } else {
      this.openCharacterPanel();
    }
  }

  drawLegacyMap() {
    const mapLines = this.cache.text.get('worldV3').split(/\r?\n/).slice(0, 50);

    mapLines.forEach((line, row) => {
      const tileIds = line.trim().split(/\s+/);

      tileIds.forEach((tileId, col) => {
        const tileName = this.getTileName(Number(tileId));
        this.add
          .image(
            col * this.tileSize + this.tileSize / 2,
            row * this.tileSize + this.tileSize / 2,
            `tile-${tileName}`,
          )
          .setDisplaySize(this.tileSize, this.tileSize);
      });
    });
  }

  getTileName(tileId) {
    const tileNameById = [
      'voidimg',
      'voidimg',
      'stairs1',
      'stairs2',
      'spike',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass00',
      'grass01',
      'water00',
      'water01',
      'water02',
      'water03',
      'water04',
      'water05',
      'water06',
      'water07',
      'water08',
      'water09',
      'water10',
      'water11',
      'water12',
      'water13',
      'road00',
      'road01',
      'road02',
      'road03',
      'road04',
      'road05',
      'road06',
      'road07',
      'road08',
      'road09',
      'road10',
      'road11',
      'road12',
      'earth',
      'wall',
      'tree',
      'hut',
      'floor01',
      'table01',
      'table02',
    ];

    return tileNameById[tileId] ?? 'voidimg';
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
