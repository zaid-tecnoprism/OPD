import express from 'express';
import { createSuccessResponse } from '../utils/response.js';
import { agent1AnalyzeIntake } from '../agents/agent1_intake.js';
import { agent2CoordinateBilling } from '../agents/agent2_billing.js';

const router = express.Router();

router.post('/analyze', async (req, res, next) => {
  try {
    const result = await agent1AnalyzeIntake(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, trace: result.trace });
    }
    res.json({
      success: true,
      data: result.data,
      message: result.message,
      safetyDisclaimer: result.safetyDisclaimer,
      trace: result.trace
    });
  } catch (e) { next(e); }
});

router.post('/coordinate', async (req, res, next) => {
  try {
    const result = await agent2CoordinateBilling(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error, trace: result.trace });
    }
    res.json({
      success: true,
      data: result.data,
      message: result.message,
      safety: result.safety,
      trace: result.trace
    });
  } catch (e) { next(e); }
});

router.get('/agent-info', (req, res) => {
  res.json(createSuccessResponse({
    agents: [
      {
        id: 'agent1',
        name: 'Patient Intake & Routing Agent',
        purpose: 'Reads intake, retrieves history, suggests department/priority, generates summary, detects missing info, decides human review',
        tools: ['lookupPatient', 'getPatientHistory', 'getDepartmentDirectory', 'getVisit'],
        output: ['patientId', 'visitId', 'suggestedDepartment', 'priority', 'summary', 'reason', 'missingInformation', 'followUpQuestions', 'requiresHumanReview'],
        safety: 'No diagnosis, no prescription, no emergency declaration. Never replaces doctor.'
      },
      {
        id: 'agent2',
        name: 'Clinical Workflow / Billing Coordinator Agent',
        purpose: 'Retrieves completed consultation, coordinates pharmacy/test/billing, prepares billing, tracks services, notifies',
        tools: ['getPrescription', 'getMedicineInfo', 'getTestInfo', 'getBillingInfo', 'generateBill', 'getPatientHistory', 'getVisit', 'notify'],
        output: ['workflowStatus', 'prescriptionSummary', 'servicesStatus', 'bill', 'notificationsSent'],
        safety: 'Never modifies diagnosis, medicines, tests or notes. Preserves all doctor decisions exactly.'
      }
    ]
  }));
});

export default router;
