import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ClipboardList, AlertTriangle, TrendingUp, Clock, ArrowUpRight, Shield, Users, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const PRIORITY_COLORS = ['hsl(0,72%,50%)', 'hsl(25,95%,53%)', 'hsl(45,93%,47%)', 'hsl(152,60%,42%)'];

const AdminDashboard = () => {
  const { user, users } = useAuth();
  const { tickets, activityLogs } = useTickets();

  if (!user) return null;

  const openTickets = tickets.filter(t => t.status === 'Open');
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress');
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved');
  const overdueTickets = tickets.filter(t => t.isOverdue || (new Date(t.slaDeadline).getTime() < Date.now() && t.status !== 'Resolved'));
  const totalCustomers = users.filter(u => u.role === 'customer').length;

  const statusCounts = ['Open', 'In Progress', 'Resolved'].map(s => ({
    name: s,
    count: tickets.filter(t => t.status === s).length,
  })).filter(d => d.count > 0);

  const priorityCounts = ['Critical', 'High', 'Medium', 'Low'].map((p, i) => ({
    name: p,
    count: tickets.filter(t => t.priority === p).length,
    fill: PRIORITY_COLORS[i],
  })).filter(d => d.count > 0);

  const slaCompliance = tickets.length > 0
    ? Math.round((tickets.filter(t => !t.isOverdue && new Date(t.slaDeadline).getTime() >= Date.now()).length / tickets.length) * 100)
    : 100;


  const recentTickets = [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
  const recentLogs = activityLogs.slice(0, 8);

  const cards = [
    { icon: ClipboardList, label: 'Total Tickets', value: tickets.length, color: 'text-primary', bg: 'bg-primary/8' },
    { icon: Clock, label: 'Open Tickets', value: openTickets.length, color: 'text-blue-500', bg: 'bg-blue-500/8' },
    { icon: CheckCircle, label: 'Resolved', value: resolvedTickets.length, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
    { icon: Users, label: 'Total Customers', value: totalCustomers, color: 'text-violet-500', bg: 'bg-violet-500/8' },
    { icon: AlertTriangle, label: 'Overdue', value: overdueTickets.length, color: 'text-destructive', bg: 'bg-destructive/8' },
    { icon: TrendingUp, label: 'SLA Compliance', value: `${slaCompliance}%`, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
  ];

  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const LOG_COLORS: Record<string, string> = {
    user_registered: 'bg-violet-500/10 text-violet-500',
    ticket_created: 'bg-blue-500/10 text-blue-500',
    ticket_closed: 'bg-muted text-muted-foreground',
    ticket_resolved: 'bg-emerald-500/10 text-emerald-500',
    user_deleted: 'bg-destructive/10 text-destructive',
    status_changed: 'bg-orange-500/10 text-orange-500',
    message_sent: 'bg-primary/10 text-primary',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">System overview &amp; management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(card => (
          <div key={card.label} className="card-premium p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{card.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="font-heading text-2xl font-bold tracking-tight text-card-foreground">{card.value}</p>
          </div>
        ))}
      </div>


      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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

        <div className="card-premium p-5">
          <h3 className="mb-4 font-heading text-sm font-semibold text-card-foreground">Tickets by Priority</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} label={{ fontSize: 11 }} strokeWidth={2} stroke="hsl(0,0%,100%)">
                  {priorityCounts.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid hsl(220,15%,91%)', boxShadow: '0 4px 12px hsl(225 30% 10% / 0.08)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-card-foreground">Recent Tickets</h3>
            <Link to="/tickets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="divide-y divide-border">
            {recentTickets.map(ticket => (
              <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{ticket.id}</span>
                  <span className="text-sm font-medium text-card-foreground truncate">{ticket.subject}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h3 className="font-heading text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Activity Log
            </h3>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${LOG_COLORS[log.type] || 'bg-muted text-muted-foreground'}`}>
                  <Activity className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground truncate">{log.description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatTime(log.timestamp)}{log.actor ? ` • ${log.actor}` : ''}</p>
                </div>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No activity yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
