import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import {
  limitToLast,
  onValue,
  push,
  query,
  ref as dbRef,
  orderByChild,
  type DataSnapshot,
} from "firebase/database";
import { db } from "../firebase";
import type { AuthUser, DifficultyKey, LeaderboardEntry, UserScore } from "../types";

function parseGlobalSnapshot(snapshot: DataSnapshot): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  snapshot.forEach((child) => {
    const data = child.val() || {};
    entries.push({
      id: child.key ?? "",
      score: Number(data.score || 0),
      username: String(data.username || "Anonymous"),
      wave: Number(data.wave || 1),
      difficulty: (data.difficulty as DifficultyKey) || "easy",
      timestamp: Number(data.timestamp || Date.now()),
      userId: String(data.userId || ""),
    });
  });
  return entries;
}

function parseUserSnapshot(snapshot: DataSnapshot): UserScore[] {
  const scores: UserScore[] = [];
  snapshot.forEach((child) => {
    const data = child.val() || {};
    scores.push({
      id: child.key ?? "",
      score: Number(data.score || 0),
      wave: Number(data.wave || 1),
      difficulty: (data.difficulty as DifficultyKey) || "easy",
      timestamp: Number(data.timestamp || Date.now()),
    });
  });
  return scores;
}

export function useLeaderboard(user: Ref<AuthUser | null>) {
  const globalLeaderboard = ref<LeaderboardEntry[]>([]);
  const userScores = ref<UserScore[]>([]);
  const isSubmitting = ref(false);
  const error = ref("");

  let globalUnsubscribe: (() => void) | null = null;
  let userUnsubscribe: (() => void) | null = null;

  const sortedLeaderboard = computed(() =>
    [...globalLeaderboard.value].sort((a, b) => b.score - a.score).slice(0, 50)
  );

  const sortedUserScores = computed(() =>
    [...userScores.value].sort((a, b) => b.score - a.score).slice(0, 10)
  );

  function subscribeToGlobal() {
    const leaderboardRef = dbRef(db, "leaderboard");
    const leaderboardQuery = query(leaderboardRef, orderByChild("score"), limitToLast(100));

    globalUnsubscribe = onValue(leaderboardQuery, (snapshot) => {
      globalLeaderboard.value = parseGlobalSnapshot(snapshot);
    });
  }

  function subscribeToUser(userId: string) {
    userUnsubscribe?.();

    const userScoresRef = dbRef(db, `users/${userId}/scores`);
    const userQuery = query(userScoresRef, orderByChild("score"), limitToLast(10));

    userUnsubscribe = onValue(userQuery, (snapshot) => {
      userScores.value = parseUserSnapshot(snapshot);
    });
  }

  onMounted(() => {
    subscribeToGlobal();
  });

  onUnmounted(() => {
    globalUnsubscribe?.();
    userUnsubscribe?.();
  });

  watch(
    user,
    (newUser) => {
      if (newUser?.uid) {
        subscribeToUser(newUser.uid);
      } else {
        userUnsubscribe?.();
        userScores.value = [];
      }
    },
    { immediate: true }
  );

  async function submitScore(score: number, wave: number, difficulty: DifficultyKey, username: string) {
    if (!user.value?.uid) {
      error.value = "Must be logged in to submit scores";
      return false;
    }

    error.value = "";
    isSubmitting.value = true;

    try {
      const timestamp = Date.now();
      const entry = {
        score,
        username: username.slice(0, 20) || "Anonymous",
        wave,
        difficulty,
        timestamp,
        userId: user.value.uid,
      };

      const leaderboardRef = dbRef(db, "leaderboard");
      await push(leaderboardRef, entry);

      const userScoresRef = dbRef(db, `users/${user.value.uid}/scores`);
      await push(userScoresRef, { score, wave, difficulty, timestamp });

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to submit score";
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    globalLeaderboard: sortedLeaderboard,
    userScores: sortedUserScores,
    isSubmitting,
    error,
    submitScore,
  };
}
