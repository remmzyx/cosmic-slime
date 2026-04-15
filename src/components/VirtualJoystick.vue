<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const props = defineProps<{
  setAxis: (x: number, y: number) => void;
  releaseAll: () => void;
}>();

const baseRef = ref<HTMLElement | null>(null);
const knobOffset = ref({ x: 0, y: 0 });

let activePointerId: number | null = null;

function clampToRadius(dx: number, dy: number, maxR: number) {
  const len = Math.hypot(dx, dy);
  if (len > maxR && len > 0) {
    return { dx: (dx / len) * maxR, dy: (dy / len) * maxR };
  }
  return { dx, dy };
}

function applyPointer(e: PointerEvent) {
  const el = baseRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const knobR = 26;
  const maxTravel = Math.max(8, Math.min(rect.width, rect.height) / 2 - knobR - 6);
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const c = clampToRadius(dx, dy, maxTravel);
  dx = c.dx;
  dy = c.dy;
  knobOffset.value = { x: dx, y: dy };
  const nx = maxTravel > 0 ? dx / maxTravel : 0;
  const ny = maxTravel > 0 ? dy / maxTravel : 0;
  props.setAxis(nx, ny);
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  activePointerId = e.pointerId;
  baseRef.value?.setPointerCapture(e.pointerId);
  applyPointer(e);
}

function onPointerMove(e: PointerEvent) {
  if (activePointerId !== e.pointerId) return;
  applyPointer(e);
}

function onPointerEnd(e: PointerEvent) {
  if (activePointerId !== e.pointerId) return;
  try {
    baseRef.value?.releasePointerCapture(e.pointerId);
  } catch {
    /* already released */
  }
  activePointerId = null;
  knobOffset.value = { x: 0, y: 0 };
  props.releaseAll();
}

onBeforeUnmount(() => {
  if (activePointerId !== null && baseRef.value) {
    try {
      baseRef.value.releasePointerCapture(activePointerId);
    } catch {
      /* ignore */
    }
  }
  activePointerId = null;
  knobOffset.value = { x: 0, y: 0 };
  props.releaseAll();
});
</script>

<template>
  <div
    ref="baseRef"
    class="virtual-joystick-base"
    role="application"
    aria-label="Move: drag the stick in any direction"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
    <div class="virtual-joystick-ring" aria-hidden="true" />
    <div
      class="virtual-joystick-knob"
      :style="{
        transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
      }"
    />
  </div>
</template>
