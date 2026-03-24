export type DifficultyKey = "easy" | "normal" | "hard" | "chaos";

export interface GameState {
  running: boolean;
  paused: boolean;
  score: number;
  wave: number;
  health: number;
  shards: number;
  timeAlive: number;
  lastTimeStamp: number;
  difficulty: DifficultyKey;
  bestScore: number;
  bestWave: number;
  totalRuns: number;
  totalShards: number;
  totalTimeAlive: number;
}

export interface GameLog {
  id: string;
  time: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  time: number;
}

export interface Track {
  title: string;
  url: string;
}
