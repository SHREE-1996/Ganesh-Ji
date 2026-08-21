// =========================================
// SHREE GANESH PROVISION STORE
// Firebase config — shared by Login/ and Admin/
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmMAOBgTtkTCCah2OSHfvFDvtqWR4WDyE",
  authDomain: "shreeganeshstore1996.firebaseapp.com",
  projectId: "shreeganeshstore1996",
  storageBucket: "shreeganeshstore1996.firebasestorage.app",
  messagingSenderId: "1065191660956",
  appId: "1:1065191660956:web:a75d38631134387f457c59"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
