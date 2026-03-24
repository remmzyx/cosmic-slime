<script setup lang="ts">
import { ref } from "vue";
import type { AuthUser, LeaderboardEntry, UserScore } from "../types";

defineProps<{
  globalLeaderboard: LeaderboardEntry[];
  userScores: UserScore[];
  user: AuthUser | null;
}>();

const activeTab = ref<"global" | "personal">("global");

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
</script>

<template>
  <div id="leaderboard-panel">
    <div class="leaderboard-title">Leaderboard</div>

    <div class="leaderboard-tabs">
      <button class="tab-btn" :class="{ active: activeTab === 'global' }" @click="activeTab = 'global'">Global</button>
      <button v-if="user" class="tab-btn" :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">My Scores</button>
    </div>

    <div class="leaderboard-list">
      <template v-if="activeTab === 'global'">
        <div
          v-for="(entry, index) in globalLeaderboard.slice(0, 20)"
          :key="entry.id"
          class="leaderboard-row"
          :class="{ 'is-current-user': user && entry.userId === user.uid }"
        >
          <span class="rank">#{{ index + 1 }}</span>
          <span class="username">{{ entry.username }}</span>
          <span class="score">{{ entry.score }}</span>
          <span class="wave">W{{ entry.wave }}</span>
          <span class="difficulty">{{ entry.difficulty }}</span>
        </div>
        <div v-if="globalLeaderboard.length === 0" class="no-scores">No scores yet. Be the first!</div>
      </template>

      <template v-else>
        <div v-for="(score, index) in userScores" :key="score.id" class="leaderboard-row personal">
          <span class="rank">#{{ index + 1 }}</span>
          <span class="score">{{ score.score }}</span>
          <span class="wave">W{{ score.wave }}</span>
          <span class="difficulty">{{ score.difficulty }}</span>
          <span class="date">{{ formatDate(score.timestamp) }}</span>
        </div>
        <div v-if="userScores.length === 0" class="no-scores">No personal scores yet. Play to submit!</div>
      </template>
    </div>
  </div>
</template>
