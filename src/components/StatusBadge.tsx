import { TicketStatus } from '@/types';

const statusConfig: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  'Open': { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' },
  'In Progress': { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500' },
  'Resolved': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
};

export const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const config = statusConfig[status] || statusConfig['Open'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
};
