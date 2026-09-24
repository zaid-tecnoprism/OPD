export function Badge({ children, variant = 'gray' }) {
  const cls = {
    green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red',
    blue: 'badge-blue', gray: 'badge-gray', purple: 'badge-purple'
  }[variant] || 'badge-gray';
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function Spinner({ size = 'sm' }) {
  const wh = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <svg className={`animate-spin ${wh} text-hospital-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function EmptyState({ title = 'No data', description = '' }) {
  return (
    <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-lg">
      <div className="text-4xl mb-3">📭</div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      {description && <div className="text-xs text-slate-500 mt-1">{description}</div>}
    </div>
  );
}

export function Alert({ variant = 'info', children }) {
  const cls = { info: 'alert-info', success: 'alert-success', warn: 'alert-warn', error: 'alert-error' }[variant] || 'alert-info';
  return <div className={`alert ${cls}`}>{children}</div>;
}

export function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="card-header flex items-center justify-between">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}

export function priorityBadge(p) {
  if (p === 'priority review') return <Badge variant="red">Priority Review</Badge>;
  if (p === 'urgent clinical review required') return <Badge variant="red">Urgent Review</Badge>;
  return <Badge variant="green">Routine</Badge>;
}

export function statusBadge(s) {
  const map = {
    pending: ['gray', 'Pending'],
    called: ['yellow', 'Called'],
    'in consultation': ['blue', 'In Consultation'],
    completed: ['green', 'Completed'],
    cancelled: ['red', 'Cancelled'],
    paid: ['green', 'Paid'],
    dispensed: ['green', 'Dispensed'],
    confirmed: ['blue', 'Confirmed']
  };
  const [variant, label] = map[s] || ['gray', s];
  return <Badge variant={variant}>{label}</Badge>;
}
