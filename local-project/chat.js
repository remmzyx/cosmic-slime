import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, limitToLast, onValue, push, query, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm3wqbkBx-PMFpH7Cym9t08F_gSVNoZCc",
  authDomain: "cosmic-slime.firebaseapp.com",
  databaseURL: "https://cosmic-slime-default-rtdb.firebaseio.com",
  projectId: "cosmic-slime",
  storageBucket: "cosmic-slime.firebasestorage.app",
  messagingSenderId: "646544734520",
  appId: "1:646544734520:web:11732c1f79adb0687569cd",
  measurementId: "G-4CL3ZWEDJT"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const messagesRef = ref(db, "messages");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderMessages(snapshot, chatBox) {
  chatBox.innerHTML = "";

  snapshot.forEach((child) => {
    const data = child.val() || {};
    const row = document.createElement("div");
    row.style.marginBottom = "4px";
    row.innerHTML = `<b>${escapeHtml(data.username || "Anonymous")}:</b> ${escapeHtml(data.text || "")}`;
    chatBox.appendChild(row);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chat-box");
  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const usernameInput = document.getElementById("username-input");

  if (!chatBox || !chatInput || !chatSend || !usernameInput) {
    console.warn("Chat UI elements are missing. Skipping chat initialization.");
    return;
  }

  const recentMessagesQuery = query(messagesRef, limitToLast(100));
  onValue(recentMessagesQuery, (snapshot) => {
    renderMessages(snapshot, chatBox);
  });

  async function sendMessage() {
    const username = (usernameInput.value || "Anonymous").trim().slice(0, 20) || "Anonymous";
    const text = (chatInput.value || "").trim().slice(0, 250);
    if (!text) return;

    await push(messagesRef, {
      username,
      text,
      time: Date.now()
    });
    chatInput.value = "";
  }

  chatSend.addEventListener("click", () => {
    sendMessage().catch((error) => {
      console.error("Failed to send chat message:", error);
      alert("Could not send message. Check Firebase rules/config.");
    });
  });

  chatInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    sendMessage().catch((error) => {
      console.error("Failed to send chat message:", error);
      alert("Could not send message. Check Firebase rules/config.");
    });
  });
});
