import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { billingService } from '../services/billingService';
import { visitService } from '../services/visitService';
import { Card, Spinner, Alert, EmptyState, Badge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function BillingPatient() {
  const { patientId } = useParams();
  const patient = useApi(() => patientService.getById(patientId), true, [patientId]);
  const visits = useApi(() => patientService.getVisits(patientId), true, [patientId]);
  const bills = useApi(() => billingService.getByPatient(patientId), true, [patientId]);
  const [genLoading, setGenLoading] = useState(null);
  const [payLoading, setPayLoading] = useState(null);
  const [err, setErr] = useState('');

  async function generate(visitId) {
    setErr(''); setGenLoading(visitId);
    try {
      await billingService.generate(patientId, visitId);
      await bills.execute();
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setGenLoading(null); }
  }
  async function payBill(billId) {
    setErr(''); setPayLoading(billId);
    try { await billingService.pay(billId); await bills.execute(); }
    catch (e) { setErr(getErrorMessage(e)); }
    finally { setPayLoading(null); }
  }

  if (patient.loading || bills.loading) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;
  if (patient.error) return <Alert variant="error">{getErrorMessage(patient.error)}</Alert>;
  const p = patient.data;
  const allVisits = (visits.data?.visits || []).filter(v => v.visitStatus === 'completed');
  const patientBills = bills.data || [];
  const billsByVisit = Object.fromEntries(patientBills.map(b => [b.visitId, b]));

  const totalUnpaid = patientBills.filter(b => b.paymentStatus !== 'paid').reduce((s, b) => s + b.total, 0);
  const totalPaid = patientBills.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/billing" className="btn btn-ghost">← Back</Link>
          <div>
            <h1 className="text-xl font-bold">{p.firstName} {p.lastName}</h1>
            <div className="text-sm text-slate-500"><span className="font-mono">{p.id}</span> · {p.mobileNumber}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="text-right"><div className="text-xs text-slate-500">Total Paid</div><div className="text-lg font-bold text-green-600">{inr(totalPaid)}</div></div>
          <div className="text-right"><div className="text-xs text-slate-500">Balance Due</div><div className="text-lg font-bold text-red-600">{inr(totalUnpaid)}</div></div>
        </div>
      </div>

      {err && <Alert variant="error">{err}</Alert>}

      <Card title="Completed Visits" subtitle="Generate bills per visit">
        {allVisits.length === 0 ? <EmptyState title="No completed visits" /> : (
          <div className="space-y-3">
            {allVisits.map(v => {
              const b = billsByVisit[v.id];
              return (
                <div key={v.id} className="p-4 border border-slate-200 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono font-semibold text-hospital-700">{v.id}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="text-slate-500 text-xs">{formatDateTime(v.visitDate)}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <Badge variant="blue">{v.department}</Badge>
                    </div>
                    {b ? (
                      <div className="flex gap-2">
                        {b.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Pending</Badge>}
                        <Link to={`/bills/${b.id}`} className="btn btn-secondary text-xs">View Bill</Link>
                      </div>
                    ) : (
                      <button className="btn btn-primary text-xs" onClick={() => generate(v.id)} disabled={genLoading === v.id}>
                        {genLoading === v.id ? <><Spinner /> Generating...</> : '💵 Generate Bill'}
                      </button>
                    )}
                  </div>
                  <div className="text-sm font-medium">{v.mainProblem}</div>
                  {b && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div><div className="text-xs text-slate-500">Bill ID</div><div className="font-mono text-xs">{b.id.substring(0, 8)}...</div></div>
                        <div><div className="text-xs text-slate-500">Subtotal</div><div>{inr(b.subtotal)}</div></div>
                        <div><div className="text-xs text-slate-500">Total</div><div className="font-semibold">{inr(b.total)}</div></div>
                        <div className="text-right">
                          {b.paymentStatus !== 'paid' ? (
                            <button className="btn btn-primary text-xs" onClick={() => payBill(b.id)} disabled={payLoading === b.id}>
                              {payLoading === b.id ? <><Spinner /> Paying...</> : '💰 Mark Paid'}
                            </button>
                          ) : (
                            <a href={billingService.pdfUrl(b.id)} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs">📄 PDF</a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Bills" subtitle={`${patientBills.length} bills`}>
        {patientBills.length === 0 ? <EmptyState title="No bills yet" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Bill ID</th><th>Visit</th><th>Date</th><th>Charges</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {patientBills.map(b => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs">{b.id.substring(0, 12)}...</td>
                    <td className="font-mono text-xs">{b.visitId}</td>
                    <td className="text-xs text-slate-500">{formatDateTime(b.createdAt)}</td>
                    <td>{b.charges.length}</td>
                    <td>{inr(b.subtotal)}</td>
                    <td>{inr(b.gstTotal)}</td>
                    <td className="font-semibold">{inr(b.total)}</td>
                    <td>{b.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Pending</Badge>}</td>
                    <td className="flex gap-1">
                      <Link to={`/bills/${b.id}`} className="btn btn-ghost text-xs">View</Link>
                      <a href={billingService.pdfUrl(b.id)} target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">📄 PDF</a>
                      {b.paymentStatus !== 'paid' && <button className="btn btn-primary text-xs" onClick={() => payBill(b.id)} disabled={payLoading === b.id}>{payLoading === b.id ? <Spinner /> : 'Pay'}</button>}
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
