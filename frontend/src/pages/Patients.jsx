import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { patientService } from '../services/patientService';
import { Card, Spinner, EmptyState, Alert } from '../components/UI';
import { formatDate } from '../utils/format';

export default function Patients() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading, error, execute } = useApi(() => patientService.getAll({ search: search || undefined }), true, []);

  const [byMobile, setByMobile] = useState('');
  const [mobileError, setMobileError] = useState('');

  function handleMobileSearch(e) {
    e.preventDefault();
    setMobileError('');
    patientService.getByMobile(byMobile).then(p => {
      nav(`/patients/${p.id}`);
    }).catch(err => {
      setMobileError(err?.error?.message || 'Patient not found');
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Patient Lookup" subtitle="Search by P_ID, name or mobile number">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Search (P_ID / Name / Mobile)</label>
            <div className="flex gap-2">
              <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. P001, Rahul, 98765..." />
              <button className="btn btn-primary" onClick={() => execute()}>🔍</button>
            </div>
          </div>
          <form onSubmit={handleMobileSearch}>
            <label className="label">Find by Mobile</label>
            <div className="flex gap-2">
              <input className="input" value={byMobile} onChange={e => setByMobile(e.target.value)} placeholder="Mobile number" />
              <button className="btn btn-primary">Go</button>
            </div>
            {mobileError && <p className="text-xs text-red-600 mt-1">{mobileError}</p>}
          </form>
          <div className="flex items-end">
            <Link to="/patients/new" className="btn btn-primary w-full">➕ New Registration</Link>
          </div>
        </div>
      </Card>

      <Card title="Patient Directory" subtitle={`${(data || []).length} patients`}>
        {loading && <div className="py-10 flex justify-center"><Spinner /></div>}
        {error && <Alert variant="error">{error?.message || 'Failed to load patients'}</Alert>}
        {!loading && !error && (data || []).length === 0 && <EmptyState title="No patients match your search" />}
        {!loading && !error && (data || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>P_ID</th><th>Name</th><th>Gender</th><th>Age</th><th>Mobile</th><th>Registered</th><th></th></tr></thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id} className="cursor-pointer" onClick={() => nav(`/patients/${p.id}`)}>
                    <td className="font-mono font-semibold text-hospital-700">{p.id}</td>
                    <td className="font-medium">{p.firstName} {p.lastName}</td>
                    <td>{p.gender}</td>
                    <td>{p.age} yrs</td>
                    <td>{p.mobileNumber}</td>
                    <td className="text-slate-500">{formatDate(p.createdAt)}</td>
                    <td><Link to={`/patients/${p.id}`} className="text-sm text-hospital-700 hover:underline">View →</Link></td>
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
