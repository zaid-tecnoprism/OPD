export function formatDate(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return String(d); }
}
export function formatDateTime(d) {
  if (!d) return '-';
  try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(d); }
}
export function inr(n) {
  try { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  catch { return '₹0.00'; }
}
export function getErrorMessage(e) {
  if (!e) return 'Unknown error';
  if (e.error?.message) return e.error.message;
  if (e.message) return e.message;
  return String(e);
}
