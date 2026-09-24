import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { billingService } from '../services/billingService';
import { Card, Spinner, Alert, EmptyState, Badge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function Billing() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [lookErr, setLookErr] = useState('');
  const [recon, setRecon] = useState(null);
  const recentBills = useApi(() => {
    return Promise.all([1, 2, 3, 4, 5, 6].map(id =>
      billingService.getByPatient(`P00${id}`).catch(() => [])
    )).then(arr => arr.flat().slice(0, 20));
  }, true, []);

  async function doSearch() {
    setLookErr('');
    setFoundPatient(null);
    try {
      if (search.toUpperCase().startsWith('P')) {
        const p = await patientService.getById(search.toUpperCase().trim());
        setFoundPatient(p);
      } else if (search.trim()) {
        const p = await patientService.getByMobile(search.trim());
        setFoundPatient(p);
      }
    } catch (e) { setLookErr(getErrorMessage(e)); }
  }

  async function runReconciliation() {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/reports/daily-billing-reconciliation`).then(r => r.json());
      setRecon(r.data);
    } catch (e) { setLookErr(getErrorMessage(e)); }
  }

  return (
    <div className="space-y-6">
      <Card title="Billing Center" subtitle="Lookup patient by P_ID or mobile → view bills & payments">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="label">Lookup Patient (P_ID / Mobile)</label>
            <div className="flex gap-2">
              <input className="input" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="P001 or 9876543210" />
              <button className="btn btn-primary" onClick={doSearch}>🔍 Search</button>
            </div>
            {lookErr && <p className="text-xs text-red-600 mt-1">{lookErr}</p>}
          </div>
          <div><button className="btn btn-secondary w-full" onClick={runReconciliation}>📊 Run Billing Reconciliation</button></div>
          <div><button className="btn btn-secondary w-full" onClick={() => fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/reports/auto-generate-missing-bills`, { method: 'POST' }).then(r => r.json()).then(d => alert(`Generated: ${JSON.stringify(d.data)}`)).catch(() => {})}>⚡ Auto-Generate Missing Bills</button></div>
        </div>
        {foundPatient && (
          <div className="mt-4 p-4 bg-hospital-50 border border-hospital-200 rounded-md flex items-center justify-between">
            <div>
              <div className="font-semibold">{foundPatient.firstName} {foundPatient.lastName}</div>
              <div className="text-xs font-mono text-hospital-700">{foundPatient.id} · {foundPatient.mobileNumber}</div>
            </div>
            <button className="btn btn-primary" onClick={() => nav(`/billing/${foundPatient.id}`)}>View Bills →</button>
          </div>
        )}
      </Card>

      {recon && (
        <Card title="Daily Billing Reconciliation" subtitle={`For ${recon.date} — ${recon.totalCompletedVisits} completed visits`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-blue-50 border rounded"><div className="text-xs text-blue-700">Expected Total</div><div className="text-lg font-bold text-blue-900">{inr(recon.summary.expectedTotal)}</div></div>
            <div className="p-3 bg-green-50 border rounded"><div className="text-xs text-green-700">Actual Total</div><div className="text-lg font-bold text-green-900">{inr(recon.summary.actualTotal)}</div></div>
            <div className="p-3 bg-yellow-50 border rounded"><div className="text-xs text-yellow-700">Discrepancy</div><div className="text-lg font-bold text-yellow-900">{inr(recon.summary.discrepancyAmount)}</div></div>
            <div className="p-3 bg-red-50 border rounded"><div className="text-xs text-red-700">Missing Bills</div><div className="text-lg font-bold text-red-900">{recon.summary.missingBillCount}</div></div>
          </div>
          {recon.discrepancies.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Discrepancies</h4>
              <ul className="text-sm space-y-1">
                {recon.discrepancies.slice(0, 5).map((d, i) => (
                  <li key={i} className="p-2 border border-yellow-200 bg-yellow-50 rounded text-xs">
                    <b>{d.visitId}</b> ({d.patientId}) — {d.type}: {d.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recon.missingBills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Missing Bills</h4>
              <ul className="text-sm space-y-1">
                {recon.missingBills.map((m, i) => (
                  <li key={i} className="p-2 border border-red-200 bg-red-50 rounded text-xs">{m.visitId} ({m.patientId}) — expected {inr(m.expectedTotal)}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card title="Recent Bills" subtitle="Across all patients (last 20)">
        {recentBills.loading && <div className="py-6 flex justify-center"><Spinner /></div>}
        {!recentBills.loading && (recentBills.data || []).length === 0 && <EmptyState title="No recent bills" />}
        {!recentBills.loading && (recentBills.data || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Bill ID</th><th>Patient</th><th>Visit</th><th>Date</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {recentBills.data.map(b => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs">{b.id.substring(0, 8)}...</td>
                    <td className="font-mono text-xs"><Link to={`/billing/${b.patientId}`} className="text-hospital-700 hover:underline">{b.patientId}</Link></td>
                    <td className="font-mono text-xs">{b.visitId}</td>
                    <td className="text-slate-500 text-xs">{formatDateTime(b.createdAt)}</td>
                    <td>{inr(b.subtotal)}</td>
                    <td>{inr(b.gstTotal)}</td>
                    <td className="font-semibold">{inr(b.total)}</td>
                    <td>{b.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Pending</Badge>}</td>
                    <td><Link to={`/bills/${b.id}`} className="text-hospital-700 hover:underline text-sm">View →</Link></td>
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
