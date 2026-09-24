import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { testService } from '../services/testService';
import { Card, Spinner, Alert, EmptyState, Badge } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function Tests() {
  const [lookupBy, setLookupBy] = useState('patientId');
  const [lookupValue, setLookupValue] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookErr, setLookErr] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [confirmErr, setConfirmErr] = useState('');
  const catalog = useApi(() => testService.getAll(), true, []);
  const txs = useApi(() => testService.getTransactions({ limit: 50 }), true, []);

  async function doLookup(e) {
    if (e) e.preventDefault();
    setLookErr('');
    setLookupResult(null);
    setSelectedVisitId('');
    try {
      const r = lookupBy === 'patientId'
        ? await testService.lookup({ patientId: lookupValue.toUpperCase().trim() })
        : await testService.lookup({ mobile: lookupValue.trim() });
      setLookupResult(r);
      if (r.latestCompletedVisit) setSelectedVisitId(r.latestCompletedVisit.id);
      else if (r.allCompletedVisits.length > 0) setSelectedVisitId(r.allCompletedVisits[0].id);
    } catch (e) { setLookErr(getErrorMessage(e)); }
  }

  const selectedData = lookupResult?.testPrescriptions.find(p => p.visit.id === selectedVisitId);

  async function confirmTest(t) {
    setConfirming(t.testId);
    setConfirmErr('');
    try {
      await testService.confirm({
        patientId: lookupResult.patient.id,
        visitId: selectedVisitId,
        testId: t.testId,
        confirmedBy: 'test-staff'
      });
      await doLookup();
      await txs.execute();
    } catch (e) { setConfirmErr(getErrorMessage(e)); }
    finally { setConfirming(null); }
  }

  return (
    <div className="space-y-6">
      <Card title="Test Center" subtitle="Lookup patient → confirm prescribed tests performed">
        <form onSubmit={doLookup} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Lookup by</label>
            <select className="input" value={lookupBy} onChange={e => setLookupBy(e.target.value)}>
              <option value="patientId">P_ID</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Value</label>
            <input className="input" value={lookupValue} onChange={e => setLookupValue(e.target.value)} placeholder={lookupBy === 'patientId' ? 'P001' : 'Mobile'} />
          </div>
          <div><button className="btn btn-primary w-full">🔍 Search</button></div>
        </form>
        {lookErr && <div className="mt-3"><Alert variant="error">{lookErr}</Alert></div>}
      </Card>

      <Card title="Test Catalog" subtitle={`${(catalog.data || []).length} tests available`}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>ID</th><th>Name</th><th>Description</th><th>Price</th><th>GST</th><th>Total</th></tr></thead>
            <tbody>
              {(catalog.data || []).map(t => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.id}</td>
                  <td className="font-medium">{t.name}</td>
                  <td className="text-slate-500 text-xs max-w-xs truncate">{t.description}</td>
                  <td>{inr(t.price)}</td>
                  <td>{t.gstPercent}%</td>
                  <td className="font-semibold">{inr(t.price * (1 + t.gstPercent / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {lookupResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card title="Patient">
              <div className="font-semibold">{lookupResult.patient.firstName} {lookupResult.patient.lastName}</div>
              <div className="text-xs text-slate-500 font-mono mb-2">{lookupResult.patient.id}</div>
              <div className="text-xs">📞 {lookupResult.patient.mobileNumber} · 🎂 {lookupResult.patient.age} yrs</div>
            </Card>
            <Card title="Visits" subtitle="Select visit">
              {lookupResult.allCompletedVisits.length === 0 ? <EmptyState title="No completed visits" /> : (
                <div className="space-y-2">
                  {lookupResult.allCompletedVisits.map(v => {
                    const latest = lookupResult.latestCompletedVisit?.id === v.id;
                    const sel = selectedVisitId === v.id;
                    return (
                      <button key={v.id} onClick={() => setSelectedVisitId(v.id)}
                        className={`w-full text-left p-3 border rounded-md transition ${sel ? 'border-hospital-500 bg-hospital-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex justify-between">
                          <span className="font-mono text-xs text-hospital-700">{v.id}</span>
                          <div className="flex gap-1">{latest && <Badge variant="blue">Latest</Badge>}</div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{formatDateTime(v.visitDate)}</div>
                        <div className="text-sm font-medium mt-1">{v.mainProblem}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {confirmErr && <Alert variant="error">❌ {confirmErr}</Alert>}
            {!selectedData ? (
              <Card title="Tests Prescribed"><EmptyState title="No tests for this visit" /></Card>
            ) : (
              <Card title={`Tests for ${selectedData.visit.id}`}>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Test</th><th>Price</th><th>GST</th><th>Total</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {selectedData.tests.map(t => {
                        const price = t.confirmTx?.price || 0;
                        return (
                          <tr key={t.testId || t.name}>
                            <td className="font-medium">{t.name}</td>
                            <td>{t.confirmTx ? inr(t.confirmTx.base) : '-'}</td>
                            <td>{t.confirmTx ? `${t.confirmTx.gstPercent}%` : '-'}</td>
                            <td className="font-semibold">{t.confirmTx ? inr(t.confirmTx.total) : '-'}</td>
                            <td>{t.confirmed ? <Badge variant="green">Confirmed</Badge> : <Badge variant="yellow">Pending</Badge>}</td>
                            <td>{!t.confirmed && (
                              <button className="btn btn-primary text-xs px-2 py-1" onClick={() => confirmTest(t)} disabled={confirming === t.testId}>
                                {confirming === t.testId ? <Spinner /> : 'Confirm Performed'}
                              </button>
                            )}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card title="Recent Test Transactions">
              {(txs.data || []).length === 0 ? <EmptyState title="No transactions" /> : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Time</th><th>Patient</th><th>Test</th><th>Amount</th><th>Visit</th><th>By</th></tr></thead>
                    <tbody>
                      {(txs.data || []).slice(0, 10).map(t => (
                        <tr key={t.id}>
                          <td className="text-xs text-slate-500">{formatDateTime(t.createdAt)}</td>
                          <td className="font-mono text-xs">{t.patientId}</td>
                          <td className="font-medium">{t.testName}</td>
                          <td className="font-semibold">{inr(t.total)}</td>
                          <td className="font-mono text-xs">{t.visitId}</td>
                          <td className="text-xs text-slate-500">{t.confirmedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
