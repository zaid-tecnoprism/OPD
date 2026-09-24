import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { visitService } from '../services/visitService';
import { departmentService } from '../services/departmentService';
import { tokenService } from '../services/tokenService';
import { agentService } from '../services/agentService';
import { Card, Spinner, Alert, Badge, priorityBadge } from '../components/UI';
import { getErrorMessage } from '../utils/format';

const SYMPTOM_KEYS = [
  ['fever', 'Fever'], ['cough', 'Cough'], ['cold', 'Cold/Runny nose'], ['soreThroat', 'Sore throat'],
  ['headache', 'Headache'], ['bodyPain', 'Body pain'], ['stomachPain', 'Stomach pain'], ['vomiting', 'Vomiting'],
  ['diarrhea', 'Diarrhea'], ['dizziness', 'Dizziness'], ['breathingDifficulty', 'Breathing difficulty'],
  ['chestDiscomfort', 'Chest discomfort'], ['skinProblem', 'Skin problem']
];

export default function NewPatientFlow() {
  const nav = useNavigate();
  const loc = useLocation();
  const existingPatient = loc.state?.patient;
  const [step, setStep] = useState(existingPatient ? 2 : 1);

  const [registered, setRegistered] = useState(!!existingPatient);
  const [searchType, setSearchType] = useState('id');
  const [searchVal, setSearchVal] = useState('');
  const [searchErr, setSearchErr] = useState('');

  const [patientForm, setPatientForm] = useState(existingPatient || {
    firstName: '', lastName: '', gender: 'Male', age: '', weight: '',
    mobileNumber: '', email: '', address: ''
  });
  const [regError, setRegError] = useState('');

  const depts = useApi(() => departmentService.getAll(), true, []);

  const [symptoms, setSymptoms] = useState({
    mainProblem: '', duration: '', severity: 'Mild',
    previousOccurrence: 'No', allergies: 'No', allergiesDetails: '',
    currentMedication: 'No', medicationDetails: '', additionalInformation: '',
    reportedSymptoms: {}, other: ''
  });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [symErr, setSymErr] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  function handleSearch() {
    setSearchErr('');
    const prom = searchType === 'id'
      ? patientService.getById(searchVal.toUpperCase().trim())
      : patientService.getByMobile(searchVal.trim());
    prom.then(p => {
      setPatientForm(p);
      setRegistered(true);
      setStep(2);
    }).catch(err => setSearchErr(getErrorMessage(err)));
  }

  function registerPatient(e) {
    e.preventDefault();
    setRegError('');
    patientService.create(patientForm).then(p => {
      setPatientForm(p);
      setRegistered(true);
      setStep(2);
    }).catch(err => setRegError(getErrorMessage(err)));
  }

  function toggleSymptom(k) {
    setSymptoms(s => ({ ...s, reportedSymptoms: { ...s.reportedSymptoms, [k]: !s.reportedSymptoms[k] } }));
  }

  async function runAgentAndSubmit(e) {
    e.preventDefault();
    setSymErr('');
    if (!symptoms.mainProblem.trim()) { setSymErr('Main problem is required'); return; }

    setSubmitLoading(true);
    try {
      const reportedSymptoms = { ...symptoms.reportedSymptoms, other: symptoms.other };
      const deptScores = {};
      let guessDept = symptoms.department || (depts.data && depts.data[0]?.name) || 'General Medicine';
      if (reportedSymptoms.chestDiscomfort || reportedSymptoms.breathingDifficulty) guessDept = 'Cardiology';
      else if (reportedSymptoms.skinProblem) guessDept = 'Dermatology';
      else if (reportedSymptoms.stomachPain || reportedSymptoms.vomiting || reportedSymptoms.diarrhea) guessDept = 'General Medicine';

      const visitPayload = {
        patientId: patientForm.id,
        mainProblem: symptoms.mainProblem,
        symptoms: Object.entries(reportedSymptoms).filter(([, v]) => v === true).map(([k]) => k).join(', ') + (symptoms.other ? ', ' + symptoms.other : ''),
        duration: symptoms.duration,
        severity: symptoms.severity,
        previousOccurrence: symptoms.previousOccurrence,
        allergies: symptoms.allergies + (symptoms.allergiesDetails ? ' - ' + symptoms.allergiesDetails : ''),
        currentMedication: symptoms.currentMedication + (symptoms.medicationDetails ? ' - ' + symptoms.medicationDetails : ''),
        additionalInformation: symptoms.additionalInformation,
        department: guessDept,
        reportedSymptoms
      };

      const visit = await visitService.create(visitPayload);
      const visitId = visit.id;

      setAiLoading(true);
      let analysis = null;
      try {
        analysis = await agentService.analyzeIntake({ patientId: patientForm.id, visitId });
        analysis = analysis.data || analysis;
      } catch (err) {
        console.warn('Agent 1 analysis failed, using fallback', err);
      }

      setAiResult(analysis);

      let finalDept = guessDept;
      let finalPriority = 'routine';
      if (analysis) {
        finalDept = analysis.suggestedDepartment || finalDept;
        finalPriority = analysis.priority || finalPriority;
        if (analysis.requiresHumanReview && finalPriority === 'routine') finalPriority = 'priority review';
      }

      await visitService.update(visitId, {
        department: finalDept,
        priority: finalPriority,
        aiStatus: analysis ? 'completed' : 'fallback'
      });

      const token = await tokenService.create({
        patientId: patientForm.id,
        visitId,
        department: finalDept,
        priority: finalPriority
      });

      setSubmitLoading(false);
      nav(`/visits/${visitId}`, { state: { token, analysis } });
    } catch (err) {
      setSubmitLoading(false);
      setSymErr(getErrorMessage(err));
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/patients" className="btn btn-ghost">← Back to Patients</Link>
        <h1 className="text-xl font-bold">Patient Registration & Intake</h1>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={step >= 1 ? 'green' : 'gray'}>Step 1: Patient</Badge>
          <span className="text-slate-300">→</span>
          <Badge variant={step >= 2 ? 'green' : 'gray'}>Step 2: Symptoms</Badge>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <Card title="Is patient already registered?">
            <div className="flex gap-4 mb-6">
              <button className={`btn ${registered ? 'btn-primary' : 'btn-secondary'} flex-1 py-3`} onClick={() => setRegistered(true)}>✅ YES, patient exists</button>
              <button className={`btn ${!registered ? 'btn-primary' : 'btn-secondary'} flex-1 py-3`} onClick={() => setRegistered(false)}>❌ NO, new registration</button>
            </div>

            {registered && (
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="label">Search by</label>
                    <select className="input" value={searchType} onChange={e => setSearchType(e.target.value)}>
                      <option value="id">P_ID</option>
                      <option value="mobile">Mobile Number</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="label">Value</label>
                    <input className="input" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder={searchType === 'id' ? 'e.g. P001' : 'e.g. 9876543210'} />
                  </div>
                  <div>
                    <button className="btn btn-primary w-full" onClick={handleSearch} disabled={!searchVal}>🔍 Search & Load</button>
                  </div>
                </div>
                {searchErr && <Alert variant="error">{searchErr}</Alert>}
              </div>
            )}

            {!registered && (
              <form onSubmit={registerPatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="field"><label className="label">First Name *</label><input required className="input" value={patientForm.firstName} onChange={e => setPatientForm({ ...patientForm, firstName: e.target.value })} /></div>
                <div className="field"><label className="label">Last Name *</label><input required className="input" value={patientForm.lastName} onChange={e => setPatientForm({ ...patientForm, lastName: e.target.value })} /></div>
                <div className="field"><label className="label">Gender *</label>
                  <select className="input" value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="field"><label className="label">Age *</label><input required type="number" min="0" className="input" value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} /></div>
                  <div className="field"><label className="label">Weight (kg)</label><input type="number" step="0.1" className="input" value={patientForm.weight} onChange={e => setPatientForm({ ...patientForm, weight: e.target.value })} /></div>
                </div>
                <div className="field"><label className="label">Mobile Number *</label><input required className="input" value={patientForm.mobileNumber} onChange={e => setPatientForm({ ...patientForm, mobileNumber: e.target.value })} /></div>
                <div className="field"><label className="label">Email</label><input type="email" className="input" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value })} /></div>
                <div className="field md:col-span-2"><label className="label">Address</label><textarea rows="2" className="input" value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} /></div>
                {regError && <div className="md:col-span-2"><Alert variant="error">{regError}</Alert></div>}
                <div className="md:col-span-2 flex gap-3 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Skip (demo only)</button>
                  <button type="submit" className="btn btn-primary">Register & Continue →</button>
                </div>
              </form>
            )}

            {registered && patientForm.id && (
              <div className="mt-6 p-4 border border-green-200 rounded-lg bg-green-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-900">{patientForm.firstName} {patientForm.lastName}</div>
                    <div className="text-xs text-green-700"><span className="font-mono bg-white px-2 py-0.5 rounded">{patientForm.id}</span> · {patientForm.gender} · {patientForm.age} yrs · {patientForm.mobileNumber}</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => setStep(2)}>Continue to Symptoms →</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={runAgentAndSubmit} className="space-y-6">
          <Card title="Patient Details" subtitle="Confirm patient information before intake">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-slate-500">P_ID</div><div className="font-semibold font-mono">{patientForm.id}</div></div>
              <div><div className="text-xs text-slate-500">Name</div><div className="font-semibold">{patientForm.firstName} {patientForm.lastName}</div></div>
              <div><div className="text-xs text-slate-500">Gender / Age</div><div className="font-semibold">{patientForm.gender} · {patientForm.age} yrs</div></div>
              <div><div className="text-xs text-slate-500">Mobile</div><div className="font-semibold">{patientForm.mobileNumber}</div></div>
            </div>
            <div className="mt-3"><button type="button" className="text-xs text-hospital-700 hover:underline" onClick={() => setStep(1)}>← Change patient</button></div>
          </Card>

          <Card title="Symptoms & Complaint" subtitle="Patient-reported information (preserved exactly)">
            <div className="field">
              <label className="label">Main Problem / Chief Complaint *</label>
              <textarea rows="2" required className="input" value={symptoms.mainProblem} onChange={e => setSymptoms({ ...symptoms, mainProblem: e.target.value })} placeholder="e.g. Fever and headache since last night" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="field"><label className="label">Duration / When did it start?</label><input className="input" value={symptoms.duration} onChange={e => setSymptoms({ ...symptoms, duration: e.target.value })} placeholder="e.g. 2 days, since last night, 1 week" /></div>
              <div className="field"><label className="label">Severity</label>
                <select className="input" value={symptoms.severity} onChange={e => setSymptoms({ ...symptoms, severity: e.target.value })}>
                  <option>Mild</option><option>Moderate</option><option>Severe</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="label mb-2">Check all applicable symptoms:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SYMPTOM_KEYS.map(([k, label]) => (
                  <label key={k} className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer transition ${symptoms.reportedSymptoms[k] ? 'bg-hospital-50 border-hospital-500 text-hospital-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={!!symptoms.reportedSymptoms[k]} onChange={() => toggleSymptom(k)} className="h-4 w-4" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="field mt-4"><label className="label">Other symptoms (if any)</label><input className="input" value={symptoms.other} onChange={e => setSymptoms({ ...symptoms, other: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="field">
                <label className="label">Experienced before?</label>
                <select className="input" value={symptoms.previousOccurrence} onChange={e => setSymptoms({ ...symptoms, previousOccurrence: e.target.value })}>
                  <option>No</option><option>Yes</option><option>Not sure</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Known allergies?</label>
                <select className="input" value={symptoms.allergies} onChange={e => setSymptoms({ ...symptoms, allergies: e.target.value })}>
                  <option>No</option><option>Yes</option><option>Not sure</option>
                </select>
                {(symptoms.allergies === 'Yes' || symptoms.allergies === 'Not sure') && (
                  <input className="input mt-2" placeholder="Allergy details" value={symptoms.allergiesDetails} onChange={e => setSymptoms({ ...symptoms, allergiesDetails: e.target.value })} />
                )}
              </div>
              <div className="field md:col-span-2">
                <label className="label">Current medication?</label>
                <div className="flex gap-2">
                  <select className="input flex-shrink-0 w-40" value={symptoms.currentMedication} onChange={e => setSymptoms({ ...symptoms, currentMedication: e.target.value })}>
                    <option>No</option><option>Yes</option>
                  </select>
                  <input className="input" placeholder="Medication details" value={symptoms.medicationDetails} onChange={e => setSymptoms({ ...symptoms, medicationDetails: e.target.value })} disabled={symptoms.currentMedication === 'No'} />
                </div>
              </div>
              <div className="field md:col-span-2">
                <label className="label">Additional information</label>
                <textarea rows="2" className="input" value={symptoms.additionalInformation} onChange={e => setSymptoms({ ...symptoms, additionalInformation: e.target.value })} />
              </div>
            </div>
          </Card>

          {aiResult && (
            <Card title="AI Intake Summary" subtitle="Agent 1 analysis — AI does NOT diagnose. Doctor retains final clinical authority.">
              <Alert variant="info">
                <div className="font-semibold">Safety Notice</div>
                <div className="text-xs mt-1">This is an AI-assisted routing/summary. Not a diagnosis, not an emergency declaration. All clinical decisions rest with the attending physician.</div>
              </Alert>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">AI Suggested Department</div>
                  <div className="font-bold text-hospital-700 text-lg">{aiResult.suggestedDepartment || '-'}</div>
                  {aiResult.alternativeDepartments && aiResult.alternativeDepartments.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">Also considered: {aiResult.alternativeDepartments.join(', ')}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Priority / Review</div>
                  <div>{priorityBadge(aiResult.priority)} {aiResult.requiresHumanReview && <Badge variant="red">Priority Review Required</Badge>}</div>
                </div>
              </div>
              <div className="mt-4"><div className="text-xs text-slate-500 mb-1">AI Intake Summary</div><div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">{aiResult.summary}</div></div>
              <div className="mt-3"><div className="text-xs text-slate-500 mb-1">Reasoning</div><div className="text-sm">{aiResult.reason}</div></div>
              {aiResult.followUpQuestions && aiResult.followUpQuestions.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1">Suggested follow-up questions:</div>
                  <ul className="text-sm space-y-1 list-disc pl-5 text-slate-700">{aiResult.followUpQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
              )}
              {aiResult.missingInformation && aiResult.missingInformation.length > 0 && (
                <div className="mt-3"><div className="text-xs text-slate-500 mb-1">Missing information noted:</div><div className="text-sm">{aiResult.missingInformation.join(' · ')}</div></div>
              )}
            </Card>
          )}

          {symErr && <Alert variant="error">{symErr}</Alert>}

          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button type="submit" className="btn btn-primary px-6 py-2.5" disabled={submitLoading || aiLoading}>
              {aiLoading || submitLoading ? <div className="flex items-center gap-2"><Spinner /> Analyzing & Creating Visit...</div> : 'Submit Intake → Run AI Analysis → Generate Token'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
