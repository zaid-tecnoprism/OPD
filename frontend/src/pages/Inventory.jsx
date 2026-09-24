import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { pharmacyService } from '../services/pharmacyService';
import { Card, Spinner, Alert, EmptyState, Badge } from '../components/UI';
import { inr, getErrorMessage } from '../utils/format';

export default function Inventory() {
  const inv = useApi(() => pharmacyService.getInventory(), true, []);
  const [adjustId, setAdjustId] = useState(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('adjustment');
  const [adjErr, setAdjErr] = useState('');

  async function doAdjust() {
    setAdjErr('');
    try {
      await pharmacyService.updateInventory(adjustId, Number(adjQty), adjReason);
      setAdjustId(null);
      setAdjQty('');
      await inv.execute();
    } catch (e) { setAdjErr(getErrorMessage(e)); }
  }

  if (inv.loading) return <div className="py-20 flex justify-center"><Spinner size="md" /></div>;
  if (inv.error) return <Alert variant="error">{getErrorMessage(inv.error)}</Alert>;

  const items = inv.data || [];
  const totalValue = items.reduce((s, i) => s + i.price * i.stockQuantity, 0);
  const lowCount = items.filter(i => i.lowStock).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-xs text-slate-500">Total SKUs</div><div className="text-2xl font-bold">{items.length}</div></Card>
        <Card><div className="text-xs text-slate-500">Inventory Value</div><div className="text-2xl font-bold">{inr(totalValue)}</div></Card>
        <Card><div className="text-xs text-slate-500">Low Stock Alerts</div><div className={`text-2xl font-bold ${lowCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{lowCount}</div></Card>
      </div>
      {adjErr && <Alert variant="error">{adjErr}</Alert>}
      <Card title="Inventory Stock" subtitle={`${items.length} medicines`}>
        {items.length === 0 ? <EmptyState title="No inventory" /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Unit Price</th><th>GST</th><th>Stock</th><th>Value</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id}>
                    <td className="font-mono text-xs">{i.id}</td>
                    <td className="font-medium">{i.name}</td>
                    <td><Badge variant="blue">{i.category}</Badge></td>
                    <td>{inr(i.price)}</td>
                    <td>{i.gstPercent}%</td>
                    <td className={`font-semibold ${i.stockQuantity < 50 ? 'text-red-600' : ''}`}>{i.stockQuantity} {i.unit}</td>
                    <td className="font-medium">{inr(i.price * i.stockQuantity)}</td>
                    <td>{i.lowStock ? <Badge variant="red">Low Stock</Badge> : <Badge variant="green">OK</Badge>}</td>
                    <td>
                      {adjustId === i.id ? (
                        <div className="flex gap-1">
                          <input className="input text-xs w-20" type="number" placeholder="+/- qty" value={adjQty} onChange={e => setAdjQty(e.target.value)} />
                          <button className="btn btn-primary text-xs px-2" onClick={doAdjust}>Save</button>
                          <button className="btn btn-ghost text-xs" onClick={() => setAdjustId(null)}>×</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost text-xs" onClick={() => { setAdjustId(i.id); setAdjQty(''); }}>Adjust</button>
                      )}
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
