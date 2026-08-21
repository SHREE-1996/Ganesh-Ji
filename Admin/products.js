/* =========================================
   SHREE GANESH PROVISION STORE
   products.js — Products CRUD (Firestore)
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const productsCol = collection(db, 'products');
let editingId = null;
let unsubscribe = null;
let initialized = false;

/* ---------- INIT (called once from admin.js after login) ---------- */
export function initProducts() {
  startListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('productSearch').addEventListener('input', e => renderProducts(e.target.value));
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
  document.getElementById('productModal').addEventListener('click', e => {
    if (e.target.id === 'productModal') closeProductModal();
  });
  document.getElementById('productForm').addEventListener('submit', handleSubmit);
}

/* ---------- LIVE LISTENER ---------- */
function startListener() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    query(productsCol, orderBy('name')),
    (snap) => {
      state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderProducts(document.getElementById('productSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('productsTableBody').innerHTML =
        `<tr><td colspan="6" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

/* ---------- RENDER ---------- */
export function renderProducts(filter = '') {
  const tbody = document.getElementById('productsTableBody');
  const list = state.products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">Koi product nahi mila. "+ Naya Product" se add karo.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const low = Number(p.stock) <= Number(p.lowStockThreshold);
    return `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.category)}</td>
        <td>₹${Number(p.price).toFixed(2)}</td>
        <td>${p.stock} ${escapeHtml(p.unit)}</td>
        <td><span class="badge ${low ? 'badge-warn' : 'badge-ok'}">${low ? 'Low Stock' : 'In Stock'}</span></td>
        <td class="row-actions">
          <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
          <button class="icon-btn" data-del="${p.id}" title="Delete">🗑️</button>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openProductModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
}

/* ---------- MODAL ---------- */
function openProductModal(id = null) {
  editingId = id;
  const form = document.getElementById('productForm');
  form.reset();
  document.getElementById('productError').textContent = '';

  if (id) {
    const p = state.products.find(x => x.id === id);
    document.getElementById('modalTitle').textContent = 'Product Edit Karo';
    document.getElementById('pName').value = p.name;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pUnit').value = p.unit;
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pThreshold').value = p.lowStockThreshold;
  } else {
    document.getElementById('modalTitle').textContent = 'Naya Product';
    document.getElementById('pThreshold').value = 5;
  }
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
  editingId = null;
}

async function handleSubmit(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('pName').value.trim(),
    category: document.getElementById('pCategory').value.trim(),
    price: parseFloat(document.getElementById('pPrice').value),
    unit: document.getElementById('pUnit').value.trim(),
    stock: parseInt(document.getElementById('pStock').value, 10),
    lowStockThreshold: parseInt(document.getElementById('pThreshold').value, 10),
  };

  if (!data.name || !data.category || isNaN(data.price) || isNaN(data.stock)) {
    document.getElementById('productError').textContent = 'Sab fields sahi se bharo.';
    return;
  }

  try {
    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), data);
    } else {
      data.createdAt = Date.now();
      await addDoc(productsCol, data);
    }
    closeProductModal();
  } catch (err) {
    console.error(err);
    document.getElementById('productError').textContent = 'Save nahi ho paya — Firestore rules check karo.';
  }
}

async function deleteProduct(id) {
  if (!confirm('Ye product delete karna hai?')) return;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    console.error(err);
    alert('Delete nahi ho paya — Firestore rules check karo.');
  }
}
