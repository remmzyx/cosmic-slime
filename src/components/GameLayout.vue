<script setup lang="ts">
import type { DifficultyKey, GameLog, GameState } from "../types";

defineProps<{
  gameState: GameState;
  stateLabel: string;
  logs: GameLog[];
  activeTutorialText: string;
}>();

const emit = defineEmits<{
  start: [];
  tutorial: [];
  difficulty: [key: DifficultyKey];
}>();

const difficulties: DifficultyKey[] = ["easy", "normal", "hard", "chaos"];
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
  </div>

  <div id="right-panel">
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
