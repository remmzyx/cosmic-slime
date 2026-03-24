import { computed, ref } from "vue";
import type { Track } from "../types";

export function useAudioPlayer(onLog?: (text: string) => void) {
  const tracks = ref<Track[]>([
    { title: "*locked! (contact the owner for your song here!)*", url: "https://files.catbox.moe/...mp3" },
    { title: "Song 2", url: "https://files.catbox.moe/olzvrn.mp3" },
    { title: "Song 3", url: "https://files.catbox.moe/irbwk2.mp3" },
  ]);

  const audioRef = ref<HTMLAudioElement | null>(null);
  const currentTrackIndex = ref(0);
  const isMusicPlaying = ref(false);

  const currentTrackTitle = computed(() => tracks.value[currentTrackIndex.value]?.title ?? "None");

  function loadTrack(index: number) {
    currentTrackIndex.value = (index + tracks.value.length) % tracks.value.length;
    if (audioRef.value) audioRef.value.src = tracks.value[currentTrackIndex.value].url;
  }

  async function playTrack(index: number) {
    loadTrack(index);
    if (!audioRef.value) return;
    audioRef.value.volume = 0.4;
    await audioRef.value.play();
    isMusicPlaying.value = true;
    onLog?.(`Playing: ${tracks.value[currentTrackIndex.value].title}`);
  }

  async function playCurrentTrack() {
    if (!audioRef.value) return;
    if (!audioRef.value.src) loadTrack(currentTrackIndex.value);
    audioRef.value.volume = 0.4;
    await audioRef.value.play();
    isMusicPlaying.value = true;
    onLog?.("Music ON.");
  }

  function pauseMusic() {
    audioRef.value?.pause();
    isMusicPlaying.value = false;
    onLog?.("Music OFF.");
  }

  async function toggleMusic() {
    if (isMusicPlaying.value) pauseMusic();
    else await playCurrentTrack();
  }

  async function nextTrack() {
    await playTrack(currentTrackIndex.value + 1);
  }

  async function prevTrack() {
    await playTrack(currentTrackIndex.value - 1);
  }

  function onEnded() {
    void nextTrack();
  }

  return {
    tracks,
    audioRef,
    currentTrackIndex,
    currentTrackTitle,
    isMusicPlaying,
    loadTrack,
    playTrack,
    toggleMusic,
    nextTrack,
    prevTrack,
    onEnded,
  };
}
