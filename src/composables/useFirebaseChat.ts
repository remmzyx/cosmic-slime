import { initializeApp } from "firebase/app";
import { getDatabase, limitToLast, onValue, push, query, ref, type DataSnapshot } from "firebase/database";
import { onMounted, onUnmounted, ref as vueRef } from "vue";
import type { ChatMessage } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyCm3wqbkBx-PMFpH7Cym9t08F_gSVNoZCc",
  authDomain: "cosmic-slime.firebaseapp.com",
  databaseURL: "https://cosmic-slime-default-rtdb.firebaseio.com",
  projectId: "cosmic-slime",
  storageBucket: "cosmic-slime.firebasestorage.app",
  messagingSenderId: "646544734520",
  appId: "1:646544734520:web:11732c1f79adb0687569cd",
  measurementId: "G-4CL3ZWEDJT",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");

function fromSnapshot(snapshot: DataSnapshot): ChatMessage[] {
  const rows: ChatMessage[] = [];
  snapshot.forEach((child) => {
    const data = child.val() || {};
    rows.push({
      id: child.key ?? `${Date.now()}-${Math.random()}`,
      username: String(data.username || "Anonymous"),
      text: String(data.text || ""),
      time: Number(data.time || Date.now()),
    });
  });
  return rows;
}

export function useFirebaseChat() {
  const username = vueRef("Anonymous");
  const input = vueRef("");
  const messages = vueRef<ChatMessage[]>([]);
  const error = vueRef("");

  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    const recentMessagesQuery = query(messagesRef, limitToLast(100));
    unsubscribe = onValue(recentMessagesQuery, (snapshot) => {
      messages.value = fromSnapshot(snapshot);
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  async function sendMessage() {
    error.value = "";
    const cleanUser = (username.value || "Anonymous").trim().slice(0, 20) || "Anonymous";
    const cleanText = (input.value || "").trim().slice(0, 250);
    if (!cleanText) return;

    try {
      await push(messagesRef, { username: cleanUser, text: cleanText, time: Date.now() });
      input.value = "";
    } catch {
      error.value = "Could not send message. Check Firebase rules/config.";
    }
  }

  return { username, input, messages, error, sendMessage };
}
