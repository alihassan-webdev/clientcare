import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { tickets } = useTickets();

  if (!user) return null;

  const userTickets = tickets.filter(t => t.createdBy === user.id);
  const openTickets = userTickets.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const resolvedTickets = userTickets.filter(t => t.status === 'Resolved');
  const overdueTickets = userTickets.filter(t => t.isOverdue || new Date(t.slaDeadline).getTime() < Date.now());

  const slaCompliance = userTickets.length > 0
    ? Math.round((userTickets.filter(t => !t.isOverdue && new Date(t.slaDeadline).getTime() >= Date.now()).length / userTickets.length) * 100)
    : 100;

  const statusCounts = ['Open', 'In Progress', 'Resolved', 'Closed'].map(s => ({
    name: s,
    count: userTickets.filter(t => t.status === s).length,
  })).filter(d => d.count > 0);

  const recentTickets = [...userTickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  const cards = [
    { icon: Clock, label: 'Open Tickets', value: openTickets.length, color: 'text-primary', bg: 'bg-primary/8' },
    { icon: CheckCircle, label: 'Resolved', value: resolvedTickets.length, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
    { icon: AlertTriangle, label: 'Overdue', value: overdueTickets.length, color: 'text-destructive', bg: 'bg-destructive/8' },
    { icon: TrendingUp, label: 'SLA Compliance', value: `${slaCompliance}%`, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">My Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground capitalize">Welcome back, {user.name}</p>
      </div>

      <div className="card-premium p-5">
        <h3 className="mb-4 font-heading text-sm font-semibold text-card-foreground">My Profile</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Full Name', value: user.name },
            { label: 'Email', value: user.email },
            { label: 'Phone', value: user.phone },
            { label: 'Company', value: user.company },
            { label: 'Role', value: user.role },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-card-foreground capitalize">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="card-premium p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-muted-foreground">{card.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-[18px] w-[18px] ${card.color}`} />
              </div>
            </div>
            <p className="mt-3 font-heading text-3xl font-bold tracking-tight text-card-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card-premium p-5">
        <h3 className="mb-4 font-heading text-sm font-semibold text-card-foreground">Tickets by Status</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,92%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220,10%,46%)' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(220,10%,46%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(220,15%,91%)', boxShadow: '0 4px 12px hsl(225 30% 10% / 0.08)', fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(225,72%,52%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="font-heading text-sm font-semibold text-card-foreground">Recent Activity</h3>
          <Link to="/tickets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
        <div className="divide-y divide-border">
          {recentTickets.map(ticket => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                <span className="text-sm font-medium text-card-foreground">{ticket.subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <SLACountdown deadline={ticket.slaDeadline} compact />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
