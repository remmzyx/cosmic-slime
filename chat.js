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
