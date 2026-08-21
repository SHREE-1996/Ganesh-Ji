/* =========================================
   SHREE GANESH PROVISION STORE
   sales.js — Sales History (read-only view of bills.js output)
   ========================================= */
import { db } from "../firebase-config.js";
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state, notifyChange } from "./state.js";
import { escapeHtml } from "./utils.js";

const salesCol = collection(db, 'sales');
let unsubscribe = null;
let initialized = false;

/* ---------- INIT ---------- */
export function initSales() {
  startListener();
  if (initialized) return;
  initialized = true;

  document.getElementById('salesSearch').addEventListener('input', e => renderSales(e.target.value));
  document.getElementById('closeBillViewBtn').addEventListener('click', () => {
    document.getElementById('billViewModal').classList.add('hidden');
  });
  document.getElementById('billViewModal').addEventListener('click', e => {
    if (e.target.id === 'billViewModal') document.getElementById('billViewModal').classList.add('hidden');
  });
}

function startListener() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    query(salesCol, orderBy('createdAt', 'desc')),
    (snap) => {
      state.sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSales(document.getElementById('salesSearch').value);
      notifyChange();
    },
    (err) => {
      console.error('Firestore error:', err);
      document.getElementById('salesTableBody').innerHTML =
        `<tr><td colspan="7" class="empty-msg">Data load nahi ho paya — Firestore rules check karo.</td></tr>`;
    }
  );
}

/* ---------- RENDER ---------- */
export function renderSales(filter = '') {
  const f = filter.toLowerCase();
  const list = state.sales.filter(s =>
    s.customerName.toLowerCase().includes(f) || s.billNumber.toLowerCase().includes(f)
  );

  const totalRevenue = state.sales.reduce((s, sale) => s + Number(sale.total), 0);
  document.getElementById('statSalesTotal').textContent = '₹' + totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById('statSalesCount').textContent = state.sales.length;
  const avg = state.sales.length ? totalRevenue / state.sales.length : 0;
  document.getElementById('statSalesAvg').textContent = '₹' + avg.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const tbody = document.getElementById('salesTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Abhi tak koi bill nahi bana. Billing page se banao.</td></tr>`;
    return;
  }

  const paymentLabel = { cash: 'Cash', upi: 'UPI', khata: 'Khata' };

  tbody.innerHTML = list.map(s => {
    const dateStr = new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td>${escapeHtml(s.billNumber)}</td>
        <td>${dateStr}</td>
        <td>${escapeHtml(s.customerName)}</td>
        <td>${s.items.length} item${s.items.length > 1 ? 's' : ''}</td>
        <td>₹${Number(s.total).toFixed(2)}</td>
        <td><span class="badge ${s.paymentMode === 'khata' ? 'badge-warn' : 'badge-ok'}">${paymentLabel[s.paymentMode] || s.paymentMode}</span></td>
        <td class="row-actions"><button class="icon-btn" data-view="${s.id}" title="View">👁️</button></td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewBill(b.dataset.view)));
}

/* ---------- VIEW BILL MODAL ---------- */
function viewBill(id) {
  const sale = state.sales.find(s => s.id === id);
  if (!sale) return;

  document.getElementById('viewBillNumber').textContent = sale.billNumber;
  const dateStr = new Date(sale.createdAt).toLocaleString('en-IN');
  const paymentLabel = { cash: 'Cash', upi: 'UPI', khata: 'Khata (udhaar)' };

  const itemsHtml = sale.items.map(it => `
    <div class="bill-view-row">
      <span>${escapeHtml(it.name)} × ${it.qty} ${escapeHtml(it.unit)}</span>
      <span>₹${(it.price * it.qty).toFixed(2)}</span>
    </div>`).join('');

  document.getElementById('viewBillDetails').innerHTML = `
    <div class="bill-view-row"><span>Customer</span><span>${escapeHtml(sale.customerName)}</span></div>
    <div class="bill-view-row"><span>Date</span><span>${dateStr}</span></div>
    <div class="bill-view-row"><span>Payment</span><span>${paymentLabel[sale.paymentMode] || sale.paymentMode}</span></div>
    <div style="margin-top: 14px; margin-bottom: 6px; font-weight: 700; color: var(--green-dark);">Items</div>
    ${itemsHtml}
    <div class="bill-view-row"><span>Subtotal</span><span>₹${Number(sale.subtotal).toFixed(2)}</span></div>
    <div class="bill-view-row"><span>Discount</span><span>−₹${Number(sale.discount).toFixed(2)}</span></div>
    <div class="bill-view-total"><span>Total</span><span>₹${Number(sale.total).toFixed(2)}</span></div>
  `;

  document.getElementById('billViewModal').classList.remove('hidden');
}