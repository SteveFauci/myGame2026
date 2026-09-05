import Phaser from 'phaser';
import { getChapterDefinition } from '../data/chapters.js';
import { COMBAT_RULES } from '../data/combat.js';
import { ITEM_DEFINITIONS, getItemAssetPath, getItemDefinition } from '../data/items.js';
import { parseLegacyMap } from '../data/LegacyMapParser.js';
import { clearPlayerStateCache, resetPlayerState, savePlayerState } from '../data/playerState.js';
import {
  completeChapterProgress,
  isNodeUnlocked,
  loadProgress,
  markBossDefeated,
  markBossTreasureCollected,
  resetProgress,
  revealWorldNode,
} from '../data/progress.js';
import { getMapTriggers } from '../data/mapTriggers.js';
import { isLegacyTileSolid } from '../data/tiles.js';
import { getWorldNode } from '../data/worldMap.js';
import LegacyMonster from '../entities/LegacyMonster.js';
import Projectile from '../entities/Projectile.js';
import PlayerCharacter from '../entities/PlayerCharacter.js';
import TrainingSlime from '../entities/TrainingSlime.js';
import AudioManager, { preloadAudio } from '../systems/AudioManager.js';
import Lighting from '../systems/Lighting.js';
import PathFinder from '../systems/PathFinder.js';

const MAP_TEXT_ASSETS = Object.freeze({
  worldV3: '/maps/worldV3.txt',
  mydungeon01: '/maps/mydungeon01.txt',
  mydungeon02: '/maps/mydungeon02.txt',
});

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

const LEGACY_ENTITY_ASSETS = Object.freeze({
  OBJ_Coin_Bronze: {
    textureKey: 'legacy-coin-bronze',
    path: '/objects/coin_bronze.png',
  },
  OBJ_Key: {
    textureKey: 'item-key',
  },
  OBJ_Tent: {
    textureKey: 'legacy-tent',
    path: '/objects/tent.png',
  },
  OBJ_Pickaxe: {
    textureKey: 'legacy-pickaxe',
    path: '/objects/pickaxe.png',
  },
  OBJ_FieldShopHut: {
    textureKey: 'legacy-field-shop-hut',
    path: '/tiles/hut.png',
    collision: false,
    collisionBox: { x: -24, y: -24, width: 48, height: 48 },
    interactable: true,
    triggerNodeId: 'fieldShop',
    travelEntry: Object.freeze({
      type: 'shop',
      scene: 'ShopScene',
      shopId: 'fieldShop',
      returnNodeId: 'fieldShop',
    }),
  },
  OBJ_Axe: {
    textureKey: 'legacy-axe',
    path: '/objects/axe.png',
  },
  OBJ_Shield_Blue: {
    textureKey: 'item-blue-shield',
  },
  OBJ_Shield_Wood: {
    textureKey: 'item-wood-shield',
  },
  OBJ_Potion_Red: {
    textureKey: 'item-red-potion',
  },
  OBJ_ManaCrystal: {
    textureKey: 'manaFull',
  },
  OBJ_Heart: {
    textureKey: 'heartFull',
  },
  OBJ_Blueheart: {
    textureKey: 'legacy-blue-heart',
    path: '/objects/blueheart.png',
  },
  OBJ_Door: {
    textureKey: 'legacy-door',
    path: '/objects/door.png',
    collision: true,
    collisionBox: { x: -24, y: -8, width: 48, height: 32 },
  },
  OBJ_Door_Iron: {
    textureKey: 'legacy-door-iron',
    path: '/objects/door_iron.png',
    collision: true,
    collisionBox: { x: -24, y: -8, width: 48, height: 32 },
  },
  NPC_BigRock: {
    textureKey: 'legacy-big-rock',
    path: '/npc/bigrock.png',
    collision: true,
    pushable: true,
    interactable: true,
    collisionBox: { x: -22, y: -18, width: 44, height: 40 },
  },
  OBJ_Rock: {
    textureKey: 'legacy-big-rock',
    path: '/npc/bigrock.png',
    collision: true,
    pushable: true,
    interactable: true,
    collisionBox: { x: -22, y: -18, width: 44, height: 40 },
  },
  OBJ_Chest: {
    textureKey: 'legacy-chest',
    path: '/objects/chest.png',
    collision: true,
    collisionBox: { x: -20, y: -8, width: 40, height: 32 },
  },
  OBJ_Lantern: {
    textureKey: 'item-lantern',
  },
  OBJ_AirWall: {
    textureKey: 'legacy-air-wall',
    path: '/objects/airwall.png',
    collision: true,
    blocksPlayer: false,
    blocksEnemies: true,
    visible: false,
    collisionBox: { x: -24, y: -24, width: 48, height: 48 },
  },
  IT_MetalPlate: {
    textureKey: 'legacy-metal-plate',
    path: '/interactive/metalplate.png',
    collision: false,
    plate: true,
    visible: true,
    collisionBox: { x: -24, y: -24, width: 48, height: 48 },
  },
  IT_DestructibleWall: {
    textureKey: 'legacy-destructible-wall',
    path: '/interactive/destructibleWall.png',
    collision: true,
    destructible: true,
    life: 2,
    requiredToolId: 'pickaxe',
    collisionBox: { x: -24, y: -24, width: 48, height: 48 },
  },
  NPC_OldMan: {
    textureKey: 'legacy-oldman-down-1',
    textureKey2: 'legacy-oldman-down-2',
    path: '/npc/oldman_down_1.png',
    path2: '/npc/oldman_down_2.png',
    collision: true,
    collisionBox: { x: -16, y: -8, width: 30, height: 30 },
  },
  MON_GreenSlime: {
    textureKey: 'slimeDown1',
    textureKey2: 'slimeDown2',
    collision: true,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
  },
  MON_Bat: {
    textureKey: 'legacy-bat-down-1',
    textureKey2: 'legacy-bat-down-2',
    path: '/monsters/bat_down_1.png',
    path2: '/monsters/bat_down_2.png',
    collision: true,
    collisionBox: { x: -21, y: -9, width: 42, height: 21 },
  },
  MON_Orc: {
    textureKey: 'legacy-orc-down-1',
    textureKey2: 'legacy-orc-down-2',
    path: '/monsters/orc_down_1.png',
    path2: '/monsters/orc_down_2.png',
    collision: true,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
  },
  MON_RedSlime: {
    textureKey: 'legacy-red-slime-down-1',
    textureKey2: 'legacy-red-slime-down-2',
    path: '/monsters/redslime_down_1.png',
    path2: '/monsters/redslime_down_2.png',
    collision: true,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
  },
  MON_SkeletonLord: {
    textureKey: 'legacy-skeletonlord-down-1',
    textureKey2: 'legacy-skeletonlord-down-2',
    collision: true,
    collisionBox: { x: -80, y: -80, width: 144, height: 192 },
  },
  IT_DryTree: {
    textureKey: 'legacy-dry-tree',
    path: '/interactive/drytree.png',
    destroyedTextureKey: 'legacy-trunk',
    destroyedPath: '/interactive/trunk.png',
    destructible: true,
    life: 3,
    requiredToolId: 'axe',
    collision: true,
    collisionBox: { x: -22, y: -8, width: 44, height: 36 },
  },
});

const LEGACY_PICKUPS = Object.freeze({
  OBJ_Coin_Bronze: { kind: 'coin', label: 'Bronze Coin', value: 1 },
  OBJ_Heart: { kind: 'life', label: 'Heart', value: 2 },
  OBJ_ManaCrystal: { kind: 'mana', label: 'Mana Crystal', value: 1 },
  OBJ_Key: { kind: 'item', itemId: 'key', label: 'Key' },
  OBJ_Potion_Red: { kind: 'item', itemId: 'redPotion', label: 'Red Potion' },
  OBJ_Axe: { kind: 'item', itemId: 'axe', label: "Woodcutter's Axe" },
  OBJ_Pickaxe: { kind: 'item', itemId: 'pickaxe', label: 'Pickaxe' },
  OBJ_Lantern: { kind: 'item', itemId: 'lantern', label: 'Lantern' },
  OBJ_Shield_Blue: { kind: 'item', itemId: 'blueShield', label: 'Blue Shield' },
  OBJ_Shield_Wood: { kind: 'item', itemId: 'woodShield', label: 'Wood Shield' },
  OBJ_Tent: { kind: 'item', itemId: 'tent', label: 'Tent' },
  OBJ_Blueheart: { kind: 'bossTreasure', label: 'Blue Heart' },
});

const OLD_MAN_DIALOGUE = Object.freeze([
  'Hello, blue cat of software college.',
  "So you've come to this island to finish your LaoYu?",
  "I used to be a great student of 6th department, but now... I'm a bit too old for taking a LaoYu.",
  'Well, good luck on you.',
]);

const FIREBALL_TEXTURE_KEYS = Object.freeze({
  up: ['fireballUp1', 'fireballUp2'],
  down: ['fireballDown1', 'fireballDown2'],
  left: ['fireballLeft1', 'fireballLeft2'],
  right: ['fireballRight1', 'fireballRight2'],
});

const BOSS_DIALOGUE = Object.freeze([
  'No one can steal my treasure!',
  'You will DIE here!',
  'WELCOME TO YOUR DOOM!',
]);

const BOSS_TREASURE_TILE = Object.freeze({ col: 25, row: 8 });
const BOSS_BARRIER_TILE = Object.freeze({ col: 25, row: 28 });

const MONSTER_DEFINITIONS = Object.freeze({
  MON_GreenSlime: {
    name: 'Green Slime',
    textureKey: 'slimeDown1',
    textureKey2: 'slimeDown2',
    maxLife: 4,
    attack: 2,
    defense: 0,
    exp: 2,
    speed: 70,
    detectionRange: 320,
    attackRange: 76,
    attackCooldown: 900,
    attackWindupDuration: 350,
    knockBackPower: 0,
    bodyWidth: 36,
    bodyHeight: 30,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
    dropTypeName: 'OBJ_Coin_Bronze',
    usePathfinding: true,
  },
  MON_Orc: {
    name: 'Orc',
    textureKey: 'legacy-orc-down-1',
    textureKey2: 'legacy-orc-down-2',
    maxLife: 10,
    attack: 8,
    defense: 2,
    exp: 20,
    speed: 56,
    detectionRange: 420,
    attackRange: 88,
    attackCooldown: 1050,
    attackWindupDuration: 480,
    knockBackPower: 5,
    attackTextureKeys: {
      up: ['legacy-orc-attack-up-1', 'legacy-orc-attack-up-2'],
      down: ['legacy-orc-attack-down-1', 'legacy-orc-attack-down-2'],
      left: ['legacy-orc-attack-left-1', 'legacy-orc-attack-left-2'],
      right: ['legacy-orc-attack-right-1', 'legacy-orc-attack-right-2'],
    },
    bodyWidth: 40,
    bodyHeight: 44,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
    dropTypeName: 'OBJ_Coin_Bronze',
    usePathfinding: true,
  },
  MON_RedSlime: {
    name: 'Red Slime',
    textureKey: 'legacy-red-slime-down-1',
    textureKey2: 'legacy-red-slime-down-2',
    maxLife: 8,
    attack: 7,
    defense: 0,
    exp: 5,
    speed: 90,
    detectionRange: 340,
    attackRange: 76,
    attackCooldown: 900,
    attackWindupDuration: 400,
    knockBackPower: 0,
    bodyWidth: 36,
    bodyHeight: 30,
    collisionBox: { x: -18, y: -12, width: 36, height: 30 },
    dropTypeName: 'OBJ_Coin_Bronze',
    usePathfinding: true,
  },
  MON_SkeletonLord: {
    name: 'Skeleton Lord',
    textureKey: 'legacy-skeletonlord-down-1',
    textureKey2: 'legacy-skeletonlord-down-2',
    boss: true,
    sleep: true,
    maxLife: 150,
    attack: 10,
    defense: 2,
    exp: 150,
    speed: 56,
    detectionRange: 500,
    attackRange: 168,
    attackCooldown: 1050,
    attackWindupDuration: 500,
    knockBackPower: 7,
    attackTextureKeys: {
      up: ['legacy-skeletonlord-attack-up-1', 'legacy-skeletonlord-attack-up-2'],
      down: ['legacy-skeletonlord-attack-down-1', 'legacy-skeletonlord-attack-down-2'],
      left: ['legacy-skeletonlord-attack-left-1', 'legacy-skeletonlord-attack-left-2'],
      right: ['legacy-skeletonlord-attack-right-1', 'legacy-skeletonlord-attack-right-2'],
    },
    phase2TextureKey: 'legacy-skeletonlord-phase2-down-1',
    phase2TextureKey2: 'legacy-skeletonlord-phase2-down-2',
    phase2TextureKeys: {
      up: ['legacy-skeletonlord-phase2-up-1', 'legacy-skeletonlord-phase2-up-2'],
      down: ['legacy-skeletonlord-phase2-down-1', 'legacy-skeletonlord-phase2-down-2'],
      left: ['legacy-skeletonlord-phase2-left-1', 'legacy-skeletonlord-phase2-left-2'],
      right: ['legacy-skeletonlord-phase2-right-1', 'legacy-skeletonlord-phase2-right-2'],
    },
    phase2AttackTextureKeys: {
      up: ['legacy-skeletonlord-phase2-attack-up-1', 'legacy-skeletonlord-phase2-attack-up-2'],
      down: ['legacy-skeletonlord-phase2-attack-down-1', 'legacy-skeletonlord-phase2-attack-down-2'],
      left: ['legacy-skeletonlord-phase2-attack-left-1', 'legacy-skeletonlord-phase2-attack-left-2'],
      right: ['legacy-skeletonlord-phase2-attack-right-1', 'legacy-skeletonlord-phase2-attack-right-2'],
    },
    phase2AttackMultiplier: 2,
    phase2SpeedBonus: 24,
    bodyWidth: 144,
    bodyHeight: 192,
    collisionBox: { x: -80, y: -80, width: 144, height: 192 },
    footprintWidthTiles: 5,
    footprintHeightTiles: 5,
    spawnOffsetTiles: { x: 0, y: 1 },
    scale: 7.5,
    depth: 24,
    dropTypeName: null,
    usePathfinding: true,
    pathfindingRange: 14,
  },
  MON_Bat: {
    name: 'Bat',
    textureKey: 'legacy-bat-down-1',
    textureKey2: 'legacy-bat-down-2',
    maxLife: 7,
    attack: 5,
    defense: 0,
    exp: 7,
    speed: 120,
    detectionRange: 280,
    attackRange: 64,
    attackCooldown: 850,
    attackWindupDuration: 360,
    knockBackPower: 0,
    bodyWidth: 36,
    bodyHeight: 24,
    collisionBox: { x: -21, y: -9, width: 42, height: 21 },
    dropTypeName: 'OBJ_Coin_Bronze',
  },
});

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.combatMessages = [];
    this.gameOver = false;
    this.titleScreen = false;
    this.dialogue = null;
    this.confirmPrompt = null;
    this.sleepSequence = null;
    this.pauseMenuOpen = false;
    this.pauseCursor = 0;
    this.pauseMenuMode = 'main';
    this.pauseDeveloperCursor = 0;
    this.developerMode = {
      noClip: false,
      invincible: false,
    };
    this.chapterDefinition = null;
    this.chapterClear = false;
    this.chapterClearResult = null;
    this.objectiveTargetCount = 0;
    this.puzzleSolved = false;
    this.puzzleRockCount = 0;
    this.puzzlePlateCount = 0;
    this.mapKey = 'worldV3';
    this.mapTriggers = [];
    this.triggeredMapTriggerIds = new Set();
    this.bossEncounter = null;
    this.bossMonster = null;
  }

  init(data = {}) {
    this.resetRunState();
    this.chapterId = data.chapterId ?? 'newbieVillage';
    this.chapterName = data.chapterName ?? 'Newbie Village';
    this.returnNodeId = data.returnNodeId ?? 'village';
    this.spawnTile = data.spawn ?? { col: 23, row: 21 };
    this.chapterDefinition = getChapterDefinition(this.chapterId);
    this.mapKey = this.chapterDefinition?.mapKey ?? 'worldV3';
  }

  resetRunState() {
    this.combatMessages = [];
    this.gameOver = false;
    this.gameOverCursor = 0;
    this.titleScreen = false;
    this.dialogue = null;
    this.confirmPrompt = null;
    this.sleepSequence = null;
    this.pauseMenuOpen = false;
    this.pauseCursor = 0;
    this.pauseMenuMode = 'main';
    this.pauseDeveloperCursor = 0;
    this.developerMode = {
      noClip: false,
      invincible: false,
    };
    this.chapterDefinition = null;
    this.chapterClear = false;
    this.chapterClearResult = null;
    this.objectiveTargetCount = 0;
    this.puzzleSolved = false;
    this.puzzleRockCount = 0;
    this.puzzlePlateCount = 0;
    this.triggeredMapTriggerIds = new Set();
    this.bossEncounter = null;
    this.bossMonster = null;
    this.nextDropId = 0;
    this.pendingAttack = false;
    this.pendingRangedAttack = false;
    this.pendingInteract = false;
    this.pendingConfirm = false;
    this.pendingPause = false;
  }

  preload() {
    preloadAudio(this.load);
    Object.entries(MAP_TEXT_ASSETS).forEach(([key, path]) => {
      this.load.text(key, path);
    });

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
      this.load.image(
        `playerAxe${this.capitalize(direction)}1`,
        `/player/boy_axe_${direction}_1.png`,
      );
      this.load.image(
        `playerAxe${this.capitalize(direction)}2`,
        `/player/boy_axe_${direction}_2.png`,
      );
      this.load.image(
        `playerPick${this.capitalize(direction)}1`,
        `/player/boy_pick_${direction}_1.png`,
      );
      this.load.image(
        `playerPick${this.capitalize(direction)}2`,
        `/player/boy_pick_${direction}_2.png`,
      );
    });

    this.load.image('slimeDown1', '/monsters/greenslime_down_1.png');
    this.load.image('slimeDown2', '/monsters/greenslime_down_2.png');
    ['up', 'down', 'left', 'right'].forEach((direction) => {
      this.load.image(
        `legacy-orc-attack-${direction}-1`,
        `/monsters/orc_attack_${direction}_1.png`,
      );
      this.load.image(
        `legacy-orc-attack-${direction}-2`,
        `/monsters/orc_attack_${direction}_2.png`,
      );
    });
    ['up', 'down', 'left', 'right'].forEach((direction) => {
      this.load.image(
        `legacy-skeletonlord-${direction}-1`,
        `/monsters/skeletonlord_${direction}_1.png`,
      );
      this.load.image(
        `legacy-skeletonlord-${direction}-2`,
        `/monsters/skeletonlord_${direction}_2.png`,
      );
      this.load.image(
        `legacy-skeletonlord-attack-${direction}-1`,
        `/monsters/skeletonlord_attack_${direction}_1.png`,
      );
      this.load.image(
        `legacy-skeletonlord-attack-${direction}-2`,
        `/monsters/skeletonlord_attack_${direction}_2.png`,
      );
      this.load.image(
        `legacy-skeletonlord-phase2-${direction}-1`,
        `/monsters/skeletonlord_phase2_${direction}_1.png`,
      );
      this.load.image(
        `legacy-skeletonlord-phase2-${direction}-2`,
        `/monsters/skeletonlord_phase2_${direction}_2.png`,
      );
      this.load.image(
        `legacy-skeletonlord-phase2-attack-${direction}-1`,
        `/monsters/skeletonlord_phase2_attack_${direction}_1.png`,
      );
      this.load.image(
        `legacy-skeletonlord-phase2-attack-${direction}-2`,
        `/monsters/skeletonlord_phase2_attack_${direction}_2.png`,
      );
    });
    this.load.image('fireballUp1', '/projectile/fireball_up_1.png');
    this.load.image('fireballUp2', '/projectile/fireball_up_2.png');
    this.load.image('fireballDown1', '/projectile/fireball_down_1.png');
    this.load.image('fireballDown2', '/projectile/fireball_down_2.png');
    this.load.image('fireballLeft1', '/projectile/fireball_left_1.png');
    this.load.image('fireballLeft2', '/projectile/fireball_left_2.png');
    this.load.image('fireballRight1', '/projectile/fireball_right_1.png');
    this.load.image('fireballRight2', '/projectile/fireball_right_2.png');

    this.load.image('heartFull', '/objects/heart_full.png');
    this.load.image('heartHalf', '/objects/heart_half.png');
    this.load.image('heartBlank', '/objects/heart_blank.png');
    this.load.image('manaFull', '/objects/manacrystal_full.png');
    this.load.image('manaBlank', '/objects/manacrystal_blank.png');
    Object.values(ITEM_DEFINITIONS).forEach((item) => {
      const assetPath = getItemAssetPath(item);
      if (assetPath) {
        this.load.image(item.textureKey, assetPath);
      }
    });

    Object.values(LEGACY_ENTITY_ASSETS).forEach((asset) => {
      if (asset.path) {
        this.load.image(asset.textureKey, asset.path);
      }
      if (asset.path2) {
        this.load.image(asset.textureKey2, asset.path2);
      }
      if (asset.destroyedPath) {
        this.load.image(asset.destroyedTextureKey, asset.destroyedPath);
      }
    });

    TILE_NAMES.forEach((tileName) => {
      this.load.image(`tile-${tileName}`, `/tiles/${tileName}.png`);
    });
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');

    this.tileSize = 48;
    this.mapKey = this.chapterDefinition?.mapKey ?? 'worldV3';
    this.progress = loadProgress();
    this.legacyMap = parseLegacyMap(this.cache.text.get(this.mapKey) ?? '');
    this.mapTriggers = getMapTriggers(this.mapKey);
    this.worldWidth = this.legacyMap.width * this.tileSize;
    this.worldHeight = this.legacyMap.height * this.tileSize;

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.projectiles = [];
    this.enemies = [];

    this.drawLegacyMap();
    this.createLegacyEntitySprites();
    this.pathFinder = new PathFinder(this);
    this.createInput();
    this.audio = new AudioManager(this);
    this.audio.playMusic(this.getMusicKey());

    const spawnCol = Number.isFinite(this.spawnTile?.col) ? this.spawnTile.col : 23;
    const spawnRow = Number.isFinite(this.spawnTile?.row) ? this.spawnTile.row : 21;
    this.player = new PlayerCharacter(
      this,
      spawnCol * this.tileSize + this.tileSize / 2,
      spawnRow * this.tileSize + this.tileSize / 2,
    );
    if (this.player.stats.life <= 0) {
      this.restorePlayerVitals();
      savePlayerState(this.player.toState());
    }
    this.restoreBossTreasureIfNeeded();
    if (this.mapKey === 'worldV3') {
      this.enemies.push(
        new TrainingSlime(
          this,
          25 * this.tileSize + this.tileSize / 2,
          21 * this.tileSize + this.tileSize / 2,
        ),
      );
    }

    this.lighting = new Lighting(this, {
      mode: this.chapterDefinition?.lightingMode,
    });
    this.createHud();
    this.createCharacterPanel();
    this.createDialoguePanel();
    this.createConfirmPanel();
    this.createPausePanel();
    this.createChapterClearPanel();
    this.createGameOverPanel();
    this.createTitlePanel();
    this.createBossHealthBar();
    this.setupChapterObjective();
    this.setupBossEncounter();
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: 'W',
      left: 'A',
      down: 'S',
      right: 'D',
      attack: 'J',
      ranged: 'I',
      interact: 'F',
      guard: 'SPACE',
      inventory: 'C',
      confirm: 'ENTER',
      cancel: 'ESC',
      pause: 'P',
    });
    this.pendingAttack = false;
    this.pendingRangedAttack = false;
    this.pendingInteract = false;
    this.pendingConfirm = false;
    this.pendingPause = false;

    [
      'keydown-C',
      'keydown-ESC',
      'keydown-J',
      'keydown-I',
      'keydown-ENTER',
      'keydown-F',
      'keydown-P',
    ].forEach((eventName) => this.input.keyboard.removeAllListeners(eventName));

    this.input.keyboard.on('keydown-C', () => {
      if (
        !this.pauseMenuOpen
        && !this.confirmPrompt
        && !this.sleepSequence
        && !this.dialogue
        && !this.gameOver
        && !this.titleScreen
      ) {
        this.toggleCharacterPanel();
      }
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.characterPanel?.visible) {
        this.closeCharacterPanel();
      }
    });
    this.input.keyboard.on('keydown-J', () => {
      this.pendingAttack = true;
    });
    this.input.keyboard.on('keydown-I', () => {
      this.pendingRangedAttack = true;
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      this.pendingConfirm = true;
    });
    this.input.keyboard.on('keydown-F', () => {
      this.pendingInteract = true;
    });
    this.input.keyboard.on('keydown-P', () => {
      this.pendingPause = true;
    });
  }

  getMusicKey() {
    if (this.chapterId === 'bossGate' && this.bossEncounter?.battleActive) {
      return 'music-boss';
    }

    if (this.chapterId === 'dungeon') {
      return 'music-dungeon';
    }
    if (this.chapterId === 'bossGate') {
      return 'music-dungeon';
    }
    return 'music-overworld';
  }

  createHud() {
    this.heartIcons = Array.from(
      { length: Math.ceil(this.player.stats.maxLife / 2) },
      () => this.add.image(0, 0, 'heartBlank')
        .setOrigin(0.5)
        .setDisplaySize(this.tileSize, this.tileSize)
        .setScrollFactor(0)
        .setDepth(90),
    );
    this.manaIcons = Array.from(
      { length: this.player.stats.maxMana },
      () => this.add.image(0, 0, 'manaBlank')
        .setOrigin(0.5)
        .setDisplaySize(this.tileSize, this.tileSize)
        .setScrollFactor(0)
        .setDepth(90),
    );

    const statusTextStyle = {
      fontFamily: 'MaruMonica',
      fontSize: '22px',
      color: '#f8fafc',
      stroke: '#0f172a',
      strokeThickness: 4,
    };
    this.lifeHud = this.add.text(0, 0, '', statusTextStyle)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(90);
    this.manaHud = this.add.text(0, 0, '', statusTextStyle)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(90);
    this.timeHud = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '22px',
      color: '#cbd5e1',
      stroke: '#0f172a',
      strokeThickness: 4,
    })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(90);

    this.hud = this.add.text(16, 132, '', {
      fontFamily: 'MaruMonica',
      fontSize: '21px',
      color: '#f8fafc',
      lineSpacing: 5,
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(90);

    this.messageHud = this.add.text(16, 214, '', {
      fontFamily: 'MaruMonica',
      fontSize: '21px',
      color: '#fde68a',
      lineSpacing: 5,
      stroke: '#0f172a',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(90);

    this.layoutHud();
    this.scale.on('resize', this.layoutHud, this);
    this.updateHud();
  }

  layoutHud() {
    if (!this.heartIcons || !this.manaIcons) {
      return;
    }

    this.heartIcons.forEach((icon, index) => {
      icon.setPosition(160 + index * this.tileSize, 32);
    });
    this.manaIcons.forEach((icon, index) => {
      icon.setPosition(160 + index * 35, 96);
    });
    this.lifeHud.setPosition(16, 28);
    this.manaHud.setPosition(16, 92);
    this.timeHud.setPosition(this.scale.width - 16, this.scale.height - 16);
  }

  ensureHudStatusIcons() {
    if (!this.player || !this.heartIcons || !this.manaIcons) {
      return;
    }

    const requiredHearts = Math.ceil(this.player.stats.maxLife / 2);
    while (this.heartIcons.length < requiredHearts) {
      this.heartIcons.push(
        this.add.image(0, 0, 'heartBlank')
          .setOrigin(0.5)
          .setDisplaySize(this.tileSize, this.tileSize)
          .setScrollFactor(0)
          .setDepth(90),
      );
    }

    while (this.manaIcons.length < this.player.stats.maxMana) {
      this.manaIcons.push(
        this.add.image(0, 0, 'manaBlank')
          .setOrigin(0.5)
          .setDisplaySize(this.tileSize, this.tileSize)
          .setScrollFactor(0)
          .setDepth(90),
      );
    }

    this.layoutHud();
  }

  createCharacterPanel() {
    this.characterPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.panelBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.82).setOrigin(0);
    this.panelFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 1).setOrigin(0);
    this.panelTitle = this.add.text(0, 0, 'Character & Inventory', {
      fontFamily: 'MaruMonica',
      fontSize: '35px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.panelStats = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '25px',
      color: '#cbd5e1',
      lineSpacing: 6,
    });
    this.panelDescription = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#f8fafc',
      wordWrap: { width: 300 },
      lineSpacing: 6,
    });
    this.panelHint = this.add.text(0, 0, 'WASD / Arrows: select    F: equip/use    C / Esc: close', {
      fontFamily: 'MaruMonica',
      fontSize: '21px',
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
        fontFamily: 'MaruMonica',
        fontSize: '22px',
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

  createLegacyEntitySprites() {
    this.mapEntities = [];
    this.unrenderedMapEntities = [];

    this.legacyMap.entities.forEach((entity, index) => {
      const definition = LEGACY_ENTITY_ASSETS[entity.typeName];

      if (!definition) {
        this.unrenderedMapEntities.push(entity);
        return;
      }

      if (entity.category === 'MON' && MONSTER_DEFINITIONS[entity.typeName]) {
        const monsterDefinition = MONSTER_DEFINITIONS[entity.typeName];
        const footprintWidthTiles = monsterDefinition.footprintWidthTiles ?? 1;
        const footprintHeightTiles = monsterDefinition.footprintHeightTiles ?? 1;
        const spawnOffsetTiles = monsterDefinition.spawnOffsetTiles ?? { x: 0, y: 0 };
        const monster = new LegacyMonster(this, {
          ...monsterDefinition,
          typeName: entity.typeName,
          x: entity.x * this.tileSize
            + (footprintWidthTiles * this.tileSize) / 2
            + (spawnOffsetTiles.x * this.tileSize),
          y: entity.y * this.tileSize
            + (footprintHeightTiles * this.tileSize) / 2
            + (spawnOffsetTiles.y * this.tileSize),
          animationKey: `legacy-${entity.typeName.toLowerCase()}-idle`,
        });

        monster.sourceEntity = entity;
        monster.objectiveTarget = this.isChapterEnemyTarget(entity);
        if (monster.boss) {
          this.bossMonster = monster;
        }
        this.enemies.push(monster);
        return;
      }

      const mapEntity = {
        ...entity,
        id: `${entity.category}-${entity.typeName}-${index}`,
        collision: definition.collision ?? false,
        blocksPlayer: definition.blocksPlayer ?? definition.collision ?? false,
        blocksEnemies: definition.blocksEnemies ?? definition.collision ?? false,
        collisionBox: definition.collisionBox ?? null,
        destructible: definition.destructible ?? false,
        life: definition.life ?? null,
        pushable: definition.pushable ?? false,
        plate: definition.plate ?? false,
        requiredToolId: definition.requiredToolId ?? null,
        triggerNodeId: definition.triggerNodeId ?? null,
        travelEntry: definition.travelEntry ?? null,
        invulnerableUntil: 0,
        destroyed: false,
        destroyedTextureKey: definition.destroyedTextureKey ?? null,
        pickup: LEGACY_PICKUPS[entity.typeName] ?? null,
        interactable: definition.interactable ?? Boolean(
          entity.category === 'NPC'
          || entity.typeName === 'OBJ_Door'
          || entity.typeName === 'OBJ_Door_Iron'
          || entity.typeName === 'OBJ_Chest'
          || definition.triggerNodeId,
        ),
        opened: false,
        sprite: null,
      };

      if (definition.visible !== false) {
        mapEntity.sprite = this.add
          .sprite(
            entity.x * this.tileSize + this.tileSize / 2,
            entity.y * this.tileSize + this.tileSize / 2,
            definition.textureKey,
          )
          .setScale(3)
          .setDepth(this.getLegacyEntityDepth(entity.category));

        if (definition.textureKey2) {
          const animationKey = `legacy-${entity.typeName.toLowerCase()}-idle`;

          if (!this.anims.exists(animationKey)) {
            this.anims.create({
              key: animationKey,
              frames: [
                { key: definition.textureKey },
                { key: definition.textureKey2 },
              ],
              frameRate: entity.category === 'NPC' ? 2 : 4,
              repeat: -1,
            });
          }

          mapEntity.sprite.play(animationKey);
        }
      }

      mapEntity.worldX = entity.x * this.tileSize + this.tileSize / 2;
      mapEntity.worldY = entity.y * this.tileSize + this.tileSize / 2;
      mapEntity.sprite?.setData('mapEntityId', mapEntity.id);
      this.mapEntities.push(mapEntity);
    });
  }

  getLegacyEntityDepth(category) {
    if (category === 'IT') {
      return 16;
    }
    if (category === 'NPC' || category === 'MON') {
      return 18;
    }
    return 15;
  }

  isChapterEnemyTarget(entity) {
    const targets = this.chapterDefinition?.enemyTargets ?? [];

    return targets.some((target) => (
      target.typeName === entity.typeName
      && target.x === entity.x
      && target.y === entity.y
    ));
  }

  setupChapterObjective() {
    this.objectiveTargetCount = this.enemies.filter((enemy) => enemy.objectiveTarget).length;

    if (!this.chapterDefinition) {
      return;
    }

    if (this.chapterDefinition.type === 'platePuzzle') {
      this.setupPlatePuzzle();
    }

    this.addCombatMessage(this.chapterDefinition.objectiveText);
    this.checkChapterObjectiveProgress();
  }

  setupBossEncounter() {
    if (this.chapterId !== 'bossGate') {
      return;
    }

    this.bossEncounter = {
      cutsceneStarted: false,
      battleActive: false,
      defeated: false,
      treasureCreated: false,
      treasureCollected: false,
    };

    if (this.bossMonster) {
      this.bossMonster.sleep = true;
      this.bossMonster.sprite.setTint(0x9ca3af);
    }
  }

  restoreBossTreasureIfNeeded() {
    if (
      !this.progress?.bossTreasureCollected
      || !this.player
      || this.player.inventory.count('blueHeart') > 0
      || !this.player.inventory.canAdd('blueHeart')
    ) {
      return;
    }

    this.player.inventory.add('blueHeart');
    savePlayerState(this.player.toState());
    this.addCombatMessage('The Blue Heart has been restored to your pack.');
  }

  getBossMonster() {
    if (this.bossMonster && !this.bossMonster.removed) {
      return this.bossMonster;
    }

    this.bossMonster = this.enemies.find((enemy) => (
      enemy.typeName === 'MON_SkeletonLord'
      && !enemy.removed
    )) ?? null;
    return this.bossMonster;
  }

  startBossCutscene(trigger = null) {
    if (
      this.chapterId !== 'bossGate'
      || this.bossEncounter?.cutsceneStarted
      || this.bossEncounter?.battleActive
    ) {
      return false;
    }

    const boss = this.getBossMonster();
    if (!boss) {
      this.addCombatMessage('The chamber is silent.');
      return false;
    }

    if (!this.bossEncounter) {
      this.setupBossEncounter();
    }

    this.bossEncounter.cutsceneStarted = true;
    if (trigger?.id) {
      this.triggeredMapTriggerIds.add(trigger.id);
    }

    this.player.sprite.setVelocity(0, 0);
    this.player.attackSprite.setVisible(false);
    this.player.sprite.setVisible(true);
    this.enemies.forEach((enemy) => {
      enemy.sprite?.setVelocity(0, 0);
      enemy.attackWindup = null;
      enemy.clearAttackVisual?.();
    });

    this.createBossBarrier();
    this.audio?.playSfx('sfx-door-open', { volume: 0.65 });
    this.cameras.main.stopFollow();
    this.cameras.main.pan(boss.sprite.x, boss.sprite.y + this.tileSize, 900, 'Sine.easeInOut');
    this.openDialogue('Skeleton Lord', BOSS_DIALOGUE, boss, {
      onComplete: () => this.startBossBattle(),
    });
    return true;
  }

  startBossBattle() {
    const boss = this.getBossMonster();
    if (!boss || boss.defeated) {
      this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
      return;
    }

    this.bossEncounter = {
      ...(this.bossEncounter ?? {}),
      cutsceneStarted: true,
      battleActive: true,
      defeated: false,
    };
    boss.wake();
    this.audio?.playMusic('music-boss');
    this.showBossHealthBar(boss);
    this.addCombatMessage('Skeleton Lord awakens!');
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
  }

  completeBossBattle(enemy) {
    if (this.chapterId !== 'bossGate' || this.bossEncounter?.defeated) {
      return;
    }

    this.bossEncounter = {
      ...(this.bossEncounter ?? {}),
      cutsceneStarted: true,
      battleActive: false,
      defeated: true,
      treasureCollected: this.player.inventory.count('blueHeart') > 0,
    };
    this.progress = markBossDefeated();
    this.audio?.playMusic('music-dungeon');
    this.openBossDoors();
    this.createBossTreasure();
    this.updateBossHealthBar(enemy);
    this.time.delayedCall(800, () => this.hideBossHealthBar());
    this.addCombatMessage('The iron gate lock breaks.');
  }

  createBossBarrier() {
    if (this.mapEntities.some((entity) => entity.id === 'boss-battle-barrier' && !entity.destroyed)) {
      return;
    }

    const definition = LEGACY_ENTITY_ASSETS.OBJ_Door_Iron;
    const worldX = BOSS_BARRIER_TILE.col * this.tileSize + this.tileSize / 2;
    const worldY = BOSS_BARRIER_TILE.row * this.tileSize + this.tileSize / 2;
    const barrier = {
      id: 'boss-battle-barrier',
      category: 'OBJ',
      typeName: 'OBJ_Door_Iron',
      x: BOSS_BARRIER_TILE.col,
      y: BOSS_BARRIER_TILE.row,
      worldX,
      worldY,
      extra: null,
      collision: true,
      blocksPlayer: true,
      blocksEnemies: true,
      collisionBox: definition.collisionBox,
      pickup: null,
      interactable: false,
      opened: false,
      destroyed: false,
      temporary: true,
      sprite: this.add.sprite(worldX, worldY, definition.textureKey)
        .setScale(3)
        .setDepth(this.getLegacyEntityDepth('OBJ')),
    };

    barrier.sprite.setData('mapEntityId', barrier.id);
    this.mapEntities.push(barrier);
  }

  openBossDoors(options = {}) {
    const animated = options.animated ?? true;
    const silent = options.silent ?? false;

    this.mapEntities
      .filter((entity) => entity.typeName === 'OBJ_Door_Iron' && !entity.destroyed)
      .forEach((door) => {
        door.opened = true;
        door.destroyed = true;
        door.collision = false;
        door.blocksPlayer = false;
        door.blocksEnemies = false;
        door.collisionBox = null;
        door.interactable = false;

        if (!silent) {
          this.audio?.playSfx('sfx-door-open', { volume: 0.6 });
        }

        if (!door.sprite || !animated) {
          this.removeMapEntity(door);
          return;
        }

        this.tweens.add({
          targets: door.sprite,
          alpha: 0,
          y: door.sprite.y - 8,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => this.removeMapEntity(door),
        });
      });
  }

  createBossTreasure() {
    if (this.bossEncounter?.treasureCreated) {
      return;
    }

    if (this.player?.inventory.count('blueHeart') > 0) {
      this.bossEncounter.treasureCreated = true;
      return;
    }

    const existingTreasure = this.mapEntities.some((entity) => (
      entity.typeName === 'OBJ_Blueheart'
      && !entity.destroyed
    ));
    if (existingTreasure) {
      this.bossEncounter.treasureCreated = true;
      return;
    }

    const worldX = BOSS_TREASURE_TILE.col * this.tileSize + this.tileSize / 2;
    const worldY = BOSS_TREASURE_TILE.row * this.tileSize + this.tileSize / 2;
    this.createDrop(worldX, worldY, 'OBJ_Blueheart');
    if (this.bossEncounter) {
      this.bossEncounter.treasureCreated = true;
    }
  }

  showBossHealthBar(boss = this.getBossMonster()) {
    if (!this.bossHealthBar || !boss) {
      return;
    }

    this.bossHealthBar.setVisible(true);
    this.updateBossHealthBar(boss);
  }

  hideBossHealthBar() {
    this.bossHealthBar?.setVisible(false);
  }

  updateBossHealthBar(boss = this.getBossMonster()) {
    if (!this.bossHealthBar || !this.bossBarFill || !this.bossBarBack) {
      return;
    }

    if (!boss || (!this.bossEncounter?.battleActive && !boss.dying)) {
      this.bossHealthBar.setVisible(false);
      return;
    }

    const barWidth = this.bossBarBack.width;
    const lifeRatio = Phaser.Math.Clamp(boss.life / boss.maxLife, 0, 1);
    this.bossHealthBar.setVisible(true);
    this.bossNameText.setText(boss.name);
    this.bossBarFill.setSize(
      Math.max(0, Math.floor((barWidth - 4) * lifeRatio)),
      16,
    );
    this.bossHpText.setText(`${Math.max(0, boss.life)} / ${boss.maxLife}`);
  }

  setupPlatePuzzle() {
    this.puzzleSolved = false;
    this.puzzleRockCount = this.getPuzzleRocks().length;
    this.puzzlePlateCount = this.getPuzzlePlates().length;
    this.refreshPlatePuzzleState(true);
  }

  getPuzzleRocks() {
    return this.mapEntities.filter((entity) => entity.pushable && !entity.destroyed);
  }

  getPuzzlePlates() {
    return this.mapEntities.filter((entity) => entity.plate && !entity.destroyed);
  }

  refreshPlatePuzzleState(forceUpdate = false) {
    if (!this.chapterDefinition || this.chapterDefinition.type !== 'platePuzzle') {
      return;
    }

    const rocks = this.getPuzzleRocks();
    const plates = this.getPuzzlePlates();

    plates.forEach((plate) => {
      plate.linkedEntity = null;
      plate.sprite?.clearTint();
      plate.sprite?.setAlpha(0.95);
    });

    rocks.forEach((rock) => {
      rock.linkedEntity = null;
    });

    rocks.forEach((rock) => {
      const linkedPlate = plates.find((plate) => (
        !plate.linkedEntity && this.isRockOnPlate(rock, plate)
      ));

      if (linkedPlate) {
        rock.linkedEntity = linkedPlate;
        linkedPlate.linkedEntity = rock;
        linkedPlate.sprite?.setTint(0xffd166);
        linkedPlate.sprite?.setAlpha(1);
      }
    });

    const solved = plates.length > 0 && rocks.length > 0 && rocks.every((rock) => rock.linkedEntity);
    if (solved && !this.puzzleSolved) {
      this.puzzleSolved = true;
      this.openIronDoorsForPuzzle();
      this.audio?.playSfx('sfx-unlock', { volume: 0.6 });
      this.addCombatMessage('A hidden mechanism clicks open.');
    }
  }

  isRockOnPlate(rock, plate) {
    if (!rock || !plate) {
      return false;
    }

    const distance = Math.max(
      Math.abs(rock.worldX - plate.worldX),
      Math.abs(rock.worldY - plate.worldY),
    );

    if (distance <= 12) {
      rock.worldX = plate.worldX;
      rock.worldY = plate.worldY;
      rock.sprite?.setPosition(rock.worldX, rock.worldY);
      return true;
    }

    return false;
  }

  openIronDoorsForPuzzle() {
    this.mapEntities
      .filter((entity) => entity.typeName === 'OBJ_Door_Iron' && !entity.destroyed)
      .forEach((door) => {
        door.opened = true;
        door.collision = false;
        door.blocksPlayer = false;
        door.blocksEnemies = false;
        door.collisionBox = null;
        door.interactable = false;
        this.audio?.playSfx('sfx-door-open', { volume: 0.6 });

        if (!door.sprite) {
          this.removeMapEntity(door);
          return;
        }

        this.tweens.add({
          targets: door.sprite,
          alpha: 0,
          y: door.sprite.y - 8,
          duration: 180,
          ease: 'Cubic.easeOut',
          onComplete: () => this.removeMapEntity(door),
        });
      });
  }

  createDialoguePanel() {
    this.dialoguePanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(110)
      .setVisible(false);

    this.dialogueBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.22).setOrigin(0);
    this.dialogueFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 0.98).setOrigin(0);
    this.dialogueSpeaker = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '27px',
      color: '#fde68a',
      fontStyle: 'bold',
    });
    this.dialogueText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '25px',
      color: '#f8fafc',
      wordWrap: { width: 760 },
      lineSpacing: 7,
    });
    this.dialogueHint = this.add.text(0, 0, 'F: continue', {
      fontFamily: 'MaruMonica',
      fontSize: '20px',
      color: '#94a3b8',
    });

    this.dialoguePanel.add([
      this.dialogueBackdrop,
      this.dialogueFrame,
      this.dialogueSpeaker,
      this.dialogueText,
      this.dialogueHint,
    ]);
    this.layoutDialoguePanel();
    this.scale.on('resize', this.layoutDialoguePanel, this);
  }

  createGameOverPanel() {
    this.gameOverPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(120)
      .setVisible(false);

    this.gameOverBackdrop = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.72).setOrigin(0);
    this.gameOverTitle = this.add.text(0, 0, 'Game Over', {
      fontFamily: 'MaruMonica',
      fontSize: '68px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.gameOverOptions = [
      this.add.text(0, 0, 'Retry', {
        fontFamily: 'MaruMonica',
        fontSize: '32px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Quit', {
        fontFamily: 'MaruMonica',
        fontSize: '32px',
        color: '#f8fafc',
      }).setOrigin(0.5),
    ];
    this.gameOverCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '32px',
      color: '#fde68a',
    }).setOrigin(0.5);

    this.gameOverPanel.add([
      this.gameOverBackdrop,
      this.gameOverTitle,
      ...this.gameOverOptions,
      this.gameOverCursorText,
    ]);
    this.layoutGameOverPanel();
    this.scale.on('resize', this.layoutGameOverPanel, this);
  }

  createConfirmPanel() {
    this.confirmPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(130)
      .setVisible(false);

    this.confirmBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.45).setOrigin(0);
    this.confirmFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 0.98).setOrigin(0);
    this.confirmTitle = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '31px',
      color: '#fde68a',
      fontStyle: 'bold',
    });
    this.confirmText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '25px',
      color: '#f8fafc',
      wordWrap: { width: 520 },
      lineSpacing: 7,
    });
    this.confirmOptions = [
      this.add.text(0, 0, 'Yes', {
        fontFamily: 'MaruMonica',
        fontSize: '27px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'No', {
        fontFamily: 'MaruMonica',
        fontSize: '27px',
        color: '#f8fafc',
      }).setOrigin(0.5),
    ];
    this.confirmCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '27px',
      color: '#fde68a',
    }).setOrigin(0.5);

    this.confirmPanel.add([
      this.confirmBackdrop,
      this.confirmFrame,
      this.confirmTitle,
      this.confirmText,
      ...this.confirmOptions,
      this.confirmCursorText,
    ]);
    this.layoutConfirmPanel();
    this.scale.on('resize', this.layoutConfirmPanel, this);
  }

  createPausePanel() {
    this.pausePanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(118)
      .setVisible(false);

    this.pauseBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.62).setOrigin(0);
    this.pauseFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 0.98).setOrigin(0);
    this.pauseTitle = this.add.text(0, 0, 'Paused', {
      fontFamily: 'MaruMonica',
      fontSize: '42px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.pauseChapter = this.add.text(0, 0, this.chapterName, {
      fontFamily: 'MaruMonica',
      fontSize: '24px',
      color: '#fde68a',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.pauseMainOptions = [
      this.add.text(0, 0, 'Resume', {
        fontFamily: 'MaruMonica',
        fontSize: '30px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, '', {
        fontFamily: 'MaruMonica',
        fontSize: '30px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Developer Mode', {
        fontFamily: 'MaruMonica',
        fontSize: '30px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Return to World Map', {
        fontFamily: 'MaruMonica',
        fontSize: '30px',
        color: '#f8fafc',
      }).setOrigin(0.5),
    ];
    this.pauseDeveloperOptions = [
      this.add.text(0, 0, '', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, '', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Restore HP / MP', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Restore Map', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Clear Save', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
      this.add.text(0, 0, 'Back', {
        fontFamily: 'MaruMonica',
        fontSize: '28px',
        color: '#f8fafc',
      }).setOrigin(0.5),
    ];
    this.pauseOptions = this.pauseMainOptions;
    this.pauseHint = this.add.text(
      0,
      0,
      '',
      {
        fontFamily: 'MaruMonica',
        fontSize: '19px',
        color: '#cbd5e1',
      },
    ).setOrigin(0.5);
    this.pauseCursorText = this.add.text(0, 0, '>', {
      fontFamily: 'MaruMonica',
      fontSize: '30px',
      color: '#fde68a',
    }).setOrigin(0.5);

    this.pausePanel.add([
      this.pauseBackdrop,
      this.pauseFrame,
      this.pauseTitle,
      this.pauseChapter,
      ...this.pauseMainOptions,
      ...this.pauseDeveloperOptions,
      this.pauseHint,
      this.pauseCursorText,
    ]);
    this.setPauseMenuMode('main');
    this.layoutPausePanel();
    this.scale.on('resize', this.layoutPausePanel, this);
  }

  createChapterClearPanel() {
    this.chapterClearPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(119)
      .setVisible(false);

    this.chapterClearBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 0.62).setOrigin(0);
    this.chapterClearFrame = this.add.rectangle(0, 0, 1, 1, 0x172033, 0.98).setOrigin(0);
    this.chapterClearTitle = this.add.text(0, 0, 'Chapter Clear', {
      fontFamily: 'MaruMonica',
      fontSize: '44px',
      color: '#f8fafc',
      fontStyle: 'bold',
      stroke: '#020617',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.chapterClearText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '27px',
      color: '#fde68a',
      align: 'center',
      wordWrap: { width: 620 },
      lineSpacing: 8,
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.chapterClearHint = this.add.text(0, 0, 'F / Enter: return to world map', {
      fontFamily: 'MaruMonica',
      fontSize: '23px',
      color: '#cbd5e1',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.chapterClearPanel.add([
      this.chapterClearBackdrop,
      this.chapterClearFrame,
      this.chapterClearTitle,
      this.chapterClearText,
      this.chapterClearHint,
    ]);
    this.layoutChapterClearPanel();
    this.scale.on('resize', this.layoutChapterClearPanel, this);
  }

  createTitlePanel() {
    this.titlePanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(130)
      .setVisible(false);

    this.titleBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 1).setOrigin(0);
    this.titleName = this.add.text(0, 0, 'Blue Boy Adventure', {
      fontFamily: 'MaruMonica',
      fontSize: '58px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.titlePrompt = this.add.text(0, 0, 'Press Enter to start', {
      fontFamily: 'MaruMonica',
      fontSize: '28px',
      color: '#fde68a',
    }).setOrigin(0.5);
    this.titlePanel.add([this.titleBackdrop, this.titleName, this.titlePrompt]);
    this.layoutTitlePanel();
    this.scale.on('resize', this.layoutTitlePanel, this);
  }

  createBossHealthBar() {
    this.bossHealthBar = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(96)
      .setVisible(false);

    this.bossNameText = this.add.text(0, 0, 'Skeleton Lord', {
      fontFamily: 'MaruMonica',
      fontSize: '25px',
      color: '#f8fafc',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.bossBarBack = this.add.rectangle(0, 0, 1, 20, 0x231f20, 1).setOrigin(0, 0.5);
    this.bossBarFill = this.add.rectangle(0, 0, 1, 16, 0xff1f3d, 1).setOrigin(0, 0.5);
    this.bossBarFrame = this.add.rectangle(0, 0, 1, 22, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xf8fafc, 0.9);
    this.bossHpText = this.add.text(0, 0, '', {
      fontFamily: 'MaruMonica',
      fontSize: '20px',
      color: '#f8fafc',
      stroke: '#020617',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.bossHealthBar.add([
      this.bossNameText,
      this.bossBarBack,
      this.bossBarFill,
      this.bossBarFrame,
      this.bossHpText,
    ]);
    this.layoutBossHealthBar();
    this.scale.on('resize', this.layoutBossHealthBar, this);
  }

  layoutDialoguePanel() {
    if (!this.dialoguePanel) {
      return;
    }

    const panelWidth = Math.min(900, this.scale.width - 32);
    const panelHeight = Math.min(190, this.scale.height - 32);
    const panelX = Math.floor((this.scale.width - panelWidth) / 2);
    const panelY = this.scale.height - panelHeight - 16;

    this.dialogueBackdrop.setSize(this.scale.width, this.scale.height);
    this.dialogueFrame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.dialogueSpeaker.setPosition(panelX + 24, panelY + 18);
    this.dialogueText.setPosition(panelX + 24, panelY + 56);
    this.dialogueText.setWordWrapWidth(panelWidth - 48);
    this.dialogueHint.setPosition(panelX + panelWidth - 126, panelY + panelHeight - 28);
  }

  layoutConfirmPanel() {
    if (!this.confirmPanel) {
      return;
    }

    const panelWidth = Math.min(600, this.scale.width - 32);
    const panelHeight = Math.min(250, this.scale.height - 32);
    const panelX = Math.floor((this.scale.width - panelWidth) / 2);
    const panelY = Math.floor((this.scale.height - panelHeight) / 2);

    this.confirmBackdrop.setSize(this.scale.width, this.scale.height);
    this.confirmFrame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.confirmTitle.setPosition(panelX + 28, panelY + 24);
    this.confirmText.setPosition(panelX + 28, panelY + 70);
    this.confirmText.setWordWrapWidth(panelWidth - 56);
    this.confirmOptions[0].setPosition(panelX + panelWidth / 2 - 70, panelY + panelHeight - 44);
    this.confirmOptions[1].setPosition(panelX + panelWidth / 2 + 70, panelY + panelHeight - 44);
    this.updateConfirmCursor();
  }

  layoutPausePanel() {
    if (!this.pausePanel) {
      return;
    }

    const panelWidth = Math.min(520, this.scale.width - 32);
    const panelHeight = Math.min(440, this.scale.height - 32);
    const panelX = Math.floor((this.scale.width - panelWidth) / 2);
    const panelY = Math.floor((this.scale.height - panelHeight) / 2);
    const centerX = panelX + panelWidth / 2;
    const optionStartY = panelY + 166;
    const optionGap = this.pauseMenuMode === 'developer' ? 40 : 54;

    this.pauseBackdrop.setSize(this.scale.width, this.scale.height);
    this.pauseFrame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.pauseTitle.setPosition(centerX, panelY + 56);
    this.pauseChapter.setPosition(centerX, panelY + 104);
    this.pauseOptions.forEach((option, index) => {
      option.setPosition(centerX, optionStartY + (index * optionGap));
    });
    if (this.pauseMenuMode === 'main') {
      this.pauseMainOptions[1]?.setText(`Volume: ${Math.round((this.audio?.getMasterVolume() ?? 0) * 100)}%`);
    }
    this.pauseHint.setWordWrapWidth(panelWidth - 32);
    this.pauseHint.setPosition(centerX, panelY + panelHeight - 24);
    this.updatePauseCursor();
  }

  layoutChapterClearPanel() {
    if (!this.chapterClearPanel) {
      return;
    }

    const panelWidth = Math.min(700, this.scale.width - 32);
    const panelHeight = Math.min(340, this.scale.height - 32);
    const panelX = Math.floor((this.scale.width - panelWidth) / 2);
    const panelY = Math.floor((this.scale.height - panelHeight) / 2);
    const centerX = panelX + panelWidth / 2;

    this.chapterClearBackdrop.setSize(this.scale.width, this.scale.height);
    this.chapterClearFrame.setPosition(panelX, panelY).setSize(panelWidth, panelHeight);
    this.chapterClearTitle.setPosition(centerX, panelY + 70);
    this.chapterClearText.setPosition(centerX, panelY + 165);
    this.chapterClearText.setWordWrapWidth(panelWidth - 72);
    this.chapterClearHint.setPosition(centerX, panelY + panelHeight - 48);
  }

  layoutGameOverPanel() {
    if (!this.gameOverPanel) {
      return;
    }

    this.gameOverBackdrop.setSize(this.scale.width, this.scale.height);
    const centerX = this.scale.width / 2;
    const startY = this.scale.height / 2 - 90;

    this.gameOverTitle.setPosition(centerX, startY);
    this.gameOverOptions[0].setPosition(centerX, startY + 100);
    this.gameOverOptions[1].setPosition(centerX, startY + 148);
    this.gameOverCursorText.setPosition(centerX - 74, startY + 100);
  }

  layoutTitlePanel() {
    if (!this.titlePanel) {
      return;
    }

    this.titleBackdrop.setSize(this.scale.width, this.scale.height);
    this.titleName.setPosition(this.scale.width / 2, this.scale.height / 2 - 65);
    this.titlePrompt.setPosition(this.scale.width / 2, this.scale.height / 2 + 32);
  }

  layoutBossHealthBar() {
    if (!this.bossHealthBar) {
      return;
    }

    const barWidth = Math.min(440, Math.max(180, this.scale.width - 32));
    const x = Math.floor((this.scale.width - barWidth) / 2);
    const y = Math.max(58, this.scale.height - 72);

    this.bossNameText.setPosition(x + barWidth / 2, y - 22);
    this.bossBarBack.setPosition(x, y).setSize(barWidth, 20);
    this.bossBarFill.setPosition(x + 2, y);
    this.bossBarFrame.setPosition(x, y).setSize(barWidth, 22);
    this.bossHpText.setPosition(x + barWidth / 2, y);
    this.updateBossHealthBar();
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
    this.panelDescription.setPosition(panelX + 410, panelY + 490);
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

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left)
      || Phaser.Input.Keyboard.JustDown(this.keys.left)
    ) {
      nextCursor = Math.max(0, cursor - 1);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right)
      || Phaser.Input.Keyboard.JustDown(this.keys.right)
    ) {
      nextCursor = Math.min(19, cursor + 1);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
    ) {
      nextCursor = Math.max(0, cursor - 5);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.down)
    ) {
      nextCursor = Math.min(19, cursor + 5);
    }

    this.player.inventoryCursor = nextCursor;

    if (this.consumeInteractInput()) {
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
      `Level ${this.player.stats.level}`,
      `Exp ${this.player.stats.exp}/${this.player.stats.nextLevelExp}`,
      `Attack ${this.player.attackPower}`,
      `Defense ${this.player.defense}`,
      `Coin ${this.player.stats.coin}`,
      '',
      `Weapon: ${this.player.getCurrentWeapon().name}`,
      `Shield: ${this.player.getCurrentShield().name}`,
      `Light: ${this.player.getCurrentLight()?.name ?? 'None'}`,
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
      const equipped = this.player.isSlotEquipped(slot?.slotId);

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

  handleEnemyDefeated(enemy) {
    if (!this.player || !enemy || enemy.experienceGranted) {
      return;
    }

    enemy.experienceGranted = true;
    this.player.gainExperience(enemy.exp);
    savePlayerState(this.player.toState());

    if (enemy.typeName === 'MON_SkeletonLord') {
      this.completeBossBattle(enemy);
    }
  }

  getPlayerCollisionBounds(x = this.player.x, y = this.player.y) {
    return new Phaser.Geom.Rectangle(x - 16, y - 8, 32, 32);
  }

  getLegacyEntityBounds(entity, x = null, y = null) {
    const centerX = x ?? entity.worldX ?? (entity.x * this.tileSize + this.tileSize / 2);
    const centerY = y ?? entity.worldY ?? (entity.y * this.tileSize + this.tileSize / 2);
    const box = entity.collisionBox ?? { x: -20, y: -20, width: 40, height: 40 };

    return new Phaser.Geom.Rectangle(
      centerX + box.x,
      centerY + box.y,
      box.width,
      box.height,
    );
  }

  damageInteractiveEntities(attackBounds, weaponId) {
    const targets = this.mapEntities
      .filter((entity) => (
        entity.destructible
        && !entity.destroyed
        && entity.sprite
        && entity.collision
        && this.time.now >= entity.invulnerableUntil
        && Phaser.Geom.Intersects.RectangleToRectangle(
          attackBounds,
          this.getLegacyEntityBounds(entity),
        )
      ))
      .sort((first, second) => (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, first.worldX, first.worldY)
        - Phaser.Math.Distance.Between(this.player.x, this.player.y, second.worldX, second.worldY)
      ));

    if (targets.length === 0) {
      return false;
    }

    const target = targets.find((entity) => !entity.requiredToolId || entity.requiredToolId === weaponId);
    if (!target) {
      const requiredToolId = targets[0].requiredToolId;
      const requiredTool = getItemDefinition(requiredToolId);
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
      if (requiredTool) {
        this.addCombatMessage(`Need ${requiredTool.name}.`);
      }
      return true;
    }

    this.audio?.playSfx(
      target.typeName === 'IT_DryTree' ? 'sfx-cut-tree' : 'sfx-chip-wall',
      { volume: 0.55 },
    );
    target.life = Math.max(0, (target.life ?? 1) - 1);
    target.invulnerableUntil = this.time.now + 350;
    target.sprite.setTint(0xffffff);
    this.time.delayedCall(120, () => {
      if (!target.destroyed && target.sprite) {
        target.sprite.clearTint();
      }
    });

    if (target.life <= 0) {
      target.destroyed = true;
      target.collision = false;
      target.blocksPlayer = false;
      target.blocksEnemies = false;
      target.collisionBox = null;
      target.destructible = false;
      target.requiredToolId = null;
      target.pushable = false;
      target.interactable = false;

      if (target.destroyedTextureKey) {
        target.sprite.setTexture(target.destroyedTextureKey);
        target.sprite.clearTint();
        this.addCombatMessage(
          target.typeName === 'IT_DryTree'
            ? 'The tree has been chopped down.'
            : 'The obstacle breaks apart.',
        );
      } else {
        target.sprite.clearTint();
        this.tweens.add({
          targets: target.sprite,
          alpha: 0,
          scaleX: 2.4,
          scaleY: 2.4,
          duration: 180,
          ease: 'Cubic.easeOut',
          onComplete: () => this.removeMapEntity(target),
        });
        this.addCombatMessage(
          target.typeName === 'IT_DestructibleWall'
            ? 'The wall crumbles.'
            : 'The obstacle breaks apart.',
        );
      }
    } else {
      if (target.typeName === 'IT_DryTree') {
        this.addCombatMessage(`Tree hit: ${target.life} HP left`);
      } else {
        this.addCombatMessage(`Obstacle hit: ${target.life} HP left`);
      }
    }

    return true;
  }

  isSolidTileAt(col, row) {
    if (
      col < 0
      || row < 0
      || row >= this.legacyMap.height
      || col >= this.legacyMap.tileRows[row].length
    ) {
      return true;
    }

    return isLegacyTileSolid(this.legacyMap.tileRows[row][col]);
  }

  canPlayerOccupy(x, y) {
    if (this.developerMode?.noClip) {
      return true;
    }

    const bounds = this.getPlayerCollisionBounds(x, y);
    const epsilon = 0.001;
    const leftCol = Math.floor(bounds.left / this.tileSize);
    const rightCol = Math.floor((bounds.right - epsilon) / this.tileSize);
    const topRow = Math.floor(bounds.top / this.tileSize);
    const bottomRow = Math.floor((bounds.bottom - epsilon) / this.tileSize);

    for (let row = topRow; row <= bottomRow; row += 1) {
      for (let col = leftCol; col <= rightCol; col += 1) {
        if (this.isSolidTileAt(col, row)) {
          return false;
        }
      }
    }

    for (const entity of this.mapEntities) {
      if (!(entity.blocksPlayer ?? entity.collision) || entity.destroyed) {
        continue;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        bounds,
        this.getLegacyEntityBounds(entity),
      )) {
        return false;
      }
    }

    for (const enemy of this.enemies ?? []) {
      if (enemy.defeated || enemy.dying || enemy.removed) {
        continue;
      }

      const enemyBounds = enemy.getCollisionBounds?.()
        ?? new Phaser.Geom.Rectangle(enemy.sprite.x - 18, enemy.sprite.y - 12, 36, 30);
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemyBounds)) {
        return false;
      }
    }

    return true;
  }

  movePlayer(player, dx, dy) {
    let nextX = player.x;
    let nextY = player.y;
    let movedX = false;
    let movedY = false;

    if (dx !== 0) {
      const candidateX = nextX + dx;
      if (this.canPlayerOccupy(candidateX, nextY)) {
        nextX = candidateX;
        movedX = true;
      } else if (this.tryPushBlockingEntity(player, candidateX, nextY, dx, 0)) {
        if (this.canPlayerOccupy(candidateX, nextY)) {
          nextX = candidateX;
          movedX = true;
        }
      }
    }

    if (dy !== 0) {
      const candidateY = nextY + dy;
      if (this.canPlayerOccupy(nextX, candidateY)) {
        nextY = candidateY;
        movedY = true;
      } else if (this.tryPushBlockingEntity(player, nextX, candidateY, 0, dy)) {
        if (this.canPlayerOccupy(nextX, candidateY)) {
          nextY = candidateY;
          movedY = true;
        }
      }
    }

    if (movedX || movedY) {
      player.sprite.body.reset(nextX, nextY);
      this.refreshPlatePuzzleState();
    } else {
      player.sprite.setVelocity(0, 0);
    }
    return { movedX, movedY };
  }

  findPushableEntity(bounds) {
    return this.mapEntities
      .filter((entity) => (
        entity.pushable
        && entity.collision
        && !entity.destroyed
        && entity.sprite
        && Phaser.Geom.Intersects.RectangleToRectangle(
          bounds,
          this.getLegacyEntityBounds(entity),
        )
      ))
      .sort((first, second) => (
        Phaser.Math.Distance.Between(this.player.x, this.player.y, first.worldX, first.worldY)
        - Phaser.Math.Distance.Between(this.player.x, this.player.y, second.worldX, second.worldY)
      ))[0] ?? null;
  }

  tryPushBlockingEntity(player, candidateX, candidateY, dx, dy) {
    const bounds = this.getPlayerCollisionBounds(candidateX, candidateY);
    const pushable = this.findPushableEntity(bounds);

    if (!pushable) {
      return false;
    }

    return this.movePushableEntity(pushable, dx, dy, player);
  }

  movePushableEntity(entity, dx, dy, player) {
    const nextX = entity.worldX + dx;
    const nextY = entity.worldY + dy;
    const bounds = this.getLegacyEntityBounds(entity, nextX, nextY);

    if (
      !this.canBoundsOccupy(bounds, null, {
        includeEnemies: true,
        ignoredMapEntity: entity,
      })
      || Phaser.Geom.Intersects.RectangleToRectangle(bounds, this.getPlayerCollisionBounds())
    ) {
      return false;
    }

    entity.worldX = nextX;
    entity.worldY = nextY;
    entity.sprite?.setPosition(nextX, nextY);
    entity.linkedEntity = null;
    this.refreshPlatePuzzleState(player === this.player);
    return true;
  }

  getMovingBounds(x, y, box) {
    return new Phaser.Geom.Rectangle(x + box.x, y + box.y, box.width, box.height);
  }

  canBoundsOccupy(bounds, ignoredEnemy = null, options = {}) {
    const includeEnemies = options.includeEnemies ?? true;
    const ignoredMapEntity = options.ignoredMapEntity ?? null;
    const mapCollisionProperty = options.mapCollisionProperty ?? 'collision';
    const epsilon = 0.001;
    const leftCol = Math.floor(bounds.left / this.tileSize);
    const rightCol = Math.floor((bounds.right - epsilon) / this.tileSize);
    const topRow = Math.floor(bounds.top / this.tileSize);
    const bottomRow = Math.floor((bounds.bottom - epsilon) / this.tileSize);

    for (let row = topRow; row <= bottomRow; row += 1) {
      for (let col = leftCol; col <= rightCol; col += 1) {
        if (this.isSolidTileAt(col, row)) {
          return false;
        }
      }
    }

    for (const entity of this.mapEntities) {
      if (!(entity[mapCollisionProperty] ?? entity.collision) || entity.destroyed) {
        continue;
      }
      if (entity === ignoredMapEntity) {
        continue;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, this.getLegacyEntityBounds(entity))) {
        return false;
      }
    }

    if (includeEnemies) {
      for (const enemy of this.enemies ?? []) {
        if (enemy === ignoredEnemy || enemy.defeated || enemy.dying || enemy.removed) {
          continue;
        }

        const enemyBounds = enemy.getCollisionBounds?.();
        if (enemyBounds && Phaser.Geom.Intersects.RectangleToRectangle(bounds, enemyBounds)) {
          return false;
        }
      }
    }

    return true;
  }

  canEnemyOccupy(enemy, x, y) {
    const box = enemy.collisionBox ?? { x: -18, y: -12, width: 36, height: 30 };
    const bounds = this.getMovingBounds(x, y, box);

    if (!this.canBoundsOccupy(bounds, enemy, { mapCollisionProperty: 'blocksEnemies' })) {
      return false;
    }

    return !Phaser.Geom.Intersects.RectangleToRectangle(bounds, this.getPlayerCollisionBounds());
  }

  moveEnemy(enemy, dx, dy) {
    let nextX = enemy.sprite.x;
    let nextY = enemy.sprite.y;
    let movedX = false;
    let movedY = false;

    if (dx !== 0 && this.canEnemyOccupy(enemy, nextX + dx, nextY)) {
      nextX += dx;
      movedX = true;
    }
    if (dy !== 0 && this.canEnemyOccupy(enemy, nextX, nextY + dy)) {
      nextY += dy;
      movedY = true;
    }

    if (movedX || movedY) {
      enemy.sprite.body?.reset(nextX, nextY);
      enemy.sprite.setPosition(nextX, nextY);
    } else {
      enemy.sprite.setVelocity(0, 0);
    }

    return { movedX, movedY };
  }

  canProjectileOccupy(x, y) {
    const bounds = new Phaser.Geom.Rectangle(x - 12, y - 12, 24, 24);
    return this.canBoundsOccupy(bounds, null, { includeEnemies: false });
  }

  spawnProjectile(options) {
    const projectile = new Projectile(this, {
      ...options,
      textureKeys: options.textureKeys ?? FIREBALL_TEXTURE_KEYS,
    });

    if (!this.canProjectileOccupy(projectile.sprite.x, projectile.sprite.y)) {
      projectile.destroy();
      return null;
    }

    this.projectiles.push(projectile);
    this.lighting?.redraw();
    return projectile;
  }

  removeProjectile(projectile) {
    const index = this.projectiles.indexOf(projectile);
    if (index !== -1) {
      this.projectiles.splice(index, 1);
    }
    this.lighting?.redraw();
  }

  getInteractionBounds() {
    const reach = this.tileSize;
    const width = this.tileSize;

    switch (this.player.facing) {
      case 'up':
        return new Phaser.Geom.Rectangle(this.player.x - width / 2, this.player.y - reach, width, reach);
      case 'down':
        return new Phaser.Geom.Rectangle(this.player.x - width / 2, this.player.y, width, reach);
      case 'left':
        return new Phaser.Geom.Rectangle(this.player.x - reach, this.player.y - width / 2, reach, width);
      case 'right':
        return new Phaser.Geom.Rectangle(this.player.x, this.player.y - width / 2, reach, width);
      default:
        return new Phaser.Geom.Rectangle(this.player.x, this.player.y, 0, 0);
    }
  }

  findInteractionTarget() {
    const interactionBounds = this.getInteractionBounds();
    const candidates = this.mapEntities.filter((entity) => (
      entity.interactable
      && Phaser.Geom.Intersects.RectangleToRectangle(
        interactionBounds,
        this.getLegacyEntityBounds(entity),
      )
    ));

    candidates.sort((first, second) => (
      Phaser.Math.Distance.Between(this.player.x, this.player.y, first.worldX, first.worldY)
      - Phaser.Math.Distance.Between(this.player.x, this.player.y, second.worldX, second.worldY)
    ));
    return candidates[0] ?? null;
  }

  handleInteraction() {
    const target = this.findInteractionTarget();

    if (!target) {
      const trigger = this.findMapTriggerTarget();
      if (trigger && this.handleMapTriggerInteraction(trigger)) {
        return;
      }
      this.addCombatMessage('Nothing to interact with.');
      return;
    }

    if (target.typeName === 'NPC_OldMan') {
      this.openDialogue('Old Man', OLD_MAN_DIALOGUE, target);
      return;
    }

    if (target.typeName === 'OBJ_Door') {
      this.confirmOpenDoor(target);
      return;
    }

    if (target.typeName === 'OBJ_Door_Iron') {
      this.openDialogue('Iron Door', ["It won't budge."]);
      return;
    }

    if (target.pushable) {
      this.addCombatMessage("It's a giant rock.");
      return;
    }

    if (target.triggerNodeId) {
      this.revealWorldNodeFromTrigger(target.triggerNodeId, target);
      return;
    }

    if (target.travelEntry) {
      this.startTravelEntry(target.travelEntry);
      return;
    }

    if (target.typeName === 'OBJ_Chest') {
      this.openChest(target);
    }
  }

  revealWorldNodeFromTrigger(nodeId, sourceEntity) {
    const node = getWorldNode(nodeId);

    if (!node) {
      this.addCombatMessage('Nothing happens.');
      return;
    }

    const result = revealWorldNode(nodeId);
    sourceEntity.triggerNodeId = null;
    if (!sourceEntity.travelEntry) {
      sourceEntity.interactable = false;
    }

    if (sourceEntity.travelEntry) {
      this.audio?.playSfx('sfx-unlock', { volume: 0.55 });
      this.startTravelEntry(sourceEntity.travelEntry);
      return;
    }

    if (
      result.newlyDiscoveredNodeIds.includes(nodeId)
      || result.newlyUnlockedNodeIds.includes(nodeId)
    ) {
      this.progress = loadProgress();
      this.audio?.playSfx('sfx-unlock', { volume: 0.6 });
      this.addCombatMessage(`${node.label} discovered!`);
      return;
    }

    this.addCombatMessage(`${node.label} is already on the world map.`);
  }

  startTravelEntry(entry) {
    if (!entry) {
      this.addCombatMessage('Nothing happens.');
      return;
    }

    if (entry.type === 'shop') {
      if (this.player) {
        savePlayerState(this.player.toState());
      }
      this.clearBufferedInput();
      this.resetTransientCombatState();
      this.scene.pause();
      this.scene.launch(entry.scene ?? 'ShopScene', {
        shopId: entry.shopId,
        returnSceneKey: this.scene.key,
        returnNodeId: entry.returnNodeId ?? this.returnNodeId,
      });
      return;
    }

    if (entry.type === 'chapter') {
      this.scene.start(entry.scene ?? 'GameScene', {
        chapterId: entry.chapterId,
        chapterName: entry.chapterName ?? entry.chapterId,
        returnNodeId: entry.returnNodeId ?? this.returnNodeId,
        spawn: entry.spawn ?? this.spawnTile,
      });
      return;
    }

    this.addCombatMessage('Nothing happens.');
  }

  findMapTriggerTarget() {
    const interactionBounds = this.getInteractionBounds();
    const candidates = this.mapTriggers.filter((trigger) => this.isMapTriggerAvailable(trigger) && Phaser.Geom.Intersects.RectangleToRectangle(
      interactionBounds,
      this.getMapTriggerBounds(trigger),
    ));

    candidates.sort((first, second) => (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.getTriggerCenterX(first),
        this.getTriggerCenterY(first),
      ) - Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.getTriggerCenterX(second),
        this.getTriggerCenterY(second),
      )
    ));

    return candidates[0] ?? null;
  }

  updateAutomaticMapTriggers() {
    const playerBounds = this.getPlayerCollisionBounds();
    const trigger = this.mapTriggers.find((candidate) => (
      candidate.activation === 'touch'
      && this.isMapTriggerAvailable(candidate)
      && !this.triggeredMapTriggerIds.has(candidate.id)
      && Phaser.Geom.Intersects.RectangleToRectangle(
        playerBounds,
        this.getMapTriggerBounds(candidate),
      )
    ));

    if (!trigger) {
      return false;
    }

    this.triggeredMapTriggerIds.add(trigger.id);
    return this.handleMapTriggerInteraction(trigger);
  }

  isMapTriggerAvailable(trigger) {
    if (!trigger) {
      return false;
    }

    if (Array.isArray(trigger.allowedChapterIds) && !trigger.allowedChapterIds.includes(this.chapterId)) {
      return false;
    }

    if (
      trigger.kind === 'boss-cutscene'
      && (
        this.bossEncounter?.cutsceneStarted
        || this.bossEncounter?.battleActive
      )
    ) {
      return false;
    }

    return true;
  }

  getMapTriggerBounds(trigger) {
    return new Phaser.Geom.Rectangle(
      trigger.col * this.tileSize,
      trigger.row * this.tileSize,
      this.tileSize,
      this.tileSize,
    );
  }

  getTriggerCenterX(trigger) {
    return trigger.col * this.tileSize + this.tileSize / 2;
  }

  getTriggerCenterY(trigger) {
    return trigger.row * this.tileSize + this.tileSize / 2;
  }

  handleMapTriggerInteraction(trigger) {
    if (!this.isMapTriggerAvailable(trigger)) {
      return false;
    }

    if (trigger.kind === 'chapter-entry') {
      const requiredNode = getWorldNode(trigger.requiredNodeId);
      if (
        !trigger.bypassUnlock
        && requiredNode
        && !isNodeUnlocked(this.progress, requiredNode)
      ) {
        this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
        this.addCombatMessage(trigger.lockedMessage ?? 'The way is blocked.');
        return true;
      }

      if (trigger.discoverNodeId) {
        this.progress = revealWorldNode(trigger.discoverNodeId).progress;
      }

      if (this.player) {
        savePlayerState(this.player.toState());
      }

      this.audio?.playSfx('sfx-stairs', { volume: 0.55 });
      this.scene.start('GameScene', {
        chapterId: trigger.targetChapterId,
        chapterName: getChapterDefinition(trigger.targetChapterId)?.name ?? trigger.targetChapterId,
        returnNodeId: trigger.requiredNodeId ?? this.returnNodeId,
        spawn: trigger.spawn ?? this.spawnTile,
      });
      return true;
    }

    if (trigger.kind === 'return-world-map') {
      this.returnToWorldMap();
      return true;
    }

    if (trigger.kind === 'complete-chapter') {
      if (trigger.requiresSolvedPuzzle && !this.puzzleSolved) {
        this.addCombatMessage(trigger.lockedMessage ?? 'The way is blocked.');
        return true;
      }

      this.completeChapter();
      return true;
    }

    if (trigger.kind === 'boss-cutscene') {
      return this.startBossCutscene(trigger);
    }

    return false;
  }

  confirmOpenDoor(door) {
    if (this.player.inventory.count('key') <= 0) {
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
      this.openDialogue('Door', ['You need a key to open this.']);
      return;
    }

    this.openConfirmPrompt({
      title: 'Door',
      message: 'Use Key x1 to open this door?',
      onConfirm: () => {
        if (!this.player.inventory.removeItem('key', 1)) {
          this.openDialogue('Door', ['You need a key to open this.']);
          return;
        }

        this.openDoor(door);
      },
      onCancel: () => {
        this.addCombatMessage('Door left closed.');
      },
    });
  }

  openDoor(door) {
    door.opened = true;
    door.collision = false;
    door.blocksPlayer = false;
    door.blocksEnemies = false;
    door.collisionBox = null;
    door.interactable = false;
    this.audio?.playSfx('sfx-door-open', { volume: 0.6 });
    this.addCombatMessage('You use the key and open the door!');

    if (!door.sprite) {
      this.removeMapEntity(door);
      return;
    }

    this.tweens.add({
      targets: door.sprite,
      alpha: 0,
      y: door.sprite.y - 8,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => this.removeMapEntity(door),
    });
  }

  openConfirmPrompt({ title, message, onConfirm, onCancel }) {
    this.confirmPrompt = {
      title,
      message,
      onConfirm,
      onCancel,
      cursor: 0,
    };

    this.confirmTitle.setText(title);
    this.confirmText.setText(message);
    this.confirmPanel.setVisible(true);
    this.updateConfirmCursor();
  }

  closeConfirmPrompt() {
    this.confirmPrompt = null;
    this.confirmPanel.setVisible(false);
  }

  updateConfirmCursor() {
    if (!this.confirmCursorText || !this.confirmOptions) {
      return;
    }

    const cursor = this.confirmPrompt?.cursor ?? 0;
    this.confirmOptions.forEach((option, index) => {
      option.setColor(index === cursor ? '#fde68a' : '#f8fafc');
    });
    this.confirmCursorText.setPosition(
      this.confirmOptions[cursor].x - 35,
      this.confirmOptions[cursor].y,
    );
  }

  updateConfirmInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left)
      || Phaser.Input.Keyboard.JustDown(this.keys.left)
      || Phaser.Input.Keyboard.JustDown(this.cursors.right)
      || Phaser.Input.Keyboard.JustDown(this.keys.right)
      || Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
      || Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.down)
    ) {
      this.confirmPrompt.cursor = this.confirmPrompt.cursor === 0 ? 1 : 0;
      this.updateConfirmCursor();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.cancel)) {
      const onCancel = this.confirmPrompt.onCancel;
      this.closeConfirmPrompt();
      onCancel?.();
      return;
    }

    if (!this.consumeConfirmInput()) {
      return;
    }

    const { cursor, onConfirm, onCancel } = this.confirmPrompt;
    this.closeConfirmPrompt();

    if (cursor === 0) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  }

  openPauseMenu() {
    if (this.pauseMenuOpen) {
      return;
    }

    this.pauseMenuOpen = true;
    this.setPauseMenuMode('main');
    this.player.sprite.setVelocity(0, 0);
    this.enemies.forEach((enemy) => enemy.sprite?.setVelocity(0, 0));
    this.pausePanel.setVisible(true);
    this.updatePauseCursor();
  }

  closePauseMenu() {
    this.pauseMenuOpen = false;
    this.pauseMenuMode = 'main';
    this.pausePanel.setVisible(false);
  }

  setPauseMenuMode(mode) {
    this.pauseMenuMode = mode === 'developer' ? 'developer' : 'main';
    this.pauseCursor = 0;
    this.pauseOptions = this.pauseMenuMode === 'developer'
      ? this.pauseDeveloperOptions
      : this.pauseMainOptions;

    if (this.pauseTitle) {
      this.pauseTitle.setText(this.pauseMenuMode === 'developer' ? 'Developer Mode' : 'Paused');
    }

    if (this.pauseChapter) {
      this.pauseChapter.setText(
        this.pauseMenuMode === 'developer'
          ? 'Cheats and maintenance'
          : this.chapterName,
      );
    }

    this.pauseMainOptions?.forEach((option) => option.setVisible(this.pauseMenuMode === 'main'));
    this.pauseDeveloperOptions?.forEach((option) => option.setVisible(this.pauseMenuMode === 'developer'));
    this.updatePauseVolumeText();
    this.updatePauseDeveloperText();
    this.updatePauseHintText();
    this.layoutPausePanel();
  }

  updatePauseCursor() {
    if (!this.pauseCursorText || !this.pauseOptions) {
      return;
    }

    this.pauseOptions.forEach((option, index) => {
      option.setColor(index === this.pauseCursor ? '#fde68a' : '#f8fafc');
    });
    const selectedBounds = this.pauseOptions[this.pauseCursor].getBounds();
    this.pauseCursorText.setPosition(
      Math.floor(selectedBounds.x - 24),
      Math.floor(selectedBounds.y + selectedBounds.height / 2),
    );
  }

  updatePauseHintText() {
    if (!this.pauseHint) {
      return;
    }

    this.pauseHint.setText(
      this.pauseMenuMode === 'developer'
        ? 'W / S: select    F / Enter: confirm\nESC: back'
        : 'W / S: select    F / Enter: confirm\nA / D: adjust volume',
    );
  }

  updatePauseInput() {
    const cancelJustDown = Phaser.Input.Keyboard.JustDown(this.keys.cancel);
    const pauseJustDown = Phaser.Input.Keyboard.JustDown(this.keys.pause) || this.pendingPause;
    this.pendingPause = false;

    if (this.pauseMenuMode === 'developer' && cancelJustDown) {
      this.setPauseMenuMode('main');
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
      return;
    }

    if (this.pauseMenuMode === 'main' && (cancelJustDown || pauseJustDown)) {
      this.closePauseMenu();
      return;
    }

    const movedUp = (
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
    );
    const movedDown = (
      Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.down)
    );

    if (movedUp !== movedDown) {
      const direction = movedDown ? 1 : -1;
      this.pauseCursor = (
        this.pauseCursor + direction + this.pauseOptions.length
      ) % this.pauseOptions.length;
      this.updatePauseCursor();
      this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
    }

    if (this.pauseMenuMode === 'main' && this.pauseCursor === 1) {
      const volumeUp = (
        Phaser.Input.Keyboard.JustDown(this.cursors.right)
        || Phaser.Input.Keyboard.JustDown(this.keys.right)
      );
      const volumeDown = (
        Phaser.Input.Keyboard.JustDown(this.cursors.left)
        || Phaser.Input.Keyboard.JustDown(this.keys.left)
      );
      const volumeDirection = volumeUp !== volumeDown
        ? (volumeUp ? 1 : -1)
        : 0;

      if (volumeDirection !== 0) {
        this.audio?.adjustMasterVolume(volumeDirection * 0.05);
        this.updatePauseVolumeText();
        this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
        return;
      }
    }

    if (!this.consumeConfirmInput()) {
      return;
    }

    if (this.pauseMenuMode === 'main') {
      if (this.pauseCursor === 0) {
        this.closePauseMenu();
        return;
      }

      if (this.pauseCursor === 1) {
        return;
      }

      if (this.pauseCursor === 2) {
        this.setPauseMenuMode('developer');
        return;
      }

      if (this.pauseCursor === 3) {
        this.returnToWorldMap({}, { savePlayerState: false });
      }
      return;
    }

    if (this.pauseCursor === 0) {
      this.toggleDeveloperNoClip();
      return;
    }

    if (this.pauseCursor === 1) {
      this.toggleDeveloperInvincible();
      return;
    }

    if (this.pauseCursor === 2) {
      this.restorePlayerVitals();
      savePlayerState(this.player.toState());
      this.addCombatMessage('HP and MP restored.');
      return;
    }

    if (this.pauseCursor === 3) {
      this.confirmResetProgress();
      return;
    }

    if (this.pauseCursor === 4) {
      this.confirmClearSave();
      return;
    }

    if (this.pauseCursor === 5) {
      this.setPauseMenuMode('main');
    }
  }

  updatePauseVolumeText() {
    if (!this.pauseMainOptions?.[1]) {
      return;
    }

    const volume = Math.round((this.audio?.getMasterVolume() ?? 0) * 100);
    this.pauseMainOptions[1].setText(`Volume: ${volume}%`);
  }

  updatePauseDeveloperText() {
    if (!this.pauseDeveloperOptions?.length) {
      return;
    }

    this.pauseDeveloperOptions[0].setText(`No Clip: ${this.developerMode.noClip ? 'On' : 'Off'}`);
    this.pauseDeveloperOptions[1].setText(`Invincible: ${this.developerMode.invincible ? 'On' : 'Off'}`);
  }

  toggleDeveloperNoClip() {
    this.developerMode.noClip = !this.developerMode.noClip;
    this.updatePauseDeveloperText();
    this.updatePauseCursor();
    this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
  }

  toggleDeveloperInvincible() {
    this.developerMode.invincible = !this.developerMode.invincible;
    if (this.developerMode.invincible && this.player?.stats) {
      this.player.stats.life = Math.max(1, this.player.stats.life);
    }
    this.updatePauseDeveloperText();
    this.updatePauseCursor();
    this.audio?.playSfx('sfx-cursor', { volume: 0.45 });
  }

  confirmResetProgress() {
    this.openConfirmPrompt({
      title: 'Developer Mode',
      message: 'Reset world map progress?',
      onConfirm: () => {
        this.progress = resetProgress();
        this.addCombatMessage('World map progress restored.');
        this.returnToWorldMap({ worldMessage: 'World map restored.' }, { savePlayerState: false });
      },
      onCancel: () => {
        this.setPauseMenuMode('developer');
      },
    });
  }

  confirmClearSave() {
    this.openConfirmPrompt({
      title: 'Developer Mode',
      message: 'Clear save data and return to the world map?',
      onConfirm: () => {
        clearPlayerStateCache();
        resetPlayerState();
        this.progress = resetProgress();
        this.addCombatMessage('Save data cleared.');
        this.returnToWorldMap({ worldMessage: 'Save cleared.' }, { savePlayerState: false });
      },
      onCancel: () => {
        this.setPauseMenuMode('developer');
      },
    });
  }

  returnToWorldMap(extraData = {}, options = {}) {
    if (options.savePlayerState !== false && this.player) {
      const outgoingState = this.player.toState();
      if (this.gameOver) {
        outgoingState.stats.life = outgoingState.stats.maxLife;
        outgoingState.stats.mana = outgoingState.stats.maxMana;
      }
      savePlayerState(outgoingState);
    }

    this.scene.start('WorldMapScene', {
      returnNodeId: this.returnNodeId,
      lastChapterId: this.chapterId,
      ...extraData,
    });
  }

  onShopReturn(playerState, returnMessage = '') {
    if (this.player && playerState) {
      this.player.applyState(playerState);
    }

    this.resetTransientCombatState();
    this.clearBufferedInput();

    if (returnMessage) {
      this.addCombatMessage(returnMessage);
    }

    this.audio?.playMusic(this.getMusicKey());
    this.updateHud();
  }

  restorePlayerVitals() {
    if (!this.player) {
      return;
    }

    this.player.stats.life = this.player.stats.maxLife;
    this.player.stats.mana = this.player.stats.maxMana;
    this.player.dead = false;
    this.player.knockbackState = null;
    this.player.invulnerableUntil = 0;
  }

  clearBufferedInput() {
    this.pendingAttack = false;
    this.pendingRangedAttack = false;
    this.pendingInteract = false;
    this.pendingConfirm = false;
    this.pendingPause = false;
  }

  resetTransientCombatState() {
    if (!this.player) {
      return;
    }

    this.player.attackState = null;
    this.player.guarding = false;
    this.player.guardElapsed = 0;
    this.player.guardPressedAt = -Infinity;
    this.player.knockbackState = null;
    this.player.invulnerableUntil = 0;
    this.player.dead = false;
    this.player.sprite.setVelocity(0, 0);
    this.player.sprite.setVisible(true);
    this.player.attackSprite.setVisible(false);
    this.player.sprite.setTexture(this.player.getStandingTexture());
  }

  restartChapter() {
    if (this.player) {
      this.restorePlayerVitals();
      savePlayerState(this.player.toState());
    }

    this.scene.restart({
      chapterId: this.chapterId,
      chapterName: this.chapterName,
      returnNodeId: this.returnNodeId,
      spawn: this.spawnTile,
    });
  }

  completeChapter() {
    if (this.chapterClear || !this.chapterDefinition) {
      return;
    }

    this.chapterClear = true;
    this.chapterClearResult = completeChapterProgress(
      this.chapterId,
      this.chapterDefinition.unlocks ?? [],
    );
    this.audio?.playSfx('sfx-fanfare', { volume: 0.65 });

    this.player.sprite.setVelocity(0, 0);
    this.player.sprite.stop();
    this.player.attackSprite.setVisible(false);
    this.player.sprite.setVisible(true);
    this.enemies.forEach((enemy) => {
      enemy.sprite?.setVelocity(0, 0);
      enemy.attackWindup = null;
    });

    const unlockedText = this.getUnlockedNodeText();
    this.chapterClearTitle.setText(this.chapterDefinition.clearTitle ?? 'Chapter Clear');
    this.chapterClearText.setText([
      this.chapterDefinition.clearText ?? 'Objective complete.',
      unlockedText,
      this.getChapterClearContinueText(),
    ].filter(Boolean).join('\n'));
    this.chapterClearPanel.setVisible(true);
  }

  updateChapterClearInput() {
    if (!this.consumeConfirmInput() && !this.consumeInteractInput()) {
      return;
    }

    this.advanceFromChapterClear();
  }

  advanceFromChapterClear() {
    const nextChapterId = this.chapterDefinition?.nextChapterId ?? null;

    if (nextChapterId) {
      const nextChapter = getChapterDefinition(nextChapterId);
      const nextNode = getWorldNode(nextChapterId);

      if (this.player) {
        savePlayerState(this.player.toState());
      }

      this.audio?.stopMusic();
      this.scene.start('GameScene', {
        chapterId: nextChapterId,
        chapterName: nextChapter?.name ?? nextChapterId,
        returnNodeId: nextNode?.id ?? this.returnNodeId,
        spawn: nextNode?.spawn ?? this.spawnTile,
      });
      return;
    }

    this.returnToWorldMap({
      completedChapterId: this.chapterId,
      unlockedNodeIds: this.chapterClearResult?.newlyUnlockedNodeIds ?? [],
      worldMessage: this.getChapterClearWorldMessage(),
    });
  }

  checkChapterObjectiveProgress() {
    if (this.chapterClear || !this.chapterDefinition) {
      return;
    }

    if (this.chapterDefinition.type === 'platePuzzle') {
      return;
    }

    if (this.chapterDefinition.type === 'defeatMarkedEnemies') {
      const remaining = this.getRemainingObjectiveEnemies();

      if (this.objectiveTargetCount > 0 && remaining === 0) {
        this.completeChapter();
      }
    }
  }

  handleDialogueComplete(dialogue) {
    if (dialogue?.onComplete) {
      dialogue.onComplete(dialogue);
      return;
    }

    if (
      !this.chapterClear
      && this.chapterDefinition?.type === 'talkNpc'
      && dialogue?.target?.typeName === this.chapterDefinition.npcTypeName
    ) {
      this.completeChapter();
    }
  }

  getRemainingObjectiveEnemies() {
    return this.enemies.filter((enemy) => (
      enemy.objectiveTarget
      && !enemy.defeated
      && !enemy.removed
    )).length;
  }

  getObjectiveHudText() {
    if (!this.chapterDefinition) {
      return null;
    }

    if (this.chapterClear) {
      return 'Objective: Complete';
    }

    if (this.chapterDefinition.type === 'defeatMarkedEnemies') {
      const remaining = this.getRemainingObjectiveEnemies();
      const defeated = Math.max(0, this.objectiveTargetCount - remaining);
      return `Objective: ${this.chapterDefinition.objectiveTitle} ${defeated}/${this.objectiveTargetCount}`;
    }

    if (this.chapterDefinition.type === 'platePuzzle') {
      const rocks = this.getPuzzleRocks();
      const total = this.puzzleRockCount || rocks.length;
      const linked = rocks.filter((rock) => rock.linkedEntity).length;
      if (this.puzzleSolved) {
        return 'Objective: Reach the exit stairs';
      }
      return `Objective: ${this.chapterDefinition.objectiveTitle} ${linked}/${total}`;
    }

    if (this.chapterDefinition.type === 'bossEncounter') {
      if (this.bossEncounter?.treasureCollected) {
        return 'Objective: Complete';
      }
      if (this.bossEncounter?.defeated) {
        return 'Objective: Claim the Blue Heart';
      }
      if (this.bossEncounter?.battleActive) {
        return 'Objective: Defeat the Skeleton Lord';
      }
      return 'Objective: Find the Skeleton Lord';
    }

    return `Objective: ${this.chapterDefinition.objectiveTitle}`;
  }

  getUnlockedNodeText() {
    const labels = (this.chapterClearResult?.newlyUnlockedNodeIds ?? [])
      .map((nodeId) => getWorldNode(nodeId)?.label)
      .filter(Boolean);

    if (labels.length === 0) {
      return 'Progress saved.';
    }

    return `Unlocked: ${labels.join(', ')}`;
  }

  getChapterClearWorldMessage() {
    const labels = (this.chapterClearResult?.newlyUnlockedNodeIds ?? [])
      .map((nodeId) => getWorldNode(nodeId)?.label)
      .filter(Boolean);

    if (labels.length === 0) {
      return `${this.chapterName} cleared.`;
    }

    return `${this.chapterName} cleared. ${labels.join(', ')} unlocked.`;
  }

  getChapterClearContinueText() {
    const nextChapterId = this.chapterDefinition?.nextChapterId ?? null;

    if (nextChapterId) {
      const nextName = getChapterDefinition(nextChapterId)?.name ?? nextChapterId;
      return `Press F / Enter to continue to ${nextName}.`;
    }

    return 'Press F / Enter to return to the World Map.';
  }

  openChest(chest) {
    if (chest.opened) {
      this.openDialogue('Chest', ['The chest is empty.']);
      return;
    }

    const pickup = LEGACY_PICKUPS[chest.extra];
    const item = pickup?.itemId ? getItemDefinition(pickup.itemId) : null;

    if (!item) {
      this.openDialogue('Chest', ['The chest is empty.']);
      return;
    }

    if (!this.player.inventory.add(item.id)) {
      this.openDialogue('Chest', ["You found something, but you can't carry any more."]);
      return;
    }

    chest.opened = true;
    chest.sprite?.setTint(0x9ca3af);
    this.audio?.playSfx('sfx-unlock', { volume: 0.5 });
    this.openDialogue('Chest', [`You open the chest and find a ${item.name}!`]);
  }

  openDialogue(speaker, lines, target = null, options = {}) {
    this.dialogue = {
      speaker,
      lines,
      index: 0,
      target,
      onComplete: options.onComplete ?? null,
    };
    this.dialoguePanel.setVisible(true);
    this.refreshDialoguePanel();
  }

  refreshDialoguePanel() {
    if (!this.dialogue) {
      return;
    }

    this.dialogueSpeaker.setText(this.dialogue.speaker);
    this.dialogueText.setText(this.dialogue.lines[this.dialogue.index]);
  }

  updateDialogueInput() {
    if (!this.consumeInteractInput()) {
      return;
    }

    this.dialogue.index += 1;
    if (this.dialogue.index >= this.dialogue.lines.length) {
      const finishedDialogue = this.dialogue;
      this.dialogue = null;
      this.dialoguePanel.setVisible(false);
      this.handleDialogueComplete(finishedDialogue);
      return;
    }

    this.refreshDialoguePanel();
  }

  collectNearbyPickups() {
    const playerBounds = this.getPlayerCollisionBounds();

    this.mapEntities.slice().forEach((entity) => {
      if (
        !entity.pickup
        || !entity.sprite
        || !Phaser.Geom.Intersects.RectangleToRectangle(
          playerBounds,
          new Phaser.Geom.Rectangle(entity.worldX - 18, entity.worldY - 18, 36, 36),
        )
      ) {
        return;
      }

      if (this.applyPickup(entity)) {
        this.removeMapEntity(entity);
      }
    });
  }

  applyPickup(entity) {
    const pickup = entity.pickup;

    if (pickup.kind === 'coin') {
      this.player.stats.coin += pickup.value;
      this.audio?.playSfx('sfx-coin', { volume: 0.55 });
      this.addCombatMessage(`Coin +${pickup.value}`);
      return true;
    }

    if (pickup.kind === 'life') {
      this.player.stats.life = Math.min(
        this.player.stats.maxLife,
        this.player.stats.life + pickup.value,
      );
      this.audio?.playSfx('sfx-powerup', { volume: 0.5 });
      this.addCombatMessage(`Life +${pickup.value}`);
      return true;
    }

    if (pickup.kind === 'mana') {
      this.player.stats.mana = Math.min(
        this.player.stats.maxMana,
        this.player.stats.mana + pickup.value,
      );
      this.audio?.playSfx('sfx-powerup', { volume: 0.5 });
      this.addCombatMessage(`Mana +${pickup.value}`);
      return true;
    }

    if (pickup.kind === 'item') {
      const added = this.player.inventory.add(pickup.itemId);
      if (added) {
        this.audio?.playSfx(
          pickup.itemId === 'key' ? 'sfx-unlock' : 'sfx-powerup',
          { volume: 0.5 },
        );
        this.addCombatMessage(`Got a ${pickup.label}!`);
      } else {
        this.addCombatMessage("You can't carry any more.");
      }
      return added;
    }

    if (pickup.kind === 'bossTreasure') {
      const added = this.player.inventory.add('blueHeart');
      if (!added) {
        this.addCombatMessage("You can't carry the Blue Heart.");
        return false;
      }

      this.progress = markBossTreasureCollected();
      this.progress = completeChapterProgress('bossGate', []).progress;
      this.bossEncounter = {
        ...(this.bossEncounter ?? {}),
        treasureCollected: true,
      };
      savePlayerState(this.player.toState());
      this.audio?.playSfx('sfx-fanfare', { volume: 0.65 });
      this.openDialogue('Blue Heart', ['You find the Blue Heart, the legendary treasure!'], entity, {
        onComplete: () => this.goToCredits(),
      });
      return true;
    }

    return false;
  }

  goToCredits() {
    if (this.player) {
      savePlayerState(this.player.toState());
    }

    this.audio?.stopMusic();
    this.scene.start('CreditsScene', {
      returnSceneKey: 'TitleScene',
      returnMode: 'start',
      returnSceneData: {
        bannerText: 'The Blue Heart has been claimed.',
      },
    });
  }

  removeMapEntity(entity) {
    const index = this.mapEntities.indexOf(entity);
    if (index === -1) {
      return;
    }

    entity.sprite?.destroy();
    this.mapEntities.splice(index, 1);
  }

  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index === -1) {
      return;
    }

    this.enemies.splice(index, 1);
    this.checkChapterObjectiveProgress();
  }

  createDrop(worldX, worldY, typeName = 'OBJ_Coin_Bronze') {
    const definition = LEGACY_ENTITY_ASSETS[typeName];
    const pickup = LEGACY_PICKUPS[typeName];
    if (!definition || !pickup) {
      return;
    }

    this.nextDropId = (this.nextDropId ?? 0) + 1;
    const entity = {
      id: `drop-${this.nextDropId}`,
      category: 'OBJ',
      typeName,
      x: worldX / this.tileSize - 0.5,
      y: worldY / this.tileSize - 0.5,
      worldX,
      worldY,
      extra: null,
      collision: false,
      collisionBox: null,
      pickup,
      interactable: false,
      opened: false,
      sprite: this.add.sprite(worldX, worldY, definition.textureKey)
        .setScale(3)
        .setDepth(this.getLegacyEntityDepth('OBJ')),
    };

    entity.sprite.setData('mapEntityId', entity.id);
    this.mapEntities.push(entity);
  }

  enterGameOver() {
    if (this.gameOver || this.developerMode?.invincible) {
      return;
    }

    this.gameOver = true;
    this.audio?.stopMusic();
    this.audio?.playSfx('sfx-game-over', { volume: 0.65 });
    this.gameOverCursor = 0;
    this.player.dead = true;
    this.player.sprite.setVelocity(0, 0);
    this.player.attackSprite.setVisible(false);
    this.player.sprite.setVisible(true);
    this.enemies.forEach((enemy) => {
      enemy.sprite.setVelocity(0, 0);
      enemy.attackWindup = null;
    });
    this.gameOverPanel.setVisible(true);
    this.updateGameOverCursor();
  }

  updateGameOverCursor() {
    const startY = this.scale.height / 2 - 90;
    this.gameOverCursorText.setPosition(
      this.scale.width / 2 - 74,
      startY + 100 + this.gameOverCursor * 48,
    );
  }

  updateGameOverInput() {
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.up)
      || Phaser.Input.Keyboard.JustDown(this.cursors.down)
      || Phaser.Input.Keyboard.JustDown(this.keys.down)
    ) {
      this.gameOverCursor = this.gameOverCursor === 0 ? 1 : 0;
      this.updateGameOverCursor();
    }

    if (!this.consumeConfirmInput()) {
      return;
    }

    if (this.gameOverCursor === 0) {
      this.restartChapter();
      return;
    }

    this.returnToWorldMap();
  }

  showTitleScreen() {
    this.gameOver = false;
    this.titleScreen = true;
    this.gameOverPanel.setVisible(false);
    this.titlePanel.setVisible(true);
    this.player.sprite.setVelocity(0, 0);
    this.player.sprite.setVisible(false);
    this.player.attackSprite.setVisible(false);
    this.enemies.forEach((enemy) => enemy.sprite.setVelocity(0, 0));
  }

  consumeConfirmInput() {
    const keyboardConfirm = Phaser.Input.Keyboard.JustDown(this.keys.confirm);
    const keyboardInteract = Phaser.Input.Keyboard.JustDown(this.keys.interact);
    const confirm = (
      this.pendingConfirm
      || this.pendingInteract
      || keyboardConfirm
      || keyboardInteract
    );
    this.pendingConfirm = false;
    this.pendingInteract = false;
    return confirm;
  }

  startSleepSequence() {
    if (this.sleepSequence) {
      return;
    }

    this.closeCharacterPanel();
    this.dialogue = null;
    this.dialoguePanel?.setVisible(false);
    this.confirmPrompt = null;
    this.confirmPanel?.setVisible(false);

    this.player.stats.life = this.player.stats.maxLife;
    this.player.stats.mana = this.player.stats.maxMana;
    this.player.sprite.setVelocity(0, 0);
    this.player.sprite.stop();
    this.player.sprite.setVisible(true);
    this.player.attackSprite.setVisible(false);
    this.player.sprite.setTexture('legacy-tent');
    this.audio?.playSfx('sfx-sleep', { volume: 0.6 });

    if (!this.sleepPanel) {
      this.sleepPanel = this.add.container(0, 0)
        .setScrollFactor(0)
        .setDepth(125)
        .setVisible(false);
      this.sleepBackdrop = this.add.rectangle(0, 0, 1, 1, 0x020617, 1).setOrigin(0);
      this.sleepText = this.add.text(0, 0, 'Sleeping until morning...', {
        fontFamily: 'MaruMonica',
        fontSize: '30px',
        color: '#f8fafc',
        stroke: '#020617',
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.sleepPanel.add([this.sleepBackdrop, this.sleepText]);
      this.layoutSleepPanel();
      this.scale.on('resize', this.layoutSleepPanel, this);
    }

    this.sleepPanel.setAlpha(0).setVisible(true);
    this.sleepSequence = { active: true };

    this.tweens.add({
      targets: this.sleepPanel,
      alpha: 1,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.lighting?.resetDay();
        this.time.delayedCall(420, () => {
          this.tweens.add({
            targets: this.sleepPanel,
            alpha: 0,
            duration: 560,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              this.sleepPanel.setVisible(false);
              this.sleepSequence = null;
              this.player.sprite.setTexture(this.player.getStandingTexture());
              this.addCombatMessage('You wake up refreshed.');
            },
          });
        });
      },
    });
  }

  layoutSleepPanel() {
    if (!this.sleepPanel) {
      return;
    }

    this.sleepBackdrop.setSize(this.scale.width, this.scale.height);
    this.sleepText.setPosition(this.scale.width / 2, this.scale.height / 2);
  }

  updateHud() {
    if (!this.hud || !this.player) {
      return;
    }

    this.ensureHudStatusIcons();
    const life = Math.max(0, this.player.stats.life);
    const mana = Math.max(0, this.player.stats.mana);
    this.heartIcons.forEach((icon, index) => {
      const remainingLife = life - index * 2;
      const textureKey = remainingLife >= 2
        ? 'heartFull'
        : remainingLife === 1
          ? 'heartHalf'
          : 'heartBlank';
      icon.setTexture(textureKey);
    });
    this.manaIcons.forEach((icon, index) => {
      icon.setTexture(index < mana ? 'manaFull' : 'manaBlank');
    });
    this.lifeHud.setText(`HP ${life}/${this.player.stats.maxLife}`);
    this.manaHud.setText(`MP ${mana}/${this.player.stats.maxMana}`);
    this.timeHud.setText(this.lighting?.getStateLabel() ?? 'Day');

    const objectiveText = this.getObjectiveHudText();
    this.hud.setText([
      `Area: ${this.chapterName}`,
      objectiveText,
      `ATK ${this.player.attackPower}   DEF ${this.player.defense}`,
      `Weapon: ${this.player.getCurrentWeapon().name}`,
      '[J] Attack   [I] Fireball   [F] Interact   [Space] Guard   [C] Inventory   [P/ESC] Pause',
    ].filter(Boolean).join('\n'));

    this.combatMessages = this.combatMessages.filter(
      (message) => message.expiresAt > this.time.now,
    );
    this.messageHud.setText(this.combatMessages.map((message) => message.text).join('\n'));
    this.updateBossHealthBar();
  }

  showCombatFeedback(result) {
    if (result === 'parry') {
      this.addCombatMessage(
        `Perfect parry! Counter attack x${COMBAT_RULES.counterAttackMultiplier} for 1 second.`,
      );
      this.cameras.main.flash(90, 155, 225, 255, false);
      this.cameras.main.shake(80, 0.0025);
      this.audio?.playSfx('sfx-parry', { volume: 0.45 });
      return;
    }

    if (result === 'block') {
      this.addCombatMessage('Blocked!');
      this.cameras.main.flash(70, 130, 185, 225, false);
      this.audio?.playSfx('sfx-blocked', { volume: 0.35 });
    }
  }

  update(time, delta) {
    if (this.titleScreen) {
      if (this.consumeConfirmInput()) {
        this.scene.restart();
      }
      return;
    }

    if (this.gameOver) {
      this.updateGameOverInput();
      this.updateHud();
      return;
    }

    if (this.chapterClear) {
      this.updateChapterClearInput();
      this.updateHud();
      return;
    }

    if (this.confirmPrompt) {
      this.updateConfirmInput();
      this.updateHud();
      return;
    }

    if (this.pauseMenuOpen) {
      this.updatePauseInput();
      this.updateHud();
      return;
    }

    if (this.sleepSequence) {
      this.updateHud();
      return;
    }

    if (this.dialogue) {
      this.updateDialogueInput();
      this.updateHud();
      return;
    }

    if (this.characterPanel.visible) {
      this.updateCharacterPanelInput();
      this.updateHud();
      return;
    }

    if (this.consumePauseInput()) {
      this.openPauseMenu();
      this.updateHud();
      return;
    }

    this.player.update({
      left: this.cursors.left.isDown || this.keys.left.isDown,
      right: this.cursors.right.isDown || this.keys.right.isDown,
      up: this.cursors.up.isDown || this.keys.up.isDown,
      down: this.cursors.down.isDown || this.keys.down.isDown,
      guardDown: this.keys.guard.isDown,
      guardJustDown: Phaser.Input.Keyboard.JustDown(this.keys.guard),
      attackJustDown: this.consumeAttackInput(),
      rangedAttackJustDown: this.consumeRangedAttackInput(),
    }, this.enemies, delta);

    if (!this.gameOver) {
      this.collectNearbyPickups();
    }

    if (!this.gameOver && this.updateAutomaticMapTriggers()) {
      this.updateHud();
      return;
    }

    if (!this.gameOver && this.consumeInteractInput()) {
      this.handleInteraction();
    }

    if (!this.gameOver) {
      this.enemies.forEach((enemy) => enemy.update(this.player, time, delta));
      this.projectiles.slice().forEach((projectile) => {
        projectile.update(time, delta, this.enemies);
      });
      if (this.chapterDefinition?.type === 'platePuzzle') {
        this.refreshPlatePuzzleState();
      }
      this.checkChapterObjectiveProgress();
    }
    this.lighting.update(delta);
    this.updateHud();
  }

  consumeAttackInput() {
    const keyboardAttack = Phaser.Input.Keyboard.JustDown(this.keys.attack);
    const attackJustDown = this.pendingAttack || keyboardAttack;
    this.pendingAttack = false;
    return attackJustDown;
  }

  consumeRangedAttackInput() {
    const keyboardRanged = Phaser.Input.Keyboard.JustDown(this.keys.ranged);
    const rangedJustDown = this.pendingRangedAttack || keyboardRanged;
    this.pendingRangedAttack = false;
    return rangedJustDown;
  }

  consumePauseInput() {
    const keyboardPause = Phaser.Input.Keyboard.JustDown(this.keys.pause);
    const keyboardEscape = Phaser.Input.Keyboard.JustDown(this.keys.cancel);
    const pauseJustDown = this.pendingPause || keyboardPause || keyboardEscape;
    this.pendingPause = false;
    return pauseJustDown;
  }

  consumeInteractInput() {
    const keyboardInteract = Phaser.Input.Keyboard.JustDown(this.keys.interact);
    const interactJustDown = this.pendingInteract || keyboardInteract;
    this.pendingInteract = false;
    return interactJustDown;
  }

  toggleCharacterPanel() {
    if (this.characterPanel.visible) {
      this.closeCharacterPanel();
    } else {
      this.openCharacterPanel();
    }
  }

  drawLegacyMap() {
    this.legacyMap.tileRows.forEach((tileIds, row) => {
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
