<script setup lang="ts">
import { onMounted } from "vue";
import { NButton, NSpace } from "naive-ui";
import { useTetrisDrag } from "../composables/useTetrisDrag";

const t = useTetrisDrag();

onMounted(() => {
  t.mount();
});
</script>

<template>
  <div class="tetris-wrap cosmic-blocks-page">
    <div class="tetris-main">
      <div class="tetris-board-frame">
        <div class="tetris-hud" aria-label="Score and best">
          <div class="hud-score">
            Score <span class="hud-num">{{ t.score }}</span>
          </div>
          <div class="hud-best">
            <span class="crown" aria-hidden="true">👑</span>
            <span class="hud-best-label">Best</span>
            <span class="hud-num">{{ t.bestScore }}</span>
          </div>
        </div>
        <canvas
          :ref="t.canvasRef"
          class="tetris-canvas"
          aria-label="Block puzzle: drag one of three pieces onto the 8 by 8 board"
          @pointerdown="t.onPointerDown"
          @pointermove="t.onPointerMove"
          @pointerup="t.onPointerUp"
          @pointercancel="t.onPointerUp"
          @pointerleave="t.onPointerLeave"
        />
      </div>
    </div>
    <aside class="tetris-side">
      <NSpace vertical size="small" class="tetris-actions">
        <NButton type="primary" block @click="t.start">Restart</NButton>
      </NSpace>
      <div class="t-help">
        Drag any of the 3 blocks from where you grabbed them. Green ghost = valid drop. Full rows or columns flash clear. Invalid or
        off-board drops snap back.
      </div>
    </aside>
  </div>
</template>

<style scoped>
.cosmic-blocks-page {
  --cb-cyan: #22d3ee;
  --cb-pink: #f472b6;
  --cb-violet: #a78bfa;
  --cb-mint: #4ade80;
}

.tetris-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
  max-width: 1100px;
  align-items: flex-start;
  justify-content: center;
  overflow-x: auto;
}

.tetris-main {
  border-radius: 14px;
  overflow: visible;
  padding: 3px;
  background: linear-gradient(
    135deg,
    rgba(244, 114, 182, 0.55) 0%,
    rgba(34, 211, 238, 0.5) 35%,
    rgba(167, 139, 250, 0.55) 70%,
    rgba(74, 222, 128, 0.45) 100%
  );
  box-shadow:
    0 0 28px rgba(34, 211, 238, 0.25),
    0 0 40px rgba(244, 114, 182, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

.tetris-board-frame {
  position: relative;
  display: inline-block;
  max-width: 100%;
  padding: 10px 10px 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.15) 100%);
}

.tetris-hud {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 0 2px 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.hud-score {
  text-align: left;
  color: var(--cb-cyan);
  text-shadow:
    0 0 14px rgba(34, 211, 238, 0.55),
    0 0 2px rgba(0, 0, 0, 0.4);
}

.hud-best {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-align: right;
  color: var(--cb-pink);
  text-shadow:
    0 0 14px rgba(244, 114, 182, 0.5),
    0 0 2px rgba(0, 0, 0, 0.4);
}

.crown {
  font-size: 16px;
  line-height: 1;
  filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.65));
}

.hud-best-label {
  opacity: 0.85;
  font-weight: 500;
}

.hud-num {
  color: #f0f9ff;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.tetris-canvas {
  display: block;
  /* Match JS width/height — CSS scaling breaks pointer ↔ canvas coordinate mapping */
  width: auto;
  max-width: none;
  height: auto;
  touch-action: none;
  cursor: grab;
  border-radius: 10px;
}

.tetris-side {
  min-width: 200px;
  max-width: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(
    160deg,
    rgba(167, 139, 250, 0.18) 0%,
    rgba(15, 23, 42, 0.55) 45%,
    rgba(34, 211, 238, 0.12) 100%
  );
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.t-help {
  font-size: 11px;
  opacity: 0.82;
  line-height: 1.45;
  color: rgba(224, 250, 255, 0.88);
}

@media (max-width: 720px) {
  .tetris-side {
    max-width: none;
    width: 100%;
  }
}
</style>
