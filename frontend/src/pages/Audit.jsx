import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, Spinner, Badge, EmptyState } from '../components/UI';
import { formatDateTime } from '../utils/format';

export default function Audit() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [limit, setLimit] = useState(200);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      params.set('limit', limit);
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/audit/logs?${params.toString()}`).then(r => r.json());
      setLogs(r.data?.logs || []);
    } finally { setLoading(false); }
  }
  async function loadNotif() {
    setNotifLoading(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/audit/notifications`).then(r => r.json());
      setNotifications(r.data?.notifications || []);
    } finally { setNotifLoading(false); }
  }

  useEffect(() => { loadLogs(); loadNotif(); }, []);

  const counts = logs.reduce((acc, l) => { acc[l.entityType || 'other'] = (acc[l.entityType || 'other'] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <Card title="Audit Dashboard" subtitle="All actions logged with timestamps, actor, and entity references">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(counts).slice(0, 4).map(([k, v]) => (
            <div key={k} className="p-3 bg-slate-50 border rounded-md">
              <div className="text-xs text-slate-500">{k || 'System'}</div>
              <div className="text-xl font-bold">{v}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Action</label>
            <select className="input" value={action} onChange={e => setAction(e.target.value)}>
              <option value="">All</option>
              {['Agent1_AnalyzeIntake', 'Agent2_CoordinateBilling', 'Billing_Generate', 'Billing_Payment', 'Pharmacy_Dispense', 'TestCenter_Confirm', 'POST', 'PUT'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Entity Type</label>
            <select className="input" value={entityType} onChange={e => setEntityType(e.target.value)}>
              <option value="">All</option>
              {['Patient', 'Visit', 'Prescription', 'Bill', 'Token', 'Pharmacy', 'TestCenter', 'Agent'].map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Max logs</label>
            <select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))}>
              <option value={50}>50</option><option value={200}>200</option><option value={500}>500</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={loadLogs}>🔄 Refresh Logs</button>
            <button className="btn btn-secondary" onClick={loadNotif}>🔔 Notifications</button>
          </div>
        </div>
      </Card>

      <Card title="Notifications" subtitle="Agent-generated & system notifications">
        {notifLoading && <div className="py-6 flex justify-center"><Spinner /></div>}
        {!notifLoading && notifications.length === 0 && <EmptyState title="No notifications" />}
        {!notifLoading && notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.slice(0, 20).map(n => (
              <div key={n.id} className={`p-3 border rounded-md ${n.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant={n.type.includes('pharmacy') ? 'red' : n.type.includes('billing') ? 'yellow' : 'blue'}>{n.type}</Badge>
                    <span className="ml-2 text-sm font-medium">{n.message}</span>
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(n.createdAt)}</div>
                </div>
                <div className="text-xs text-slate-500 mt-1">{n.patientId && `P:${n.patientId}`} {n.visitId && `· V:${n.visitId}`}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Audit Log Entries" subtitle={`${logs.length} entries loaded`}>
        {loading && <div className="py-6 flex justify-center"><Spinner /></div>}
        {!loading && logs.length === 0 && <EmptyState title="No audit logs match" />}
        {!loading && logs.length > 0 && (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="table">
              <thead className="sticky top-0 z-10"><tr>
                <th>Timestamp</th><th>Actor</th><th>Action</th><th>Entity</th><th>P_ID</th><th>V_ID</th><th>Details</th>
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(l.timestamp)}</td>
                    <td><Badge variant="gray">{l.actor}</Badge></td>
                    <td className="text-xs font-mono">{l.action}</td>
                    <td>{l.entityType && <Badge variant="purple">{l.entityType}</Badge>}</td>
                    <td className="text-xs font-mono">{l.patientId || '-'}</td>
                    <td className="text-xs font-mono">{l.visitId || '-'}</td>
                    <td className="text-xs text-slate-600 max-w-xs truncate" title={typeof l.details === 'object' ? JSON.stringify(l.details) : l.details}>
                      {l.details?.errorMessage || l.details?.bodySample || l.details?.message || l.details?.statusCode || (typeof l.details === 'object' ? JSON.stringify(l.details).substring(0, 80) : l.details)}
                    </td>
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
