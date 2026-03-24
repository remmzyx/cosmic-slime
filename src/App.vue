<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { NButton, NConfigProvider, NSpace, NSwitch, darkTheme } from "naive-ui";
import GameLayout from "./components/GameLayout.vue";
import ChatPanel from "./components/ChatPanel.vue";
import MusicPlayer from "./components/MusicPlayer.vue";
import { useAudioPlayer } from "./composables/useAudioPlayer";
import { useFirebaseChat } from "./composables/useFirebaseChat";
import { useGameEngine } from "./composables/useGameEngine";

const game = useGameEngine();
const chat = useFirebaseChat();
const isDark = ref(true);
const audio = useAudioPlayer((text) => {
  game.logs.value.push({ id: `${Date.now()}-${Math.random()}`, time: new Date().toTimeString().slice(0, 8), text });
});

onMounted(() => {
  game.mount();
  audio.loadTrack(audio.currentTrackIndex.value);
  game.registerMusicToggle(() => {
    void audio.toggleMusic();
  });
});

onUnmounted(() => {
  game.unmount();
});

watch(chat.messages, () => {
  const chatBox = document.getElementById("chat-box");
  if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
});

watch(
  isDark,
  (value) => {
    document.body.classList.toggle("theme-dark", value);
    document.body.classList.toggle("theme-light", !value);
  },
  { immediate: true },
);

const activeTutorialText = computed(() => {
  if (!game.tutorial.active) return "";
  return game.tutorial.steps[game.tutorial.step] ?? "Complete";
});
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : null">
    <div class="app-shell">
      <header class="top-bar">
        <h1>Cosmic Slime Escape</h1>
        <NSpace align="center">
          <span class="theme-label">{{ isDark ? "Dark" : "Light" }} theme</span>
          <NSwitch v-model:value="isDark" />
          <NButton size="small" secondary @click="isDark = !isDark">
            Toggle Theme
          </NButton>
        </NSpace>
      </header>
      <h2>Guide a tiny space slime through a neon asteroid maze. Collect shards, dodge drones, survive waves.</h2>

      <div id="game-container">
        <GameLayout
          :game-state="game.gameState"
          :state-label="game.stateLabel.value"
          :logs="game.logs.value"
          :active-tutorial-text="activeTutorialText"
          @start="game.startGame"
          @tutorial="game.startTutorial"
          @difficulty="game.setDifficulty"
        >
          <template #canvas>
            <canvas ref="game.canvasRef" id="gameCanvas" width="640" height="480" />
          </template>

          <template #chat>
            <ChatPanel
              :username="chat.username.value"
              :input="chat.input.value"
              :messages="chat.messages.value"
              :error="chat.error.value"
              @update:username="chat.username.value = $event"
              @update:input="chat.input.value = $event"
              @send="chat.sendMessage"
            />
          </template>

          <template #music>
            <MusicPlayer
              :tracks="audio.tracks.value"
              :current-track-index="audio.currentTrackIndex.value"
              :current-track-title="audio.currentTrackTitle.value"
              :is-music-playing="audio.isMusicPlaying.value"
              @prev="audio.prevTrack"
              @next="audio.nextTrack"
              @toggle="audio.toggleMusic"
              @play-at="audio.playTrack"
            />
          </template>
        </GameLayout>
      </div>

      <div id="footer-note">This is just a local, silly HTML/JS game. No servers, no tracking, just vibes and cosmic slime.</div>
      <audio ref="audio.audioRef" id="bgMusic" @ended="audio.onEnded" />
    </div>
  </NConfigProvider>
</template>
