import { publicPath } from '../data/publicPath.js';

const AUDIO_SETTINGS_KEY = 'myGame2026.audio.v1';
const DEFAULT_MASTER_VOLUME = 0.75;

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze({
    'music-overworld': '/sound/BlueBoyAdventure.wav',
    'music-dungeon': '/sound/Dungeon.wav',
    'music-boss': '/sound/FinalBattle.wav',
    'music-shop': '/sound/Merchant.wav',
  }),
  sfx: Object.freeze({
    'sfx-coin': '/sound/coin.wav',
    'sfx-powerup': '/sound/powerup.wav',
    'sfx-unlock': '/sound/unlock.wav',
    'sfx-fanfare': '/sound/fanfare.wav',
    'sfx-hit-monster': '/sound/hitmonster.wav',
    'sfx-receive-damage': '/sound/receivedamage.wav',
    'sfx-swing-weapon': '/sound/swingweapon.wav',
    'sfx-level-up': '/sound/levelup.wav',
    'sfx-cursor': '/sound/cursor.wav',
    'sfx-burning': '/sound/burning.wav',
    'sfx-cut-tree': '/sound/cuttree.wav',
    'sfx-game-over': '/sound/gameover.wav',
    'sfx-stairs': '/sound/stairs.wav',
    'sfx-sleep': '/sound/sleep.wav',
    'sfx-blocked': '/sound/blocked.wav',
    'sfx-parry': '/sound/parry.wav',
    'sfx-chip-wall': '/sound/chipwall.wav',
    'sfx-door-open': '/sound/dooropen.wav',
  }),
});

let activeMusic = null;

export function preloadAudio(loader) {
  Object.entries({ ...AUDIO_ASSETS.music, ...AUDIO_ASSETS.sfx }).forEach(([key, path]) => {
    loader.audio(key, publicPath(path));
  });
}

export default class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = scene.sound;
    this.masterVolume = loadMasterVolume();
    this.applyMasterVolume();
  }

  playMusic(key) {
    if (!this.sound || !this.scene.cache.audio.exists(key)) {
      return null;
    }

    if (activeMusic?.key === key && activeMusic.isPlaying) {
      return activeMusic;
    }

    this.stopMusic();
    activeMusic = this.sound.add(key, {
      loop: true,
      volume: 1,
    });
    activeMusic.play();
    return activeMusic;
  }

  stopMusic() {
    if (!activeMusic) {
      return;
    }

    activeMusic.stop();
    activeMusic.destroy();
    activeMusic = null;
  }

  playSfx(key, options = {}) {
    if (!this.sound || !this.scene.cache.audio.exists(key)) {
      return null;
    }

    return this.sound.play(key, {
      ...options,
      volume: options.volume ?? 1,
    });
  }

  getMasterVolume() {
    return this.masterVolume;
  }

  setMasterVolume(value) {
    this.masterVolume = clamp(Number(value), 0, 1);
    saveMasterVolume(this.masterVolume);
    this.applyMasterVolume();
  }

  adjustMasterVolume(step) {
    this.setMasterVolume(this.masterVolume + step);
  }

  applyMasterVolume() {
    if (this.sound) {
      this.sound.volume = this.masterVolume;
    }
  }
}

function loadMasterVolume() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_MASTER_VOLUME;
  }

  try {
    const saved = Number(window.localStorage.getItem(AUDIO_SETTINGS_KEY));
    return Number.isFinite(saved) ? clamp(saved, 0, 1) : DEFAULT_MASTER_VOLUME;
  } catch {
    return DEFAULT_MASTER_VOLUME;
  }
}

function saveMasterVolume(value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(AUDIO_SETTINGS_KEY, String(value));
  } catch {
    // Audio preferences are optional and should not prevent the game from running.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
