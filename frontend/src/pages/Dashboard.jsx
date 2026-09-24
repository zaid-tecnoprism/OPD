import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { visitService } from '../services/visitService';
import { tokenService } from '../services/tokenService';
import { Card, Badge, Spinner, EmptyState, statusBadge, priorityBadge } from '../components/UI';
import { formatDateTime, inr } from '../utils/format';

export default function Dashboard() {
  const [queueReport, setQueueReport] = useState(null);
  const tokens = useApi(() => tokenService.getAll({ today: '1' }));
  const patients = useApi(() => patientService.getAll());
  const visits = useApi(() => visitService.getAll({ today: '1' }));

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/reports/daily-queue-report`)
      .then(r => r.json()).then(d => setQueueReport(d.data)).catch(() => {});
  }, []);

  if (tokens.loading || patients.loading) return <div className="flex justify-center py-20"><Spinner size="md" /></div>;

  const todayTokens = tokens.data || [];
  const pending = todayTokens.filter(t => t.status === 'pending');
  const inConsult = todayTokens.filter(t => t.status === 'in consultation');
  const completed = todayTokens.filter(t => t.status === 'completed');

  const stats = [
    { label: 'Registered Patients', value: (patients.data || []).length, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'Today Visits', value: (visits.data || []).length, icon: '📋', color: 'bg-purple-50 text-purple-700' },
    { label: 'Tokens in Queue', value: pending.length, icon: '⏳', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Completed Today', value: completed.length, icon: '✅', color: 'bg-green-50 text-green-700' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{s.value}</div>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Today's Queue"
          subtitle={`${pending.length} pending · ${inConsult.length} in progress · ${completed.length} completed`}
          action={<Link to="/doctor/queue" className="btn btn-ghost text-sm">View Queue →</Link>}
          className="lg:col-span-2"
        >
          {todayTokens.length === 0 ? <EmptyState title="No tokens today" /> : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Token</th><th>Patient</th><th>Department</th><th>Priority</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>
                  {todayTokens.slice(0, 8).map(t => (
                    <tr key={t.id}>
                      <td className="font-mono font-semibold">{t.token}</td>
                      <td>{t.patientId}</td>
                      <td>{t.department}</td>
                      <td>{priorityBadge(t.priority)}</td>
                      <td>{statusBadge(t.status)}</td>
                      <td className="text-slate-500">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link to="/patients/new" className="btn btn-primary w-full justify-start">➕ New Patient / Registration</Link>
              <Link to="/doctor/queue" className="btn btn-secondary w-full justify-start">🩺 Doctor Consultation Queue</Link>
              <Link to="/pharmacy" className="btn btn-secondary w-full justify-start">💊 Pharmacy Dispensing</Link>
              <Link to="/tests" className="btn btn-secondary w-full justify-start">🧪 Test Center</Link>
              <Link to="/billing" className="btn btn-secondary w-full justify-start">💵 Billing & Payments</Link>
            </div>
          </Card>

          {queueReport && (
            <Card title="Department Status" subtitle="Queue breakdown by department">
              <div className="space-y-3">
                {queueReport.departments.filter(d => d.total > 0).map(d => (
                  <div key={d.department}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{d.department} <span className="text-slate-400">({d.tokenPrefix})</span></span>
                      <span className="text-slate-500">{d.completed}/{d.total}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-hospital-500" style={{ width: `${d.total ? (d.completed / d.total * 100) : 0}%` }} />
                    </div>
                    {d.priorityPending > 0 && <div className="text-xs text-red-600 mt-1">⚠ {d.priorityPending} priority pending</div>}
                  </div>
                ))}
                {!queueReport.departments.some(d => d.total > 0) && <EmptyState title="No queue activity today" />}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
