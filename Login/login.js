/* =========================================
   SHREE GANESH PROVISION STORE
   login.js — Firebase Authentication
   ========================================= */
import { auth } from "../firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Ye email pehle se registered hai — login karo.';
    case 'auth/invalid-email':        return 'Email sahi format mein daalo.';
    case 'auth/weak-password':        return 'Password kam se kam 6 characters ka hona chahiye.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':       return 'Email ya password galat hai.';
    default:                          return 'Kuch galat hua, dobara try karo.';
  }
}

/* ---- LOGIN FORM ---- */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      window.location.href = '../Admin/admin.html';
    } catch (err) {
      errEl.textContent = friendlyError(err.code);
    }
  });
}

/* ---- SIGNUP FORM ---- */
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name  = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const pass  = document.getElementById('signupPassword').value;
    const errEl = document.getElementById('signupError');
    errEl.textContent = '';
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(cred.user, { displayName: name });
      window.location.href = '../Admin/admin.html';
    } catch (err) {
      errEl.textContent = friendlyError(err.code);
    }
  });
}
