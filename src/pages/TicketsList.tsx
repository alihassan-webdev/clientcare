import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { TicketStatus, TicketPriority, TicketTag } from '@/types';
import { Search, SlidersHorizontal, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved'];
const PRIORITIES: TicketPriority[] = ['Critical', 'High', 'Medium', 'Low'];

const TicketsList = () => {
  const { user, users } = useAuth();
  const { tickets, deleteTicket } = useTickets();
  const isAdmin = user?.role === 'admin';
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = isAdmin ? tickets : tickets.filter(t => t.createdBy === user?.id);
    if (statusFilter) result = result.filter(t => t.status === statusFilter);
    if (priorityFilter) result = result.filter(t => t.priority === priorityFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        return t.subject.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q) ||
          t.company.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q));
      });
    }
    return result;
  }, [tickets, isAdmin, user, statusFilter, priorityFilter, search]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {isAdmin ? 'All Tickets' : 'My Tickets'}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{filtered.length} ticket{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filters */}
      <div className="card-premium p-3.5 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={isAdmin ? "Search by ID, subject, customer, email, company, or tag..." : "Search tickets..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 min-w-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:border-ring focus:outline-none">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="flex-1 min-w-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus:border-ring focus:outline-none">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {/* Quick status filters */}
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'Critical' ? '' : 'Critical')}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              priorityFilter === 'Critical' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            High Priority
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ticket ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                {isAdmin && <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>}
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => {
                const isOverdue = new Date(ticket.slaDeadline).getTime() < Date.now() && !['Resolved', 'Closed'].includes(ticket.status);
                return (
                  <tr key={ticket.id} className={`border-b border-border transition-colors hover:bg-accent/40 ${isOverdue ? 'bg-destructive/[0.03]' : ''}`}>
                    <td className="px-4 py-3.5">
                      <Link to={`/tickets/${ticket.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{ticket.id}</Link>
                    </td>
                    <td className="px-4 py-3.5 max-w-[250px]">
                      <Link to={`/tickets/${ticket.id}`} className="text-[13px] font-medium text-card-foreground hover:text-primary line-clamp-1 transition-colors">{ticket.subject}</Link>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-card-foreground capitalize truncate">{ticket.customerName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{ticket.customerEmail}</p>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3.5"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3.5"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                            <Tag className="h-2 w-2" />{tag}
                          </span>
                        ))}
                        {ticket.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{ticket.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {['Resolved', 'Closed'].includes(ticket.status)
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : <SLACountdown deadline={ticket.slaDeadline} compact />}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(ticket.updatedAt)}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => { e.preventDefault(); setDeleteConfirm(ticket.id); }}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete ticket"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="px-4 py-16 text-center text-muted-foreground">No tickets found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <h3 className="font-heading text-lg font-semibold text-card-foreground">Delete Ticket</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete this ticket? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button
                onClick={() => {
                  deleteTicket(deleteConfirm, user?.name);
                  toast.success('Ticket deleted successfully');
                  setDeleteConfirm(null);
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsList;
