/* =========================================
   SHREE GANESH PROVISION STORE
   billing.js — Create bills: deducts product stock,
   updates customer khata (if paid on credit), and
   logs a sale record (Sales History reads from this).
   ========================================= */
import { db } from "../firebase-config.js";
import {
  collection, addDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

const salesCol = collection(db, 'sales');
const stockCol = collection(db, 'stockMovements');
const ledgerCol = collection(db, 'customerLedger');

let cart = []; // [{ productId, name, unit, price, qty }]
let initialized = false;

/* ---------- INIT (called once from admin.js after login) ---------- */
export function initBilling() {
  if (initialized) return;
  initialized = true;

  document.getElementById('addToCartBtn').addEventListener('click', addToCart);
  document.getElementById('clearCartBtn').addEventListener('click', () => {
    if (cart.length && !confirm('Cart khali karna hai?')) return;
    cart = [];
    renderCart();
  });
  document.getElementById('generateBillBtn').addEventListener('click', generateBill);
  document.getElementById('billDiscount').addEventListener('input', renderCart);

  // Refresh dropdowns whenever billing view becomes visible
  document.querySelector('.side-link[data-view="billing"]').addEventListener('click', refreshDropdowns);

  renderCart();
}

function refreshDropdowns() {
  const custSel = document.getElementById('billCustomer');
  custSel.innerHTML = '<option value="">Walk-in Customer</option>' +
    state.customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.phone)})</option>`).join('');

  const prodSel = document.getElementById('billProductSelect');
  prodSel.innerHTML = state.products
    .filter(p => Number(p.stock) > 0)
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ₹${Number(p.price).toFixed(2)} (${p.stock} ${escapeHtml(p.unit)} bacha hai)</option>`)
    .join('') || '<option value="">Koi product stock mein nahi hai</option>';
}

/* ---------- CART ---------- */
function addToCart() {
  const productId = document.getElementById('billProductSelect').value;
  const qty = parseInt(document.getElementById('billQty').value, 10);
  const errEl = document.getElementById('billError');
  errEl.textContent = '';

  const product = state.products.find(p => p.id === productId);
  if (!product || !qty || qty <= 0) {
    errEl.textContent = 'Product aur quantity sahi se select karo.';
    return;
  }

  const alreadyInCart = cart.find(c => c.productId === productId);
  const qtyInCart = alreadyInCart ? alreadyInCart.qty : 0;

  if (qtyInCart + qty > Number(product.stock)) {
    errEl.textContent = `Itna stock nahi hai — sirf ${product.stock} ${product.unit} bacha hai.`;
    return;
  }

  if (alreadyInCart) {
    alreadyInCart.qty += qty;
  } else {
    cart.push({ productId, name: product.name, unit: product.unit, price: Number(product.price), qty });
  }
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(c => c.productId !== productId);
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('cartTableBody');
  if (!cart.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">Cart khali hai — upar se product add karo.</td></tr>`;
  } else {
    tbody.innerHTML = cart.map(c => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>₹${c.price.toFixed(2)}</td>
        <td>${c.qty} ${escapeHtml(c.unit)}</td>
        <td>₹${(c.price * c.qty).toFixed(2)}</td>
        <td class="row-actions"><button class="icon-btn" data-remove="${c.productId}" title="Remove">🗑️</button></td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.remove)));
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
  const grandTotal = Math.max(subtotal - discount, 0);

  document.getElementById('billSubtotal').textContent = '₹' + subtotal.toFixed(2);
  document.getElementById('billGrandTotal').textContent = '₹' + grandTotal.toFixed(2);
}

/* ---------- GENERATE BILL ---------- */
async function generateBill() {
  const errEl = document.getElementById('billError');
  errEl.textContent = '';

  if (!cart.length) {
    errEl.textContent = 'Cart khali hai, pehle products add karo.';
    return;
  }

  const customerId = document.getElementById('billCustomer').value || null;
  const customer = customerId ? state.customers.find(c => c.id === customerId) : null;
  const paymentMode = document.getElementById('billPaymentMode').value;
  const discount = parseFloat(document.getElementById('billDiscount').value) || 0;
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const total = Math.max(subtotal - discount, 0);

  if (paymentMode === 'khata' && !customer) {
    errEl.textContent = 'Khata (udhaar) ke liye customer select karna zaroori hai.';
    return;
  }

  const billNumber = 'B' + Date.now().toString().slice(-8);

  try {
    // 1. Save the sale record
    await addDoc(salesCol, {
      billNumber,
      customerId: customerId || null,
      customerName: customer ? customer.name : 'Walk-in Customer',
      items: cart.map(c => ({ productId: c.productId, name: c.name, unit: c.unit, price: c.price, qty: c.qty })),
      subtotal,
      discount,
      total,
      paymentMode,
      createdAt: Date.now()
    });

    // 2. Deduct stock + log a stock movement for each item
    for (const item of cart) {
      const product = state.products.find(p => p.id === item.productId);
      if (!product) continue;
      const newStock = Number(product.stock) - item.qty;
      await updateDoc(doc(db, 'products', item.productId), { stock: newStock });
      await addDoc(stockCol, {
        productId: item.productId,
        productName: item.name,
        unit: item.unit,
        type: 'out',
        quantity: item.qty,
        reason: 'Sale',
        note: `Bill #${billNumber}`,
        stockAfter: newStock,
        createdAt: Date.now()
      });
    }

    // 3. If paid on khata, update customer balance
    if (paymentMode === 'khata' && customer) {
      const newBalance = Number(customer.balance || 0) + total;
      await updateDoc(doc(db, 'customers', customer.id), { balance: newBalance });
      await addDoc(ledgerCol, {
        customerId: customer.id,
        customerName: customer.name,
        type: 'credit',
        amount: total,
        note: `Bill #${billNumber}`,
        balanceAfter: newBalance,
        createdAt: Date.now()
      });
    }

    cart = [];
    document.getElementById('billDiscount').value = 0;
    document.getElementById('billCustomer').value = '';
    renderCart();
    alert(`Bill #${billNumber} ban gaya! Total: ₹${total.toFixed(2)}`);
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Bill save nahi ho paya — Firestore rules check karo.';
  }
}