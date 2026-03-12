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
      // Step 1: Log incoming form data
      console.log('=== TICKET CREATION STARTED ===');
      console.log('1. Form data received:', {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        industry: data.industry,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        createdBy: data.createdBy,
        company: data.company,
      });

      // Step 2: Validate required fields
      const requiredFields = ['fullName', 'email', 'subject', 'description', 'priority'];
      const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      console.log('2. Required fields validation: PASSED');

      // Step 3: Verify Firestore is initialized
      console.log('3. Firestore DB initialized:', !!db);
      if (!db) {
        throw new Error('Firestore database is not initialized');
      }

      // Step 4: Create tickets collection reference
      const ticketsCollection = collection(db, 'tickets');
      console.log('4. Tickets collection reference created');

      // Step 5: Build ticket data object
      const now = new Date().toISOString();
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

      console.log('5. Ticket data prepared:', ticketData);
      console.log('   - Priority value type:', typeof ticketData.priority);
      console.log('   - Priority value:', ticketData.priority);
      console.log('   - Allowed values: "Low", "Medium", "High", "Critical"');

      // Step 6: Verify priority matches allowed values
      const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!allowedPriorities.includes(ticketData.priority)) {
        console.warn('Priority mismatch - converting if needed:', {
          received: ticketData.priority,
          allowed: allowedPriorities,
        });
      }

      // Step 7: Attempt to write to Firestore
      console.log('6. Attempting to write ticket to Firestore collection: "tickets"');
      const docRef = await addDoc(ticketsCollection, ticketData);
      console.log('7. Ticket created successfully in Firestore!');
      console.log('   - Document ID:', docRef.id);
      console.log('   - Collection path: "tickets"');

      // Step 8: Update document with generated ticketId
      console.log('8. Updating document with generated ticket ID...');
      const ticketId = `TCK-${docRef.id.substring(0, 8).toUpperCase()}`;
      await updateDoc(docRef, { ticketId });
      console.log('9. Ticket ID updated successfully:', ticketId);

      const newTicket: Ticket = {
        id: docRef.id,
        ...ticketData,
        ticketId,
      };

      addActivityLog({ type: 'ticket_created', description: `Ticket ${ticketId} created`, actor: data.fullName });
      console.log('=== TICKET CREATION COMPLETED ===');
      return newTicket;
    } catch (error) {
      console.error('=== TICKET CREATION FAILED ===');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;

      console.error('ERROR MESSAGE:', errorMessage);
      console.error('ERROR CODE:', errorCode);
      console.error('FULL ERROR OBJECT:', error);

      // Provide specific error context
      if (errorCode === 'permission-denied') {
        console.error('❌ PERMISSION DENIED: Your Firebase security rules are rejecting the write.');
        console.error('   - Check if you are authenticated');
        console.error('   - Check if your priority value matches "Low", "Medium", "High", or "Critical" exactly');
        console.error('   - Check if all required fields are present: fullName, email, subject, description, priority');
      } else if (errorCode === 'not-found') {
        console.error('❌ DATABASE NOT FOUND: Firestore database connection issue.');
      } else if (errorCode === 'unauthenticated') {
        console.error('❌ NOT AUTHENTICATED: You must be logged in to create tickets.');
      }

      console.error('Full error details:', {
        message: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
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
