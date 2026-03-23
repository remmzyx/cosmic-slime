// public/chat.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ====== PASTE YOUR FIREBASE CONFIG FROM CONSOLE HERE ======
   Replace the placeholder values below with the exact config from
   Firebase Console → Project Settings → Your apps → Web app
*/
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
/* ========================================================= */

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ---------------- Moderation helpers (client-side) ---------------- */

// Local fallback banned list (keep sanitized; expand safely)
let bannedWords = ["badword", "exampleword"];

// Optional: load banned list from Firebase once at startup
function loadBannedWordsFromDB() {
  try {
    const bRef = ref(db, "banned_words");
    onValue(bRef, snap => {
      const val = snap.val();
      if (val && Array.isArray(val)) bannedWords = val;
      else if (val && typeof val === "object") bannedWords = Object.values(val);
      console.log("Banned words loaded:", bannedWords.length);
    }, err => {
      console.warn("Could not load banned words:", err);
    });
  } catch (e) {
    console.warn("loadBannedWordsFromDB error", e);
  }
}
loadBannedWordsFromDB();

const leetMap = { '0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','+':'t' };

function normalizeText(s) {
  if (!s) return "";
  s = s.toLowerCase();
  s = s.split('').map(ch => leetMap[ch] || ch).join('');
  s = s.replace(/([a-z])\1{2,}/g, '$1$1'); // collapse long repeats
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function wordBoundaryRegex(word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fuzzy = esc.split('').map(ch => ch + '[\\W_]*').join('');
  return new RegExp('\\b' + fuzzy + '\\b', 'i');
}

function containsBanned(normalized) {
  for (const w of bannedWords) {
    if (!w || w.length < 2) continue;
    const re = wordBoundaryRegex(w);
    if (re.test(normalized)) return w;
  }
  return null;
}

function censorOriginal(original, matchedWord) {
  if (!matchedWord) return original;
  const re = wordBoundaryRegex(matchedWord);
  return original.replace(re, match => '*'.repeat(Math.max(3, matchedWord.length)));
}

// mode: "block" | "censor" | "flag"
function moderateMessage(originalText, mode = "censor") {
  const normalized = normalizeText(originalText);
  const matched = containsBanned(normalized);
  if (!matched) return { action: "allow", text: originalText, matched: null };

  if (mode === "block") return { action: "block", text: null, matched };
  if (mode === "flag") return { action: "flag", text: originalText, matched };

  const censored = censorOriginal(originalText, matched);
  return { action: "censor", text: censored, matched };
}

/* ---------------- Chat UI and send/receive flow ---------------- */

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const usernameInput = document.getElementById("username-input");

let lastSent = 0;
const COOLDOWN_MS = 1200; // 1.2s cooldown

chatSend.addEventListener("click", async () => {
  const now = Date.now();
  if (now - lastSent < COOLDOWN_MS) {
    chatSend.disabled = true;
    setTimeout(() => chatSend.disabled = false, COOLDOWN_MS - (now - lastSent));
    return;
  }
  lastSent = now;

  const username = (usernameInput.value || "Anonymous").trim();
  const raw = (chatInput.value || "").trim();
  if (!raw) return;

  // Choose moderation mode: "censor" is safe default
  const result = moderateMessage(raw, "censor");

  if (result.action === "block") {
    alert("Message blocked by filter.");
    return;
  }

  // Send to pending so server/moderator can act
  const payload = {
    username,
    text: result.text,
    original: result.action === "censor" ? raw : undefined, // optional for audit
    status: result.action === "flag" ? "flagged" : "pending",
    matched: result.matched || null,
    time: Date.now()
  };

  await push(ref(db, "messages_pending"), payload);
  chatInput.value = "";
});

// Listen to approved public messages
onValue(ref(db, "messages"), snapshot => {
  chatBox.innerHTML = "";
  snapshot.forEach(child => {
    const m = child.val();
    const el = document.createElement("div");
    el.innerHTML = `<b>${escapeHtml(m.username)}:</b> ${escapeHtml(m.text)}`;
    chatBox.appendChild(el);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

function escapeHtml(s) {
  if (!s) return "";
  return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

/*
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const chatBox = document.getElementById("chat-box");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const usernameInput = document.getElementById("username-input");

// SEND MESSAGE
chatSend.onclick = () => {
  const username = usernameInput.value || "Anonymous";
  const text = chatInput.value;

  if (text.trim() === "") return;

  push(ref(db, "messages"), {
    username,
    text,
    time: Date.now()
  });

  chatInput.value = "";
};

// RECEIVE MESSAGES
onValue(ref(db, "messages"), snapshot => {
  chatBox.innerHTML = "";
  snapshot.forEach(child => {
    const msg = child.val();
    chatBox.innerHTML += `<div><b>${msg.username}:</b> ${msg.text}</div>`;
  });

  chatBox.scrollTop = chatBox.scrollHeight;
});
