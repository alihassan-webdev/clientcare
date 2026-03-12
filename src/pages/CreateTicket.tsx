import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { TicketPriority } from '@/types';
import { toast } from 'sonner';
import { Send, Info, Paperclip, X, FileText, Loader } from 'lucide-react';

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const SLA_MAP: Record<TicketPriority, string> = {
  Critical: '1 hour',
  High: '4 hours',
  Medium: '8 hours',
  Low: '24 hours',
};

const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

const CreateTicket = () => {
  const { user } = useAuth();
  const { addTicket } = useTickets();
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerLocation, setCustomerLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: Log form submission attempt
    console.log('=== FORM SUBMISSION INITIATED ===');
    console.log('Current form values:', {
      customerName,
      customerEmail,
      customerPhone,
      customerLocation,
      industry,
      subject,
      description,
      priority,
      attachmentCount: attachments.length,
    });

    // Step 2: Validate required fields client-side
    if (!priority || !subject.trim() || !description.trim() || !customerName.trim() || !customerEmail.trim()) {
      console.error('Client-side validation failed. Missing fields:');
      if (!customerName.trim()) console.error('  - Full Name is empty');
      if (!customerEmail.trim()) console.error('  - Email is empty');
      if (!subject.trim()) console.error('  - Subject is empty');
      if (!description.trim()) console.error('  - Description is empty');
      if (!priority) console.error('  - Priority is not selected');

      toast.error('Please fill in all required fields');
      return;
    }

    console.log('Client-side validation: PASSED');
    console.log('Priority value before submission:', {
      value: priority,
      type: typeof priority,
      expected: 'Low | Medium | High | Critical',
    });

    setIsSubmitting(true);
    try {
      const attachmentNames = attachments.map(f => f.name).join(', ');
      const ticketPayload = {
        subject,
        description,
        priority: priority as TicketPriority,
        createdBy: user?.id || '',
        company: user?.company || '',
        fullName: customerName,
        email: customerEmail,
        phone: customerPhone,
        location: customerLocation,
        industry,
        attachment: attachmentNames || undefined,
      };

      console.log('Submitting ticket with payload:', ticketPayload);
      console.log('User context:', {
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        userRole: user?.role,
      });

      const ticket = await addTicket(ticketPayload);

      if (ticket) {
        console.log('✓ Ticket created successfully!', ticket);
        toast.success(`Ticket ${ticket.ticketId} created successfully!`);
        navigate('/tickets');
      } else {
        console.error('✗ addTicket returned null - check error logs above');
      }
    } catch (error) {
      console.error('Unexpected error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Create Support Ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">Fill in the details below. Our team will respond within the SLA window.</p>
      </div>

      <form onSubmit={handleSubmit} className="card-premium p-6 space-y-5">
        {/* Contact Information */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Full Name *</label>
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your full name" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Email *</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="your@email.com" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Phone Number</label>
              <input type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+92 3XX XXXXXXX" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Location</label>
              <input type="text" value={customerLocation} onChange={e => setCustomerLocation(e.target.value)} placeholder="City, Country" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Industry</label>
            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Steel Manufacturing, Automotive, Mining" className={inputClass} />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Ticket Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ticket Details</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Subject *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of the issue" required className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue in detail. Include error codes, timestamps, and steps to reproduce." rows={5} required className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Priority *</label>
            <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} required className={inputClass}>
              <option value="">Select priority...</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {priority && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                SLA deadline: {SLA_MAP[priority as TicketPriority]}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-card-foreground">Attachments (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={e => {
                if (e.target.files) {
                  setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:border-ring w-full"
            >
              <Paperclip className="h-4 w-4" />
              Click to attach files
            </button>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-card-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                    <button type="button" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button type="button" onClick={() => navigate('/tickets')} disabled={isSubmitting} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-primary-glow disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Ticket
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;
