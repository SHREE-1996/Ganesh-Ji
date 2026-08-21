/* =========================================
   SHREE GANESH PROVISION STORE
   dashboard.js — Dashboard stats (reads shared state)
   ---------------------------------------------------------------
   Ye module Firestore ko directly nahi chhuta — products.js aur
   stock.js jab bhi apna data update karte hain, state.js ke
   notifyChange() se ye render() call ho jata hai.
   ========================================= */
import { state, onStateChange } from "./state.js";
import { escapeHtml } from "./utils.js";

let initialized = false;

export function initDashboard() {
  if (initialized) return;
  initialized = true;
  onStateChange(renderDashboard);
  renderDashboard();
}

function renderDashboard() {
  const products = state.products;

  document.getElementById('statTotalProducts').textContent = products.length;

  const stockValue = products.reduce((sum, p) => sum + (Number(p.price) * Number(p.stock)), 0);
  document.getElementById('statStockValue').textContent = '₹' + stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const lowStockItems = products.filter(p => Number(p.stock) <= Number(p.lowStockThreshold));
  document.getElementById('statLowStock').textContent = lowStockItems.length;

  const categories = new Set(products.map(p => p.category));
  document.getElementById('statCategories').textContent = categories.size;

  document.getElementById('statTotalCustomers').textContent = state.customers.length;
  const totalUdhaar = state.customers.reduce((sum, c) => sum + Math.max(Number(c.balance || 0), 0), 0);
  document.getElementById('statTotalUdhaar').textContent = '₹' + totalUdhaar.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  document.getElementById('statTotalSuppliers').textContent = state.suppliers.length;
  const totalPayable = state.suppliers.reduce((sum, s) => sum + Math.max(Number(s.balance || 0), 0), 0);
  document.getElementById('statTotalPayable').textContent = '₹' + totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const totalSales = state.sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = totalSales - totalExpenses;
  document.getElementById('statTotalSales').textContent = '₹' + totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById('statTotalExpenses').textContent = '₹' + totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById('statProfit').textContent = (profit < 0 ? '−' : '') + '₹' + Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById('profitCard').classList.toggle('stat-card-warn', profit < 0);

  const lowStockList = document.getElementById('lowStockList');
  if (!lowStockItems.length) {
    lowStockList.innerHTML = `<p class="empty-msg">Sab products stock mein hai 👍</p>`;
  } else {
    lowStockList.innerHTML = lowStockItems.map(p => `
      <div class="low-stock-item">
        <span>${escapeHtml(p.name)}</span>
        <span class="badge badge-warn">${p.stock} ${escapeHtml(p.unit)} bacha hai</span>
      </div>`).join('');
  }
}