export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type TicketPriority = 'Low' | 'Medium' | 'High';

export type TicketCategory = 'Hardware' | 'Software' | 'Network' | 'Security' | 'Database' | 'Other';

export type Attachment = {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
};

export type TicketComment = {
  id?: string;
  ticketId: string;
  userId: string;
  userName: string;
  content: string; // Changed from comment to content for consistency
  isInternal?: boolean;
  attachments?: Attachment[];
  createdAt?: string;
  updatedAt?: string;
};

export type TicketAssignment = {
  id?: string;
  ticketId: string;
  assignedTo: string; // Supplier ID
  assignedBy: string; // User ID who assigned
  assignedDate?: string;
};

export type TicketChangeLog = {
  id?: string;
  ticketId: string;
  userId: string;
  userName: string;
  action: string; // 'created', 'status_changed', 'assigned', 'comment_added', etc.
  oldValue?: string;
  newValue?: string;
  description: string;
  createdAt?: string;
};

export type Ticket = {
  id?: string;
  ticketNumber: string; // Format: RHD-20250703-0001
  reporterId?: string; // ID of the reporter in the project
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  projectId?: string; // Link to project for SLA (will be derived from projectName)
  projectName?: string; // Project name stored in SharePoint
  assignedTo?: string; // Supplier ID
  attachments?: Attachment[];
  slaDeadline?: string; // Calculated based on priority and project SLA
  createdAt?: string;
  updatedAt?: string;
  inprogressAt?: string; // When status changed to "In Progress"
  resolvedAt?: string;
  closedAt?: string;
  receivedAt?: string; // When the ticket was received (for SLA calculation)
  createdByEmail?: string; // Email of the user who created the ticket
  
  // Resolution Details
  resolvedBy?: string;
  problemFound?: string;
  solution?: string;
  resolutionAttachments?: Attachment[];
  
  // Feedback
  rating?: number;
  feedback?: string;
};

export type TicketFeedback = {
  id?: string;
  ticketId: string;
  rating: number;
  comment?: string;
  createdAt?: string;
};

export type TicketFormData = {  reporterId?: string;  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
  projectId?: string;
  assignedTo?: string; // Allow pre-assignment during creation
  attachments?: File[];
  receivedAt?: string; // When the ticket was received
  createdByEmail?: string; // Email of the user creating the ticket
  
  // Resolution Details (optional during creation, but can be added later)
  resolvedBy?: string;
  problemFound?: string;
  solution?: string;
};

export type TicketFilters = {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  reporterName?: string;
  assignedTo?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardStats = {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  overdueSlaTickets: number;
};
