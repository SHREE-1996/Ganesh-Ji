/* =========================================
   SHREE GANESH PROVISION STORE
   suppliers.js — Supplier directory + Payable tracking
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const suppliersCol = collection(db, 'suppliers');
const ledgerCol = collection(db, 'supplierLedger');

let editingId = null;
let unsubSuppliers = null;
let unsubLedger = null;
let initialized = false;

/* ---------- INIT (called once from admin.js after login) ---------- */
export function initSuppliers() {
  startSupplierListener();
  startLedgerListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('supplierSearch').addEventListener('input', e => renderSuppliers(e.target.value));
  document.getElementById('addSupplierBtn').addEventListener('click', () => openSupplierModal());
  document.getElementById('cancelSupplierBtn').addEventListener('click', closeSupplierModal);
  document.getElementById('supplierModal').addEventListener('click', e => {
    if (e.target.id === 'supplierModal') closeSupplierModal();
  });
  document.getElementById('supplierForm').addEventListener('submit', handleSupplierSubmit);

  document.getElementById('cancelSupplierPayBtn').addEventListener('click', closeSupplierPayModal);
  document.getElementById('supplierPayModal').addEventListener('click', e => {
    if (e.target.id === 'supplierPayModal') closeSupplierPayModal();
  });
  document.getElementById('supplierPayForm').addEventListener('submit', handleSupplierPaySubmit);
}

/* ---------- LIVE LISTENERS ---------- */
function startSupplierListener() {
  if (unsubSuppliers) return;
  unsubSuppliers = onSnapshot(
    query(suppliersCol, orderBy('name')),
    (snap) => {
      state.suppliers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSuppliers(document.getElementById('supplierSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('suppliersTableBody').innerHTML =
        `<tr><td colspan="5" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

function startLedgerListener() {
  if (unsubLedger) return;
  unsubLedger = onSnapshot(
    query(ledgerCol, orderBy('createdAt', 'desc')),
    (snap) => {
      state.supplierLedger = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifyChange();
    },
    (err) => console.error('Firestore error:', err)
  );
}

/* ---------- RENDER ---------- */
export function renderSuppliers(filter = '') {
  const tbody = document.getElementById('suppliersTableBody');
  const f = filter.toLowerCase();
  const list = state.suppliers.filter(s =>
    s.name.toLowerCase().includes(f) || (s.phone || '').includes(f)
  );

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Koi supplier nahi mila. "+ Naya Supplier" se add karo.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(s => {
    const bal = Number(s.balance || 0);
    let badgeClass = 'badge-ok', badgeText = 'Clear';
    if (bal > 0) { badgeClass = 'badge-warn'; badgeText = `₹${bal.toFixed(2)} payable`; }
    else if (bal < 0) { badgeClass = 'badge-ok'; badgeText = `₹${Math.abs(bal).toFixed(2)} advance diya`; }

    return `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.phone)}</td>
        <td>${escapeHtml(s.items || '—')}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="row-actions">
          <button class="icon-btn" data-pay="${s.id}" title="Payment Entry">💰</button>
          <button class="icon-btn" data-edit="${s.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${s.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openSupplierModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteSupplier(b.dataset.del)));
  tbody.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => openSupplierPayModal(b.dataset.pay)));
}

/* ---------- SUPPLIER MODAL (add/edit) ---------- */
function openSupplierModal(id = null) {
  editingId = id;
  const form = document.getElementById('supplierForm');
  form.reset();
  document.getElementById('supplierError').textContent = '';

  if (id) {
    const s = state.suppliers.find(x => x.id === id);
    document.getElementById('supplierModalTitle').textContent = 'Supplier Edit Karo';
    document.getElementById('supName').value = s.name;
    document.getElementById('supPhone').value = s.phone;
    document.getElementById('supItems').value = s.items || '';
    document.getElementById('supNote').value = s.note || '';
  } else {
    document.getElementById('supplierModalTitle').textContent = 'Naya Supplier';
  }
  document.getElementById('supplierModal').classList.remove('hidden');
}

function closeSupplierModal() {
  document.getElementById('supplierModal').classList.add('hidden');
  editingId = null;
}

async function handleSupplierSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('supplierError');
  errEl.textContent = '';

  const data = {
    name: document.getElementById('supName').value.trim(),
    phone: document.getElementById('supPhone').value.trim(),
    items: document.getElementById('supItems').value.trim(),
    note: document.getElementById('supNote').value.trim(),
  };

  if (!data.name || !data.phone) {
    errEl.textContent = 'Naam aur phone number dono zaroori hain.';
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'suppliers', editingId), data);
    } else {
      data.balance = 0;
      data.createdAt = Date.now();
      await addDoc(suppliersCol, data);
    }
    closeSupplierModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}

async function deleteSupplier(id) {
  if (!confirm('Ye supplier delete karna hai? Iska payment history bhi hat jayegi list se.')) return;
  try {
    await deleteDoc(doc(db, 'suppliers', id));
  } catch (err) {
    console.error(err);
    alert('Delete nahi ho paya — Firestore rules check karo.');
  }
}

/* ---------- SUPPLIER PAYMENT MODAL ---------- */
function openSupplierPayModal(supplierId) {
  const s = state.suppliers.find(x => x.id === supplierId);
  if (!s) return;

  document.getElementById('supplierPayForm').reset();
  document.getElementById('spSupplierId').value = supplierId;
  document.getElementById('supPayName').textContent = s.name;
  document.getElementById('supplierPayError').textContent = '';
  document.getElementById('supplierPayModal').classList.remove('hidden');
}

function closeSupplierPayModal() {
  document.getElementById('supplierPayModal').classList.add('hidden');
}

async function handleSupplierPaySubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('supplierPayError');
  errEl.textContent = '';

  const supplierId = document.getElementById('spSupplierId').value;
  const type = document.getElementById('spType').value;
  const amount = parseFloat(document.getElementById('spAmount').value);
  const note = document.getElementById('spNote').value.trim();

  const supplier = state.suppliers.find(s => s.id === supplierId);
  if (!supplier || !amount || amount <= 0) {
    errEl.textContent = 'Amount sahi se bharo.';
    return;
  }

  const currentBalance = Number(supplier.balance || 0);
  const newBalance = type === 'purchase' ? currentBalance + amount : currentBalance - amount;

  try {
    await updateDoc(doc(db, 'suppliers', supplierId), { balance: newBalance });
    await addDoc(ledgerCol, {
      supplierId,
      supplierName: supplier.name,
      type,
      amount,
      note,
      balanceAfter: newBalance,
      createdAt: Date.now()
    });
    closeSupplierPayModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}