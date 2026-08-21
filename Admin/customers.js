/* =========================================
   SHREE GANESH PROVISION STORE
   customers.js — Customer directory + Khata (credit) tracking
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const customersCol = collection(db, 'customers');
const ledgerCol = collection(db, 'customerLedger');

let editingId = null;
let unsubCustomers = null;
let unsubLedger = null;
let initialized = false;

/* ---------- INIT (called once from admin.js after login) ---------- */
export function initCustomers() {
  startCustomerListener();
  startLedgerListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('customerSearch').addEventListener('input', e => renderCustomers(e.target.value));
  document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal());
  document.getElementById('cancelCustomerBtn').addEventListener('click', closeCustomerModal);
  document.getElementById('customerModal').addEventListener('click', e => {
    if (e.target.id === 'customerModal') closeCustomerModal();
  });
  document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);

  document.getElementById('cancelKhataBtn').addEventListener('click', closeKhataModal);
  document.getElementById('khataModal').addEventListener('click', e => {
    if (e.target.id === 'khataModal') closeKhataModal();
  });
  document.getElementById('khataForm').addEventListener('submit', handleKhataSubmit);
}

/* ---------- LIVE LISTENERS ---------- */
function startCustomerListener() {
  if (unsubCustomers) return;
  unsubCustomers = onSnapshot(
    query(customersCol, orderBy('name')),
    (snap) => {
      state.customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCustomers(document.getElementById('customerSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('customersTableBody').innerHTML =
        `<tr><td colspan="5" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

function startLedgerListener() {
  if (unsubLedger) return;
  unsubLedger = onSnapshot(
    query(ledgerCol, orderBy('createdAt', 'desc')),
    (snap) => {
      state.customerLedger = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifyChange();
    },
    (err) => console.error('Firestore error:', err)
  );
}

/* ---------- RENDER ---------- */
export function renderCustomers(filter = '') {
  const tbody = document.getElementById('customersTableBody');
  const f = filter.toLowerCase();
  const list = state.customers.filter(c =>
    c.name.toLowerCase().includes(f) || (c.phone || '').includes(f)
  );

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Koi customer nahi mila. "+ Naya Customer" se add karo.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const bal = Number(c.balance || 0);
    let badgeClass = 'badge-ok', badgeText = 'Clear';
    if (bal > 0) { badgeClass = 'badge-warn'; badgeText = `₹${bal.toFixed(2)} udhaar`; }
    else if (bal < 0) { badgeClass = 'badge-ok'; badgeText = `₹${Math.abs(bal).toFixed(2)} advance`; }

    return `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${escapeHtml(c.address || '—')}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="row-actions">
          <button class="icon-btn" data-khata="${c.id}" title="Khata Entry">💰</button>
          <button class="icon-btn" data-edit="${c.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${c.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openCustomerModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteCustomer(b.dataset.del)));
  tbody.querySelectorAll('[data-khata]').forEach(b => b.addEventListener('click', () => openKhataModal(b.dataset.khata)));
}

/* ---------- CUSTOMER MODAL (add/edit) ---------- */
function openCustomerModal(id = null) {
  editingId = id;
  const form = document.getElementById('customerForm');
  form.reset();
  document.getElementById('customerError').textContent = '';

  if (id) {
    const c = state.customers.find(x => x.id === id);
    document.getElementById('customerModalTitle').textContent = 'Customer Edit Karo';
    document.getElementById('cName').value = c.name;
    document.getElementById('cPhone').value = c.phone;
    document.getElementById('cAddress').value = c.address || '';
    document.getElementById('cNote').value = c.note || '';
  } else {
    document.getElementById('customerModalTitle').textContent = 'Naya Customer';
  }
  document.getElementById('customerModal').classList.remove('hidden');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.add('hidden');
  editingId = null;
}

async function handleCustomerSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('customerError');
  errEl.textContent = '';

  const data = {
    name: document.getElementById('cName').value.trim(),
    phone: document.getElementById('cPhone').value.trim(),
    address: document.getElementById('cAddress').value.trim(),
    note: document.getElementById('cNote').value.trim(),
  };

  if (!data.name || !data.phone) {
    errEl.textContent = 'Naam aur phone number dono zaroori hain.';
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'customers', editingId), data);
    } else {
      data.balance = 0;
      data.createdAt = Date.now();
      await addDoc(customersCol, data);
    }
    closeCustomerModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}

async function deleteCustomer(id) {
  if (!confirm('Ye customer delete karna hai? Iska khata history bhi hat jayegi list se.')) return;
  try {
    await deleteDoc(doc(db, 'customers', id));
  } catch (err) {
    console.error(err);
    alert('Delete nahi ho paya — Firestore rules check karo.');
  }
}

/* ---------- KHATA (credit ledger) MODAL ---------- */
function openKhataModal(customerId) {
  const c = state.customers.find(x => x.id === customerId);
  if (!c) return;

  document.getElementById('khCustomerId').value = customerId;
  document.getElementById('khataCustomerName').textContent = c.name;
  document.getElementById('khataForm').reset();
  document.getElementById('khCustomerId').value = customerId;
  document.getElementById('khataError').textContent = '';
  document.getElementById('khataModal').classList.remove('hidden');
}

function closeKhataModal() {
  document.getElementById('khataModal').classList.add('hidden');
}

async function handleKhataSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('khataError');
  errEl.textContent = '';

  const customerId = document.getElementById('khCustomerId').value;
  const type = document.getElementById('khType').value;
  const amount = parseFloat(document.getElementById('khAmount').value);
  const note = document.getElementById('khNote').value.trim();

  const customer = state.customers.find(c => c.id === customerId);
  if (!customer || !amount || amount <= 0) {
    errEl.textContent = 'Amount sahi se bharo.';
    return;
  }

  const currentBalance = Number(customer.balance || 0);
  const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

  try {
    await updateDoc(doc(db, 'customers', customerId), { balance: newBalance });
    await addDoc(ledgerCol, {
      customerId,
      customerName: customer.name,
      type,
      amount,
      note,
      balanceAfter: newBalance,
      createdAt: Date.now()
    });
    closeKhataModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}