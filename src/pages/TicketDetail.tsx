import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { SLACountdown } from '@/components/SLACountdown';
import { TicketStatus, TicketTag } from '@/types';
import { toast } from 'sonner';
import {
  ArrowLeft, Send, Building, Clock, User, Eye, EyeOff, MessageSquare, Lock, Phone, Mail,
  CheckCircle, Circle, ArrowRightCircle, XCircle, Tag, X, MapPin, Factory, Paperclip, FileText, Trash2,
} from 'lucide-react';

const STATUSES: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
const ALL_TAGS: TicketTag[] = ['Bug', 'Billing', 'Technical Issue', 'Account Problem', 'Feature Request', 'General'];

const TIMELINE_ICONS: Record<string, any> = {
  created: Circle,
  status_changed: ArrowRightCircle,
  message: MessageSquare,
  tag_added: Tag,
};

const TIMELINE_COLORS: Record<string, string> = {
  created: 'text-blue-500 bg-blue-500/10',
  status_changed: 'text-orange-500 bg-orange-500/10',
  message: 'text-primary bg-primary/10',
  tag_added: 'text-emerald-500 bg-emerald-500/10',
};

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, users } = useAuth();
  const { tickets, addMessage, changeStatus, addTag, removeTag, deleteTicket } = useTickets();

  const ticket = tickets.find(t => t.id === id);
  const isAdmin = user?.role === 'admin';

  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showConfirm, setShowConfirm] = useState<TicketStatus | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const replyFileRef = React.useRef<HTMLInputElement>(null);

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">Ticket not found</p>
        <button onClick={() => navigate('/tickets')} className="mt-4 text-sm text-primary hover:underline">Back to tickets</button>
      </div>
    );
  }

  const handleSend = () => {
    if (!reply.trim() && replyAttachments.length === 0) return;
    const attachmentText = replyAttachments.length > 0
      ? `\n📎 Attachments: ${replyAttachments.map(f => f.name).join(', ')}`
      : '';
    addMessage(ticket.id, {
      author: user?.name || '',
      authorRole: user?.role || 'customer',
      content: (reply.trim() + attachmentText).trim(),
      isInternal,
    });
    setReply('');
    setIsInternal(false);
    setReplyAttachments([]);
    toast.success(isInternal ? 'Internal note added' : 'Reply sent');
  };

  const handleStatusChange = async (status: TicketStatus) => {
    await changeStatus(ticket.id, status, user?.name);
    toast.success(`Status changed to ${STATUS_LABELS[status]}`);
  };

  const confirmStatusChange = async () => {
    if (showConfirm) {
      await changeStatus(ticket.id, showConfirm, user?.name);
      toast.success(`Ticket status updated`);
      setShowConfirm(null);
    }
  };

  const visibleMessages = (ticket.messages || []).filter(m => isAdmin || !m.isInternal);
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';

  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <h3 className="font-heading text-lg font-semibold text-card-foreground">Confirm Action</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to close this ticket? This action can be reversed by changing the status.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setShowConfirm(null)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button onClick={confirmStatusChange} className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-premium-xl animate-scale-in">
            <h3 className="font-heading text-lg font-semibold text-card-foreground">Delete Ticket</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete this ticket? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setShowDeleteConfirm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">Cancel</button>
              <button
                onClick={async () => {
                  await deleteTicket(ticket.id, user?.name);
                  toast.success('Ticket deleted successfully');
                  navigate('/tickets');
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button onClick={() => navigate('/tickets')} className="self-start rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{ticket.ticketId}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {(ticket.tags || []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                <Tag className="h-2.5 w-2.5" />{tag}
                {isAdmin && (
                  <button onClick={() => { removeTag(ticket.id, tag); toast.success(`Tag "${tag}" removed`); }} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <h1 className="mt-1 font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground break-words">{ticket.subject}</h1>
        </div>
        {ticket.slaDeadline && (
          <div className="self-start">
            <SLACountdown deadline={ticket.slaDeadline} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card-premium p-5">
            <h3 className="mb-2.5 font-heading text-sm font-semibold text-card-foreground">Description</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{ticket.description}</p>
          </div>

          {/* Timeline */}
          {(ticket.timeline && ticket.timeline.length > 0) && (
            <div className="card-premium p-5">
              <h3 className="mb-4 font-heading text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" /> Status Timeline
              </h3>
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-4">
                  {ticket.timeline.map((event, idx) => {
                    const Icon = TIMELINE_ICONS[event.type] || Circle;
                    const colorClass = TIMELINE_COLORS[event.type] || 'text-muted-foreground bg-muted';
                    return (
                      <div key={event.id} className="relative flex gap-3 pl-0">
                        <div className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-medium text-card-foreground">{event.description}</p>
                          <p className="text-[11px] text-muted-foreground">{formatTime(event.timestamp)}{event.actor ? ` • ${event.actor}` : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Messages - Chat Style */}
          <div className="card-premium overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-card-foreground">
                <MessageSquare className="h-4 w-4" />
                Conversation ({visibleMessages.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {visibleMessages.map(msg => (
                <div key={msg.id} className={`px-5 py-4 ${msg.isInternal ? 'bg-orange-50/50' : ''}`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-sm font-semibold text-card-foreground capitalize">{msg.author}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      msg.authorRole === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                    }`}>{msg.authorRole}</span>
                    {msg.isInternal && (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                        <Lock className="h-2.5 w-2.5" /> Internal
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{msg.content}</p>
                </div>
              ))}
              {visibleMessages.length === 0 && (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">No messages yet</div>
              )}
            </div>

            {/* Reply box */}
            {!isClosed && (
              <div className="border-t border-border p-4">
                {isAdmin && (
                  <button
                    onClick={() => setIsInternal(!isInternal)}
                    className={`mb-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      isInternal ? 'bg-orange-100 text-orange-600' : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {isInternal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {isInternal ? 'Internal Note' : 'Public Reply'}
                  </button>
                )}
                {replyAttachments.length > 0 && (
                  <div className="mb-2.5 space-y-1.5">
                    {replyAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 text-card-foreground">{file.name}</span>
                        <span className="text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setReplyAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={replyFileRef}
                    type="file"
                    multiple
                    onChange={e => { if (e.target.files) setReplyAttachments(prev => [...prev, ...Array.from(e.target.files!)]); }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => replyFileRef.current?.click()}
                    className="rounded-lg border border-input px-2.5 py-2.5 text-muted-foreground transition-colors hover:bg-accent"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={isInternal ? 'Add an internal note...' : 'Type your reply...'}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button onClick={handleSend} disabled={!reply.trim() && replyAttachments.length === 0} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 shadow-primary-glow disabled:shadow-none">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Metadata */}
          <div className="card-premium p-5">
            <h3 className="mb-3.5 font-heading text-sm font-semibold text-card-foreground">Details</h3>
            <div className="space-y-3.5">
              {ticket.company && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><Building className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Company</p><p className="text-sm text-card-foreground">{ticket.company}</p></div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><Factory className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Industry</p><p className="text-sm text-card-foreground">{ticket.industry || '—'}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p><p className="text-sm text-card-foreground">{ticket.location || '—'}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created</p><p className="text-sm text-card-foreground">{formatTime(ticket.createdAt)}</p></div>
              </div>
            </div>
          </div>

          {/* Client Details (Admin only) */}
          {isAdmin && (
            <div className="card-premium p-5">
              <h3 className="mb-3.5 font-heading text-sm font-semibold text-card-foreground">Client Details</h3>
              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><User className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</p><p className="text-sm text-card-foreground capitalize">{ticket.fullName}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</p><p className="text-sm text-card-foreground">{ticket.email}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Phone</p><p className="text-sm text-card-foreground">{ticket.phone || '—'}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Tags (Admin) */}
          {isAdmin && (
            <div className="card-premium p-5">
              <h3 className="mb-3.5 font-heading text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map(tag => {
                  const active = (ticket.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (active) { removeTag(ticket.id, tag); toast.success(`Tag "${tag}" removed`); }
                        else { addTag(ticket.id, tag, user?.name); toast.success(`Tag "${tag}" added`); }
                      }}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        active ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div className="card-premium p-5">
              <h3 className="mb-3.5 font-heading text-sm font-semibold text-card-foreground">Admin Controls</h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Change Status</label>
                  <select
                    value={ticket.status}
                    onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                {!isClosed && (
                  <button onClick={() => handleStatusChange('resolved')} className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
                    Mark Resolved
                  </button>
                )}
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 flex items-center justify-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" /> Delete Ticket
                </button>
              </div>
            </div>
          )}

          {/* Customer delete option */}
          {!isAdmin && (
            <div className="card-premium p-5">
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 flex items-center justify-center gap-2">
                <Trash2 className="h-3.5 w-3.5" /> Delete Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
