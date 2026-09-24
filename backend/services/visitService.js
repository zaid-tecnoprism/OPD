import state, { generateId } from '../data/store.js';
import { createErrorResponse, validateRequiredFields } from '../utils/response.js';

export function getAllVisits(query = {}) {
  let list = [...state.visits];
  if (query.patientId) list = list.filter(v => v.patientId === query.patientId);
  if (query.status) list = list.filter(v => v.visitStatus === query.status);
  if (query.department) list = list.filter(v => v.department === query.department);
  if (query.today) {
    const today = new Date().toDateString();
    list = list.filter(v => new Date(v.visitDate).toDateString() === today);
  }
  return list.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getVisitById(id) {
  return state.visits.find(v => v.id === id) || null;
}

export function getVisitsByPatient(patientId) {
  return state.visits
    .filter(v => v.patientId === patientId)
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
}

export function getLatestCompletedVisit(patientId) {
  return state.visits
    .filter(v => v.patientId === patientId && v.visitStatus === 'completed')
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0] || null;
}

export function createVisit(data) {
  const err = validateRequiredFields(data, ['patientId', 'mainProblem', 'department']);
  if (err) throw err;

  const id = generateId('V', 'visitId');
  const visit = {
    id,
    patientId: data.patientId,
    visitDate: data.visitDate || new Date().toISOString(),
    mainProblem: data.mainProblem,
    symptoms: data.symptoms || '',
    duration: data.duration || '',
    severity: data.severity || 'Mild',
    previousOccurrence: data.previousOccurrence || 'No',
    allergies: data.allergies || 'No known allergies',
    currentMedication: data.currentMedication || 'None',
    additionalInformation: data.additionalInformation || '',
    department: data.department,
    priority: data.priority || 'routine',
    token: data.token || '',
    aiStatus: data.aiStatus || 'pending',
    visitStatus: data.visitStatus || 'pending',
    doctorId: data.doctorId || null,
    reportedSymptoms: data.reportedSymptoms || {}
  };
  state.visits.push(visit);
  return visit;
}

export function updateVisit(id, data) {
  const visit = getVisitById(id);
  if (!visit) throw createErrorResponse('VISIT_NOT_FOUND', 'Visit not found', 404);
  Object.assign(visit, data);
  return visit;
}

export function updateVisitStatus(id, status) {
  const visit = getVisitById(id);
  if (!visit) throw createErrorResponse('VISIT_NOT_FOUND', 'Visit not found', 404);
  const valid = ['pending', 'called', 'in consultation', 'completed', 'cancelled'];
  if (!valid.includes(status)) throw createErrorResponse('INVALID_STATUS', 'Invalid visit status', 400);
  visit.visitStatus = status;
  if (status === 'completed' && !visit.completedAt) visit.completedAt = new Date().toISOString();
  return visit;
}
