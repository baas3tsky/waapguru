/**
 * SharePoint Ticket Service
 * Manages ticket data in SharePoint Lists using Microsoft Graph API
 * Replaces stub ticket-service.ts
 */

'use server'

import { Ticket, TicketFormData, TicketStatus, TicketPriority, TicketCategory } from '@/types/ticket'
import { getListItems, createListItem, updateListItem, deleteListItem, getAccessToken } from '@/lib/graph-client'
import { logger } from '@/lib/logger'

// SharePoint configuration
const SHAREPOINT_SITE_ID = process.env.SHAREPOINT_SITE_ID!
const TICKETS_LIST_NAME = 'Tickets'

if (!SHAREPOINT_SITE_ID) {
  console.error('❌ SHAREPOINT_SITE_ID is missing in environment variables')
}

// Cached list ID
let TICKETS_LIST_ID: string | null = null

interface SharePointTicketFields {
  id?: string;
  Title: string;
  ProjectId: string;
  ProjectName: string;
  Subject: string;
  Description?: string;
  Priority: string;
  TicketStatus: string;
  Category: string;
  AssignedTo?: string;
  ContactPerson?: string;
  DueDate?: string;
  CreatedAt?: string;
  Created?: string;
  UpdatedAt?: string;
  Modified?: string;
  InprogressAt?: string;
  ResolvedAt?: string;
  ClosedAt?: string;
  ReceivedAt?: string;
  // Resolution fields stored in Feedback column as JSON
  Feedback?: string;
}

interface SharePointListItem {
  id: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: {
    user?: {
      email?: string;
      displayName?: string;
      userPrincipalName?: string;
    }
  };
  fields: SharePointTicketFields;
}

/**
 * Helper to map SharePoint list item to Ticket type
 */
async function mapSharePointItemToTicket(item: SharePointListItem, loadAttachments: boolean = false): Promise<Ticket> {
  const fields = item.fields;
  
  if (!fields) {
    throw new Error('SharePoint item fields are missing');
  }

  // Debug CreatedBy field
  if (!item.createdBy) {
    console.warn('⚠️ [DEBUG] item.createdBy is missing for ticket:', fields.Title);
  } else {
    console.log('👤 [DEBUG] item.createdBy for ticket:', fields.Title, JSON.stringify(item.createdBy, null, 2));
  }
  
  // Parse AssignedTo field
  let assignedTo = null;
  if (fields.AssignedTo) {
    try {
      assignedTo = JSON.parse(fields.AssignedTo);
    } catch (e) {
      console.error('Failed to parse AssignedTo field:', e);
    }
  }
  
  // Parse project code from ProjectName (format: "Project Name (PRJ-CODE)")
  let projectCode = fields.ProjectName ? fields.ProjectName.match(/\(([^)]+)\)/)?.[1] : null;
  
  // If project code not found in name, try to get it from ProjectId
  if (!projectCode && fields.ProjectId && loadAttachments) {
    try {
      const { getProjectById } = await import('@/lib/actions/sharepoint-project-service');
      const project = await getProjectById(fields.ProjectId);
      if (project) {
        projectCode = project.projectCode;
      }
    } catch (error) {
      console.warn('Could not load project for attachment lookup:', error);
    }
  }
  
  // Load attachments from SharePoint Document Library if requested
  let attachments: import('@/types/ticket').Attachment[] = [];
  let resolutionAttachments: import('@/types/ticket').Attachment[] = [];
  
  if (loadAttachments && fields.Title && projectCode) {
    try {
      // Use dynamic import to avoid circular dependency issues if any
      const { listTicketAttachments } = await import('@/lib/actions/sharepoint-attachments-service');
      
      // Load main attachments
      const result = await listTicketAttachments(projectCode, fields.Title);
      // Deduplicate attachments by ID
      attachments = Array.from(new Map(result.attachments.map(item => [item.id, item])).values());
      
      // Load resolution attachments
      // Note: This might fail if the folder doesn't exist yet, which is fine
      try {
        const resResult = await listTicketAttachments(projectCode, fields.Title, 'resolution');
        // Deduplicate attachments by ID to prevent duplicates
        const uniqueAttachments = Array.from(new Map(resResult.attachments.map(item => [item.id, item])).values());
        resolutionAttachments = uniqueAttachments;
      } catch (e) {
        // Ignore error for resolution attachments (folder might not exist)
        console.log('No resolution attachments found or folder missing');
      }
      
      console.log(`📎 Loaded ${attachments.length} attachments and ${resolutionAttachments.length} resolution attachments for ticket ${fields.Title}`);
    } catch (error) {
      console.error('Error loading attachments for ticket:', fields.Title, error);
    }
  }
  
  // Parse resolution details from Feedback field
  let resolutionDetails = {
    resolvedBy: undefined as string | undefined,
    problemFound: undefined as string | undefined,
    solution: undefined as string | undefined
  };
  
  if (fields.Feedback) {
    try {
      const parsed = JSON.parse(fields.Feedback);
      // Check if it's the new format (object) or old format (string/rating)
      if (typeof parsed === 'object' && parsed !== null) {
        resolutionDetails = {
          resolvedBy: parsed.resolvedBy,
          problemFound: parsed.problemFound,
          solution: parsed.solution
        };
      }
    } catch (e) {
      // If not JSON, ignore or handle legacy data
    }
  }

  return {
    id: item.id || fields.id,
    ticketNumber: fields.Title, // Title field = ticket number (RHD-YYYYMMDD-XXXX)
    projectId: fields.ProjectId,
    projectName: fields.ProjectName,
    subject: fields.Subject,
    description: fields.Description || '',
    priority: fields.Priority as TicketPriority,
    status: fields.TicketStatus as TicketStatus,
    category: fields.Category as TicketCategory,
    assignedTo: assignedTo,
    reporterId: fields.ContactPerson ? JSON.parse(fields.ContactPerson).id : undefined,
    reporterName: fields.ContactPerson ? JSON.parse(fields.ContactPerson).name : '',
    reporterEmail: fields.ContactPerson ? JSON.parse(fields.ContactPerson).email : '',
    reporterPhone: fields.ContactPerson ? JSON.parse(fields.ContactPerson).phone : '',
    slaDeadline: fields.DueDate,
    attachments: attachments,
    createdAt: fields.CreatedAt || item.createdDateTime || fields.Created || new Date().toISOString(),
    updatedAt: fields.UpdatedAt || item.lastModifiedDateTime || fields.Modified || new Date().toISOString(),
    inprogressAt: fields.InprogressAt || undefined,
    resolvedAt: fields.ResolvedAt || undefined,
    closedAt: fields.ClosedAt || undefined,
    receivedAt: fields.ReceivedAt || undefined,
    createdByEmail: (fields.ContactPerson && JSON.parse(fields.ContactPerson).creatorEmail) || item.createdBy?.user?.email || item.createdBy?.user?.userPrincipalName,
    resolvedBy: resolutionDetails.resolvedBy,
    problemFound: resolutionDetails.problemFound,
    solution: resolutionDetails.solution,
    resolutionAttachments: resolutionAttachments,
  }
}

/**
 * Helper to map Ticket to SharePoint fields
 */
function mapTicketToSharePointFields(ticket: TicketFormData | Ticket): Record<string, string | number | boolean | undefined | null> {
  const fields: Record<string, string | number | boolean | undefined | null> = {
    Title: 'ticketNumber' in ticket ? ticket.ticketNumber : '',
    ProjectId: ticket.projectId,
    ProjectName: 'projectName' in ticket ? ticket.projectName : '',
    Subject: ticket.subject,
    Description: ticket.description || '',
    Priority: ticket.priority,
    Category: ticket.category,
    TicketStatus: 'status' in ticket ? ticket.status : 'Open',
    AssignedTo: ticket.assignedTo ? JSON.stringify(ticket.assignedTo) : '',
    ContactPerson: JSON.stringify({
      id: ticket.reporterId,
      name: ticket.reporterName,
      email: ticket.reporterEmail,
      phone: ticket.reporterPhone,
      creatorEmail: 'createdByEmail' in ticket ? ticket.createdByEmail : undefined
    }),
  }
  
  console.log('🔍 Mapping ticket to SharePoint fields:', {
    ProjectId: fields.ProjectId,
    ProjectName: fields.ProjectName,
    AssignedTo: fields.AssignedTo
  });
  
  // Add optional fields
  if ('slaDeadline' in ticket && ticket.slaDeadline) {
    fields.DueDate = ticket.slaDeadline
  }

  // Add ReceivedAt if present
  // Add ReceivedAt if present
  if ('receivedAt' in ticket && ticket.receivedAt) {
    fields.ReceivedAt = ticket.receivedAt
  }
  
  // Note: Attachments will be handled separately in Document Library
  
  // Set timestamps
  if (!('id' in ticket)) {
    // New ticket
    fields.CreatedAt = new Date().toISOString()
    fields.UpdatedAt = new Date().toISOString()
  } else {
    // Update existing
    fields.UpdatedAt = new Date().toISOString()
    
    if ('inprogressAt' in ticket && ticket.inprogressAt) {
      fields.InprogressAt = ticket.inprogressAt
    }
    
    if ('resolvedAt' in ticket && ticket.resolvedAt) {
      fields.ResolvedAt = ticket.resolvedAt
    }
    
    if ('closedAt' in ticket && ticket.closedAt) {
      fields.ClosedAt = ticket.closedAt
    }
    
    // Store resolution details in Feedback field as JSON
    if (('resolvedBy' in ticket) || ('problemFound' in ticket) || ('solution' in ticket)) {
      const resolutionDetails = {
        resolvedBy: ticket.resolvedBy,
        problemFound: ticket.problemFound,
        solution: ticket.solution
      };
      fields.Feedback = JSON.stringify(resolutionDetails);
    }
  }
  
  return fields
}

/**
 * Initialize service - get Tickets list ID
 */
async function initTicketService(accessToken: string): Promise<void> {
  if (TICKETS_LIST_ID) return
  
  try {
    const { getSharePointListId } = await import('@/lib/graph-client')
    TICKETS_LIST_ID = await getSharePointListId(accessToken, SHAREPOINT_SITE_ID, TICKETS_LIST_NAME)
    
    if (!TICKETS_LIST_ID) {
      throw new Error('Tickets list not found in SharePoint')
    }
  } catch (error) {
    logger.error('Failed to initialize SharePoint Ticket Service:', error)
    throw error
  }
}

/**
 * Get all tickets
 */
export async function getAllTickets(): Promise<Ticket[]> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        select: ['id', 'createdDateTime', 'lastModifiedDateTime', 'fields', 'createdBy'],
        orderBy: 'createdDateTime desc',
        expand: ['fields']
      }
    )
    
    if (!result.success) {
      logger.error('Failed to fetch tickets:', result.error)
      return []
    }
    
    console.log('📊 Tickets fetched from SharePoint:', result.data.length)
    
    // Map items to tickets with attachments loaded
    // TODO: Optimize attachment loading (currently disabled to prevent performance issues/crashes)
    const tickets = await Promise.all(
      result.data.map((item: unknown) => mapSharePointItemToTicket(item as SharePointListItem, false))
    )
    
    return tickets
  } catch (error) {
    logger.error('Error in getAllTickets:', error)
    console.error('❌ getAllTickets error:', error)
    return []
  }
}

/**
 * Get latest ticket number
 * Optimized to fetch only the most recent ticket
 */
export async function getLatestTicketNumber(): Promise<string | null> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        select: ['fields'],
        orderBy: 'createdDateTime desc',
        top: 1,
        expand: ['fields']
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return null
    }
    
    const item = result.data[0] as SharePointListItem
    return item.fields.Title || null
  } catch (error) {
    logger.error('Error in getLatestTicketNumber:', error)
    return null
  }
}

/**
 * Get recent ticket numbers
 */
export async function getRecentTicketNumbers(limit: number = 20): Promise<string[]> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        select: ['fields'],
        orderBy: 'createdDateTime desc',
        top: limit,
        expand: ['fields']
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return []
    }
    
    return result.data
      .map(item => (item as SharePointListItem).fields.Title)
      .filter(t => t) as string[];
  } catch (error) {
    logger.error('Error in getRecentTicketNumbers:', error)
    return []
  }
}

/**
 * Get ticket by Ticket Number (Title)
 */
export async function getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        filter: `fields/Title eq '${ticketNumber}'`,
        top: 1,
        expand: ['fields']
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return null
    }
    
    return mapSharePointItemToTicket(result.data[0] as SharePointListItem)
  } catch (error) {
    logger.error(`Error in getTicketByNumber for ${ticketNumber}:`, error)
    return null
  }
}

/**
 * Get all tickets with a specific ticket number (for duplicate detection)
 */
export async function getTicketsByNumber(ticketNumber: string): Promise<Ticket[]> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        filter: `fields/Title eq '${ticketNumber}'`,
        expand: ['fields']
      }
    )
    
    if (!result.success || result.data.length === 0) {
      return []
    }
    
    return await Promise.all(result.data.map(item => mapSharePointItemToTicket(item as SharePointListItem)))
  } catch (error) {
    logger.error(`Error in getTicketsByNumber for ${ticketNumber}:`, error)
    return []
  }
}

/**
 * Get tickets by Project ID
 */
export async function getTicketsByProjectId(projectId: string): Promise<Ticket[]> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await getListItems(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        filter: `fields/ProjectId eq '${projectId}'`,
        expand: ['fields']
      }
    )
    
    if (!result.success) {
      return []
    }
    
    // Use parallel mapping for better performance
    return await Promise.all(result.data.map(item => mapSharePointItemToTicket(item as SharePointListItem)))
  } catch (error) {
    logger.error(`Error in getTicketsByProjectId for ${projectId}:`, error)
    return []
  }
}

/**
 * Get ticket by ID
 */
export async function getTicketById(id: string): Promise<Ticket | null> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const { getListItem } = await import('@/lib/graph-client')
    const result = await getListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id
    )
    
    if (!result.success || !result.data) {
      return null
    }
    
    // Load attachments for detail view
    // Enable attachment loading for detail view
    return await mapSharePointItemToTicket(result.data as SharePointListItem, true)
  } catch (error) {
    logger.error('Error in getTicketById:', error)
    return null
  }
}

/**
 * Create new ticket
 */
export async function createTicket(data: TicketFormData & { ticketNumber: string }): Promise<Ticket> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const fields = mapTicketToSharePointFields(data)
    
    console.log('Creating ticket with fields:', fields)
    
    const result = await createListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      fields
    )
    
    if (!result.success) {
      throw new Error(`Failed to create ticket: ${result.error}`)
    }
    
    console.log('✅ Ticket created successfully:', result.data.id)
    
    return mapSharePointItemToTicket(result.data)
  } catch (error) {
    logger.error('Error creating ticket:', error)
    throw new Error(`Failed to create ticket: ${error}`)
  }
}

/**
 * Update existing ticket
 */
export async function updateTicket(
  id: string,
  ticketData: Partial<Ticket>,
  existingTicket?: Ticket
): Promise<Ticket> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const existing = existingTicket || await getTicketById(id)
    if (!existing) {
      throw new Error('Ticket not found')
    }
    
    const merged = { ...existing, ...ticketData }
    const fields = mapTicketToSharePointFields(merged)
    
    const result = await updateListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id,
      fields
    )
    
    if (!result.success) {
      throw new Error(`Failed to update ticket: ${result.error}`)
    }
    
    return mapSharePointItemToTicket(result.data as SharePointListItem)
  } catch (error) {
    logger.error('Error updating ticket:', error)
    throw new Error(`Failed to update ticket: ${error}`)
  }
}

/**
 * Delete ticket
 */
export async function deleteTicket(id: string): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const result = await deleteListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id
    )
    
    if (!result.success) {
      throw new Error(`Failed to delete ticket: ${result.error}`)
    }
  } catch (error) {
    logger.error('Error deleting ticket:', error)
    throw new Error(`Failed to delete ticket: ${error}`)
  }
}

/**
 * Add activity log to ticket
 */
export async function addTicketActivity(
  id: string,
  activity: {
    action: string
    userId: string
    userName: string
    description: string
    createdAt: string
    oldValue?: string
    newValue?: string
  }
): Promise<void> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    // Get current activity log from SharePoint
    const { getListItem } = await import('@/lib/graph-client')
    const result = await getListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id
    )
    
    if (!result.success || !result.data) {
      throw new Error('Ticket not found')
    }
    
    const currentLog = result.data?.fields?.ActivityLog 
      ? JSON.parse(result.data.fields.ActivityLog) 
      : []
    
    const updatedLog = [...currentLog, activity]
    
    // Update ActivityLog field
    await updateListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id,
      { ActivityLog: JSON.stringify(updatedLog) }
    )
  } catch (error) {
    logger.error('Error adding ticket activity:', error)
    throw error
  }
}


/**
 * Get activity logs for a ticket
 */
export async function getTicketChangeLogs(id: string): Promise<Array<{
  action: string
  userId: string
  userName: string
  description: string
  createdAt: string
  oldValue?: string
  newValue?: string
}>> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    const { getListItem } = await import('@/lib/graph-client')
    const result = await getListItem(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      id
    )
    
    if (!result.success || !result.data) {
      return []
    }
    
    const activityLog = result.data?.fields?.ActivityLog
    if (!activityLog) {
      return []
    }
    
    try {
      interface LogItem {
        action: string;
        userId: string;
        userName: string;
        description: string;
        createdAt: string;
        oldValue?: string;
        newValue?: string;
      }

      const logs = JSON.parse(activityLog) as LogItem[]
      // Sort by createdAt descending (newest first)
      return logs.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    } catch (e) {
      console.error('Failed to parse ActivityLog:', e)
      return []
    }
  } catch (error) {
    logger.error('Error getting ticket change logs:', error)
    return []
  }
}

/**
 * Get frequent reporters from recent tickets
 */
export async function getFrequentReporters(): Promise<{name: string, email: string, phone: string}[]> {
  try {
    const accessToken = await getAccessToken()
    await initTicketService(accessToken)
    
    // Fetch recent tickets to look for reporters
    const result = await getListItems<SharePointListItem>(
      accessToken,
      SHAREPOINT_SITE_ID,
      TICKETS_LIST_ID!,
      {
        select: ['fields'],
        expand: ['fields'],
        top: 50, // Look at last 50 tickets
        orderBy: 'createdDateTime desc' // Most recent first
      }
    )
    
    if (!result.success) {
      return []
    }
    
    const reportersMap = new Map<string, {name: string, email: string, phone: string, count: number}>();
    
    result.data.forEach(item => {
      try {
        const fields = item.fields || (item as any);
        if (fields.ContactPerson) {
          const contact = JSON.parse(fields.ContactPerson);
          if (contact.name && contact.email) {
            const key = contact.email.toLowerCase();
            if (reportersMap.has(key)) {
              reportersMap.get(key)!.count++;
            } else {
              reportersMap.set(key, {
                name: contact.name,
                email: contact.email,
                phone: contact.phone || '',
                count: 1
              });
            }
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });
    
    // Convert to array and sort by frequency
    return Array.from(reportersMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Return top 10
      
  } catch (error) {
    logger.error('Error getting frequent reporters:', error)
    return []
  }
}
