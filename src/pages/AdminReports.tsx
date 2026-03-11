import { useState, useMemo } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { FileSpreadsheet, Download, Calendar, Filter, ClipboardList, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subWeeks, subMonths } from 'date-fns';
import * as XLSX from 'xlsx-js-style';

type Period = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

const AdminReports = () => {
  const { tickets, activityLogs } = useTickets();
  const { users } = useAuth();
  const [period, setPeriod] = useState<Period>('this_week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this_week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last_week': {
        const lw = subWeeks(now, 1);
        return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
      }
      case 'this_month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month': {
        const lm = subMonths(now, 1);
        return { from: startOfMonth(lm), to: endOfMonth(lm) };
      }
      case 'custom':
        return {
          from: customFrom ? new Date(customFrom) : startOfWeek(now, { weekStartsOn: 1 }),
          to: customTo ? new Date(customTo + 'T23:59:59') : endOfWeek(now, { weekStartsOn: 1 }),
        };
    }
  }, [period, customFrom, customTo]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const created = new Date(t.createdAt);
      return isWithinInterval(created, { start: dateRange.from, end: dateRange.to });
    });
  }, [tickets, dateRange]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(l => {
      const ts = new Date(l.timestamp);
      return isWithinInterval(ts, { start: dateRange.from, end: dateRange.to });
    });
  }, [activityLogs, dateRange]);

  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(t => t.status === 'Open').length;
    const resolved = filteredTickets.filter(t => t.status === 'Resolved').length;
    const overdue = filteredTickets.filter(t => t.isOverdue || (new Date(t.slaDeadline).getTime() < Date.now() && t.status !== 'Resolved')).length;
    const byPriority = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    filteredTickets.forEach(t => { byPriority[t.priority]++; });
    const byStatus: Record<string, number> = { Open: 0, 'In Progress': 0, Resolved: 0 };
    filteredTickets.forEach(t => { byStatus[t.status]++; });
    return { total, open, resolved, overdue, byPriority, byStatus };
  }, [filteredTickets]);

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: '2563EB' } }, alignment: { horizontal: 'center' }, border: { top: { style: 'thin', color: { rgb: 'B0B0B0' } }, bottom: { style: 'thin', color: { rgb: 'B0B0B0' } }, left: { style: 'thin', color: { rgb: 'B0B0B0' } }, right: { style: 'thin', color: { rgb: 'B0B0B0' } } } };
    const sectionStyle = { font: { bold: true, sz: 13 }, fill: { fgColor: { rgb: 'E8F0FE' } } };
    const labelStyle = { font: { bold: true, sz: 11 } };
    const valueStyle = { font: { sz: 11 } };
    const thinBorder = { top: { style: 'thin', color: { rgb: 'D0D0D0' } }, bottom: { style: 'thin', color: { rgb: 'D0D0D0' } }, left: { style: 'thin', color: { rgb: 'D0D0D0' } }, right: { style: 'thin', color: { rgb: 'D0D0D0' } } };

    const priorityColors: Record<string, string> = { Critical: '8B0000', High: 'DC2626', Medium: 'EA580C', Low: '16A34A' };
    const statusColors: Record<string, string> = { Open: '2563EB', 'In Progress': 'CA8A04', Resolved: '16A34A' };

    const periodStr = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;

    // === REPORT INFORMATION ===
    data.push([{ v: 'Support Ticket Report', s: { font: { bold: true, sz: 18, color: { rgb: '1E3A5F' } } } }]);
    data.push([]);
    data.push([{ v: 'Report Period:', s: labelStyle }, { v: periodStr, s: valueStyle }]);
    data.push([{ v: 'Generated On:', s: labelStyle }, { v: format(new Date(), 'MMM dd, yyyy HH:mm'), s: valueStyle }]);
    data.push([{ v: 'Total Tickets:', s: labelStyle }, { v: stats.total, s: valueStyle }]);
    data.push([]);
    data.push([]);

    // === TICKET OVERVIEW ===
    data.push([{ v: 'Ticket Overview', s: sectionStyle }, { v: '', s: sectionStyle }]);
    data.push([{ v: 'Metric', s: headerStyle }, { v: 'Count', s: headerStyle }]);
    data.push([{ v: 'Total Tickets', s: { ...labelStyle, border: thinBorder } }, { v: stats.total, s: { ...valueStyle, border: thinBorder } }]);
    data.push([{ v: 'Open', s: { ...labelStyle, border: thinBorder } }, { v: stats.byStatus.Open, s: { ...valueStyle, border: thinBorder } }]);
    data.push([{ v: 'Resolved', s: { ...labelStyle, border: thinBorder } }, { v: stats.byStatus.Resolved, s: { ...valueStyle, border: thinBorder } }]);
    data.push([{ v: 'Overdue', s: { ...labelStyle, border: thinBorder } }, { v: stats.overdue, s: { ...valueStyle, border: thinBorder } }]);
    data.push([]);

    // === PRIORITY BREAKDOWN ===
    data.push([{ v: 'Priority Breakdown', s: sectionStyle }, { v: '', s: sectionStyle }]);
    data.push([{ v: 'Priority', s: headerStyle }, { v: 'Count', s: headerStyle }]);
    (['Critical', 'High', 'Medium', 'Low'] as const).forEach(p => {
      data.push([
        { v: p, s: { font: { bold: true, color: { rgb: priorityColors[p] } }, border: thinBorder } },
        { v: stats.byPriority[p], s: { ...valueStyle, border: thinBorder } },
      ]);
    });
    data.push([]);

    // === STATUS BREAKDOWN ===
    data.push([{ v: 'Status Breakdown', s: sectionStyle }, { v: '', s: sectionStyle }]);
    data.push([{ v: 'Status', s: headerStyle }, { v: 'Count', s: headerStyle }]);
    (['Open', 'In Progress', 'Resolved'] as const).forEach(s => {
      data.push([
        { v: s, s: { font: { bold: true, color: { rgb: statusColors[s] } }, border: thinBorder } },
        { v: stats.byStatus[s], s: { ...valueStyle, border: thinBorder } },
      ]);
    });
    data.push([]);
    data.push([]);

    // === TICKET DETAILS TABLE ===
    data.push([{ v: 'Ticket Details', s: { font: { bold: true, sz: 14, color: { rgb: '1E3A5F' } } } }]);
    const ticketHeaderRow = ['Ticket ID', 'Subject', 'Customer Name', 'Email', 'Phone', 'Location', 'Industry', 'Company', 'Status', 'Priority', 'Created Date'].map(h => ({ v: h, s: headerStyle }));
    const ticketHeaderRowIndex = data.length;
    data.push(ticketHeaderRow);

    filteredTickets.forEach(t => {
      data.push([
        { v: t.id, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.subject, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.customerName, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.customerEmail, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.customerPhone, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.customerLocation, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.industry, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.company, s: { font: { sz: 10 }, border: thinBorder } },
        { v: t.status, s: { font: { sz: 10, color: { rgb: statusColors[t.status] || '000000' } }, border: thinBorder } },
        { v: t.priority, s: { font: { sz: 10, bold: true, color: { rgb: priorityColors[t.priority] || '000000' } }, border: thinBorder } },
        { v: format(new Date(t.createdAt), 'MMM dd, yyyy'), s: { font: { sz: 10 }, border: thinBorder } },
      ]);
    });

    if (filteredTickets.length === 0) {
      data.push([{ v: 'No tickets in this period', s: { font: { italic: true, color: { rgb: '999999' } } } }]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    ];

    // Freeze panes at ticket header row
    ws['!freeze'] = { xSplit: 0, ySplit: ticketHeaderRowIndex + 1 };

    // Auto filter on ticket table
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: ticketHeaderRowIndex, c: 0 }, e: { r: ticketHeaderRowIndex + filteredTickets.length, c: 10 } }) };

    // Merge title cell
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Support Report');

    const fromStr = format(dateRange.from, 'MMM_dd_yyyy');
    const toStr = format(dateRange.to, 'MMM_dd_yyyy');
    XLSX.writeFile(wb, `Support_Report_${fromStr}_to_${toStr}.xlsx`);
  };

  const periodLabels: Record<Period, string> = {
    this_week: 'This Week',
    last_week: 'Last Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range',
  };

  const statCards = [
    { icon: ClipboardList, label: 'Total Tickets', value: stats.total, color: 'text-primary', bg: 'bg-primary/8' },
    { icon: Clock, label: 'Open', value: stats.open, color: 'text-blue-500', bg: 'bg-blue-500/8' },
    { icon: CheckCircle, label: 'Resolved / Closed', value: stats.resolved, color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
    { icon: AlertTriangle, label: 'Overdue', value: stats.overdue, color: 'text-destructive', bg: 'bg-destructive/8' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">Track & download weekly/monthly reports</p>
          </div>
        </div>
        <button
          onClick={downloadExcel}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-primary-glow"
        >
          <Download className="h-4 w-4" /> Download Excel
        </button>
      </div>

      {/* Period Filter */}
      <div className="card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-card-foreground">Filter Period</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(periodLabels) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground shadow-primary-glow'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Showing: {format(dateRange.from, 'MMM dd, yyyy')} — {format(dateRange.to, 'MMM dd, yyyy')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map(card => (
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

      {/* Priority & Status breakdown */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="card-premium p-5">
          <h3 className="font-heading text-sm font-semibold text-card-foreground mb-3">By Priority</h3>
          <div className="space-y-2.5">
            {([
              { key: 'Critical' as const, color: 'bg-destructive' },
              { key: 'High' as const, color: 'bg-orange-500' },
              { key: 'Medium' as const, color: 'bg-yellow-500' },
              { key: 'Low' as const, color: 'bg-emerald-500' },
            ]).map(({ key, color }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{key}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-muted" style={{ width: 80 }}>
                    <div
                      className={`h-2 rounded-full ${color} transition-all`}
                      style={{ width: stats.total > 0 ? (stats.byPriority[key] / stats.total) * 80 : 0 }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-card-foreground w-6 text-right">{stats.byPriority[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-premium p-5">
          <h3 className="font-heading text-sm font-semibold text-card-foreground mb-3">By Status</h3>
          <div className="space-y-2.5">
            {([
              { key: 'Open' as const, color: 'bg-blue-500' },
              { key: 'In Progress' as const, color: 'bg-yellow-500' },
              { key: 'Resolved' as const, color: 'bg-emerald-500' },
            ]).map(({ key, color }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{key}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-muted" style={{ width: 80 }}>
                    <div
                      className={`h-2 rounded-full ${color} transition-all`}
                      style={{ width: stats.total > 0 ? (stats.byStatus[key] / stats.total) * 80 : 0 }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-card-foreground w-6 text-right">{stats.byStatus[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="card-premium overflow-hidden">
        <div className="border-b border-border px-5 py-3.5">
          <h3 className="font-heading text-sm font-semibold text-card-foreground">
            Tickets in Period ({filteredTickets.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Industry</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id} className="border-b border-border transition-colors hover:bg-accent/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-card-foreground truncate max-w-[200px]">{t.subject}</td>
                  <td className="px-4 py-3 text-card-foreground font-medium">{t.customerName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.customerEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{t.customerPhone}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.customerLocation}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.industry}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.company}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      t.status === 'Open' ? 'bg-blue-500/10 text-blue-600' :
                      t.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-600' :
                      t.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-muted text-muted-foreground'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      t.priority === 'Critical' ? 'bg-destructive/10 text-destructive' :
                      t.priority === 'High' ? 'bg-orange-500/10 text-orange-600' :
                      t.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-emerald-500/10 text-emerald-600'
                    }`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{format(new Date(t.createdAt), 'MMM dd, yyyy')}</td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-muted-foreground">No tickets in this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
