/* =========================================
   SHREE GANESH PROVISION STORE
   admin.js — ENTRY POINT
   ---------------------------------------------------------------
   Yaha sirf auth guard aur sidebar navigation hai. Har feature
   apni file mein hai:
     products.js   → Products CRUD
     stock.js      → Stock Management
     dashboard.js  → Dashboard stats
   Naya module (Customers, Suppliers, Billing...) banega to bas
   uski nayi file banegi aur yaha 2 lines import karke wire hogi.
   ========================================= */
import { auth } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { initProducts } from "./products.js";
import { initStock } from "./stock.js";
import { initDashboard } from "./dashboard.js";
import { initCustomers } from "./customers.js";
import { initSuppliers } from "./suppliers.js";
import { initBilling } from "./billing.js";
import { initSales } from "./sales.js";
import { initExpenses } from "./expenses.js";

/* ---------- AUTH GUARD ---------- */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../Login/login.html';
    return;
  }
  document.getElementById('topbarUser').textContent = user.displayName || user.email;

  // Har module apna Firestore listener + apne DOM events khud set karta hai.
  // Ye 3 lines hi hain jo modules ko "on" karti hain.
  initDashboard();
  initProducts();
  initStock();
  initCustomers();
  initSuppliers();
  initBilling();
  initSales();
  initExpenses();
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

/* ---------- SIDEBAR NAV ---------- */
document.querySelectorAll('.side-link[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-link[data-view]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
    document.getElementById('viewTitle').textContent = btn.querySelector('span').textContent;
  });
});