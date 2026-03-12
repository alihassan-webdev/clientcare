import { TicketStatus } from '@/types';

const statusConfig: Record<TicketStatus, { bg: string; text: string; dot: string; label: string }> = {
  'open': { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500', label: 'Open' },
  'in_progress': { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500', label: 'In Progress' },
  'resolved': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Resolved' },
  'closed': { bg: 'bg-slate-500/10', text: 'text-slate-600', dot: 'bg-slate-500', label: 'Closed' },
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const config = statusConfig[status] || statusConfig['open'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
