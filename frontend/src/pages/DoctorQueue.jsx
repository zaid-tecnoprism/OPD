import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { tokenService } from '../services/tokenService';
import { doctorService } from '../services/doctorService';
import { patientService } from '../services/patientService';
import { Card, Spinner, EmptyState, Alert, Badge, priorityBadge, statusBadge } from '../components/UI';
import { formatDateTime, getErrorMessage } from '../utils/format';

export default function DoctorQueue() {
  const [dept, setDept] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [status, setStatus] = useState('');
  const [patientInfo, setPatientInfo] = useState({});

  const doctors = useApi(() => doctorService.getAll(), true, []);
  const tokenRes = useApi(() => tokenService.getAll({
    department: dept || undefined,
    doctorId: doctorId || undefined,
    status: status || undefined
  }), true, [dept, doctorId, status]);

  const tokens = tokenRes.data || [];

  async function loadPatient(id) {
    if (patientInfo[id]) return patientInfo[id];
    try {
      const p = await patientService.getById(id);
      setPatientInfo(prev => ({ ...prev, [id]: p }));
      return p;
    } catch (e) { return null; }
  }

  if (tokenRes.loading || doctors.loading) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;
  if (tokenRes.error) return <Alert variant="error">{getErrorMessage(tokenRes.error)}</Alert>;

  async function updateStatus(token, s) {
    try {
      await tokenService.updateStatus(token, s);
      await tokenRes.execute();
    } catch (e) { alert(getErrorMessage(e)); }
  }

  const queuePriority = (t) => {
    if (t.priority === 'priority review') return 0;
    if (t.priority === 'urgent clinical review required') return 0;
    return 1;
  };
  const sorted = [...tokens].sort((a, b) => queuePriority(a) - queuePriority(b) || new Date(a.createdAt) - new Date(b.createdAt));

  const counts = { pending: 0, called: 0, inConsult: 0, completed: 0 };
  for (const t of tokens) {
    if (t.status === 'pending') counts.pending++;
    else if (t.status === 'called') counts.called++;
    else if (t.status === 'in consultation') counts.inConsult++;
    else if (t.status === 'completed') counts.completed++;
  }

  return (
    <div className="space-y-6">
      <Card title="Doctor Queue Dashboard" subtitle="Tokens ordered by priority first, then time">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200"><div className="text-xs text-yellow-700">Pending</div><div className="text-2xl font-bold text-yellow-900">{counts.pending}</div></div>
          <div className="p-3 bg-blue-50 rounded-md border border-blue-200"><div className="text-xs text-blue-700">Called / In Queue</div><div className="text-2xl font-bold text-blue-900">{counts.called}</div></div>
          <div className="p-3 bg-purple-50 rounded-md border border-purple-200"><div className="text-xs text-purple-700">In Consultation</div><div className="text-2xl font-bold text-purple-900">{counts.inConsult}</div></div>
          <div className="p-3 bg-green-50 rounded-md border border-green-200"><div className="text-xs text-green-700">Completed</div><div className="text-2xl font-bold text-green-900">{counts.completed}</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Filter by Department</label>
            <select className="input" value={dept} onChange={e => setDept(e.target.value)}>
              <option value="">All Departments</option>
              {[...new Set(tokens.map(t => t.department))].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Filter by Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="called">Called</option>
              <option value="in consultation">In Consultation</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-end"><Link to="/patients/new" className="btn btn-primary w-full">➕ New Intake</Link></div>
        </div>
      </Card>

      {sorted.length === 0 ? <EmptyState title="No tokens in queue" description="Create a new patient visit to generate a token" /> : (
        <Card title="Token Queue" subtitle={`${sorted.length} tokens`}>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <th>Token</th><th>Patient</th><th>Department</th><th>Priority</th>
                <th>Complaint (Patient-Reported)</th><th>AI Status</th><th>Time</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {sorted.map(t => (
                  <TokenRow key={t.id} t={t} patientInfo={patientInfo} loadPatient={loadPatient} updateStatus={updateStatus} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function TokenRow({ t, patientInfo, loadPatient, updateStatus }) {
  const [p, setP] = useState(patientInfo[t.patientId] || null);
  useEffect(() => {
    let mounted = true;
    if (!p) {
      loadPatient(t.patientId).then(loaded => { if (mounted && loaded) setP(loaded); });
    }
    return () => { mounted = false; };
  }, [p, t.patientId, loadPatient]);
  return (
    <tr>
      <td className="font-mono font-bold text-lg text-hospital-700">{t.token}</td>
      <td>
        <div className="font-medium">{p ? `${p.firstName} ${p.lastName}` : t.patientId}</div>
        <div className="text-xs text-slate-500 font-mono">{t.patientId} {p ? `· ${p.age}yrs` : ''}</div>
      </td>
      <td>{t.department}</td>
      <td>{priorityBadge(t.priority)}</td>
      <td className="max-w-sm truncate text-slate-600">{t.complaint || '-'}</td>
      <td>{t.aiStatus === 'completed' ? <Badge variant="green">AI Analyzed</Badge> : <Badge variant="gray">{t.aiStatus || 'pending'}</Badge>}</td>
      <td className="text-slate-500 text-xs">{formatDateTime(t.createdAt)}</td>
      <td>{statusBadge(t.status)}</td>
      <td>
        <div className="flex gap-1 flex-wrap">
          {t.status === 'pending' && <button className="btn btn-secondary text-xs px-2 py-1" onClick={() => updateStatus(t.token, 'called')}>Call</button>}
          {(t.status === 'pending' || t.status === 'called') && <button className="btn btn-primary text-xs px-2 py-1" onClick={() => updateStatus(t.token, 'in consultation')}>Start</button>}
          <Link to={`/doctor/consultation/${t.token}`} className="btn btn-ghost text-xs px-2 py-1 text-hospital-700">Open</Link>
        </div>
      </td>
    </tr>
  );
}
