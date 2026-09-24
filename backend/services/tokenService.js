import state, { generateTokenNumber, uuid } from '../data/store.js';
import { createErrorResponse } from '../utils/response.js';
import { getDoctorsByDepartment } from './doctorService.js';
import { getDepartmentByName } from './departmentService.js';
import { updateVisit } from './visitService.js';

export function getAllTokens(query = {}) {
  let list = [...state.tokens];
  if (query.status) list = list.filter(t => t.status === query.status);
  if (query.department) list = list.filter(t => t.department === query.department);
  if (query.doctorId) list = list.filter(t => t.doctorId === query.doctorId);
  if (query.today) {
    const today = new Date().toDateString();
    list = list.filter(t => new Date(t.createdAt).toDateString() === today);
  }
  return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function getTokenByValue(token) {
  return state.tokens.find(t => t.token === token) || null;
}

export function createToken({ patientId, visitId, department, priority = 'routine' }) {
  const dept = getDepartmentByName(department);
  if (!dept) throw createErrorResponse('DEPARTMENT_NOT_FOUND', 'Department not found', 404);

  const doctors = getDoctorsByDepartment(department);
  if (doctors.length === 0) throw createErrorResponse('NO_DOCTOR_AVAILABLE', `No doctor available in ${department}`, 400);

  const tokenValue = generateTokenNumber(dept.tokenPrefix);
  const doctorId = doctors[0].id;

  const tokenObj = {
    id: uuid(),
    token: tokenValue,
    patientId,
    visitId,
    department,
    priority,
    doctorId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  state.tokens.push(tokenObj);

  if (visitId) {
    try {
      updateVisit(visitId, { token: tokenValue, doctorId, department });
    } catch (e) {}
  }

  return tokenObj;
}

export function updateTokenStatus(token, status) {
  const t = getTokenByValue(token);
  if (!t) throw createErrorResponse('TOKEN_NOT_FOUND', 'Token not found', 404);
  const valid = ['pending', 'called', 'in consultation', 'completed', 'cancelled'];
  if (!valid.includes(status)) throw createErrorResponse('INVALID_STATUS', 'Invalid token status', 400);
  t.status = status;
  if (t.visitId) {
    try {
      if (status === 'completed' || status === 'cancelled') {
        updateVisit(t.visitId, { visitStatus: status === 'completed' ? 'completed' : 'cancelled' });
      } else {
        updateVisit(t.visitId, { visitStatus: status });
      }
    } catch (e) {}
  }
  return t;
}
