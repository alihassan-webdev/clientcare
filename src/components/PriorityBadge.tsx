import { TicketPriority } from '@/types';

const priorityConfig: Record<TicketPriority, { bg: string; text: string }> = {
  'Critical': { bg: 'bg-priority-critical-subtle', text: 'text-priority-critical' },
  'High': { bg: 'bg-priority-high-subtle', text: 'text-priority-high' },
  'Medium': { bg: 'bg-priority-medium-subtle', text: 'text-priority-medium' },
  'Low': { bg: 'bg-priority-low-subtle', text: 'text-priority-low' },
};

export const PriorityBadge = ({ priority }: { priority: TicketPriority }) => {
  const config = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {priority}
    </span>
  );
};
