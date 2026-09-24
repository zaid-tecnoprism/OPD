import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { pharmacyService } from '../services/pharmacyService';
import { Card, Spinner, Alert, Badge, EmptyState } from '../components/UI';
import { formatDateTime, inr, getErrorMessage } from '../utils/format';

export default function Pharmacy() {
  const [lookupBy, setLookupBy] = useState('patientId');
  const [lookupValue, setLookupValue] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookErr, setLookErr] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [dispensing, setDispensing] = useState(null);
  const [dispenseErr, setDispenseErr] = useState('');
  const txs = useApi(() => pharmacyService.getTransactions({ limit: 50 }), true, []);

  async function doLookup(e) {
    if (e) e.preventDefault();
    setLookErr('');
    setLookupResult(null);
    setSelectedVisitId('');
    try {
      const r = lookupBy === 'patientId'
        ? await pharmacyService.lookup({ patientId: lookupValue.toUpperCase().trim() })
        : await pharmacyService.lookup({ mobile: lookupValue.trim() });
      setLookupResult(r);
      if (r.latestCompletedVisit) setSelectedVisitId(r.latestCompletedVisit.id);
      else if (r.allCompletedVisits.length > 0) setSelectedVisitId(r.allCompletedVisits[0].id);
    } catch (e) { setLookErr(getErrorMessage(e)); }
  }

  const selectedPrescription = lookupResult?.prescriptions.find(p => p.visit.id === selectedVisitId);

  async function dispenseMed(m) {
    setDispensing(m.medicineId);
    setDispenseErr('');
    try {
      await pharmacyService.dispense({
        patientId: lookupResult.patient.id,
        visitId: selectedVisitId,
        medicineId: m.medicineId,
        quantity: m.quantity,
        dispensedBy: 'pharmacy-staff'
      });
      await doLookup();
      await txs.execute();
    } catch (e) { setDispenseErr(getErrorMessage(e)); }
    finally { setDispensing(null); }
  }

  return (
    <div className="space-y-6">
      <Card title="Pharmacy Dispensing" subtitle="Look up patient/token → view prescription → confirm dispensing">
        <form onSubmit={doLookup} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="label">Look up by</label>
            <select className="input" value={lookupBy} onChange={e => setLookupBy(e.target.value)}>
              <option value="patientId">P_ID</option>
              <option value="mobile">Mobile Number</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Value</label>
            <input className="input" value={lookupValue} onChange={e => setLookupValue(e.target.value)} placeholder={lookupBy === 'patientId' ? 'e.g. P001' : 'Mobile number'} />
          </div>
          <div><button className="btn btn-primary w-full">🔍 Search Patient</button></div>
        </form>
        {lookErr && <div className="mt-3"><Alert variant="error">{lookErr}</Alert></div>}
      </Card>

      {lookupResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card title="Patient">
              <div className="font-semibold">{lookupResult.patient.firstName} {lookupResult.patient.lastName}</div>
              <div className="text-xs text-slate-500 font-mono mb-2">{lookupResult.patient.id}</div>
              <dl className="text-xs space-y-1">
                <div>📞 {lookupResult.patient.mobileNumber}</div>
                <div>🎂 {lookupResult.patient.age} yrs · {lookupResult.patient.gender}</div>
              </dl>
            </Card>
            <Card title="Select Visit" subtitle="Default: latest completed visit">
              {lookupResult.allCompletedVisits.length === 0 ? <EmptyState title="No completed visits" description="No prescriptions yet" /> : (
                <div className="space-y-2">
                  {lookupResult.allCompletedVisits.map(v => {
                    const latest = lookupResult.latestCompletedVisit?.id === v.id;
                    const sel = selectedVisitId === v.id;
                    return (
                      <button key={v.id} onClick={() => setSelectedVisitId(v.id)}
                        className={`w-full text-left p-3 border rounded-md transition ${sel ? 'border-hospital-500 bg-hospital-50 ring-1 ring-hospital-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-hospital-700">{v.id}</span>
                          <div className="flex gap-1">
                            {latest && <Badge variant="blue">Latest</Badge>}
                            {sel && <Badge variant="green">Selected</Badge>}
                          </div>
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
            {dispenseErr && <Alert variant="error">❌ {dispenseErr}</Alert>}
            {!selectedPrescription ? (
              <Card title="Prescription"><EmptyState title="No prescription for this visit" /></Card>
            ) : (
              <Card title={`Prescription for ${selectedPrescription.visit.id}`} subtitle={`Diagnosis: ${selectedPrescription.prescription.diagnosis}`}>
                <div className="overflow-x-auto mb-4">
                  <table className="table">
                    <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th><th>Price</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {selectedPrescription.medicines.map(m => {
                        const amount = m.unitPrice ? inr(m.unitPrice * m.quantity) : '-';
                        return (
                          <tr key={m.medicineId || m.name}>
                            <td className="font-medium">{m.name}</td>
                            <td>{m.dosage}</td><td>{m.frequency}</td><td>{m.duration}</td><td>{m.quantity}</td>
                            <td className="text-slate-500 text-xs">{m.instructions}</td>
                            <td>{amount}</td>
                            <td>{m.dispensed ? <Badge variant="green">Dispensed</Badge> : <Badge variant="yellow">Pending</Badge>}</td>
                            <td>{!m.dispensed && (
                              <button className="btn btn-primary text-xs px-2 py-1" onClick={() => dispenseMed(m)} disabled={dispensing === m.medicineId}>
                                {dispensing === m.medicineId ? <Spinner /> : 'Dispense'}
                              </button>
                            )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card title="Recent Dispensing Transactions">
              {(txs.data || []).length === 0 ? <EmptyState title="No transactions yet" /> : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Time</th><th>Patient</th><th>Medicine</th><th>Qty</th><th>Amount</th><th>Visit</th><th>By</th></tr></thead>
                    <tbody>
                      {(txs.data || []).slice(0, 10).map(t => (
                        <tr key={t.id}>
                          <td className="text-slate-500 text-xs">{formatDateTime(t.createdAt)}</td>
                          <td className="font-mono text-xs">{t.patientId}</td>
                          <td className="font-medium">{t.medicineName}</td>
                          <td>{t.quantity}</td>
                          <td className="font-semibold">{inr(t.total)}</td>
                          <td className="font-mono text-xs">{t.visitId}</td>
                          <td className="text-slate-500 text-xs">{t.dispensedBy}</td>
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
