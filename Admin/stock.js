/* =========================================
   SHREE GANESH PROVISION STORE
   stock.js — Stock Management (Firestore)
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const stockCol = collection(db, 'stockMovements');
let unsubscribe = null;
let initialized = false;

/* ---------- INIT (called once from admin.js after login) ---------- */
export function initStock() {
  startListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('stockSearch').addEventListener('input', e => renderStockPage(e.target.value));
  document.getElementById('addStockBtn').addEventListener('click', openStockModal);
  document.getElementById('cancelStockBtn').addEventListener('click', closeStockModal);
  document.getElementById('stockModal').addEventListener('click', e => {
    if (e.target.id === 'stockModal') closeStockModal();
  });
  document.getElementById('stockForm').addEventListener('submit', handleSubmit);
}

/* ---------- LIVE LISTENER ---------- */
function startListener() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    query(stockCol, orderBy('createdAt', 'desc')),
    (snap) => {
      state.stockMoves = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStockPage(document.getElementById('stockSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('stockTableBody').innerHTML =
        `<tr><td colspan="6" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

/* ---------- RENDER ---------- */
export function renderStockPage(filter = '') {
  const f = filter.toLowerCase();
  const list = state.stockMoves.filter(m =>
    m.productName.toLowerCase().includes(f) || m.reason.toLowerCase().includes(f)
  );

  const totalIn = state.stockMoves.filter(m => m.type === 'in').reduce((s, m) => s + Number(m.quantity), 0);
  const totalOut = state.stockMoves.filter(m => m.type === 'out').reduce((s, m) => s + Number(m.quantity), 0);
  document.getElementById('statStockIn').textContent = totalIn;
  document.getElementById('statStockOut').textContent = totalOut;
  document.getElementById('statStockEntries').textContent = state.stockMoves.length;

  const tbody = document.getElementById('stockTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">Koi stock entry nahi mili. "+ Stock Entry" se add karo.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => {
    const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    return `
      <tr>
        <td>${dateStr}</td>
        <td>${escapeHtml(m.productName)}</td>
        <td><span class="badge ${m.type === 'in' ? 'badge-ok' : 'badge-warn'}">${m.type === 'in' ? 'IN' : 'OUT'}</span></td>
        <td>${m.quantity} ${escapeHtml(m.unit || '')}</td>
        <td>${escapeHtml(m.reason)}${m.note ? ' — ' + escapeHtml(m.note) : ''}</td>
        <td>${m.stockAfter} ${escapeHtml(m.unit || '')}</td>
      </tr>`;
  }).join('');
}

/* ---------- MODAL ---------- */
function openStockModal() {
  if (!state.products.length) {
    alert('Pehle Products page se kam se kam ek product add karo.');
    return;
  }
  const sel = document.getElementById('sProduct');
  sel.innerHTML = state.products
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.stock} ${escapeHtml(p.unit)} bacha hai)</option>`)
    .join('');

  document.getElementById('stockForm').reset();
  document.getElementById('stockError').textContent = '';
  document.getElementById('stockModal').classList.remove('hidden');
}

function closeStockModal() {
  document.getElementById('stockModal').classList.add('hidden');
}

async function handleSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('stockError');
  errEl.textContent = '';

  const productId = document.getElementById('sProduct').value;
  const type = document.getElementById('sType').value;
  const qty = parseInt(document.getElementById('sQty').value, 10);
  const reason = document.getElementById('sReason').value;
  const note = document.getElementById('sNote').value.trim();

  const product = state.products.find(p => p.id === productId);
  if (!product || !qty || qty <= 0) {
    errEl.textContent = 'Sab fields sahi se bharo.';
    return;
  }

  const newStock = type === 'in'
    ? Number(product.stock) + qty
    : Number(product.stock) - qty;

  if (newStock < 0) {
    errEl.textContent = `Itna stock nahi hai — sirf ${product.stock} ${product.unit} bacha hai.`;
    return;
  }

  try {
    await updateDoc(doc(db, 'products', productId), { stock: newStock });
    await addDoc(stockCol, {
      productId,
      productName: product.name,
      unit: product.unit,
      type,
      quantity: qty,
      reason,
      note,
      stockAfter: newStock,
      createdAt: Date.now()
    });
    closeStockModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}
