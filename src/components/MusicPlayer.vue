<script setup lang="ts">
import type { Track } from "../types";

defineProps<{
  tracks: Track[];
  currentTrackIndex: number;
  currentTrackTitle: string;
  isMusicPlaying: boolean;
}>();

const emit = defineEmits<{
  prev: [];
  next: [];
  toggle: [];
  playAt: [index: number];
}>();
</script>

<template>
  <div id="music-box">
    <h3>Music Player</h3>
    <div id="music-current">Current: <span id="musicCurrentTitle">{{ currentTrackTitle }}</span></div>
    <div id="music-controls">
      <button class="music-btn" @click="emit('prev')">Prev</button>
      <button class="music-btn" @click="emit('toggle')">{{ isMusicPlaying ? "Pause" : "Play" }}</button>
      <button class="music-btn" @click="emit('next')">Next</button>
    </div>
    <div id="music-list">
      <div v-for="(track, index) in tracks" :key="track.title + index" class="music-track" :class="{ active: index === currentTrackIndex && isMusicPlaying }" @click="emit('playAt', index)">
        <span class="music-track-title">{{ track.title }}</span>
        <span class="music-track-index">#{{ index + 1 }}</span>
      </div>
    </div>
  </div>
</template>
