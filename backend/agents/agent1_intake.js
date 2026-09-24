import { callTool } from '../tools/agentTools.js';

const DEPT_KEYWORDS = {
  'General Medicine': ['fever', 'cough', 'cold', 'sore throat', 'headache', 'body pain', 'diarrhea', 'vomiting', 'stomach pain', 'general', 'weakness', 'fatigue', 'chills'],
  'ENT': ['ear', 'nose', 'throat', 'hearing', 'sinus', 'sneezing', 'snoring', 'hoarse voice', 'tinnitus'],
  'Gynecology': ['pregnancy', 'periods', 'menstrual', 'vaginal', 'breast', 'pelvic', 'ovary', 'uterus', 'pms', 'menopause'],
  'Pediatrics': ['child', 'baby', 'infant', 'newborn', 'kid', 'toddler', 'teen'],
  'Dermatology': ['skin', 'rash', 'itching', 'acne', 'eczema', 'psoriasis', 'hair', 'dandruff', 'nail', 'allergy skin'],
  'Orthopedics': ['bone', 'joint', 'back pain', 'knee', 'shoulder', 'fracture', 'sprain', 'arthritis', 'neck pain', 'muscle'],
  'Cardiology': ['chest', 'heart', 'palpitation', 'blood pressure', 'hypertension', 'breathing', 'shortness of breath', 'angina', 'cardiac']
};

const PRIORITY_FLAG_SYMPTOMS = [
  'breathing difficulty', 'chest discomfort', 'chest pain', 'severe',
  'blood', 'unconscious', 'stroke', 'paralysis', 'heart attack',
  'high fever', 'persistent vomiting', 'dehydration'
];

function matchKeywords(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()));
}

function scoreDepartments(symptomsText, age, reportedSymptoms = {}) {
  const scores = {};
  let text = symptomsText;
  if (reportedSymptoms) {
    for (const [k, v] of Object.entries(reportedSymptoms)) {
      if (v === true) {
        text += ' ' + k.replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    }
    if (reportedSymptoms.other) text += ' ' + reportedSymptoms.other;
  }

  for (const [dept, keywords] of Object.entries(DEPT_KEYWORDS)) {
    const matches = matchKeywords(text, keywords);
    scores[dept] = matches.length;
  }

  if (age && age < 14) {
    scores['Pediatrics'] = (scores['Pediatrics'] || 0) + 2;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted;
}

function assessPriority(symptomsText, severity, reportedSymptoms = {}) {
  let text = symptomsText + ' ' + (severity || '');
  if (reportedSymptoms) {
    for (const [k, v] of Object.entries(reportedSymptoms)) {
      if (v === true) {
        text += ' ' + k.replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    }
    if (reportedSymptoms.other) text += ' ' + reportedSymptoms.other;
  }
  const lower = text.toLowerCase();
  const flags = PRIORITY_FLAG_SYMPTOMS.filter(f => lower.includes(f));

  let priority = 'routine';
  let requiresHumanReview = false;
  let reviewReason = null;

  if (severity === 'Severe') {
    priority = 'priority review';
    requiresHumanReview = true;
    reviewReason = 'Patient reported severe symptoms';
  }

  if (flags.length >= 2) {
    priority = 'priority review';
    requiresHumanReview = true;
    reviewReason = reviewReason || `Concerning symptoms detected: ${flags.join(', ')}`;
  }

  if (reportedSymptoms && (reportedSymptoms.breathingDifficulty || reportedSymptoms.chestDiscomfort)) {
    priority = 'priority review';
    requiresHumanReview = true;
    reviewReason = reviewReason || 'Cardiorespiratory symptoms require immediate clinical review';
  }

  return { priority, requiresHumanReview, reviewReason, flags };
}

function extractReportedSymptomsList(reportedSymptoms, mainProblem, symptomsField) {
  const list = [];
  const labelMap = {
    fever: 'Fever', cough: 'Cough', cold: 'Cold/Runny nose',
    soreThroat: 'Sore throat', headache: 'Headache', bodyPain: 'Body pain',
    stomachPain: 'Stomach pain', vomiting: 'Vomiting', diarrhea: 'Diarrhea',
    dizziness: 'Dizziness', breathingDifficulty: 'Breathing difficulty',
    chestDiscomfort: 'Chest discomfort', skinProblem: 'Skin problem'
  };
  if (reportedSymptoms) {
    for (const [k, v] of Object.entries(reportedSymptoms)) {
      if (v === true && labelMap[k]) list.push(labelMap[k]);
    }
    if (reportedSymptoms.other) list.push(`Other: ${reportedSymptoms.other}`);
  }
  if (symptomsField && list.length === 0) {
    const parts = String(symptomsField).split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    list.push(...parts);
  }
  if (list.length === 0 && mainProblem) list.push(mainProblem);
  return list;
}

export async function agent1AnalyzeIntake({ patientId, visitId, mobile }) {
  const trace = [];
  trace.push({ step: 'init', timestamp: new Date().toISOString(), patientId, visitId });

  const patientLookup = await callTool('lookupPatient', { patientId, mobile });
  trace.push({ step: 'tool_call:lookupPatient', params: { patientId, mobile }, result: patientLookup.success ? 'found' : 'not_found', data: patientLookup });

  const patient = patientLookup.success ? patientLookup.data : null;
  let historyData = null;
  if (patient && patient.id) {
    const historyLookup = await callTool('getPatientHistory', { patientId: patient.id });
    trace.push({ step: 'tool_call:getPatientHistory', params: { patientId: patient.id }, result: historyLookup.success ? 'ok' : 'error', data: historyLookup });
    historyData = historyLookup.success ? historyLookup.data : null;
  }

  const deptDir = await callTool('getDepartmentDirectory', {});
  trace.push({ step: 'tool_call:getDepartmentDirectory', result: deptDir.success ? 'ok' : 'error' });

  const visitLookup = visitId ? await callTool('getVisit', { visitId }) : { success: false };
  trace.push({ step: 'tool_call:getVisit', params: { visitId }, result: visitLookup.success ? 'ok' : 'none' });

  const visit = visitLookup.success ? visitLookup.data.visit : null;
  const effectivePatient = patient || (visitLookup.success ? visitLookup.data.patient : null);

  if (!effectivePatient) {
    return {
      success: false,
      error: { code: 'PATIENT_REQUIRED', message: 'Patient not found. Patient data required for analysis.' },
      trace
    };
  }

  const mainProblem = (visit && visit.mainProblem) || '';
  const symptomsField = (visit && visit.symptoms) || '';
  const reportedSymptoms = (visit && visit.reportedSymptoms) || {};
  const severity = (visit && visit.severity) || 'Mild';
  const previousOccurrence = (visit && visit.previousOccurrence) || 'No';
  const allergies = (visit && visit.allergies) || 'No known allergies';
  const currentMedication = (visit && visit.currentMedication) || 'None';
  const additionalInfo = (visit && visit.additionalInformation) || '';
  const age = effectivePatient.age;

  const reportedSymptomsList = extractReportedSymptomsList(reportedSymptoms, mainProblem, symptomsField);
  const combinedText = `${mainProblem} ${symptomsField} ${allergies} ${currentMedication} ${additionalInfo}`;

  const deptScores = scoreDepartments(combinedText, age, reportedSymptoms);
  const suggestedDepartment = deptScores[0][1] > 0 ? deptScores[0][0] : 'General Medicine';
  const altDepartments = deptScores.filter(([, s], i) => i > 0 && s > 0 && s === deptScores[0][1]).map(([d]) => d);

  const priorityResult = assessPriority(combinedText, severity, reportedSymptoms);

  const missingInfo = [];
  if (!mainProblem) missingInfo.push('Main problem/complaint');
  if (reportedSymptomsList.length === 0) missingInfo.push('Specific symptoms checklist');
  if (severity === '' || !severity) missingInfo.push('Severity level');
  if (!currentMedication) missingInfo.push('Current medication status');
  if (!previousOccurrence) missingInfo.push('Previous occurrence history');
  if (!allergies) missingInfo.push('Allergy information');

  const followUpQuestions = [];
  if (!severity || severity === '') {
    followUpQuestions.push('How severe are the symptoms on a scale of Mild/Moderate/Severe?');
  }
  if (allergies && allergies.toLowerCase().includes('not sure')) {
    followUpQuestions.push('Can you recall any previous reactions to medicines or foods?');
  }
  if (previousOccurrence && previousOccurrence.toLowerCase() === 'yes') {
    followUpQuestions.push('When did these symptoms last occur and what was the diagnosis/treatment?');
  }
  if (reportedSymptoms && reportedSymptoms.fever) {
    followUpQuestions.push('What was the highest temperature recorded?');
  }
  if (priorityResult.flags.includes('breathing difficulty') || priorityResult.flags.includes('chest discomfort')) {
    followUpQuestions.push('How long have you had chest discomfort or breathing difficulty? Does it worsen with activity?');
  }
  if (reportedSymptoms && reportedSymptoms.vomiting && reportedSymptoms.diarrhea) {
    followUpQuestions.push('Have you noticed signs of dehydration (dry mouth, decreased urine output)?');
  }

  const historySummary = historyData ? {
    visitsCount: historyData.visitCount,
    completedVisits: historyData.completedCount,
    lastVisit: historyData.visits.length > 0 ? {
      date: historyData.visits[0].date,
      mainProblem: historyData.visits[0].mainProblem,
      department: historyData.visits[0].department,
      diagnosis: historyData.visits[0].diagnosis
    } : null,
    relevantHistory: historyData.visits.filter(v => {
      if (!v.department) return false;
      const relevantDepts = [suggestedDepartment, ...altDepartments];
      return relevantDepts.includes(v.department);
    }).map(v => ({
      date: v.date,
      problem: v.mainProblem,
      department: v.department,
      diagnosis: v.diagnosis
    }))
  } : null;

  const reasons = [];
  const topKeywords = matchKeywords(combinedText, DEPT_KEYWORDS[suggestedDepartment] || []);
  if (topKeywords.length > 0) reasons.push(`Reported symptoms (${topKeywords.join(', ')}) align with ${suggestedDepartment}.`);
  if (altDepartments.length > 0) reasons.push(`Alternative departments considered: ${altDepartments.join(', ')}.`);
  if (historySummary && historySummary.lastVisit && historySummary.lastVisit.department === suggestedDepartment) {
    reasons.push(`Previous visit history also in ${suggestedDepartment}.`);
  }
  if (age < 14 && suggestedDepartment === 'Pediatrics') reasons.push('Patient age falls within pediatric range.');
  reasons.push('Final clinical determination to be made by attending physician.');

  const summary = [
    `Patient ${effectivePatient.firstName} ${effectivePatient.lastName} (${effectivePatient.id}, ${effectivePatient.age}yrs)`,
    reportedSymptomsList.length > 0 ? `Presented with: ${reportedSymptomsList.join(', ')}.` : 'Patient-reported symptoms being collected.',
    severity ? `Severity reported: ${severity}.` : '',
    allergies ? `Allergies: ${allergies}.` : '',
    currentMedication ? `Current medication: ${currentMedication}.` : '',
    historySummary && historySummary.visitCount > 0 ? `${historySummary.visitCount} prior visit(s) on record. Last visit for: ${historySummary.lastVisit ? historySummary.lastVisit.mainProblem : 'N/A'}.` : 'No prior visit history.',
    `AI suggestion routed for ${suggestedDepartment} evaluation with priority: ${priorityResult.priority}.`
  ].filter(Boolean).join(' ');

  const output = {
    patientId: effectivePatient.id,
    visitId: visitId || null,
    suggestedDepartment,
    priority: priorityResult.priority,
    reason: reasons.join(' '),
    summary,
    reportedSymptoms: reportedSymptomsList,
    relevantHistory: historySummary ? historySummary.relevantHistory : [],
    missingInformation: missingInfo,
    followUpQuestions,
    requiresHumanReview: priorityResult.requiresHumanReview,
    humanReviewReason: priorityResult.reviewReason,
    alternativeDepartments: altDepartments,
    departmentScores: Object.fromEntries(deptScores),
    aiStatus: 'completed'
  };

  trace.push({ step: 'analysis_complete', timestamp: new Date().toISOString(), output });

  return {
    success: true,
    data: output,
    message: 'Agent 1 intake analysis complete. AI does not diagnose. Doctor retains final clinical authority.',
    trace,
    safetyDisclaimer: 'This is an AI-assisted routing/summary. Not a diagnosis. Not a medical emergency declaration. All clinical decisions rest with the attending physician.'
  };
}
