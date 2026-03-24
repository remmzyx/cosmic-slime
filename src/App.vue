<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { NButton, NConfigProvider, NSpace, NSwitch, darkTheme } from "naive-ui";
import GameLayout from "./components/GameLayout.vue";
import ChatPanel from "./components/ChatPanel.vue";
import MusicPlayer from "./components/MusicPlayer.vue";
import AuthPanel from "./components/AuthPanel.vue";
import LeaderboardPanel from "./components/LeaderboardPanel.vue";
import { useAudioPlayer } from "./composables/useAudioPlayer";
import { useFirebaseChat } from "./composables/useFirebaseChat";
import { useGameEngine } from "./composables/useGameEngine";
import { useAuth } from "./composables/useAuth";
import { useLeaderboard } from "./composables/useLeaderboard";

const game = useGameEngine();
const authState = useAuth();
const leaderboard = useLeaderboard(authState.user);
const chat = useFirebaseChat();
const isDark = ref(true);
const audio = useAudioPlayer((text) => {
  game.logs.value.push({ id: `${Date.now()}-${Math.random()}`, time: new Date().toTimeString().slice(0, 8), text });
});

// Sync chat username with auth displayName
watch(
  authState.displayName,
  (name) => {
    chat.username.value = name;
  },
  { immediate: true }
);

onMounted(() => {
  game.mount();
  audio.loadTrack(audio.currentTrackIndex.value);
  game.registerMusicToggle(() => {
    void audio.toggleMusic();
  });
  game.registerGameOverHandler((score, wave, difficulty) => {
    if (authState.isAuthenticated.value) {
      void leaderboard.submitScore(score, wave, difficulty, authState.displayName.value);
    }
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
            <canvas :ref="game.canvasRef" id="gameCanvas" width="640" height="480" />
          </template>

          <template #auth>
            <AuthPanel
              :user="authState.user.value"
              :is-loading="authState.isLoading.value"
              :error="authState.error.value"
              @sign-in-with-google="authState.signInWithGoogle"
              @sign-up-with-email="authState.signUpWithEmail"
              @sign-in-with-email="authState.signInWithEmail"
              @log-out="authState.logOut"
            />
          </template>

          <template #chat>
            <ChatPanel
              :username="chat.username.value"
              :input="chat.input.value"
              :messages="chat.messages.value"
              :error="chat.error.value"
              :is-authenticated="authState.isAuthenticated.value"
              @update:username="chat.username.value = $event"
              @update:input="chat.input.value = $event"
              @send="chat.sendMessage"
            />
          </template>

          <template #leaderboard>
            <LeaderboardPanel
              :global-leaderboard="leaderboard.globalLeaderboard.value"
              :user-scores="leaderboard.userScores.value"
              :user="authState.user.value"
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

      <div id="footer-note">This is simple, silly HTML/JS game. Cloud server, no tracking, just vibes and cosmic slime.</div>
      <audio :ref="audio.audioRef" id="bgMusic" @ended="audio.onEnded" />
    </div>
  </NConfigProvider>
</template>
