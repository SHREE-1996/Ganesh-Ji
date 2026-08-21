/* =========================================
   SHREE GANESH PROVISION STORE
   utils.js — shared helper functions
   ========================================= */

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
