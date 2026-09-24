import { getPatientById, findPatientByMobile, getAllPatients } from '../services/patientService.js';
import { getVisitsByPatient, getVisitById, getAllVisits, createVisit, updateVisit } from '../services/visitService.js';
import { getAllDepartments, getDepartmentByName, getDepartmentById } from '../services/departmentService.js';
import { getAllDoctors, getDoctorById, getDoctorsByDepartment } from '../services/doctorService.js';
import { createToken, getAllTokens, getTokenByValue, updateTokenStatus } from '../services/tokenService.js';
import { getAllMedicines, getMedicineById, getInventoryStatus } from '../services/medicineService.js';
import { getAllTests, getTestById } from '../services/testService.js';
import { getPrescriptionByVisit, getPrescriptionsByPatient } from '../services/prescriptionService.js';
import { getBillById, getBillsByPatient, generateBill, payBill } from '../services/billingService.js';
import { addNotification } from '../utils/audit.js';

export const agentTools = {
  lookupPatient: {
    name: 'lookupPatient',
    description: 'Look up a patient by ID or mobile number',
    execute: async ({ patientId, mobile }) => {
      try {
        if (patientId) {
          const p = getPatientById(patientId);
          return { success: true, data: p, source: patientId ? 'patient_id' : 'mobile' };
        }
        if (mobile) {
          const p = findPatientByMobile(mobile);
          return { success: true, data: p, source: 'mobile' };
        }
        return { success: false, error: 'patientId or mobile required' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getPatientHistory: {
    name: 'getPatientHistory',
    description: 'Get all previous visits for a patient',
    execute: async ({ patientId }) => {
      try {
        const visits = getVisitsByPatient(patientId);
        const patient = getPatientById(patientId);
        const prescriptions = getPrescriptionsByPatient(patientId);
        const bills = getBillsByPatient(patientId);
        return {
          success: true,
          data: {
            patient,
            visits: visits.map(v => ({
              id: v.id,
              date: v.visitDate,
              mainProblem: v.mainProblem,
              symptoms: v.symptoms,
              department: v.department,
              status: v.visitStatus,
              diagnosis: (prescriptions.find(p => p.visitId === v.id) || {}).diagnosis,
              doctorId: v.doctorId
            })),
            visitCount: visits.length,
            completedCount: visits.filter(v => v.visitStatus === 'completed').length,
            allergies: patient ? patient.allergies : null,
            prescriptionsCount: prescriptions.length,
            bills
          }
        };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getDepartmentDirectory: {
    name: 'getDepartmentDirectory',
    description: 'Get all departments with descriptions and token prefixes',
    execute: async () => {
      try {
        const depts = getAllDepartments();
        const withDoctors = depts.map(d => ({
          ...d,
          availableDoctors: getDoctorsByDepartment(d.name).map(doc => ({ id: doc.id, name: doc.name }))
        }));
        return { success: true, data: withDoctors };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getVisit: {
    name: 'getVisit',
    description: 'Get details of a specific visit',
    execute: async ({ visitId }) => {
      try {
        const visit = getVisitById(visitId);
        if (!visit) return { success: false, error: 'Visit not found' };
        const patient = getPatientById(visit.patientId);
        return { success: true, data: { visit, patient } };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getPrescription: {
    name: 'getPrescription',
    description: 'Get prescription for a visit',
    execute: async ({ visitId }) => {
      try {
        const p = getPrescriptionByVisit(visitId);
        return { success: true, data: p };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getMedicineInfo: {
    name: 'getMedicineInfo',
    description: 'Get medicine details and inventory status',
    execute: async ({ medicineId, search }) => {
      try {
        if (medicineId) {
          const m = getMedicineById(medicineId);
          return { success: true, data: m };
        }
        if (search) {
          const meds = getAllMedicines({ search });
          return { success: true, data: meds };
        }
        return { success: true, data: getInventoryStatus() };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getTestInfo: {
    name: 'getTestInfo',
    description: 'Get test catalog and pricing',
    execute: async ({ testId, search }) => {
      try {
        if (testId) {
          const t = getTestById(testId);
          return { success: true, data: t };
        }
        const tests = getAllTests({ search });
        return { success: true, data: tests };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  getBillingInfo: {
    name: 'getBillingInfo',
    description: 'Get billing details for a visit or patient',
    execute: async ({ visitId, patientId, billId }) => {
      try {
        if (billId) {
          return { success: true, data: getBillById(billId) };
        }
        if (patientId) {
          return { success: true, data: getBillsByPatient(patientId) };
        }
        return { success: false, error: 'billId or patientId required' };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  generateBill: {
    name: 'generateBill',
    description: 'Generate or retrieve bill for a visit',
    execute: async ({ patientId, visitId }) => {
      try {
        const bill = generateBill({ patientId, visitId });
        return { success: true, data: bill };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  },

  notify: {
    name: 'notify',
    description: 'Create workflow notification for staff',
    execute: async ({ patientId, visitId, type, message, priority }) => {
      try {
        const n = addNotification({ patientId, visitId, type, message, priority });
        return { success: true, data: n };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }
  }
};

export async function callTool(toolName, params) {
  const tool = agentTools[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  try {
    return await tool.execute(params || {});
  } catch (e) {
    return { success: false, error: `Tool ${toolName} failed: ${e.message}` };
  }
}
