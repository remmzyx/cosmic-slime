<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { DifficultyKey, GameLog, GameState } from "../types";
import VirtualJoystick from "./VirtualJoystick.vue";

type TouchKey = "w" | "a" | "s" | "d";
type MovementMode = "joystick" | "pad";

const MOVEMENT_MODE_KEY = "cosmicSlimeMovementMode";

const props = defineProps<{
  gameState: GameState;
  stateLabel: string;
  logs: GameLog[];
  activeTutorialText: string;
  gameTouch?: {
    setAxis: (x: number, y: number) => void;
    setKey: (key: TouchKey, down: boolean) => void;
    dash: () => void;
    pause: () => void;
    music: () => void;
    releaseAll: () => void;
  };
}>();

const emit = defineEmits<{
  start: [];
  tutorial: [];
  difficulty: [key: DifficultyKey];
}>();

const difficulties: DifficultyKey[] = ["easy", "normal", "hard", "chaos"];

const isFullscreen = ref(false);
const movementMode = ref<MovementMode>("joystick");

type ScreenOrientationApi = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

function syncFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  isFullscreen.value = !!(document.fullscreenElement ?? d.webkitFullscreenElement);
}

async function toggleFullscreen() {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  const d = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const fsEl = document.fullscreenElement ?? d.webkitFullscreenElement;
  try {
    if (fsEl) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
    } else {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
  } catch {
    /* Fullscreen may be blocked by some WebViews */
  }
}

async function lockPortraitOrientation() {
  try {
    const orientation = screen.orientation as ScreenOrientationApi | undefined;
    if (!orientation?.lock) return;
    try {
      await orientation.lock("portrait");
    } catch {
      await orientation.lock("portrait-primary");
    }
  } catch {
    /* Not supported in all browsers/webviews */
  }
}

function unlockOrientation() {
  try {
    const orientation = screen.orientation as ScreenOrientationApi | undefined;
    orientation?.unlock?.();
  } catch {
    /* ignore */
  }
}

function pressPadKey(key: TouchKey) {
  props.gameTouch?.setKey(key, true);
}

function releasePadKey(key: TouchKey) {
  props.gameTouch?.setKey(key, false);
}

function toggleMovementMode() {
  movementMode.value = movementMode.value === "joystick" ? "pad" : "joystick";
  localStorage.setItem(MOVEMENT_MODE_KEY, movementMode.value);
  props.gameTouch?.releaseAll();
}

watch(isFullscreen, (fs) => {
  document.body.classList.toggle("mobile-fullscreen-game", fs);
  if (fs) {
    void lockPortraitOrientation();
  } else {
    unlockOrientation();
    props.gameTouch?.releaseAll();
  }
});

onMounted(() => {
  const saved = localStorage.getItem(MOVEMENT_MODE_KEY);
  if (saved === "joystick" || saved === "pad") movementMode.value = saved;
  syncFullscreen();
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("webkitfullscreenchange", syncFullscreen);
});

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", syncFullscreen);
  document.removeEventListener("webkitfullscreenchange", syncFullscreen);
  unlockOrientation();
  document.body.classList.remove("mobile-fullscreen-game");
});
</script>

<template>
  <div id="left-panel">
    <div id="canvas-wrapper"><slot name="canvas" /></div>

    <div id="hud">
      <div class="hud-section"><div class="hud-label">Score</div><div class="hud-value">{{ Math.floor(gameState.score) }}</div></div>
      <div class="hud-section"><div class="hud-label">Wave</div><div class="hud-value">{{ gameState.wave }}</div></div>
      <div class="hud-section"><div class="hud-label">Health</div><div class="hud-value">{{ Math.max(0, Math.floor(gameState.health)) }}</div></div>
      <div class="hud-section"><div class="hud-label">Shards</div><div class="hud-value">{{ gameState.shards }}</div></div>
      <div class="hud-section"><div class="hud-label">State</div><div class="hud-value">{{ stateLabel }}</div></div>
      <div class="hud-section"><button @click="emit('start')">Start / Restart</button></div>
    </div>

    <div id="controls">
      <div class="pill"><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span><span>Move slime</span></div>
      <div class="pill"><span class="key">Space</span><span>Dash</span></div>
      <div class="pill"><span class="key">P</span><span>Pause / Resume</span></div>
      <div class="pill"><span class="key">M</span><span>Toggle music</span></div>
    </div>

    <div v-if="gameTouch" class="mobile-controls" aria-label="Touch controls">
      <VirtualJoystick
        v-if="movementMode === 'joystick'"
        :set-axis="gameTouch.setAxis"
        :release-all="gameTouch.releaseAll"
      />
      <div v-else class="fs-dpad mobile-inline-dpad" aria-label="D-pad">
        <div class="fs-dpad-row">
          <span class="fs-dpad-gap" />
          <button
            type="button"
            class="fs-dpad-btn"
            @pointerdown.prevent="pressPadKey('w')"
            @pointerup="releasePadKey('w')"
            @pointerleave="releasePadKey('w')"
            @pointercancel="releasePadKey('w')"
          >
            ▲
          </button>
          <span class="fs-dpad-gap" />
        </div>
        <div class="fs-dpad-row">
          <button
            type="button"
            class="fs-dpad-btn"
            @pointerdown.prevent="pressPadKey('a')"
            @pointerup="releasePadKey('a')"
            @pointerleave="releasePadKey('a')"
            @pointercancel="releasePadKey('a')"
          >
            ◀
          </button>
          <span class="fs-dpad-gap" />
          <button
            type="button"
            class="fs-dpad-btn"
            @pointerdown.prevent="pressPadKey('d')"
            @pointerup="releasePadKey('d')"
            @pointerleave="releasePadKey('d')"
            @pointercancel="releasePadKey('d')"
          >
            ▶
          </button>
        </div>
        <div class="fs-dpad-row">
          <span class="fs-dpad-gap" />
          <button
            type="button"
            class="fs-dpad-btn"
            @pointerdown.prevent="pressPadKey('s')"
            @pointerup="releasePadKey('s')"
            @pointerleave="releasePadKey('s')"
            @pointercancel="releasePadKey('s')"
          >
            ▼
          </button>
          <span class="fs-dpad-gap" />
        </div>
      </div>
      <button type="button" class="mobile-action-btn mobile-movement-toggle" @pointerdown.prevent="toggleMovementMode">
        Movement: {{ movementMode === "joystick" ? "Joystick" : "D-Pad" }}
      </button>
      <div class="mobile-controls-actions">
        <button type="button" class="mobile-action-btn" @pointerdown.prevent="gameTouch.dash">
          Dash
        </button>
        <button type="button" class="mobile-action-btn" @pointerdown.prevent="gameTouch.pause">
          Pause
        </button>
        <button type="button" class="mobile-action-btn" @pointerdown.prevent="gameTouch.music">
          Music
        </button>
        <button type="button" class="mobile-action-btn" @pointerdown.prevent="toggleFullscreen">
          Full Screen
        </button>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="gameTouch && isFullscreen" class="fullscreen-ui">
      <div class="fs-action-menu">
        <button type="button" class="fs-menu-btn" @pointerdown.prevent="emit('start')">Start / Restart</button>
        <button type="button" class="fs-menu-btn" @pointerdown.prevent="gameTouch.dash">Dash</button>
        <button type="button" class="fs-menu-btn" @pointerdown.prevent="gameTouch.music">Music</button>
        <button type="button" class="fs-menu-btn" @pointerdown.prevent="gameTouch.pause">Pause</button>
        <button type="button" class="fs-menu-btn fs-menu-btn-secondary" @pointerdown.prevent="toggleFullscreen">
          Exit Full Screen
        </button>
      </div>

      <div class="fs-movement-stack">
        <div class="fs-movement-corner">
          <VirtualJoystick
            v-if="movementMode === 'joystick'"
            :set-axis="gameTouch.setAxis"
            :release-all="gameTouch.releaseAll"
          />
          <div v-else class="fs-dpad">
            <div class="fs-dpad-row">
              <span class="fs-dpad-gap" />
              <button
                type="button"
                class="fs-dpad-btn"
                @pointerdown.prevent="pressPadKey('w')"
                @pointerup="releasePadKey('w')"
                @pointerleave="releasePadKey('w')"
                @pointercancel="releasePadKey('w')"
              >
                ▲
              </button>
              <span class="fs-dpad-gap" />
            </div>
            <div class="fs-dpad-row">
              <button
                type="button"
                class="fs-dpad-btn"
                @pointerdown.prevent="pressPadKey('a')"
                @pointerup="releasePadKey('a')"
                @pointerleave="releasePadKey('a')"
                @pointercancel="releasePadKey('a')"
              >
                ◀
              </button>
              <span class="fs-dpad-gap" />
              <button
                type="button"
                class="fs-dpad-btn"
                @pointerdown.prevent="pressPadKey('d')"
                @pointerup="releasePadKey('d')"
                @pointerleave="releasePadKey('d')"
                @pointercancel="releasePadKey('d')"
              >
                ▶
              </button>
            </div>
            <div class="fs-dpad-row">
              <span class="fs-dpad-gap" />
              <button
                type="button"
                class="fs-dpad-btn"
                @pointerdown.prevent="pressPadKey('s')"
                @pointerup="releasePadKey('s')"
                @pointerleave="releasePadKey('s')"
                @pointercancel="releasePadKey('s')"
              >
                ▼
              </button>
              <span class="fs-dpad-gap" />
            </div>
          </div>
        </div>
        <button type="button" class="fs-movement-toggle-btn" @pointerdown.prevent="toggleMovementMode">
          Movement: {{ movementMode === "joystick" ? "Joystick" : "D-Pad" }}
        </button>
      </div>
    </div>
  </Teleport>

  <div id="right-panel">
    <slot name="auth" />

    <slot name="chat" />

    <div id="mission-box">
      <div id="mission-title">Mission Brief</div>
      <div id="mission-text">You are a lost cosmic slime drifting through an abandoned neon asteroid belt. Each wave spawns hostile drones and glowing shard clusters. Collect shards to charge your shield, dodge drones, and survive as many waves as you can. The maze subtly shifts every round, so do not get too comfortable.</div>
    </div>

    <div class="ad-box-right">Pay 1 dollar for your song to be 100% added to the player!</div>

    <div id="stats-box">
      <h3>Run Stats</h3>
      <div id="stats-list">
        <div class="stat-line"><span class="stat-label">Best score:</span><span class="stat-value">{{ Math.floor(gameState.bestScore) }}</span></div>
        <div class="stat-line"><span class="stat-label">Best wave:</span><span class="stat-value">{{ gameState.bestWave }}</span></div>
        <div class="stat-line"><span class="stat-label">Total runs:</span><span class="stat-value">{{ gameState.totalRuns }}</span></div>
        <div class="stat-line"><span class="stat-label">Total shards:</span><span class="stat-value">{{ gameState.totalShards }}</span></div>
        <div class="stat-line"><span class="stat-label">Total time alive:</span><span class="stat-value">{{ Math.floor(gameState.totalTimeAlive) }}s</span></div>
      </div>
    </div>

    <slot name="leaderboard" />

    <div id="difficulty-box">
      <h3>Difficulty</h3>
      <div class="difficulty-row">
        <button v-for="diff in difficulties" :key="diff" class="difficulty-btn" :class="{ active: gameState.difficulty === diff }" @click="emit('difficulty', diff)">{{ diff }}</button>
      </div>
    </div>

    <div id="tutorial-box"><button @click="emit('tutorial')">Play Tutorial</button></div>
    <div v-if="activeTutorialText" id="tutorial-status">Tutorial: {{ activeTutorialText }}</div>

    <slot name="music" />

    <div id="log">
      <div v-for="row in logs" :key="row.id" class="log-entry"><span class="time">[{{ row.time }}]</span><span class="text"> {{ row.text }}</span></div>
    </div>
  </div>
</template>
