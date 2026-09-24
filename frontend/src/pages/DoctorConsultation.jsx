import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { tokenService } from '../services/tokenService';
import { visitService } from '../services/visitService';
import { patientService } from '../services/patientService';
import { pharmacyService } from '../services/pharmacyService';
import { testService } from '../services/testService';
import { prescriptionService } from '../services/prescriptionService';
import { agentService } from '../services/agentService';
import { Card, Spinner, Alert, Badge, priorityBadge, statusBadge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

const FREQ_OPTS = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS', 'QW'];

export default function DoctorConsultation() {
  const { token } = useParams();
  const nav = useNavigate();
  const tokenData = useApi(() => tokenService.getByToken(token), true, [token]);
  const [visit, setVisit] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [ai, setAi] = useState(null);
  const [meds, setMeds] = useState([]);
  const [tests, setTests] = useState([]);
  const [medCatalog, setMedCatalog] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [fee, setFee] = useState(500);
  const [saveErr, setSaveErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedRx, setSavedRx] = useState(null);
  const [coordLoading, setCoordLoading] = useState(false);
  const [coordResult, setCoordResult] = useState(null);

  useEffect(() => {
    if (tokenData.data) {
      const t = tokenData.data;
      Promise.all([
        visitService.getById(t.visitId),
        patientService.getById(t.patientId),
        patientService.getVisits(t.patientId),
        pharmacyService.getAllMedicines(),
        testService.getAll()
      ]).then(([v, p, h, mC, tC]) => {
        setVisit(v);
        setPatient(p);
        setHistory(h.visits.filter(x => x.id !== v.id));
        setMedCatalog(mC || []);
        setTestCatalog(tC || []);
        if (v.doctorId && v.visitStatus === 'completed') {
          prescriptionService.getByVisit(v.id).then(rx => {
            setSavedRx(rx);
            setDiagnosis(rx.diagnosis);
            setMeds(rx.medicines);
            setTests(rx.tests);
            setNotes(rx.doctorNotes || '');
            setFee(rx.consultationFee || 0);
          }).catch(() => {});
        }
        if (v.aiStatus === 'completed') {
          agentService.analyzeIntake({ patientId: t.patientId, visitId: t.visitId }).then(a => setAi(a.data || a)).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [tokenData.data]);

  function addMedicine() {
    setMeds(m => [...m, { medicineId: '', name: '', dosage: '', frequency: 'OD', duration: '5 days', quantity: 10, instructions: '' }]);
  }
  function updateMed(i, k, v) { setMeds(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }
  function removeMed(i) { setMeds(m => m.filter((_, idx) => idx !== i)); }
  function onSelectMed(i, medId) {
    const m = medCatalog.find(x => x.id === medId);
    setMeds(arr => arr.map((x, idx) => idx === i ? { ...x, medicineId: medId, name: m?.name || x.name } : x));
  }

  function addTest() { setTests(t => [...t, { testId: '', name: '' }]); }
  function updateTest(i, k, v) { setTests(ts => ts.map((x, idx) => idx === i ? { ...x, [k]: v } : x)); }
  function removeTest(i) { setTests(ts => ts.filter((_, idx) => idx !== i)); }
  function onSelectTest(i, testId) {
    const t = testCatalog.find(x => x.id === testId);
    setTests(arr => arr.map((x, idx) => idx === i ? { ...x, testId, name: t?.name || x.name } : x));
  }

  async function saveAndComplete() {
    setSaveErr('');
    if (!diagnosis.trim()) { setSaveErr('Diagnosis is required'); return; }
    setSaving(true);
    try {
      if (!savedRx) {
        const rx = await prescriptionService.create({
          patientId: patient.id, visitId: visit.id, doctorId: visit.doctorId || 'DOC001',
          diagnosis, medicines: meds, tests, doctorNotes: notes, consultationFee: fee
        });
        setSavedRx(rx);
      } else {
        // in a real system we'd have update; for prototype skip if already saved
      }
      await visitService.updateStatus(visit.id, 'completed');
      await tokenService.updateStatus(token, 'completed');
      setVisit(v => ({ ...v, visitStatus: 'completed' }));
      setCoordLoading(true);
      try {
        const cr = await agentService.coordinateBilling({ patientId: patient.id, visitId: visit.id });
        setCoordResult(cr.data || cr);
      } catch (e) { console.warn('Agent 2 err', e); }
      finally { setCoordLoading(false); }
    } catch (e) { setSaveErr(getErrorMessage(e)); } finally { setSaving(false); }
  }

  if (tokenData.loading) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;
  if (tokenData.error) return <Alert variant="error">Token not found: {getErrorMessage(tokenData.error)}</Alert>;
  if (!visit || !patient) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;

  const t = tokenData.data;
  const isCompleted = visit.visitStatus === 'completed';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/doctor/queue" className="btn btn-ghost">← Queue</Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-mono font-bold text-hospital-700 bg-hospital-50 px-4 py-2 rounded-md border border-hospital-200">{t.token}</div>
              <div>
                <h1 className="text-xl font-bold">{patient.firstName} {patient.lastName}</h1>
                <div className="text-sm text-slate-500 font-mono">{patient.id} · {patient.age}yrs · {patient.gender} · {patient.mobileNumber}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {priorityBadge(visit.priority)}
          <Badge variant="blue">{visit.department}</Badge>
          {statusBadge(visit.visitStatus)}
        </div>
      </div>

      <Alert variant="warn">
        <b>⚠ Doctor is the final clinical authority.</b> AI suggestions are routing/summary only. All information below labeled <b>"Patient-reported"</b>, <b>"AI-generated"</b>, or <b>"Doctor-entered"</b> is clearly distinguished.
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Patient Complaint — Patient-Reported" subtitle="Information exactly as reported. Do not treat AI as clinical source.">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><div className="text-xs text-slate-500">Main Problem</div><div className="font-semibold p-2 bg-slate-50 rounded">{visit.mainProblem}</div></div>
              {visit.symptoms && <div className="col-span-2"><div className="text-xs text-slate-500">Symptoms</div><div className="p-2 bg-slate-50 rounded">{visit.symptoms}</div></div>}
              <div><div className="text-xs text-slate-500">Duration</div><div>{visit.duration || '-'}</div></div>
              <div><div className="text-xs text-slate-500">Severity</div><div><Badge variant={visit.severity === 'Severe' ? 'red' : visit.severity === 'Moderate' ? 'yellow' : 'green'}>{visit.severity}</Badge></div></div>
              <div><div className="text-xs text-slate-500">Allergies</div><div>{visit.allergies}</div></div>
              <div><div className="text-xs text-slate-500">Current Meds</div><div>{visit.currentMedication}</div></div>
              {visit.additionalInformation && <div className="col-span-2"><div className="text-xs text-slate-500">Additional Info</div><div>{visit.additionalInformation}</div></div>}
            </div>
          </Card>

          {ai && (
            <Card title="AI Intake Summary — AI-Generated (NOT a diagnosis)" subtitle="Agent 1 output: routing, priority, summary, missing info detection. For reference only.">
              <Alert variant="info">
                <div className="font-semibold">Labels:</div>
                <div className="text-xs mt-1">• <b>AI Suggested Department:</b> <span className="font-bold text-hospital-700">{ai.suggestedDepartment}</span> · <b>Priority:</b> {ai.priority}</div>
                <div className="text-xs mt-1">• Never labeled as "AI Diagnosis". Doctor retains final authority.</div>
              </Alert>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-500 mb-1">AI Intake Summary</div><div className="text-sm p-3 bg-slate-50 border rounded">{ai.summary}</div></div>
                <div><div className="text-xs text-slate-500 mb-1">Reasoning / Rationale</div><div className="text-sm p-3 bg-slate-50 border rounded">{ai.reason}</div></div>
              </div>
              {ai.followUpQuestions && ai.followUpQuestions.length > 0 && (
                <div className="mt-3"><div className="text-xs text-slate-500 mb-1">AI Suggested Follow-up Questions (Optional)</div>
                  <ul className="text-sm list-disc pl-5">{ai.followUpQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
              )}
              {ai.requiresHumanReview && <div className="mt-3 text-red-700 bg-red-50 border border-red-200 p-2 rounded text-sm">⚠ Priority Review Required per AI analysis</div>}
            </Card>
          )}

          <Card title="Doctor Assessment & Prescription — Doctor-Entered (FINAL)" subtitle="Doctor makes all clinical decisions">
            <div className="space-y-4">
              <div>
                <label className="label">Final Diagnosis *</label>
                <textarea required rows="2" className="input" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter clinical diagnosis..." disabled={isCompleted && !!savedRx} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">💊 Medicines ({meds.length})</label>
                  <button className="btn btn-secondary text-xs" type="button" onClick={addMedicine} disabled={isCompleted && !!savedRx}>➕ Add Medicine</button>
                </div>
                {meds.length === 0 && <div className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded border border-dashed">No medicines prescribed</div>}
                <div className="space-y-2">
                  {meds.map((m, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 border border-slate-200 rounded-md bg-white">
                      <div className="col-span-4"><select className="input text-xs" value={m.medicineId} onChange={e => onSelectMed(i, e.target.value)} disabled={isCompleted && !!savedRx}><option value="">Select...</option>{medCatalog.map(x => <option key={x.id} value={x.id}>{x.name} (₹{x.price})</option>)}</select></div>
                      <div className="col-span-2"><input className="input text-xs" placeholder="Dosage" value={m.dosage} onChange={e => updateMed(i, 'dosage', e.target.value)} disabled={isCompleted && !!savedRx} /></div>
                      <div className="col-span-2"><select className="input text-xs" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)} disabled={isCompleted && !!savedRx}>{FREQ_OPTS.map(f => <option key={f}>{f}</option>)}</select></div>
                      <div className="col-span-2"><input className="input text-xs" placeholder="Duration" value={m.duration} onChange={e => updateMed(i, 'duration', e.target.value)} disabled={isCompleted && !!savedRx} /></div>
                      <div className="col-span-1"><input className="input text-xs" type="number" min="1" placeholder="Qty" value={m.quantity} onChange={e => updateMed(i, 'quantity', e.target.value)} disabled={isCompleted && !!savedRx} /></div>
                      <div className="col-span-1 flex items-end justify-end">{!isCompleted && <button className="btn btn-danger text-xs px-2 py-1" onClick={() => removeMed(i)}>✕</button>}</div>
                      <div className="col-span-12"><input className="input text-xs" placeholder="Instructions (e.g. After food, At bedtime...)" value={m.instructions} onChange={e => updateMed(i, 'instructions', e.target.value)} disabled={isCompleted && !!savedRx} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">🧪 Lab Tests ({tests.length})</label>
                  <button className="btn btn-secondary text-xs" type="button" onClick={addTest} disabled={isCompleted && !!savedRx}>➕ Add Test</button>
                </div>
                {tests.length === 0 && <div className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded border border-dashed">No tests prescribed</div>}
                <div className="space-y-2">
                  {tests.map((tx, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-md">
                      <div className="col-span-10"><select className="input text-xs" value={tx.testId} onChange={e => onSelectTest(i, e.target.value)} disabled={isCompleted && !!savedRx}><option value="">Select test...</option>{testCatalog.map(x => <option key={x.id} value={x.id}>{x.name} (₹{x.price})</option>)}</select></div>
                      <div className="col-span-2 text-right">{!isCompleted && <button className="btn btn-danger text-xs px-2 py-1" onClick={() => removeTest(i)}>Remove</button>}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label">Consultation Fee (₹)</label><input className="input" type="number" min="0" value={fee} onChange={e => setFee(Number(e.target.value))} disabled={isCompleted && !!savedRx} /></div>
              </div>
              <div><label className="label">Doctor Notes</label><textarea rows="2" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instructions, advice, etc." disabled={isCompleted && !!savedRx} /></div>

              {saveErr && <Alert variant="error">{saveErr}</Alert>}
              {savedRx && <Alert variant="success">✅ Prescription saved and visit marked completed.</Alert>}
              {coordLoading && <Alert variant="info">🧭 Running Agent 2 Billing Coordinator...</Alert>}
              {coordResult && <Alert variant="success">🧭 Agent 2 complete. Workflow: {coordResult.workflowStatus}. Bill total: {coordResult.bill?.total ? inr(coordResult.bill.total) : 'pending'}</Alert>}

              <div className="flex gap-2 justify-end">
                <Link to={`/visits/${visit.id}`} className="btn btn-secondary">View Visit</Link>
                {!savedRx ? (
                  <button className="btn btn-primary px-6" onClick={saveAndComplete} disabled={saving}>
                    {saving ? <><Spinner /> Saving...</> : '💾 Save Prescription & Complete Visit'}
                  </button>
                ) : (
                  <button className="btn btn-primary px-6" onClick={async () => {
                    setCoordLoading(true);
                    try { const cr = await agentService.coordinateBilling({ patientId: patient.id, visitId: visit.id }); setCoordResult(cr.data || cr); }
                    finally { setCoordLoading(false); }
                  }} disabled={coordLoading}>
                    {coordLoading ? <><Spinner /> Running...</> : '🧭 Re-run Billing Coordinator (Agent 2)'}
                  </button>
                )}
                {coordResult?.bill?.id && <Link to={`/bills/${coordResult.bill.id}`} className="btn btn-primary">View Bill →</Link>}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Patient Info" className="sticky top-20">
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">P_ID</dt><dd className="font-mono font-semibold">{patient.id}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium">{patient.firstName} {patient.lastName}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Gender/Age</dt><dd>{patient.gender} · {patient.age} yrs</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Weight</dt><dd>{patient.weight || '-'} kg</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Mobile</dt><dd>{patient.mobileNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Registered</dt><dd>{formatDateTime(patient.createdAt)}</dd></div>
              {patient.address && <div><dt className="text-slate-500">Address</dt><dd className="font-medium">{patient.address}</dd></div>}
            </dl>
          </Card>

          <Card title={`Previous Visits (${history.length})`} subtitle="History visible to doctor">
            {history.length === 0 ? <div className="text-sm text-slate-400 italic">No previous visits</div> : (
              <div className="space-y-2 max-h-96 overflow-auto pr-1">
                {history.slice(0, 8).map(hv => (
                  <div key={hv.id} className="p-2 border border-slate-200 rounded-md text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-hospital-700 text-xs">{hv.id}</span>
                      {statusBadge(hv.visitStatus)}
                    </div>
                    <div className="text-xs text-slate-500">{formatDateTime(hv.visitDate)} · {hv.department}</div>
                    <div className="text-sm font-medium mt-1">{hv.mainProblem}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {coordResult && (
            <Card title="Workflow Summary (Agent 2)" subtitle="Medicines, tests, billing status">
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">Status</span><b>{coordResult.workflowStatus}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">Meds dispensed</span>{coordResult.servicesStatus?.medicines?.dispensed}/{coordResult.servicesStatus?.medicines?.total}</div>
                <div className="flex justify-between"><span className="text-slate-500">Tests confirmed</span>{coordResult.servicesStatus?.tests?.confirmed}/{coordResult.servicesStatus?.tests?.total}</div>
                {coordResult.bill?.id && <>
                  <hr className="my-2" />
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span>{inr(coordResult.bill.subtotal)}</div>
                  <div className="flex justify-between"><span className="text-slate-500">GST</span>{inr(coordResult.bill.gstTotal)}</div>
                  <div className="flex justify-between text-base"><b>Total</b><b>{inr(coordResult.bill.total)}</b></div>
                  <div className="flex justify-between mt-1">{coordResult.bill.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Payment Pending</Badge>}</div>
                </>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
