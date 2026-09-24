import state, { generateId } from '../data/store.js';
import { createErrorResponse, validateRequiredFields } from '../utils/response.js';

export function getAllPatients(query = {}) {
  let list = [...state.patients];
  if (query.mobile) {
    list = list.filter(p => p.mobileNumber === query.mobile);
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter(p =>
      p.id.toLowerCase().includes(s) ||
      p.firstName.toLowerCase().includes(s) ||
      p.lastName.toLowerCase().includes(s) ||
      p.mobileNumber.includes(s)
    );
  }
  return list;
}

export function getPatientById(id) {
  return state.patients.find(p => p.id === id) || null;
}

export function findPatientByMobile(mobile) {
  return state.patients.find(p => p.mobileNumber === mobile) || null;
}

export function createPatient(data) {
  const err = validateRequiredFields(data, ['firstName', 'lastName', 'gender', 'age', 'mobileNumber']);
  if (err) throw err;

  if (findPatientByMobile(data.mobileNumber)) {
    throw createErrorResponse('DUPLICATE_PATIENT', 'Patient with this mobile number already exists', 409);
  }

  const id = generateId('P', 'patientId');
  const patient = {
    id,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    gender: data.gender,
    age: Number(data.age),
    weight: data.weight ? Number(data.weight) : null,
    mobileNumber: data.mobileNumber.trim(),
    email: data.email ? data.email.trim() : '',
    address: data.address ? data.address.trim() : '',
    createdAt: new Date().toISOString()
  };
  state.patients.push(patient);
  return patient;
}

export function updatePatient(id, data) {
  const patient = getPatientById(id);
  if (!patient) throw createErrorResponse('PATIENT_NOT_FOUND', 'Patient not found', 404);
  Object.assign(patient, {
    firstName: data.firstName !== undefined ? data.firstName.trim() : patient.firstName,
    lastName: data.lastName !== undefined ? data.lastName.trim() : patient.lastName,
    gender: data.gender || patient.gender,
    age: data.age !== undefined ? Number(data.age) : patient.age,
    weight: data.weight !== undefined ? Number(data.weight) : patient.weight,
    mobileNumber: data.mobileNumber ? data.mobileNumber.trim() : patient.mobileNumber,
    email: data.email !== undefined ? data.email.trim() : patient.email,
    address: data.address !== undefined ? data.address.trim() : patient.address
  });
  return patient;
}
