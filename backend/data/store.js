import { v4 as uuidv4 } from 'uuid';

const state = {
  patients: [],
  visits: [],
  doctors: [],
  departments: [],
  medicines: [],
  tests: [],
  prescriptions: [],
  bills: [],
  tokens: [],
  pharmacyTransactions: [],
  testTransactions: [],
  auditLogs: [],
  notifications: [],
  counters: {
    patientId: 0,
    visitId: 0,
    tokenCounters: {}
  }
};

export function generateId(prefix, counterName) {
  if (!(counterName in state.counters)) {
    state.counters[counterName] = 0;
  }
  state.counters[counterName]++;
  const num = state.counters[counterName].toString().padStart(3, '0');
  return `${prefix}${num}`;
}

export function generateTokenNumber(prefix) {
  if (!(prefix in state.counters.tokenCounters)) {
    state.counters.tokenCounters[prefix] = 0;
  }
  state.counters.tokenCounters[prefix]++;
  const num = state.counters.tokenCounters[prefix].toString().padStart(3, '0');
  return `${prefix}-${num}`;
}

export function uuid() {
  return uuidv4();
}

export default state;
