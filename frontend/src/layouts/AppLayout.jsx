import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/patients', label: 'Patients', icon: '👤' },
  { to: '/doctor/queue', label: 'Doctor', icon: '🩺' },
  { to: '/pharmacy', label: 'Pharmacy', icon: '💊' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/tests', label: 'Test Center', icon: '🧪' },
  { to: '/billing', label: 'Billing', icon: '💵' },
  { to: '/audit', label: 'Audit Log', icon: '📋' }
];

export default function AppLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-hospital-600 text-white">
          <div className="text-lg font-bold">City General Hospital</div>
          <div className="text-xs text-green-100">OPD Management System</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = loc.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${active ? 'bg-hospital-50 text-hospital-700 border border-green-200' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
          <div>⚠️ Demo prototype</div>
          <div>Not a clinical system</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-10">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-600">{(navItems.find(n => loc.pathname.startsWith(n.to)) || {}).label || 'Home'}</h2>
          </div>
          <div className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
