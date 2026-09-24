import { useState, useEffect } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { visitService } from '../services/visitService';
import { patientService } from '../services/patientService';
import { prescriptionService } from '../services/prescriptionService';
import { tokenService } from '../services/tokenService';
import { billingService } from '../services/billingService';
import { agentService } from '../services/agentService';
import { Card, Spinner, Alert, Badge, priorityBadge, statusBadge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function VisitDetail() {
  const { id } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const token = loc.state?.token;
  const analysis = loc.state?.analysis;
  const [coordinationResult, setCoordinationResult] = useState(null);
  const [coordLoading, setCoordLoading] = useState(false);

  const visit = useApi(() => visitService.getById(id), true, [id]);
  const prescription = useApi(() => prescriptionService.getByVisit(id), true, [id]);
  const [history, setHistory] = useState(null);
  const [ai, setAi] = useState(analysis || null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (visit.data?.patientId) {
      patientService.getVisits(visit.data.patientId).then(r => setHistory(r)).catch(() => {});
    }
  }, [visit.data?.patientId]);

  async function runAI() {
    setAiLoading(true);
    try {
      const r = await agentService.analyzeIntake({ patientId: visit.data.patientId, visitId: id });
      setAi(r.data || r);
    } finally { setAiLoading(false); }
  }

  async function runCoordination() {
    setCoordLoading(true);
    try {
      const r = await agentService.coordinateBilling({ patientId: visit.data.patientId, visitId: id });
      setCoordinationResult(r.data || r);
    } finally { setCoordLoading(false); }
  }

  if (visit.loading) return <div className="flex justify-center py-20"><Spinner size="md" /></div>;
  if (visit.error) return <Alert variant="error">{getErrorMessage(visit.error)}</Alert>;

  const v = visit.data;
  const p = v.patient;
  const rx = prescription.data || null;
  const priorVisits = (history?.visits || []).filter(x => x.id !== id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/patients/${p?.id}`} className="btn btn-ghost">← Patient</Link>
          <div>
            <h1 className="text-xl font-bold">Visit {v.id}</h1>
            <div className="text-sm text-slate-500">{formatDateTime(v.visitDate)} · <Badge variant="green">{v.department}</Badge> {priorityBadge(v.priority)} {statusBadge(v.visitStatus)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          {v.visitStatus === 'completed' && <button className="btn btn-secondary" onClick={runCoordination} disabled={coordLoading}>{coordLoading ? <Spinner /> : '🧭 Run Billing Coordinator (Agent 2)'}</button>}
          <Link to={`/doctor/consultation/${v.token || ''}`} className="btn btn-primary" disabled={!v.token}>🩺 Open Consultation</Link>
        </div>
      </div>

      {token && (
        <Alert variant="success">
          ✅ Token generated: <span className="font-mono font-bold text-green-900">{token.token}</span> — assigned to {v.department} · Doctor: {token.doctorId}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Patient" className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-hospital-100 flex items-center justify-center text-xl font-bold text-hospital-700">{p?.firstName?.[0]}{p?.lastName?.[0]}</div>
            <div>
              <Link to={`/patients/${p?.id}`} className="font-semibold text-hospital-700 hover:underline">{p?.firstName} {p?.lastName}</Link>
              <div className="text-xs text-slate-500 font-mono">{p?.id} · {p?.age} yrs · {p?.gender}</div>
              <div className="text-xs text-slate-500">{p?.mobileNumber}</div>
            </div>
          </div>
          <dl className="text-xs space-y-1 border-t border-slate-100 pt-3">
            <div className="flex justify-between"><dt className="text-slate-500">Allergies</dt><dd className="font-medium">{v.allergies}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Medications</dt><dd className="font-medium">{v.currentMedication}</dd></div>
          </dl>
        </Card>

        <Card title="Patient Complaint" subtitle="Preserved exactly as reported" className="lg:col-span-2">
          <div className="space-y-3 text-sm">
            <div><div className="text-xs text-slate-500">Main Problem</div><div className="font-semibold">{v.mainProblem}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-500">Duration</div><div>{v.duration || '-'}</div></div>
              <div><div className="text-xs text-slate-500">Severity</div><div><Badge variant={v.severity === 'Severe' ? 'red' : v.severity === 'Moderate' ? 'yellow' : 'green'}>{v.severity}</Badge></div></div>
            </div>
            {v.symptoms && <div><div className="text-xs text-slate-500">Symptoms</div><div className="text-slate-700">{v.symptoms}</div></div>}
            {v.reportedSymptoms && Object.keys(v.reportedSymptoms).length > 0 && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Symptoms Checklist</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(v.reportedSymptoms).filter(([, v]) => v === true).map(([k]) => <Badge key={k} variant="blue">{k}</Badge>)}
                  {Object.values(v.reportedSymptoms).filter(x => x === true).length === 0 && <span className="text-xs text-slate-400">None checked</span>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-slate-500">Experienced before?</div><div>{v.previousOccurrence}</div></div>
              <div><div className="text-xs text-slate-500">Additional Info</div><div className="text-slate-700">{v.additionalInformation || '-'}</div></div>
            </div>
          </div>
        </Card>
      </div>

      {!ai ? (
        <Card title="AI Intake Analysis" subtitle="Agent 1 - Patient Intake & Routing" action={<button className="btn btn-primary text-sm" onClick={runAI} disabled={aiLoading}>{aiLoading ? <><Spinner /> Analyzing...</> : 'Run Agent 1'}</button>}>
          <p className="text-sm text-slate-500">Run AI analysis to get suggested department, priority, summary and follow-up questions.</p>
        </Card>
      ) : (
        <Card title="AI Intake Summary" subtitle="Agent 1 analysis — AI does NOT diagnose. Doctor is final clinical authority.">
          <Alert variant="info">Safety: Not a diagnosis. Not an emergency declaration. Doctor retains final authority.</Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div><div className="text-xs text-slate-500">AI Suggested Department</div><div className="text-lg font-bold text-hospital-700">{ai.suggestedDepartment}</div></div>
            <div><div className="text-xs text-slate-500">Priority</div><div>{priorityBadge(ai.priority)} {ai.requiresHumanReview && <Badge variant="red">Priority Review Required</Badge>}</div></div>
            <div><div className="text-xs text-slate-500">Human Review?</div><div>{ai.requiresHumanReview ? '⚠ Required' : 'Not required'}</div></div>
          </div>
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500 mb-1">AI Intake Summary</div>
            <div className="text-sm">{ai.summary}</div>
          </div>
          {ai.reason && <div className="mt-2 text-sm"><span className="text-xs text-slate-500">Reasoning: </span>{ai.reason}</div>}
        </Card>
      )}

      {priorVisits.length > 0 && (
        <Card title="Previous Visits" subtitle={`${priorVisits.length} prior visit(s)`}>
          <div className="space-y-3">
            {priorVisits.slice(0, 5).map(pv => (
              <div key={pv.id} className="p-3 border border-slate-200 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm">
                    <span className="font-mono text-hospital-700 font-semibold">{pv.id}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-slate-500">{formatDateTime(pv.visitDate)}</span>
                    <span className="mx-2 text-slate-400">·</span>
                    <Badge variant="blue">{pv.department}</Badge>
                  </div>
                  {statusBadge(pv.visitStatus)}
                </div>
                <div className="text-sm font-medium">{pv.mainProblem}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {rx && (
        <Card title="Prescription" subtitle={`Consultation Fee: ${inr(rx.consultationFee)}`}>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
            <div className="text-xs text-blue-700 mb-1">Final Diagnosis (Doctor)</div>
            <div className="font-semibold text-blue-900">{rx.diagnosis}</div>
          </div>
          {rx.medicines.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">💊 Medicines ({rx.medicines.length})</h4>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Name</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
                  <tbody>
                    {rx.medicines.map((m, i) => (
                      <tr key={i}><td className="font-medium">{m.name}</td><td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td><td>{m.quantity}</td><td className="text-slate-500">{m.instructions}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {rx.tests.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">🧪 Tests ({rx.tests.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rx.tests.map((t, i) => <div key={i} className="p-3 border border-slate-200 rounded-md flex items-center justify-between"><span>{t.name}</span><Badge variant="purple">Prescribed</Badge></div>)}
              </div>
            </div>
          )}
          {rx.doctorNotes && <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md"><div className="text-xs text-yellow-700 mb-1">Doctor Notes</div><div className="text-sm">{rx.doctorNotes}</div></div>}
          <div className="mt-4 flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={runCoordination} disabled={coordLoading}>{coordLoading ? <Spinner /> : 'Run Billing Coordinator (Agent 2)'}</button>
          </div>
        </Card>
      )}

      {coordinationResult && (
        <Card title="Workflow / Billing Coordination" subtitle="Agent 2 result — Doctor decisions preserved exactly">
          <Alert variant="success">Workflow status: <b>{coordinationResult.workflowStatus}</b></Alert>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 border rounded-md">
              <div className="text-xs text-slate-500">Medicines</div>
              <div className="text-lg font-bold">{coordinationResult.servicesStatus?.medicines?.dispensed}/{coordinationResult.servicesStatus?.medicines?.total} dispensed</div>
              {coordinationResult.servicesStatus?.medicines?.lowStockAlerts?.length > 0 && <div className="text-xs text-red-600 mt-1">⚠ Low stock alerts</div>}
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-xs text-slate-500">Tests</div>
              <div className="text-lg font-bold">{coordinationResult.servicesStatus?.tests?.confirmed}/{coordinationResult.servicesStatus?.tests?.total} confirmed</div>
            </div>
            <div className="p-3 border rounded-md">
              <div className="text-xs text-slate-500">Bill</div>
              <div className="text-lg font-bold">{coordinationResult.bill?.id ? inr(coordinationResult.bill.total) : 'N/A'}</div>
              <div className="text-xs">{coordinationResult.bill?.paymentStatus}</div>
            </div>
          </div>
          {coordinationResult.bill?.id && (
            <div className="mt-4 flex gap-2 justify-end">
              <button className="btn btn-secondary" onClick={() => window.open(billingService.pdfUrl(coordinationResult.bill.id), '_blank')}>📄 Download PDF</button>
              <Link to={`/bills/${coordinationResult.bill.id}`} className="btn btn-primary">Open Bill →</Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
