export type UserRole = 'customer' | 'admin';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketTag = 'Bug' | 'Billing' | 'Technical Issue' | 'Account Problem' | 'Feature Request' | 'General';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  company: string;
  password?: string;
  registeredAt?: string;
}

export interface Message {
  id: string;
  ticketId: string;
  author: string;
  authorRole: UserRole;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  type: 'created' | 'status_changed' | 'message' | 'rated' | 'tag_added';
  description: string;
  timestamp: string;
  actor?: string;
}

export interface TicketRating {
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  company: string;
  priority: TicketPriority;
  subject: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerLocation: string;
  industry: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  isOverdue: boolean;
  createdBy: string;
  messages: Message[];
  attachment?: string;
  timeline: TimelineEvent[];
  tags: TicketTag[];
  rating?: TicketRating;
}

export interface ActivityLog {
  id: string;
  type: 'user_registered' | 'ticket_created' | 'ticket_closed' | 'ticket_resolved' | 'user_deleted' | 'status_changed' | 'message_sent';
  description: string;
  timestamp: string;
  actor?: string;
}
