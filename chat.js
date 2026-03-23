import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm3wqbkBx-PMFpH7Cym9t08F_gSVNoZCc",
  authDomain: "cosmic-slime.firebaseapp.com",
  databaseURL: "https://cosmic-slime-default-rtdb.firebaseio.com",
  projectId: "cosmic-slime",
  storageBucket: "cosmic-slime.appspot.com",
  messagingSenderId: "446454743520",
  appId: "1:446454743520:web:38c0e17e3e479dd77569cd",
  measurementId: "G-3XQHSL1XQ0"
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
