/**
 * Ticket Service - Class wrapper for backward compatibility
 * Delegates to SharePoint Ticket Service
 */

import { Ticket, TicketFormData, TicketChangeLog, TicketComment, TicketFeedback } from '@/types/ticket'
import { Project } from '@/types/project'
import * as SharePointTicketService from './sharepoint-ticket-service'

export class TicketService {
  static async getAll(): Promise<Ticket[]> {
    return SharePointTicketService.getAllTickets()
  }

  static async getAllTickets(): Promise<Ticket[]> {
    return SharePointTicketService.getAllTickets()
  }

  static async getLatestTicketNumber(): Promise<string | null> {
    return SharePointTicketService.getLatestTicketNumber()
  }

  static async getRecentTicketNumbers(limit: number = 20): Promise<string[]> {
    return SharePointTicketService.getRecentTicketNumbers(limit)
  }

  static async getById(id: string): Promise<Ticket | null> {
    return SharePointTicketService.getTicketById(id)
  }

  static async getTicketById(id: string): Promise<Ticket | null> {
    return SharePointTicketService.getTicketById(id)
  }

  static async getTicketByNumber(ticketNumber: string): Promise<Ticket | null> {
    return SharePointTicketService.getTicketByNumber(ticketNumber)
  }

  static async getTicketsByNumber(ticketNumber: string): Promise<Ticket[]> {
    return SharePointTicketService.getTicketsByNumber(ticketNumber)
  }

  static async create(data: Partial<Ticket>): Promise<Ticket | null> {
    if (!data.ticketNumber) {
      throw new Error('Ticket number is required')
    }
    return SharePointTicketService.createTicket(data as TicketFormData & { ticketNumber: string })
  }

  static async update(id: string, updates: Partial<Ticket>, existingTicket?: Ticket): Promise<Ticket | null> {
    return SharePointTicketService.updateTicket(id, updates, existingTicket)
  }

  static async updateTicket(id: string, updates: Partial<Ticket>, existingTicket?: Ticket): Promise<Ticket | null> {
    return SharePointTicketService.updateTicket(id, updates, existingTicket)
  }

  static async delete(id: string): Promise<boolean> {
    await SharePointTicketService.deleteTicket(id)
    return true
  }

  static async deleteTicket(id: string): Promise<boolean> {
    await SharePointTicketService.deleteTicket(id)
    return true
  }

  static async addChangeLog(log: Omit<TicketChangeLog, 'id'>): Promise<void> {
    await SharePointTicketService.addTicketActivity(log.ticketId, {
      action: log.action,
      userId: log.userId,
      userName: log.userName,
      description: log.description || '',
      createdAt: log.createdAt || new Date().toISOString()
    })
  }

  static async assignTicket(ticketId: string, supplierId: string, assignedBy: string): Promise<Ticket | null> {
    console.warn('TicketService.assignTicket() not implemented', { ticketId, supplierId, assignedBy })
    return null
  }

  static async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    console.warn('TicketService.getTicketComments() not implemented', ticketId)
    return []
  }

  static async addComment(comment: Omit<TicketComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<TicketComment | null> {
    console.warn('TicketService.addComment() not implemented', comment)
    return null
  }

  static async getTicketChangeLogs(ticketId: string): Promise<TicketChangeLog[]> {
    try {
      const logs = await SharePointTicketService.getTicketChangeLogs(ticketId)
      return logs.map((log) => ({
        id: crypto.randomUUID(),
        ticketId: ticketId,
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        oldValue: log.oldValue,
        newValue: log.newValue,
        description: log.description,
        createdAt: log.createdAt
      }))
    } catch (error) {
      console.error('Error getting ticket change logs:', error)
      return []
    }
  }

  static async getTicketFeedback(ticketId: string): Promise<TicketFeedback | null> {
    try {
      const ticket = await SharePointTicketService.getTicketById(ticketId);
      if (!ticket) {
        return null;
      }

      // Check if ticket has feedback
      if (ticket.rating && ticket.rating > 0) {
        return {
          id: crypto.randomUUID(),
          ticketId: ticket.id!,
          rating: ticket.rating,
          comment: ticket.feedback,
          createdAt: ticket.closedAt || ticket.updatedAt
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting ticket feedback:', error);
      return null;
    }
  }

  static async addFeedback(feedback: Omit<TicketFeedback, 'id' | 'createdAt'>): Promise<TicketFeedback | null> {
    try {
      // Update ticket with rating and feedback
      const ticket = await SharePointTicketService.getTicketById(feedback.ticketId);
      if (!ticket) {
        console.error('Ticket not found:', feedback.ticketId);
        return null;
      }

      // Update ticket with feedback data
      await SharePointTicketService.updateTicket(feedback.ticketId, {
        rating: feedback.rating,
        feedback: feedback.comment || ''
      });

      console.log('✅ Feedback added successfully:', feedback);

      // Return feedback object
      return {
        id: crypto.randomUUID(),
        ticketId: feedback.ticketId,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding feedback:', error);
      return null;
    }
  }

  static async getDashboardStats(): Promise<{
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
    overdueSlaTickets: number
  }> {
    try {
      const tickets = await SharePointTicketService.getAllTickets()
      
      const totalTickets = tickets.length
      const openTickets = tickets.filter(t => t.status === 'Open').length
      const inProgressTickets = tickets.filter(t => t.status === 'In Progress').length
      const resolvedTickets = tickets.filter(t => t.status === 'Resolved').length
      const closedTickets = tickets.filter(t => t.status === 'Closed').length
      
      // Calculate overdue SLA tickets
      const overdueSlaTickets = tickets.filter(t => {
        if (t.status === 'Resolved' || t.status === 'Closed' || !t.slaDeadline) return false
        return new Date(t.slaDeadline) < new Date()
      }).length

      return {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        overdueSlaTickets
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        overdueSlaTickets: 0
      }
    }
  }

  static async createTicketInLocalStorage(formData: TicketFormData, project: Project | null): Promise<Ticket> {
    console.warn('TicketService.createTicketInLocalStorage() not implemented', { formData, project })
    return {
      id: crypto.randomUUID(),
      ticketNumber: 'TEMP-' + Date.now(),
      reporterName: formData.reporterName,
      reporterEmail: formData.reporterEmail,
      reporterPhone: formData.reporterPhone,
      category: formData.category,
      priority: formData.priority,
      status: 'Open',
      subject: formData.subject,
      description: formData.description,
      projectId: formData.projectId,
      slaDeadline: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: []
    }
  }
}

// Export standalone functions for backward compatibility
export const getTicketById = TicketService.getTicketById;
export const getAllTickets = TicketService.getAllTickets;
export const createTicket = TicketService.create;
export const updateTicket = TicketService.update;
export const deleteTicket = TicketService.delete;
