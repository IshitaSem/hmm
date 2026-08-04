import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase configuration for hampyypurr
const firebaseConfig = {
  apiKey: "AIzaSyDL59LNhLfu5mKa5gLrxqYQJKmBU9xCjXM",
  authDomain: "hampyypurr.firebaseapp.com",
  projectId: "hampyypurr",
  storageBucket: "hampyypurr.firebasestorage.app",
  messagingSenderId: "775432500131",
  appId: "1:775432500131:web:d14dd8a9b4ae709a606016",
  measurementId: "G-MCW63MW0MH"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize and export Firestore
export const db = getFirestore(app);
