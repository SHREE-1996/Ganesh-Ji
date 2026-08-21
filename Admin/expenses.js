/* =========================================
   SHREE GANESH PROVISION STORE
   expenses.js — Expense tracking
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const expensesCol = collection(db, 'expenses');
let editingId = null;
let unsubscribe = null;
let initialized = false;

/* ---------- INIT ---------- */
export function initExpenses() {
  startListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('expenseSearch').addEventListener('input', e => renderExpenses(e.target.value));
  document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
  document.getElementById('cancelExpenseBtn').addEventListener('click', closeExpenseModal);
  document.getElementById('expenseModal').addEventListener('click', e => {
    if (e.target.id === 'expenseModal') closeExpenseModal();
  });
  document.getElementById('expenseForm').addEventListener('submit', handleSubmit);
}

function startListener() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    query(expensesCol, orderBy('date', 'desc')),
    (snap) => {
      state.expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderExpenses(document.getElementById('expenseSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('expensesTableBody').innerHTML =
        `<tr><td colspan="5" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

/* ---------- RENDER ---------- */
export function renderExpenses(filter = '') {
  const f = filter.toLowerCase();
  const list = state.expenses.filter(e =>
    e.category.toLowerCase().includes(f) || (e.note || '').toLowerCase().includes(f)
  );

  const total = state.expenses.reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById('statExpTotal').textContent = '₹' + total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById('statExpCount').textContent = state.expenses.length;

  const now = new Date();
  const thisMonthTotal = state.expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0);
  document.getElementById('statExpMonth').textContent = '₹' + thisMonthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const tbody = document.getElementById('expensesTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Koi expense nahi mila. "+ Naya Expense" se add karo.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => {
    const dateStr = new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td>${dateStr}</td>
        <td>${escapeHtml(e.category)}</td>
        <td>₹${Number(e.amount).toFixed(2)}</td>
        <td>${escapeHtml(e.note || '—')}</td>
        <td class="row-actions">
          <button class="icon-btn" data-edit="${e.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${e.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openExpenseModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteExpense(b.dataset.del)));
}

/* ---------- MODAL ---------- */
function openExpenseModal(id = null) {
  editingId = id;
  const form = document.getElementById('expenseForm');
  form.reset();
  document.getElementById('expenseError').textContent = '';

  if (id) {
    const e = state.expenses.find(x => x.id === id);
    document.getElementById('expenseModalTitle').textContent = 'Expense Edit Karo';
    document.getElementById('exCategory').value = e.category;
    document.getElementById('exAmount').value = e.amount;
    document.getElementById('exDate').value = e.date;
    document.getElementById('exNote').value = e.note || '';
  } else {
    document.getElementById('expenseModalTitle').textContent = 'Naya Expense';
    document.getElementById('exDate').value = new Date().toISOString().slice(0, 10);
  }
  document.getElementById('expenseModal').classList.remove('hidden');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.add('hidden');
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('expenseError');
  errEl.textContent = '';

  const data = {
    category: document.getElementById('exCategory').value,
    amount: parseFloat(document.getElementById('exAmount').value),
    date: document.getElementById('exDate').value,
    note: document.getElementById('exNote').value.trim(),
  };

  if (!data.category || isNaN(data.amount) || data.amount <= 0 || !data.date) {
    errEl.textContent = 'Sab fields sahi se bharo.';
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'expenses', editingId), data);
    } else {
      data.createdAt = Date.now();
      await addDoc(expensesCol, data);
    }
    closeExpenseModal();
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}

async function deleteExpense(id) {
  if (!confirm('Ye expense delete karna hai?')) return;
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    console.error(err);
    alert('Delete nahi ho paya — Firestore rules check karo.');
  }
}