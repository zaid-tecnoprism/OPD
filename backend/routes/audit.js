import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import state from '../data/store.js';

const router = express.Router();

router.get('/logs', (req, res, next) => {
  try {
    let logs = [...state.auditLogs];
    if (req.query.patientId) logs = logs.filter(l => l.patientId === req.query.patientId);
    if (req.query.visitId) logs = logs.filter(l => l.visitId === req.query.visitId);
    if (req.query.entityType) logs = logs.filter(l => l.entityType === req.query.entityType);
    if (req.query.action) logs = logs.filter(l => l.action.toLowerCase().includes(req.query.action.toLowerCase()));
    if (req.query.limit) logs = logs.slice(0, Number(req.query.limit));
    res.json(createSuccessResponse({ logs, total: state.auditLogs.length }));
  } catch (e) { next(e); }
});

router.get('/notifications', (req, res, next) => {
  try {
    let notifs = [...state.notifications];
    if (req.query.patientId) notifs = notifs.filter(n => n.patientId === req.query.patientId);
    if (req.query.type) notifs = notifs.filter(n => n.type === req.query.type);
    if (req.query.unread) notifs = notifs.filter(n => !n.read);
    res.json(createSuccessResponse({ notifications: notifs, total: notifs.length }));
  } catch (e) { next(e); }
});

export default router;
