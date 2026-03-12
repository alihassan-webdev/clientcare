import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Ticket, TicketPriority, TicketStatus, Message, TimelineEvent, TicketTag, TicketRating, ActivityLog } from '@/types';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import app from '@/firebase';
import { toast } from 'sonner';

const SLA_HOURS: Record<TicketPriority, number> = {
  Critical: 1,
  High: 4,
  Medium: 8,
  Low: 24,
};

interface TicketContextType {
  tickets: Ticket[];
  activityLogs: ActivityLog[];
  loading: boolean;
  addTicket: (data: { subject: string; description: string; priority: TicketPriority; createdBy: string; company?: string; fullName: string; email: string; phone: string; location: string; industry: string; attachment?: string }) => Promise<Ticket | null>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: string, actor?: string) => Promise<void>;
  addMessage: (ticketId: string, message: Omit<Message, 'id' | 'ticketId' | 'createdAt'>) => void;
  changeStatus: (ticketId: string, status: TicketStatus, actor?: string) => Promise<void>;
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(app);

  // Set up real-time listener for tickets from Firestore
  useEffect(() => {
    const ticketsCollection = collection(db, 'tickets');
    const q = query(ticketsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData: Ticket[] = [];
      snapshot.forEach((doc) => {
        ticketsData.push({
          id: doc.id,
          ...doc.data(),
        } as Ticket);
      });
      // Sort by createdAt descending (newest first)
      ticketsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(ticketsData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to tickets:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    setActivityLogs(prev => [{
      ...log,
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, ...prev]);
  }, []);

  const addTicket = useCallback(async (data: { subject: string; description: string; priority: TicketPriority; createdBy: string; company?: string; fullName: string; email: string; phone: string; location: string; industry: string; attachment?: string }) => {
    try {
      const now = new Date().toISOString();
      const ticketsCollection = collection(db, 'tickets');

      const ticketData: Omit<Ticket, 'id'> = {
        ticketId: '', // Will be set after document creation
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        industry: data.industry,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        status: 'open',
        createdAt: now,
        createdBy: data.createdBy,
        company: data.company,
        updatedAt: now,
        attachment: data.attachment,
        messages: [],
        timeline: [
          {
            id: `tl-${Date.now()}`,
            type: 'created',
            description: `Ticket created by ${data.fullName}`,
            timestamp: now
          },
        ],
        tags: [],
      };

      const docRef = await addDoc(ticketsCollection, ticketData);
      console.log('Ticket created successfully:', docRef.id);

      // Update the document with the ticketId based on document ID
      const ticketId = `TCK-${docRef.id.substring(0, 8).toUpperCase()}`;
      await updateDoc(docRef, { ticketId });

      const newTicket: Ticket = {
        id: docRef.id,
        ...ticketData,
        ticketId,
      };

      addActivityLog({ type: 'ticket_created', description: `Ticket ${ticketId} created`, actor: data.fullName });
      return newTicket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error adding ticket:', error);
      console.error('Error details:', {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        code: (error as any)?.code,
      });
      toast.error('Failed to create ticket. Please check the console for details.');
      return null;
    }
  }, [db, addActivityLog]);

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    try {
      const ticketRef = doc(db, 'tickets', id);
      await updateDoc(ticketRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    }
  }, [db]);

  const deleteTicket = useCallback(async (id: string, actor?: string) => {
    try {
      const ticketRef = doc(db, 'tickets', id);
      await deleteDoc(ticketRef);
      addActivityLog({ type: 'ticket_closed', description: `Ticket ${id} deleted`, actor });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      toast.error('Failed to delete ticket');
    }
  }, [db, addActivityLog]);

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
    
    // Update local state for immediate UI feedback
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { 
            ...t, 
            messages: [...(t.messages || []), newMsg], 
            timeline: [...(t.timeline || []), tlEvent], 
            updatedAt: now 
          }
        : t
    ));

    // Also update in Firestore
    updateTicket(ticketId, {
      messages: [...(tickets.find(t => t.id === ticketId)?.messages || []), newMsg],
      timeline: [...(tickets.find(t => t.id === ticketId)?.timeline || []), tlEvent],
    });

    addActivityLog({ type: 'message_sent', description: `Message on ${ticketId} by ${message.author}`, actor: message.author });
  }, [updateTicket, tickets, addActivityLog]);

  const changeStatus = useCallback(async (ticketId: string, status: TicketStatus, actor?: string) => {
    try {
      const now = new Date().toISOString();
      const tlEvent: TimelineEvent = {
        id: `tl-${Date.now()}`,
        type: 'status_changed',
        description: `Status changed to ${status}`,
        timestamp: now,
        actor,
      };

      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        await updateTicket(ticketId, {
          status,
          timeline: [...(ticket.timeline || []), tlEvent],
        });

        const logType = status === 'resolved' ? 'ticket_resolved' : 'status_changed';
        addActivityLog({ type: logType, description: `Ticket ${ticketId} → ${status}`, actor });
      }
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to change ticket status');
    }
  }, [tickets, updateTicket, addActivityLog]);

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
      t.id === ticketId && !(t.tags || []).includes(tag)
        ? { 
            ...t, 
            tags: [...(t.tags || []), tag], 
            timeline: [...(t.timeline || []), tlEvent], 
            updatedAt: now 
          }
        : t
    ));

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket && !(ticket.tags || []).includes(tag)) {
      updateTicket(ticketId, {
        tags: [...(ticket.tags || []), tag],
        timeline: [...(ticket.timeline || []), tlEvent],
      });
    }
  }, [updateTicket, tickets]);

  const removeTag = useCallback((ticketId: string, tag: TicketTag) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { 
            ...t, 
            tags: (t.tags || []).filter(tg => tg !== tag), 
            updatedAt: new Date().toISOString() 
          }
        : t
    ));

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      updateTicket(ticketId, {
        tags: (ticket.tags || []).filter(tg => tg !== tag),
      });
    }
  }, [updateTicket, tickets]);

  return (
    <TicketContext.Provider value={{ tickets, activityLogs, loading, addTicket, updateTicket, deleteTicket, addMessage, changeStatus, addTag, removeTag, addActivityLog }}>
      {children}
    </TicketContext.Provider>
  );
};
