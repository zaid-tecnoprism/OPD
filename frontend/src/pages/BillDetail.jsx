import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { billingService } from '../services/billingService';
import { Card, Spinner, Alert, Badge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function BillDetail() {
  const { billId } = useParams();
  const nav = useNavigate();
  const bill = useApi(() => billingService.getById(billId), true, [billId]);
  const [payLoading, setPayLoading] = useState(false);
  const [err, setErr] = useState('');

  async function doPay() {
    setErr(''); setPayLoading(true);
    try { await billingService.pay(billId); await bill.execute(); }
    catch (e) { setErr(getErrorMessage(e)); }
    finally { setPayLoading(false); }
  }

  if (bill.loading) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;
  if (bill.error) return <Alert variant="error">{getErrorMessage(bill.error)}</Alert>;

  const b = bill.data;
  const patient = b.patient;
  const visit = b.visit;
  const byType = b.charges.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = { subtotal: 0, gst: 0, total: 0, items: [] };
    acc[c.type].subtotal += c.base;
    acc[c.type].gst += c.gst;
    acc[c.type].total += c.total;
    acc[c.type].items.push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={patient ? `/billing/${patient.id}` : '/billing'} className="btn btn-ghost">← Back</Link>
          <div>
            <h1 className="text-xl font-bold">Bill #{b.id.substring(0, 12)}...</h1>
            <div className="text-sm text-slate-500">
              Issued {formatDateTime(b.createdAt)} · {b.paymentStatus === 'paid' ? <Badge variant="green">Paid</Badge> : <Badge variant="yellow">Payment Pending</Badge>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={billingService.pdfUrl(b.id)} target="_blank" rel="noreferrer" className="btn btn-secondary">📄 Download PDF</a>
          {b.paymentStatus !== 'paid' && <button className="btn btn-primary" onClick={doPay} disabled={payLoading}>{payLoading ? <><Spinner /> Processing...</> : '💰 Mark as Paid'}</button>}
        </div>
      </div>

      {err && <Alert variant="error">{err}</Alert>}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-slate-500 mb-1">Hospital</div>
            <div className="font-bold text-hospital-700">City General Hospital</div>
            <div className="text-xs text-slate-600">123 Health Avenue, Medical District</div>
          </div>
          {patient && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Patient</div>
              <div className="font-semibold">{patient.firstName} {patient.lastName}</div>
              <div className="text-xs text-slate-600">
                <span className="font-mono">{patient.id}</span> · {patient.gender} · {patient.age} yrs<br />
                📞 {patient.mobileNumber}{patient.email && ` · ✉ ${patient.email}`}
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-slate-500 mb-1">Bill Info</div>
            <table className="text-xs">
              <tbody>
                <tr><td className="text-slate-500 pr-3">Bill ID:</td><td className="font-mono font-medium">{b.id}</td></tr>
                <tr><td className="text-slate-500 pr-3">Visit ID:</td><td className="font-mono">{visit?.id || b.visitId}</td></tr>
                <tr><td className="text-slate-500 pr-3">Token:</td><td className="font-mono">{visit?.token || '-'}</td></tr>
                <tr><td className="text-slate-500 pr-3">Department:</td><td>{visit?.department || '-'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {['consultation', 'medicine', 'test'].map(type => {
          const d = byType[type];
          if (!d) return null;
          const labels = { consultation: '💵 Consultation', medicine: '💊 Medicines', test: '🧪 Tests' };
          return (
            <Card key={type} title={labels[type]} subtitle={`${d.items.length} item(s)`}>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      {type !== 'consultation' && <th>Qty</th>}
                      <th>Unit Price</th>
                      <th>Base</th>
                      <th>GST %</th>
                      <th>GST Amt</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.items.map((c, i) => (
                      <tr key={i}>
                        <td className="font-medium">{c.description || c.type}{c.medicineId && <div className="text-xs text-slate-400 font-mono">{c.medicineId}</div>}</td>
                        {type !== 'consultation' && <td>{c.quantity || 1}</td>}
                        <td>{inr(c.unitPrice || c.base)}</td>
                        <td>{inr(c.base)}</td>
                        <td>{c.gstPercent}%</td>
                        <td>{inr(c.gst)}</td>
                        <td className="text-right font-semibold">{inr(c.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={type !== 'consultation' ? 3 : 2}>Sub-total {labels[type]}</td>
                      <td>{inr(d.subtotal)}</td>
                      <td></td>
                      <td>{inr(d.gst)}</td>
                      <td className="text-right">{inr(d.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="max-w-md ml-auto">
          <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">Subtotal</span><span>{inr(b.subtotal)}</span></div>
          <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-500">GST Total</span><span>{inr(b.gstTotal)}</span></div>
          <div className="flex justify-between py-3 border-t-2 border-slate-300 text-lg font-bold mt-2"><span>Bill Total</span><span className="text-hospital-700">{inr(b.total)}</span></div>
          <div className="mt-4">
            {b.paymentStatus === 'paid' ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-center">
                <div className="text-green-800 font-semibold">✅ PAYMENT SUCCESSFUL</div>
                <div className="text-xs text-green-700 mt-1">Paid on {formatDateTime(b.paidAt)}</div>
              </div>
            ) : (
              <button className="btn btn-primary w-full py-3" onClick={doPay} disabled={payLoading}>
                {payLoading ? <><Spinner /> Processing...</> : `💵 Process Payment of ${inr(b.total)} (Demo)`}
              </button>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-500 text-center">
            This is a prototype demo — no real payment gateway connected.<br />
            "Mark as Paid" sets status for workflow testing purposes only.
          </div>
        </div>
      </Card>
    </div>
  );
}
