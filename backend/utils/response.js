export function createSuccessResponse(data, message = 'Success', statusCode = 200) {
  return {
    success: true,
    data,
    message
  };
}

export function createErrorResponse(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

export function validateRequiredFields(obj, fields) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length > 0) {
    return createErrorResponse('MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`, 400);
  }
  return null;
}

export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function calculateGST(amount, percent) {
  return Number((amount * percent / 100).toFixed(2));
}

export function calculateChargeWithGST(amount, percent) {
  const gst = calculateGST(amount, percent);
  return { base: Number(amount.toFixed(2)), gst, total: Number((amount + gst).toFixed(2)) };
}
