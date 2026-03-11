import { User, Ticket } from '@/types';

const NOW = Date.now();
const DAY = 86_400_000;

export const mockUsers: User[] = [
  { id: 'admin-1', name: 'Ali Hassan', email: 'ali.hassan@aviratechnologies.com', phone: '+92 321 9876543', role: 'admin', company: 'Avira Technologies', password: 'admin123', registeredAt: new Date(NOW - 60 * DAY).toISOString() },
];

export const mockTickets: Ticket[] = [];
