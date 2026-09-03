import Phaser from 'phaser';
import { ITEM_DEFINITIONS, getItemAssetPath, getItemDefinition } from '../data/items.js';
import { loadPlayerState, savePlayerState } from '../data/playerState.js';
import { getShopDefinition } from '../data/shops.js';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';
import ShopInventory from '../systems/ShopInventory.js';

const TILE_SIZE = 48;
const MENU_OPTIONS = Object.freeze(['Buy', 'Sell', 'Leave']);

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
    this.shopId = 'fieldShop';
    this.returnNodeId = 'fieldShop';
    this.returnSceneKey = 'WorldMapScene';
    this.mode = 'select';
    this.menuCursor = 0;
    this.buyCursor = 0;
    this.sellCursor = 0;
    this.message = '';
  }

  init(data = {}) {
    this.shopId = data.shopId ?? 'fieldShop';
    this.returnNodeId = data.returnNodeId ?? this.shopId;
    this.returnSceneKey = data.returnSceneKey ?? 'WorldMapScene';
    this.mode = 'select';
    this.menuCursor = 0;
    this.buyCursor = 0;
    this.sellCursor = 0;
  }

  preload() {
    preloadAudio(this.load);
    this.loadImageOnce('shop-merchant-1', '/npc/merchant_down_1.png');
    this.loadImageOnce('shop-merchant-2', '/npc/merchant_down_2.png');
    this.loadImageOnce('shop-coin', '/objects/coin_bronze.png');
    this.loadImageOnce('shop-floor', '/tiles/floor01.png');
    this.loadImageOnce('shop-wall', '/tiles/wall.png');
    this.loadImageOnce('shop-table-1', '/tiles/table01.png');
    this.loadImageOnce('shop-table-2', '/tiles/table02.png');

    Object.values(ITEM_DEFINITIONS).forEach((item) => {
      const assetPath = getItemAssetPath(item);
      if (assetPath) {
        this.loadImageOnce(item.textureKey, assetPath);
      }
    });
  }

  create() {
    this.shopDefinition = getShopDefinition(this.shopId) ?? getShopDefinition('fieldShop');
    this.trade = new ShopInventory(this.shopDefinition, loadPlayerState());
    this.message = this.shopDefinition.greeting.join('\n');

    this.cameras.main.setBackgroundColor('#100f14');
    this.createInput();
    this.audio = new AudioManager(this);
    this.audio.playMusic('music-shop');
    this.createAnimations();
    this.drawShopRoom();
    this.createMerchant();
    this.createTradeUi();
    this.layoutTradeUi();
    this.refreshTradeUi();

    this.scale.on('resize', this.layoutTradeUi, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layoutTradeUi, this);
    });
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      left: 'A',
      down: 'S',
      right: 'D',
      interact: 'F',
      confirm: 'ENTER',
      cancel: 'ESC',
    });
  }

  createAnimations() {
    if (this.anims.exists('merchant-idle')) {
      return;
    }

    this.anims.create({
      key: 'merchant-idle',
      frames: [{ key: 'shop-merchant-1' }, { key: 'shop-merchant-2' }],
      frameRate: 2,
      repeat: -1,
    });
  }

  drawShopRoom() {
    const cols = Math.ceil(this.scale.width / TILE_SIZE);
    const rows = Math.ceil(this.scale.height / TILE_SIZE);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const isBorder = row === 0 || col === 0 || row === rows - 1 || col === cols - 1;
        this.add.image(
          col * TILE_SIZE + TILE_SIZE / 2,
          row * TILE_SIZE + TILE_SIZE / 2,
          isBorder ? 'shop-wall' : 'shop-floor',
        ).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(0);
      }
    }

    const tableY = Math.min(210, this.scale.height / 2 - 40);
    [-1, 0, 1].forEach((offset) => {
      this.add.image(this.scale.width / 2 + offset * TILE_SIZE, tableY, 'shop-table-1')
        .setDisplaySize(TILE_SIZE, TILE_SIZE)
        .setDepth(3);
      this.add.image(this.scale.width / 2 + offset * TILE_SIZE, tableY + TILE_SIZE, 'shop-table-2')
        .setDisplaySize(TILE_SIZE, TILE_SIZE)
        .setDepth(3);
    });
  }

  createMerchant() {
    const y = Math.min(142, this.scale.height / 2 - 96);
    this.merchantBaseY = y;
    this.merchant = this.add.sprite(this.scale.width / 2, y, 'shop-merchant-1')
      .setScale(3)
      .setDepth(6);
    this.merchant.play('merchant-idle');
  }

  createTradeUi() {
    this.uiLayer = this.add.container(0, 0).setDepth(20);
    this.backdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.46).setOrigin(0);
    this.frame = this.add.rectangle(0, 0, 1, 1, 0x172033, 0.96).setOrigin(0);
    this.menuFrame = this.add.rectangle(0, 0, 1, 1, 0x0f172a, 0.96).setOrigin(0);
    this.detailFrame = this.add.rectangle(0, 0, 1, 1, 0x0f172a, 0.96).setOrigin(0);

    this.titleText = this.add.text(0, 0, this.shopDefinition.name, {
      fontFamily: 'MaruMonica',
      fontSize: '40px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 5,
    });
    this.coinIcon = this.add.image(0, 0, 'shop-coin').setDisplaySize(32, 32);
    this.coinText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '28px',
      color: '#fde68a',
      stroke: '#020617',
      strokeThickness: 4,
    });
    this.modeTitle = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '31px',
      color: '#f8fafc',
      stroke: '#020617',
      strokeThickness: 4,
    });
    this.messageText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#fde68a',
      wordWrap: { width: 420 },
      lineSpacing: 7,
      stroke: '#020617',
      strokeThickness: 4,
    });
    this.descriptionText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#e2e8f0',
      wordWrap: { width: 360 },
      lineSpacing: 7,
    });

    this.menuOptions = MENU_OPTIONS.map((option) => this.add.text(0, 0, option, {
      fontFamily: 'MaruMonica',
      fontSize: '30px',
      color: '#f8fafc',
    }));
    this.menuCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '30px',
      color: '#fde68a',
    }).setOrigin(0.5);

    this.itemCells = Array.from({ length: 20 }, () => {
      const frame = this.add.rectangle(0, 0, 54, 54, 0x020617, 1)
        .setStrokeStyle(2, 0x475569);
      const icon = this.add.image(0, 0, 'item-normal-sword').setDisplaySize(42, 42).setVisible(false);
      const amount = this.add.text(0, 0, '', {
        fontFamily: 'MaruMonica',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#020617',
        strokeThickness: 3,
      }).setVisible(false);

      return { frame, icon, amount };
    });

    this.uiLayer.add([
      this.backdrop,
      this.frame,
      this.menuFrame,
      this.detailFrame,
      this.titleText,
      this.coinIcon,
      this.coinText,
      this.modeTitle,
      this.messageText,
      this.descriptionText,
      ...this.menuOptions,
      this.menuCursorText,
      ...this.itemCells.flatMap((cell) => [cell.frame, cell.icon, cell.amount]),
    ]);
  }

  layoutTradeUi() {
    if (!this.uiLayer) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(920, width - 32);
    const panelHeight = Math.min(420, height - 48);
    const panelX = Math.floor((width - panelWidth) / 2);
    const panelY = Math.floor(height - panelHeight - 24);
    const menuWidth = 190;
    const detailWidth = 350;

    this.backdrop.setSize(width, height);
    this.frame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.menuFrame.setPosition(panelX + 24, panelY + 88).setSize(menuWidth, panelHeight - 116);
    this.detailFrame.setPosition(panelX + panelWidth - detailWidth - 24, panelY + 88)
      .setSize(detailWidth, panelHeight - 116);

    this.titleText.setPosition(panelX + 26, panelY + 24);
    this.coinIcon.setPosition(panelX + panelWidth - 164, panelY + 46);
    this.coinText.setPosition(panelX + panelWidth - 138, panelY + 31);
    this.modeTitle.setPosition(panelX + menuWidth + 60, panelY + 101);
    const detailX = panelX + panelWidth - detailWidth - 24;
    const detailY = panelY + 88;
    const detailHeight = panelHeight - 116;
    this.messageText.setPosition(detailX + 24, detailY + detailHeight - 86);
    this.messageText.setWordWrapWidth(detailWidth - 48);
    this.descriptionText.setPosition(detailX + 24, detailY + 24);
    this.descriptionText.setWordWrapWidth(detailWidth - 48);

    this.menuOptions.forEach((option, index) => {
      option.setPosition(panelX + 76, panelY + 128 + index * 58);
    });

    const gridX = panelX + menuWidth + 60;
    const gridY = panelY + 160;
    const columns = this.getGridColumns();
    const cellStep = 64;

    this.itemCells.forEach((cell, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = gridX + col * cellStep;
      const y = gridY + row * cellStep;

      cell.frame.setPosition(x, y);
      cell.icon.setPosition(x, y);
      cell.amount.setPosition(x + 17, y + 12);
    });

    this.updateMenuCursor();
  }

  update(time, delta) {
    this.merchant.y = this.merchantBaseY + Math.sin(time / 360) * 5;

    if (this.mode === 'select') {
      this.updateSelectInput();
    } else {
      this.updateTradeInput();
    }
  }

  updateSelectInput() {
    if (this.justDown('up')) {
      this.menuCursor = (this.menuCursor + MENU_OPTIONS.length - 1) % MENU_OPTIONS.length;
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
      this.refreshTradeUi();
    }

    if (this.justDown('down')) {
      this.menuCursor = (this.menuCursor + 1) % MENU_OPTIONS.length;
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
      this.refreshTradeUi();
    }

    if (this.justDown('cancel')) {
      this.leaveShop();
      return;
    }

    if (!this.justDown('confirm')) {
      return;
    }

    if (this.menuCursor === 0) {
      this.mode = 'buy';
      this.buyCursor = 0;
      this.message = 'Choose goods from the merchant shelf.';
    } else if (this.menuCursor === 1) {
      this.mode = 'sell';
      this.sellCursor = 0;
      this.message = 'Choose something from your pack.';
    } else {
      this.leaveShop();
      return;
    }

    this.refreshTradeUi();
  }

  updateTradeInput() {
    if (this.justDown('cancel')) {
      this.mode = 'select';
      this.message = this.shopDefinition.greeting.join('\n');
      this.refreshTradeUi();
      return;
    }

    const move = {
      x: Number(this.justDown('right')) - Number(this.justDown('left')),
      y: Number(this.justDown('down')) - Number(this.justDown('up')),
    };

    if (move.x !== 0 || move.y !== 0) {
      this.setActiveGridCursor(this.moveGridCursor(this.getActiveGridCursor(), move.x, move.y));
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
      this.refreshTradeUi();
    }

    if (!this.justDown('confirm')) {
      return;
    }

    const result = this.mode === 'buy'
      ? this.trade.buy(this.buyCursor)
      : this.trade.sell(this.sellCursor);

    this.message = result.message;
    if (result.ok) {
      this.audio?.playSfx('sfx-coin', { volume: 0.55 });
      savePlayerState(this.trade.getPlayerState());
    } else {
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
    }

    this.setActiveGridCursor(
      clamp(this.getActiveGridCursor(), 0, Math.max(0, this.getMaxGridCells() - 1)),
    );
    this.refreshTradeUi();
  }

  refreshTradeUi() {
    this.layoutTradeUi();
    this.coinText.setText(String(this.trade.stats.coin));
    this.modeTitle.setText(this.getModeTitle());
    this.messageText.setText(this.message);

    this.menuOptions.forEach((option, index) => {
      const selected = this.mode === 'select' && index === this.menuCursor;
      const active = this.mode !== 'select' && index === this.getActiveMenuIndex();
      option.setColor(selected || active ? '#fde68a' : '#f8fafc');
    });
    this.menuCursorText.setVisible(this.mode === 'select');
    this.updateMenuCursor();

    this.refreshItemCells();
    this.refreshDescription();
  }

  refreshItemCells() {
    const visibleCells = this.getMaxGridCells();
    const activeCursor = this.getActiveGridCursor();

    this.itemCells.forEach((cell, index) => {
      const visible = this.mode !== 'select' && index < visibleCells;
      cell.frame.setVisible(visible);
      cell.icon.setVisible(false);
      cell.amount.setVisible(false);

      if (!visible) {
        return;
      }

      const slot = this.getGridSlot(index);
      const item = getItemDefinition(slot?.itemId);
      const equipped = this.mode === 'sell' && this.trade.isEquippedSlot(slot?.slotId);
      const selected = index === activeCursor;

      cell.frame
        .setFillStyle(selected ? 0x334155 : equipped ? 0x604b22 : 0x020617, 1)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xf8fafc : 0x475569);

      if (!item) {
        return;
      }

      cell.icon.setTexture(item.textureKey).setVisible(true);
      cell.amount
        .setText(slot.amount > 1 ? String(slot.amount) : '')
        .setVisible(slot.amount > 1);
    });
  }

  refreshDescription() {
    if (this.mode === 'select') {
      this.descriptionText.setText('Buy, sell, or leave.');
      return;
    }

    const slot = this.getGridSlot(this.getActiveGridCursor());
    const item = getItemDefinition(slot?.itemId);

    if (!item) {
      this.descriptionText.setText(this.mode === 'select' ? 'Buy, sell, or leave.' : 'Empty slot');
      return;
    }

    const price = this.mode === 'buy'
      ? this.trade.getBuyPrice(this.buyCursor)
      : this.trade.getSellPrice(this.sellCursor);
    const actionLabel = this.mode === 'buy' ? 'Price' : 'Sell Price';
    const equippedText = this.mode === 'sell' && this.trade.isEquippedSlot(slot?.slotId) ? '\nEquipped' : '';
    const priceText = this.mode === 'sell' && price === null
      ? 'Cannot be sold'
      : `${actionLabel}: ${price}`;

    this.descriptionText.setText([
      item.name,
      '',
      item.description,
      '',
      priceText,
      equippedText.trim(),
    ].filter(Boolean).join('\n'));
  }

  leaveShop() {
    const savedState = savePlayerState(this.trade.getPlayerState());
    const returnScene = this.returnSceneKey ? this.scene.get(this.returnSceneKey) : null;

    if (returnScene) {
      returnScene.onShopReturn?.(savedState, this.shopDefinition.farewell);
      this.scene.resume(this.returnSceneKey);
      this.scene.stop();
      return;
    }

    this.scene.start('WorldMapScene', {
      returnNodeId: this.returnNodeId,
      worldMessage: this.shopDefinition.farewell,
    });
  }

  updateMenuCursor() {
    if (!this.menuCursorText || !this.menuOptions) {
      return;
    }

    const selectedBounds = this.menuOptions[this.menuCursor].getBounds();
    this.menuCursorText.setPosition(
      Math.floor(selectedBounds.x - 22),
      Math.floor(selectedBounds.y + selectedBounds.height / 2),
    );
  }

  getModeTitle() {
    if (this.mode === 'buy') {
      return 'Merchant Goods';
    }
    if (this.mode === 'sell') {
      return 'Your Pack';
    }
    return this.shopDefinition.merchantName;
  }

  getGridColumns() {
    return this.mode === 'buy' ? 3 : 5;
  }

  getActiveMenuIndex() {
    if (this.mode === 'buy') {
      return 0;
    }
    if (this.mode === 'sell') {
      return 1;
    }
    return this.menuCursor;
  }

  getActiveGridCursor() {
    return this.mode === 'buy' ? this.buyCursor : this.sellCursor;
  }

  setActiveGridCursor(cursor) {
    if (this.mode === 'buy') {
      this.buyCursor = cursor;
    } else {
      this.sellCursor = cursor;
    }
  }

  getMaxGridCells() {
    return this.mode === 'buy' ? this.shopDefinition.stock.length : 20;
  }

  getGridSlot(index) {
    if (this.mode === 'buy') {
      return this.shopDefinition.stock[index] ?? null;
    }

    return this.trade.inventory.get(index);
  }

  moveGridCursor(cursor, dx, dy) {
    const maxCells = this.getMaxGridCells();
    if (maxCells <= 0) {
      return 0;
    }

    const columns = this.getGridColumns();
    const rows = Math.ceil(maxCells / columns);
    const currentRow = Math.floor(cursor / columns);
    const currentCol = cursor % columns;
    const nextCol = clamp(currentCol + dx, 0, columns - 1);
    const nextRow = clamp(currentRow + dy, 0, rows - 1);

    return Math.min(nextRow * columns + nextCol, maxCells - 1);
  }

  justDown(action) {
    const bindings = {
      up: [this.cursors.up, this.keys.up],
      left: [this.cursors.left, this.keys.left],
      down: [this.cursors.down, this.keys.down],
      right: [this.cursors.right, this.keys.right],
      confirm: [this.keys.interact, this.keys.confirm],
      cancel: [this.keys.cancel],
    };

    return bindings[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  loadImageOnce(key, path) {
    if (!this.textures.exists(key)) {
      this.load.image(key, path);
    }
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
