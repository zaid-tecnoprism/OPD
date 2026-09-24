import state from '../data/store.js';
import { uuid } from '../data/store.js';

export function addAuditLog({ actor = 'system', action, patientId = null, visitId = null, entityType = null, entityId = null, details = {} }) {
  const log = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    patientId,
    visitId,
    entityType,
    entityId,
    details: typeof details === 'string' ? { message: details } : details
  };
  state.auditLogs.unshift(log);
  if (state.auditLogs.length > 10000) {
    state.auditLogs.pop();
  }
  return log;
}

export function addNotification({ patientId, visitId, type, message, priority = 'normal' }) {
  const notif = {
    id: uuid(),
    patientId,
    visitId,
    type,
    message,
    priority,
    read: false,
    createdAt: new Date().toISOString()
  };
  state.notifications.unshift(notif);
  return notif;
}
