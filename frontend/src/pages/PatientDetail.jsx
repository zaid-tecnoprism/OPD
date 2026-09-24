import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { Card, Spinner, EmptyState, Alert, Badge, statusBadge, priorityBadge } from '../components/UI';
import { formatDate, formatDateTime, inr, getErrorMessage } from '../utils/format';
import { billingService } from '../services/billingService';

export default function PatientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const patient = useApi(() => patientService.getById(id));
  const visits = useApi(() => patientService.getVisits(id));
  const bills = useApi(() => billingService.getByPatient(id));
  const [err, setErr] = useState('');

  if (patient.loading || visits.loading) return <div className="flex justify-center py-20"><Spinner size="md" /></div>;
  if (patient.error) return <Alert variant="error">Patient not found: {getErrorMessage(patient.error)}</Alert>;

  const p = patient.data;
  const allVisits = (visits.data?.visits || []);
  const latest = visits.data?.latestCompletedVisit;
  const patientBills = bills.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/patients" className="btn btn-ghost">← Back</Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{p.firstName} {p.lastName}</h1>
            <div className="text-sm text-slate-500">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-hospital-700 font-semibold">{p.id}</span>
              <span className="mx-2">·</span>
              {p.gender} · {p.age} yrs · {p.weight ? p.weight + ' kg' : '-'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/patients/new" state={{ patient: p }} className="btn btn-secondary">➕ New Visit</Link>
          <Link to={`/billing/${p.id}`} className="btn btn-primary">💰 View Bills</Link>
        </div>
      </div>

      {err && <Alert variant="error">{err}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Patient Information" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Mobile</dt><dd className="font-medium">{p.mobileNumber}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{p.email || '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd className="font-medium">{p.gender}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Age</dt><dd className="font-medium">{p.age} years</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Weight</dt><dd className="font-medium">{p.weight || '-'} kg</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Registered</dt><dd className="font-medium">{formatDateTime(p.createdAt)}</dd></div>
            <div><dt className="text-slate-500 mb-1">Address</dt><dd className="font-medium">{p.address || '-'}</dd></div>
          </dl>
        </Card>

        <Card title="Summary" className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-xs text-blue-700">Total Visits</div>
              <div className="text-2xl font-bold text-blue-900">{allVisits.length}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-xs text-green-700">Completed</div>
              <div className="text-2xl font-bold text-green-900">{allVisits.filter(v => v.visitStatus === 'completed').length}</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-700">Bills</div>
              <div className="text-2xl font-bold text-purple-900">{patientBills.length}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-xs text-yellow-700">Outstanding Bills</div>
              <div className="text-2xl font-bold text-yellow-900">{patientBills.filter(b => b.paymentStatus !== 'paid').length}</div>
            </div>
          </div>
          {latest && (
            <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-700">Latest Completed Visit</div>
                <Link to={`/visits/${latest.id}`} className="text-xs text-hospital-700 hover:underline">View details →</Link>
              </div>
              <div className="text-xs text-slate-500">{formatDateTime(latest.visitDate)} · <Badge variant="green">{latest.department}</Badge></div>
              <div className="mt-2 text-sm font-medium">{latest.mainProblem}</div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Visit History" subtitle={`${allVisits.length} visits`}>
        {allVisits.length === 0 ? <EmptyState title="No visits yet" description="Register a new visit for this patient" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>V_ID</th><th>Date</th><th>Department</th><th>Token</th><th>Main Problem</th><th>Priority</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {allVisits.map(v => (
                  <tr key={v.id}>
                    <td className="font-mono text-hospital-700 font-semibold">{v.id}</td>
                    <td className="text-slate-500">{formatDateTime(v.visitDate)}</td>
                    <td>{v.department}</td>
                    <td className="font-mono">{v.token || '-'}</td>
                    <td className="max-w-xs truncate">{v.mainProblem}</td>
                    <td>{priorityBadge(v.priority)}</td>
                    <td>{statusBadge(v.visitStatus)}</td>
                    <td><Link to={`/visits/${v.id}`} className="text-sm text-hospital-700 hover:underline">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Bills" subtitle={`${patientBills.length} bills`}>
        {patientBills.length === 0 ? <EmptyState title="No bills yet" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Bill ID</th><th>Visit</th><th>Date</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {patientBills.map(b => (
                  <tr key={b.id}>
                    <td className="font-mono text-hospital-700 font-semibold">{b.id.substring(0, 8)}...</td>
                    <td className="font-mono">{b.visitId}</td>
                    <td className="text-slate-500">{formatDateTime(b.createdAt)}</td>
                    <td>{inr(b.subtotal)}</td>
                    <td>{inr(b.gstTotal)}</td>
                    <td className="font-semibold">{inr(b.total)}</td>
                    <td>{b.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Pending</Badge>}</td>
                    <td><Link to={`/bills/${b.id}`} className="text-sm text-hospital-700 hover:underline">View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
