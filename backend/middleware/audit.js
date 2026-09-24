import { addAuditLog } from '../utils/audit.js';

const NO_AUDIT_PATHS = ['/api/health', '/api/audit', '/api/reports'];

export function auditRequest(req, res, next) {
  const originalPath = req.originalUrl || req.path;
  if (NO_AUDIT_PATHS.some(p => originalPath.startsWith(p))) {
    return next();
  }

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      let action = `${req.method} ${originalPath}`;
      let patientId = null;
      let visitId = null;
      let entityType = null;
      let entityId = null;

      if (originalPath.includes('/patients')) {
        entityType = 'Patient';
        patientId = req.params.id || req.body.id || req.body.patientId || (parsed.data && (parsed.data.id || parsed.data.patientId));
      } else if (originalPath.includes('/visits')) {
        entityType = 'Visit';
        visitId = req.params.id || req.body.id || req.body.visitId || (parsed.data && (parsed.data.id || parsed.data.visitId));
        patientId = req.body.patientId || req.params.patientId || (parsed.data && parsed.data.patientId);
      } else if (originalPath.includes('/prescriptions')) {
        entityType = 'Prescription';
        visitId = req.params.visitId || req.body.visitId || (parsed.data && parsed.data.visitId);
        patientId = req.body.patientId || (parsed.data && parsed.data.patientId);
      } else if (originalPath.includes('/bills')) {
        entityType = 'Bill';
        entityId = req.params.id || req.params.billId || (parsed.data && parsed.data.id);
        visitId = req.body.visitId || (parsed.data && parsed.data.visitId);
        patientId = req.params.patientId || req.body.patientId || (parsed.data && parsed.data.patientId);
      } else if (originalPath.includes('/tokens')) {
        entityType = 'Token';
        entityId = req.params.token || (parsed.data && parsed.data.token);
        patientId = req.body.patientId || (parsed.data && parsed.data.patientId);
        visitId = req.body.visitId || (parsed.data && parsed.data.visitId);
      } else if (originalPath.includes('/pharmacy')) {
        entityType = 'Pharmacy';
        patientId = req.body.patientId || (parsed.data && parsed.data.patientId);
        visitId = req.body.visitId || (parsed.data && parsed.data.visitId);
      } else if (originalPath.includes('/test-center')) {
        entityType = 'TestCenter';
        patientId = req.body.patientId || (parsed.data && parsed.data.patientId);
        visitId = req.body.visitId || (parsed.data && parsed.data.visitId);
      } else if (originalPath.includes('/agents')) {
        entityType = 'Agent';
        visitId = req.body.visitId || (parsed.data && (parsed.data.visitId));
        patientId = req.body.patientId || (parsed.data && parsed.data.patientId);
      }

      const details = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        success: parsed && parsed.success,
        bodySample: req.body ? truncate(req.body) : undefined,
        errorMessage: parsed && parsed.error ? parsed.error.message : undefined
      };

      if (originalPath.includes('/agents/analyze')) {
        action = 'Agent1_AnalyzeIntake';
      } else if (originalPath.includes('/agents/coordinate')) {
        action = 'Agent2_CoordinateBilling';
      } else if (originalPath.includes('/bills/') && originalPath.includes('generate')) {
        action = 'Billing_Generate';
      } else if (originalPath.includes('/bills/') && originalPath.includes('/pay')) {
        action = 'Billing_Payment';
      } else if (originalPath.includes('/pharmacy/') && originalPath.includes('dispense')) {
        action = 'Pharmacy_Dispense';
      } else if (originalPath.includes('/test-center/') && originalPath.includes('confirm')) {
        action = 'TestCenter_Confirm';
      }

      addAuditLog({
        actor: req.headers['x-actor'] || 'api',
        action,
        patientId,
        visitId,
        entityType,
        entityId,
        details
      });
    } catch (e) {
    }
    return originalSend(body);
  };
  next();
}

function truncate(obj, maxLen = 500) {
  try {
    const s = JSON.stringify(obj);
    return s.length > maxLen ? s.substring(0, maxLen) + '...' : s;
  } catch {
    return '[unserializable]';
  }
}

export default { auditRequest };
