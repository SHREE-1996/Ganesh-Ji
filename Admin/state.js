/* =========================================
   SHREE GANESH PROVISION STORE
   state.js — shared in-memory store
   ---------------------------------------------------------------
   products.js aur stock.js apna Firestore data yaha rakhte hain.
   dashboard.js sirf isko padhta hai — kisi doosre module ko
   directly import nahi karta, isliye koi circular import nahi hota.
   ========================================= */

export const state = {
  products: [],
  stockMoves: [],
  customers: [],
  customerLedger: [],
  suppliers: [],
  supplierLedger: [],
  sales: [],
  expenses: []
};

const listeners = [];

export function onStateChange(cb) {
  listeners.push(cb);
}

export function notifyChange() {
  listeners.forEach(cb => cb());
}