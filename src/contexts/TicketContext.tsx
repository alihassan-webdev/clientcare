import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, TicketPriority, TicketStatus, Message, TimelineEvent, TicketTag, TicketRating, ActivityLog } from '@/types';
import { mockTickets } from '@/data/mockData';

const SLA_HOURS: Record<TicketPriority, number> = {
  Critical: 1,
  High: 4,
  Medium: 8,
  Low: 24,
};

interface TicketContextType {
  tickets: Ticket[];
  activityLogs: ActivityLog[];
  addTicket: (data: { subject: string; description: string; priority: TicketPriority; createdBy: string; company: string; customerName: string; customerEmail: string; customerPhone: string; customerLocation: string; industry: string; attachment?: string }) => Ticket;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string, actor?: string) => void;
  addMessage: (ticketId: string, message: Omit<Message, 'id' | 'ticketId' | 'createdAt'>) => void;
  changeStatus: (ticketId: string, status: TicketStatus, actor?: string) => void;
  addTag: (ticketId: string, tag: TicketTag, actor?: string) => void;
  removeTag: (ticketId: string, tag: TicketTag) => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
}

const TicketContext = createContext<TicketContextType | null>(null);

export const useTickets = () => {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
};

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [nextId, setNextId] = useState(mockTickets.length + 1);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    setActivityLogs(prev => [{
      ...log,
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addTicket = useCallback((data: { subject: string; description: string; priority: TicketPriority; createdBy: string; company: string; customerName: string; customerEmail: string; customerPhone: string; customerLocation: string; industry: string; attachment?: string }) => {
    const now = new Date().toISOString();
    const slaMs = SLA_HOURS[data.priority] * 3_600_000;
    const ticketId = `TKT-${String(nextId).padStart(4, '0')}`;

    // Auto admin welcome message
    const autoMsg: Message = {
      id: `msg-auto-${Date.now()}`,
      ticketId,
      author: 'Support Team',
      authorRole: 'admin',
      content: `Thank you for contacting us, ${data.customerName}. Your ticket (${ticketId}) has been received. Our team will review your issue and resolve it as soon as possible.`,
      isInternal: false,
      createdAt: now,
    };

    const ticket: Ticket = {
      ...data,
      id: ticketId,
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      slaDeadline: new Date(Date.now() + slaMs).toISOString(),
      isOverdue: false,
      messages: [autoMsg],
      timeline: [
        { id: `tl-${Date.now()}`, type: 'created', description: `Ticket created by ${data.customerName}`, timestamp: now },
      ],
      tags: [],
    };
    setNextId(prev => prev + 1);
    setTickets(prev => [ticket, ...prev]);
    addActivityLog({ type: 'ticket_created', description: `Ticket ${ticketId} created`, actor: data.customerName });
    return ticket;
  }, [nextId, addActivityLog]);

  const updateTicket = useCallback((id: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
  }, []);

  const deleteTicket = useCallback((id: string, actor?: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
    addActivityLog({ type: 'ticket_closed', description: `Ticket ${id} deleted`, actor });
  }, [addActivityLog]);

  const addMessage = useCallback((ticketId: string, message: Omit<Message, 'id' | 'ticketId' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newMsg: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      ticketId,
      createdAt: now,
    };
    const tlEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'message',
      description: `${message.author} ${message.isInternal ? 'added an internal note' : 'sent a message'}`,
      timestamp: now,
      actor: message.author,
    };
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, messages: [...t.messages, newMsg], timeline: [...t.timeline, tlEvent], updatedAt: now }
        : t
    ));
    addActivityLog({ type: 'message_sent', description: `Message on ${ticketId} by ${message.author}`, actor: message.author });
  }, [addActivityLog]);

  const changeStatus = useCallback((ticketId: string, status: TicketStatus, actor?: string) => {
    const now = new Date().toISOString();
    const tlEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'status_changed',
      description: `Status changed to ${status}`,
      timestamp: now,
      actor,
    };
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status, timeline: [...t.timeline, tlEvent], updatedAt: now } : t
    ));
    const logType = status === 'Resolved' ? 'ticket_resolved' : 'status_changed';
    addActivityLog({ type: logType, description: `Ticket ${ticketId} → ${status}`, actor });
  }, [addActivityLog]);

  const addTag = useCallback((ticketId: string, tag: TicketTag, actor?: string) => {
    const now = new Date().toISOString();
    const tlEvent: TimelineEvent = {
      id: `tl-${Date.now()}`,
      type: 'tag_added',
      description: `Tag "${tag}" added`,
      timestamp: now,
      actor,
    };
    setTickets(prev => prev.map(t =>
      t.id === ticketId && !t.tags.includes(tag)
        ? { ...t, tags: [...t.tags, tag], timeline: [...t.timeline, tlEvent], updatedAt: now }
        : t
    ));
  }, []);

  const removeTag = useCallback((ticketId: string, tag: TicketTag) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, tags: t.tags.filter(tg => tg !== tag), updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  return (
    <TicketContext.Provider value={{ tickets, activityLogs, addTicket, updateTicket, deleteTicket, addMessage, changeStatus, addTag, removeTag, addActivityLog }}>
      {children}
    </TicketContext.Provider>
  );
};
