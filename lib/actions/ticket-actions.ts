'use server';

import { TicketStatus, TicketFormData, Ticket, Attachment } from '@/types/ticket';
import { Project } from '@/types/project';
import { TicketService } from '@/lib/actions/ticket-service';
import { getProjectById, updateProject } from '@/lib/actions/sharepoint-project-service';
import { getTicketsByProjectId } from '@/lib/actions/sharepoint-ticket-service';
import { calculateProjectStatus } from '@/lib/project-utils';
import { sendEmail } from '@/lib/actions/email-service';
import { isSlaWarning, getSlaUsagePercentage, formatRemainingTime, calculateSlaDeadline } from '@/lib/sla-utils';
import { formatThailandTime } from '@/lib/date-utils';
import { generateTicketNumber, parseTicketNumber } from '@/lib/ticket-utils';
import { getCreatedAtTimestamp } from '@/lib/date-utils';
import { getSession } from '@/lib/actions/auth-actions';
import { uploadTicketAttachments, cleanupTicketAttachments } from '@/lib/actions/sharepoint-attachments-service';
import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Helper function สำหรับบันทึก notification history
 */
async function logNotificationHistory(
  ticketId: string,
  notificationType: string,
  recipient: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    // TODO: Implement with SharePoint List (NotificationHistory)
    console.log('Log notification:', { ticketId, notificationType, recipient, success, errorMessage });
  } catch (error) {
    console.error('Failed to log notification history:', error);
  }
}

/**
 * Helper to sync project status based on tickets
 */
async function syncProjectStatus(projectId: string) {
  try {
    const project = await getProjectById(projectId);
    if (!project) return;

    const tickets = await getTicketsByProjectId(projectId);
    const newStatus = calculateProjectStatus(project, tickets);

    if (project.status !== newStatus) {
      await updateProject(projectId, { status: newStatus });
      console.log(`Updated project ${projectId} status to ${newStatus}`);
    }
  } catch (error) {
    console.error('Failed to sync project status:', error);
  }
}

/**
 * Server Action สำหรับการอัปเดตสถานะ ticket พร้อมส่งอีเมลแจ้งเตือน
 */
export async function updateTicketStatusWithEmail(
  ticketId: string, 
  status: TicketStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current ticket to track changes
    const currentTicket = await TicketService.getById(ticketId);
    
    if (!currentTicket) {
      console.error('Failed to fetch current ticket');
      return { success: false, error: 'Failed to fetch current ticket' };
    }

    const oldStatus = currentTicket.status;
    if (oldStatus === status) {
      return { success: true }; // No change needed
    }

    const now = getCreatedAtTimestamp();
    const updates: Partial<Ticket> = { 
      status,
      updatedAt: now
    };
    
    if (status === 'In Progress') {
      updates.inprogressAt = now;
    } else if (status === 'Resolved') {
      updates.resolvedAt = now;
    } else if (status === 'Closed') {
      updates.closedAt = now;
    }
    
    // Update ticket status in database
    const updateResult = await TicketService.update(ticketId, updates, currentTicket);
    
    if (!updateResult) {
      console.error('Status update error');
      return { success: false, error: 'Failed to update ticket status' };
    }

    // Start background tasks
    const sessionPromise = getSession();
    const projectPromise = currentTicket.projectId ? getProjectById(currentTicket.projectId) : Promise.resolve(null);

    const [session, project] = await Promise.all([sessionPromise, projectPromise]);

    const userId = session?.id as string || 'system';
    const userName = session?.fullName as string || 'System';
    
    const logPromise = TicketService.addChangeLog({
      ticketId,
      userId,
      userName,
      action: 'status_changed',
      oldValue: oldStatus,
      newValue: status,
      description: `Status changed from ${oldStatus} to ${status}`,
      createdAt: now
    });

    // Sync project status
    if (currentTicket.projectId) {
      await syncProjectStatus(currentTicket.projectId);
    }

    // Send status change notification email
    let emailPromise = Promise.resolve();
    try {
      // Revalidate cache
      revalidateTag('tickets', {});
      revalidatePath(`/tickets/${ticketId}`);
      revalidatePath('/tickets');

      // Use updated ticket details
      const ticketDetails = { ...currentTicket, ...updates };

      if (ticketDetails) {
        // Send email notification for status change
        const recipients = new Set<string>();
        
        // 1. Add reporter email
        if (ticketDetails.reporterEmail && ticketDetails.reporterEmail.trim() !== '') {
          recipients.add(ticketDetails.reporterEmail);
        }

        // 2. Add creator email (Case Opener)
        if (ticketDetails.createdByEmail && ticketDetails.createdByEmail.trim() !== '') {
          // Avoid duplicate if creator is same as reporter
          if (!recipients.has(ticketDetails.createdByEmail)) {
            recipients.add(ticketDetails.createdByEmail);
          }
        }
        
        // 3. Add project manager email
        if (project?.projectManager?.email) {
          recipients.add(project.projectManager.email);
        }
        
        // 4. Find assigned supplier and add email
        if (ticketDetails.assignedTo && project?.suppliers) {
          const cleanAssignedTo = ticketDetails.assignedTo.trim();
          
          // Try to find by ID first
          let assignedSupplier = project.suppliers.find((s: any) => s.id && s.id.trim() === cleanAssignedTo);
          
          // If not found by ID, try by name (fallback)
          if (!assignedSupplier) {
            assignedSupplier = project.suppliers.find((s: any) => s.name && s.name.trim() === cleanAssignedTo);
          }

          if (assignedSupplier?.email) {
            recipients.add(assignedSupplier.email);
          }
        }

        const recipientList = Array.from(recipients);

        if (recipientList.length > 0) {
          const statusColor = {
            'Open': '#3b82f6',
            'In Progress': '#f59e0b', 
            'Pending': '#8b5cf6',
            'Resolved': '#10b981',
            'Closed': '#6b7280'
          }[status] || '#6b7280';

          emailPromise = sendEmail({
            to: recipientList,
            subject: `🔄 สถานะ Ticket เปลี่ยนแปลง: ${ticketDetails.ticketNumber}`,  
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: white; margin: 0;">🔄 สถานะ Ticket เปลี่ยนแปลง</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>หมายเลข Ticket:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticketDetails.ticketNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>หัวข้อ:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticketDetails.subject}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>สถานะเดิม:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${oldStatus}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>สถานะใหม่:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                          ${status}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>ผู้อัปเดต:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${userName || 'ระบบ'}</td>
                    </tr>
                  </table>

                  ${(status === 'Closed' && (ticketDetails.problemFound || ticketDetails.solution || (ticketDetails.resolutionAttachments && ticketDetails.resolutionAttachments.length > 0))) ? `
                  <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                    <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 16px;">📋 รายละเอียดการแก้ไข</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                      ${ticketDetails.problemFound ? `
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; width: 30%; color: #4b5563;"><strong>ปัญหาที่พบ:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937;">${ticketDetails.problemFound}</td>
                      </tr>` : ''}
                      ${ticketDetails.solution ? `
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #4b5563;"><strong>วิธีแก้ไข:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937;">${ticketDetails.solution}</td>
                      </tr>` : ''}
                      ${ticketDetails.resolvedBy ? `
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #4b5563;"><strong>ผู้แก้ไข:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #1f2937;">${ticketDetails.resolvedBy}</td>
                      </tr>` : ''}
                      ${(ticketDetails.resolutionAttachments && ticketDetails.resolutionAttachments.length > 0) ? `
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; color: #4b5563;"><strong>ไฟล์แนบการแก้ไข:</strong></td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                          <ul style="margin: 0; padding-left: 20px; color: #1f2937;">
                            ${ticketDetails.resolutionAttachments.map((att: any) => `
                              <li style="margin-bottom: 4px;">
                                <a href="${att.url}" target="_blank" style="color: #3b82f6; text-decoration: none;">
                                  ${att.filename}
                                </a>
                              </li>
                            `).join('')}
                          </ul>
                        </td>
                      </tr>` : ''}
                    </table>
                  </div>
                  ` : ''}
                </div>  
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; margin-top: 10px;"><div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
        	            © ${new Date().getFullYear()} Ruthvictor - All Rights Reserved
	                  </p>
                    <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; color: #ef4444; font-size: 15px; line-height: 22px; text-align: center;">
                      📧 อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
                    </p>
                  </div> 
              </div>
            `,
            text: `
🔄 สถานะ Ticket เปลี่ยนแปลง

หมายเลข Ticket: ${ticketDetails.ticketNumber}
หัวข้อ: ${ticketDetails.subject}
สถานะเดิม: ${oldStatus}
สถานะใหม่: ${status}
ผู้อัปเดต: ${userName}
${(status === 'Closed' && (ticketDetails.problemFound || ticketDetails.solution || (ticketDetails.resolutionAttachments && ticketDetails.resolutionAttachments.length > 0))) ? `
📋 รายละเอียดการแก้ไข
-------------------
${ticketDetails.problemFound ? `สาเหตุของปัญหา: ${ticketDetails.problemFound}\n` : ''}${ticketDetails.solution ? `วิธีแก้ไข: ${ticketDetails.solution}\n` : ''}${ticketDetails.resolvedBy ? `ผู้แก้ไข: ${ticketDetails.resolvedBy}\n` : ''}${ticketDetails.resolutionAttachments && ticketDetails.resolutionAttachments.length > 0 ? `ไฟล์แนบ: ${ticketDetails.resolutionAttachments.map((a: any) => a.filename + ' (' + a.url + ')').join(', ')}\n` : ''}` : ''}
            `
          }).then(result => {
            return result;
          }).catch(err => {
            console.error('Email send promise rejected:', err);
            return { success: false, error: err };
          }) as any;
        }
      }
    } catch (error) {
      console.error('Failed to send notification email:', error);
    }

    // Wait for all background tasks
    await Promise.all([logPromise, emailPromise]);

    return { success: true };
  } catch (error) {
    console.error('Error in updateTicketStatusWithEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Server Action สำหรับการมอบหมาย ticket ให้ supplier
 */
export async function assignTicketWithEmail(
  ticketId: string, 
  supplierId: string, 
  assignedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await TicketService.assignTicket(ticketId, supplierId, assignedBy);
    
    if (!result) {
      return { success: false, error: 'Failed to assign ticket' };
    }
    
    // Optionally send notification email here if needed
    
    // Revalidate cache
    revalidateTag('tickets', {});
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath('/tickets');

    return { success: true };
  } catch (error) {
    console.error('Error in assignTicketWithEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Server Action wrappers for TicketService methods
 * These can be safely called from Client Components
 */

export async function getAllTicketsAction() {
  return await TicketService.getAllTickets();
}

export async function getTicketByIdAction(id: string) {
  return await TicketService.getTicketById(id);
}

export async function getTicketCommentsAction(ticketId: string) {
  return await TicketService.getTicketComments(ticketId);
}

export async function getTicketChangeLogsAction(ticketId: string) {
  return await TicketService.getTicketChangeLogs(ticketId);
}

export async function getDashboardStatsAction() {
  return await TicketService.getDashboardStats();
}

export async function addCommentAction(comment: {
  ticketId: string;
  userId: string;
  userName: string;
  content: string;
  isInternal?: boolean;
}) {
  return await TicketService.addComment(comment);
}

export async function updateTicketResolution(
  ticketId: string,
  resolution: {
    resolvedBy: string;
    problemFound: string;
    solution: string;
    resolutionAttachments?: Attachment[];
  }
) {
  try {
    const updates: Partial<Ticket> = {
      resolvedBy: resolution.resolvedBy,
      problemFound: resolution.problemFound,
      solution: resolution.solution,
      resolutionAttachments: resolution.resolutionAttachments,
      updatedAt: getCreatedAtTimestamp()
    };
    
    const result = await TicketService.updateTicket(ticketId, updates);
    revalidateTag('tickets', {});
    revalidatePath(`/tickets/${ticketId}`);
    return result;
  } catch (error) {
    console.error('Error in updateTicketResolution:', error);
    throw error;
  }
}

export async function updateTicketAction(id: string, updates: Partial<Ticket>) {
  try {
    let slaResetNeeded = false;

    // Check if we need to recalculate SLA
    if (updates.receivedAt || updates.priority) {
      const currentTicket = await TicketService.getById(id);
      if (currentTicket && currentTicket.projectId) {
        const project = await getProjectById(currentTicket.projectId);
        if (project) {
          const priority = updates.priority || currentTicket.priority;
          const receivedAt = updates.receivedAt || currentTicket.receivedAt || currentTicket.createdAt;
          
          // Recalculate SLA deadline with corrected timezone
          let slaStartDate: Date;
          
          if (updates.receivedAt) {
            // New receivedAt provided, check if it needs timezone adjustment
            const dateStr = updates.receivedAt;
            if (dateStr.includes('Z') || dateStr.includes('+')) {
               slaStartDate = new Date(dateStr);
            } else {
               // No timezone info = assume Thai time input
               try {
                 const isoWithOffset = dateStr.length === 16 ? `${dateStr}:00+07:00` : `${dateStr}+07:00`;
                 slaStartDate = new Date(isoWithOffset);
                 if (isNaN(slaStartDate.getTime())) throw new Error('Invalid date');
               } catch {
                 // Fallback
                 const d = new Date(dateStr);
                 d.setHours(d.getHours() - 7);
                 slaStartDate = d;
               }
            }
          } else {
             // Use existing date (assumed already correct ISO string)
             slaStartDate = new Date(receivedAt!);
          }
          
          const newSlaDeadline = calculateSlaDeadline(priority, project, slaStartDate).toISOString();
          
          updates.slaDeadline = newSlaDeadline;
          console.log('🔄 Recalculated SLA Deadline:', newSlaDeadline);
          
          // Mark that we need to log an SLA reset
          slaResetNeeded = true;
        }
      }
    }

    const result = await TicketService.updateTicket(id, updates);
    
    // Log SLA reset if needed
    if (slaResetNeeded) {
      await TicketService.addChangeLog({
        ticketId: id,
        userId: 'system',
        userName: 'System',
        action: 'sla_reset',
        description: 'SLA calculation reset due to update in Received Date or Priority',
        createdAt: new Date().toISOString()
      });
      console.log('✅ SLA reset logged for ticket:', id);
    }
    
    // Sync project status
    if (result && result.projectId) {
      await syncProjectStatus(result.projectId);
    }

    revalidateTag('tickets', {});
    revalidatePath('/tickets');
    return result;
  } catch (error) {
    console.error('Error in updateTicketAction:', error);
    throw error;
  }
}

// Export aliases for backward compatibility
export const getTicketChangeLogs = getTicketChangeLogsAction;
// export const getTicketFeedback = getTicketFeedbackAction;


export async function deleteTicketAction(id: string) {
  const ticket = await TicketService.getById(id);
  const result = await TicketService.deleteTicket(id);
  
  if (ticket && ticket.projectId) {
    await syncProjectStatus(ticket.projectId);
  }
  
  return result;
}

/**
 * Server Action สำหรับการสร้าง ticket พร้อมส่งอีเมลแจ้งเตือน
 */
export async function createTicketWithEmail(formData: TicketFormData, project: Project) {
  try {
    // Get session to identify creator
    const session = await getSession();
    const creatorEmail = session?.email as string | undefined;

    // 1. Get recent ticket numbers (fetch top 50 to be safe)
    const existingNumbers = await TicketService.getRecentTicketNumbers(50);
    
    const now = getCreatedAtTimestamp();
    const createdDate = new Date(now);
    
    // Fix: Handle timezone check for receivedAt
    let slaStartDate = createdDate;
    
    if (formData.receivedAt) {
      // Improve date parsing to handle local time vs UTC explicitly
      const dateStr = formData.receivedAt;
      
      // If string already has timezone info (Z or +), use it directly
      if (dateStr.includes('Z') || dateStr.includes('+')) {
         const d = new Date(dateStr);
         if (!isNaN(d.getTime())) slaStartDate = d;
      } else {
         // If no timezone, assume it's Thailand Time (UTC+7)
         // Append timezone offset to ensure consistent parsing
         try {
           // Helper to constructing valid ISO string with offset
           // "2023-01-01T12:00" -> "2023-01-01T12:00:00+07:00"
           const isoWithOffset = dateStr.length === 16 ? `${dateStr}:00+07:00` : `${dateStr}+07:00`;
           const d = new Date(isoWithOffset);
           if (!isNaN(d.getTime())) {
             slaStartDate = d;
           } else {
             // Fallback: manually adjust hours if parsing fails
             const d2 = new Date(dateStr);
             if (!isNaN(d2.getTime())) {
               d2.setHours(d2.getHours() - 7);
               slaStartDate = d2;
             }
           }
         } catch (e) {
           console.error('Error parsing receivedAt:', e);
         }
      }
    }

    // Ensure priority is correctly capitalized to match SLA keys
    const priority = formData.priority ? 
      (formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1).toLowerCase() as any) : 
      'Medium';

    console.log('⏱️ SLA Calculation Debug:', {
      priority,
      originalPriority: formData.priority,
      slaLevel: project.slaLevel,
      receivedAt: formData.receivedAt,
      slaStartDate: slaStartDate.toISOString(),
      deadline: calculateSlaDeadline(priority, project, slaStartDate).toISOString()
    });

    // 2. Generate and Verify Loop (Prevent Duplicates)
    let ticketNumber = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      // Generate candidate number based on what we know
      ticketNumber = generateTicketNumber(existingNumbers);
      
      // Critical: Check if this specific number ALREADY exists in DB
      // (This prevents race conditions where two users generate the same number)
      const existing = await TicketService.getTicketByNumber(ticketNumber);
      
      if (existing) {
        console.warn(`⚠️ Ticket number collision detected: ${ticketNumber}. Retrying...`);
        existingNumbers.push(ticketNumber); // Add to list so generator produces next sequence
        attempts++;
      } else {
        isUnique = true;
      }
    }

    if (!isUnique) {
       throw new Error('Failed to generate unique ticket number. Please try again.');
    }
    
    // SAFETY CHECK: Cleanup any orphaned attachment folder for this ticket number
    // This handles the case where a ticket was deleted from DB but folder remained
    await cleanupTicketAttachments(project.projectCode, ticketNumber);
    
    console.log('📝 Creating ticket with form data:', {
      projectId: formData.projectId,
      projectName: project.projectName,
      assignedTo: formData.assignedTo,
      category: formData.category,
      receivedAt: formData.receivedAt,
      ticketNumber: ticketNumber
    });
    
    // Create base ticket data
    const ticketData = {
      ticketNumber,
      reporterName: formData.reporterName,
      reporterEmail: formData.reporterEmail,
      reporterPhone: formData.reporterPhone,
      category: formData.category,
      priority: priority,
      status: 'Open' as const,
      subject: formData.subject,
      description: formData.description,
      projectId: formData.projectId,
      projectName: project.projectName,
      assignedTo: formData.assignedTo,
      slaDeadline: calculateSlaDeadline(priority, project, slaStartDate).toISOString(),
      attachments: [],
      receivedAt: formData.receivedAt,
      createdByEmail: creatorEmail
    };

    // Insert ticket into database
    const ticket = await TicketService.create(ticketData);

    if (!ticket) {
      console.error('Ticket creation error');
      throw new Error('Failed to create ticket');
    }

    // --- DUPLICATE CHECK & FIX ---
    try {
      // Check for duplicates immediately after creation
      const duplicates = await TicketService.getTicketsByNumber(ticketNumber);
      
      if (duplicates.length > 1) {
        console.warn(`⚠️ Duplicate ticket number detected after creation: ${ticketNumber}. Found ${duplicates.length} tickets. Fixing...`);
        
        // Sort by creation date (oldest first)
        duplicates.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        
        // If timestamps are identical, sort by ID string to be deterministic
        if (duplicates[0].createdAt === duplicates[1].createdAt) {
           duplicates.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
        }

        const myTicketIndex = duplicates.findIndex(t => t.id === ticket.id);
        
        // If I am NOT the first one (index > 0), I must change my number
        if (myTicketIndex > 0) {
           console.log(`🔄 I am duplicate #${myTicketIndex} (ID: ${ticket.id}). Generating new number...`);
           
           // Fetch fresh list of recent numbers
           const recentNumbers = await TicketService.getRecentTicketNumbers(50);
           
           // Generate new number
           let newTicketNumber = generateTicketNumber(recentNumbers);
           
           // Ensure it's really unique (loop check)
           let isNewUnique = false;
           let safetyCounter = 0;
           
           while (!isNewUnique && safetyCounter < 10) {
             const exists = await TicketService.getTicketByNumber(newTicketNumber);
             
             if (exists) {
               // Manually increment
               const parts = parseTicketNumber(newTicketNumber);
               if (parts) {
                 const nextSeq = parts.sequence + 1;
                 newTicketNumber = `RHD-${parts.dateString}-${String(nextSeq).padStart(4, '0')}`;
               } else {
                 recentNumbers.push(newTicketNumber);
                 newTicketNumber = generateTicketNumber(recentNumbers);
               }
               safetyCounter++;
             } else {
               isNewUnique = true;
             }
           }
           
           if (isNewUnique) {
             console.log(`✅ Updating ticket ${ticket.id} to new number: ${newTicketNumber}`);
             await TicketService.updateTicket(ticket.id!, { ticketNumber: newTicketNumber });
             
             // Update local variables
             ticket.ticketNumber = newTicketNumber;
             ticketNumber = newTicketNumber; 
           } else {
             console.error('❌ Failed to generate unique number during duplicate fix.');
           }
        }
      }
    } catch (fixError) {
      console.error('Error during duplicate ticket fix:', fixError);
    }
    // -----------------------------

    // Revalidate cache
    revalidateTag('tickets', {});
    revalidatePath('/tickets');

    // Handle file attachments if any
    let attachments: Attachment[] = [];
    let uploadErrors: string[] = [];
    
    if (formData.attachments && formData.attachments.length > 0 && project) {
      // Upload files to SharePoint TicketAttachments library
      console.log(`📎 Uploading ${formData.attachments.length} files to SharePoint...`);
      
      const uploadResult = await uploadTicketAttachments(
        formData.attachments,
        project.projectCode,
        ticketNumber
      );
      
      attachments = uploadResult.attachments;
      uploadErrors = uploadResult.errors;
      
      if (uploadErrors.length > 0) {
        console.warn('⚠️ Some files failed to upload:', uploadErrors);
      }
      
      console.log(`✅ Uploaded ${attachments.length} files successfully to SharePoint`);
    }

    // Log ticket creation
    // const session = await getSession(); // Already fetched at the beginning
    const userId = session?.id as string || 'system';
    const userName = session?.fullName as string || 'System';
    
    await TicketService.addChangeLog({
      ticketId: ticket.id!,
      userId,
      userName,
      action: 'created',
      description: 'Ticket created',
      createdAt: now
    });

    // Sync project status
    if (ticket.projectId) {
      await syncProjectStatus(ticket.projectId);
    }

    // Use ticket directly with attachments
    const finalTicket = { ...ticket, attachments };

    // Send notification email directly from server-side
    try {
      const recipients = new Set<string>();
      
      // Add reporter email
      if (finalTicket.reporterEmail) {
        recipients.add(finalTicket.reporterEmail);
      }

      // Add current user email (Case Opener) - Case 1
      if (session?.email) {
        recipients.add(session.email as string);
      }
      
      // Add project manager email
      if (project?.projectManager?.email) {
        recipients.add(project.projectManager.email);
      }
      
      // Find assigned supplier and add email
      let assignedToName = finalTicket.assignedTo || 'ยังไม่ได้มอบหมาย';
      if (finalTicket.assignedTo && project?.suppliers) {
        const cleanAssignedTo = finalTicket.assignedTo.trim();
        
        // Try to find by ID first
        let assignedSupplier = project.suppliers.find((s: any) => s.id && s.id.trim() === cleanAssignedTo);
        
        // If not found by ID, try by name (fallback)
        if (!assignedSupplier) {
          assignedSupplier = project.suppliers.find((s: any) => s.name && s.name.trim() === cleanAssignedTo);
        }

        if (assignedSupplier) {
          assignedToName = assignedSupplier.name; // Use name for display
          if (assignedSupplier.email) {
            recipients.add(assignedSupplier.email);
          }
        }
      }

      const recipientList = Array.from(recipients);

      // Prepare attachments for email
      const emailAttachments: { filename: string; content: Buffer }[] = [];

      if (formData.attachments && formData.attachments.length > 0) {
        for (const file of formData.attachments) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            emailAttachments.push({
              filename: file.name,
              content: Buffer.from(arrayBuffer)
            });
          } catch (err) {
            console.error('Failed to read file for email attachment:', file.name, err);
          }
        }
      }

      if (recipientList.length > 0) {
        const emailResult = await sendEmail({
          to: recipientList,
          subject: `🎫 Ticket ใหม่: ${finalTicket.ticketNumber} - ${finalTicket.subject}`,
          attachments: emailAttachments,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: white; margin: 0;">🎫 Ticket ใหม่ถูกสร้างแล้ว</h2>
              </div>
              
              <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>หมายเลข Ticket:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${finalTicket.ticketNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>หัวข้อ:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${finalTicket.subject}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>ผู้รายงาน:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${finalTicket.reporterName} (${finalTicket.reporterEmail})</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>ระดับความสำคัญ:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                      <span style="background: ${finalTicket.priority === 'High' ? '#fef3c7' : finalTicket.priority === 'Medium' ? '#fef9c3' : '#f0fdf4'}; 
                                   color: ${finalTicket.priority === 'High' ? '#d97706' : finalTicket.priority === 'Medium' ? '#ca8a04' : '#16a34a'}; 
                                   padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        ${finalTicket.priority}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>ผู้รับผิดชอบ:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${assignedToName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; vertical-align: top;"><strong>รายละเอียด:</strong></td>
                    <td style="padding: 8px 0;">${finalTicket.description}</td>
                  </tr>
                </table>
              </div>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; margin-top: 10px;"><div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px;">
                  <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
        	          © ${new Date().getFullYear()} Ruthvictor - All Rights Reserved
	                </p>
                  <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; color: #ef4444; font-size: 15px; line-height: 22px; text-align: center;">
                    📧 อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
                  </p>
                </div> 
            </div>
          `,
          text: `
🎫 Ticket ใหม่ถูกสร้างแล้ว

หมายเลข Ticket: ${finalTicket.ticketNumber}
หัวข้อ: ${finalTicket.subject}
ผู้รายงาน: ${finalTicket.reporterName} (${finalTicket.reporterEmail})
ระดับความสำคัญ: ${finalTicket.priority}
ผู้รับผิดชอบ: ${assignedToName}

รายละเอียด:
${finalTicket.description}
          `
        });

        if (emailResult.success) {
          console.log('✅ Ticket creation email sent to:', recipientList);
          // Log notification history for each recipient
          for (const email of recipientList) {
            await logNotificationHistory(
              finalTicket.id!,
              'ticket_created',
              email,
              true
            );
          }
        } else {
          console.error('❌ Failed to send ticket creation email:', emailResult.error);
          // Log failed notification
          for (const email of recipientList) {
            await logNotificationHistory(
              finalTicket.id!,
              'ticket_created',
              email,
              false,
              String(emailResult.error)
            );
          }
        }
      }

    } catch (emailError) {
      console.error('Error sending ticket creation email:', emailError);
      // Don't fail ticket creation if email fails
    }

    return { success: true, data: finalTicket };
  } catch (error) {
    console.error('Error in createTicketWithEmail:', error);
    
    // If this is a database connection issue, try fallback to localStorage
    if (typeof window !== 'undefined') {
      console.warn('Database error detected, falling back to localStorage');
      try {
        const fallbackTicket = await TicketService.createTicketInLocalStorage(formData, project);
        return { success: true, data: fallbackTicket };
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Helper to check if SLA warning has been sent since the last reset
 */
async function hasSlaWarningBeenSentSinceReset(ticketId: string): Promise<boolean> {
  try {
    const logs = await TicketService.getTicketChangeLogs(ticketId);
    
    // Find latest reset
    const lastReset = logs
      .filter(l => l.action === 'sla_reset')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
      
    // Find latest warning
    const lastWarning = logs
      .filter(l => l.action === 'sla_warning_sent')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];

    if (!lastWarning) return false;
    
    if (!lastReset) return true; // Warning exists, no reset -> Sent
    
    // If warning is newer than reset, then it's sent.
    return new Date(lastWarning.createdAt || 0) > new Date(lastReset.createdAt || 0);
  } catch (error) {
    console.warn('Error checking logs:', error);
    return false;
  }
}

/**
 * Process SLA warning for a single ticket
 */
export async function processSlaWarningForTicket(ticket: Ticket, project?: Project): Promise<boolean> {
  // Skip tickets without creation date
  if (!ticket.createdAt) return false;
  
  // Get project data if missing
  if (!project && ticket.projectId) {
    try {
      project = await getProjectById(ticket.projectId) || undefined;
    } catch {
      console.warn(`Failed to get project ${ticket.projectId} for ticket ${ticket.ticketNumber}`);
    }
  }
  
  const slaStartTime = ticket.receivedAt ? new Date(ticket.receivedAt) : new Date(ticket.createdAt);
  
  // Check if ticket needs SLA warning
  if (isSlaWarning(ticket.priority, slaStartTime, project)) {
    
    // Get SLA percentage
    const slaUsage = getSlaUsagePercentage(ticket.priority, slaStartTime, project);
    
    // Only send warning if usage is >= 80%
    if (slaUsage >= 80) {
      
      // Check if warning has already been sent since last reset
      let warningAlreadySent = false;
      if (ticket.id) {
        warningAlreadySent = await hasSlaWarningBeenSentSinceReset(ticket.id);
      }

      if (warningAlreadySent) {
        return false;
      }

      const slaDeadline = calculateSlaDeadline(ticket.priority, project, slaStartTime);
      const timeRemaining = formatRemainingTime(slaDeadline);
      const isOverdue = timeRemaining === 'Overdue';
      const subjectTimeText = isOverdue ? 'Overdue' : `${timeRemaining} remaining`;
      
      // Prepare recipients
      const recipients = [];

      // Add creator email (Case Opener)
      if (ticket.createdByEmail) {
        recipients.push(ticket.createdByEmail);
      }
      
      // Add project manager email
      if (project?.projectManager?.email) {
        recipients.push(project.projectManager.email);
      }
      
      // Find assigned supplier name and email
      let assignedSupplierName = ticket.assignedTo || 'Unassigned';
      
      // Add assigned supplier email
      if (ticket.assignedTo && project?.suppliers) {
        const cleanAssignedTo = ticket.assignedTo.trim();
        
        // Try to find by ID first (new format), then by name (old format)
        const assignedSupplier = project.suppliers.find(s => 
          (s.id && s.id.trim() === cleanAssignedTo) || 
          (s.name && s.name.trim() === cleanAssignedTo)
        );
        
        if (assignedSupplier) {
          if (assignedSupplier.email) {
            recipients.push(assignedSupplier.email);
          }
          // Use the company name for display
          assignedSupplierName = assignedSupplier.name;
        }
      }

      if (recipients.length > 0) {
        const emailResult = await sendEmail({
          to: recipients,
          subject: `⚠️ SLA Warning: ${ticket.ticketNumber} - ${subjectTimeText}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; color: white;">⚠️ SLA Warning</h1>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; margin: 0;">
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                  <h2 style="color: #92400e; margin: 0 0 15px 0;">${ticket.subject}</h2>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Ticket Number:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${ticket.ticketNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Priority:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="background: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                          ${ticket.priority}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Assigned To:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${assignedSupplierName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>SLA Deadline:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${formatThailandTime(slaDeadline.toISOString())}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Time Remaining:</strong></td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="background: #fef2f2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-weight: bold;">
                          ${timeRemaining}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; vertical-align: top;"><strong>SLA Progress:</strong></td>
                      <td style="padding: 8px 0;">
                        <div style="background: #f3f4f6; border-radius: 10px; height: 20px; position: relative;">
                          <div style="background: #f59e0b; height: 100%; width: ${slaUsage}%; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <span style="color: white; font-size: 12px; font-weight: bold;">${Math.round(slaUsage)}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #f59e0b; color: white; padding: 15px; margin-top: 20px; border-radius: 8px;">
                  <p style="margin: 0; font-weight: bold;">🚨 Action Required!</p>
                  <p style="margin: 5px 0 0 0;">This ticket has reached 80% of its SLA time. Please take immediate action to avoid SLA breach.</p>
                </div>
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; margin-top: 10px;"><div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px;">
                <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
        	        © ${new Date().getFullYear()} Ruthvictor - All Rights Reserved
	              </p>
                <p style="margin: 0; font-family: Tahoma, Arial, Helvetica, sans-serif; color: #ef4444; font-size: 15px; line-height: 22px; text-align: center;">
                  📧 อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้
                </p>
              </div> 
            </div>
          `,
          text: `
⚠️ SLA Warning

Ticket: ${ticket.ticketNumber}
Subject: ${ticket.subject}
Priority: ${ticket.priority}
Assigned To: ${assignedSupplierName}
SLA Deadline: ${formatThailandTime(slaDeadline.toISOString())}
Time Remaining: ${timeRemaining}
SLA Progress: ${Math.round(slaUsage)}%

🚨 Action Required!
This ticket has reached 80% of its SLA time. Please take immediate action to avoid SLA breach.

📧 อีเมลนี้ส่งโดยอัตโนมัติจากระบบ Support Ticket System
          `
        });

        if (emailResult.success) {
          console.log(`✅ SLA warning sent for ticket ${ticket.ticketNumber} to:`, recipients);

          // Log the warning
          if (ticket.id) {
            await TicketService.addChangeLog({
              ticketId: ticket.id,
              userId: 'system',
              userName: 'System',
              action: 'sla_warning_sent',
              description: `SLA Warning sent at ${Math.round(slaUsage)}% usage. Time remaining: ${timeRemaining}`,
              createdAt: new Date().toISOString()
            });
          }
          return true;
        } else {
          console.error(`❌ Failed to send SLA warning for ticket ${ticket.ticketNumber}:`, emailResult.error);
        }
      }
    }
  }
  return false;
}

/**
 * Server Action สำหรับตรวจสอบและส่งแจ้งเตือน SLA Warning
 */
export async function checkAndSendSlaWarnings(): Promise<{ 
  success: boolean; 
  processedTickets: number; 
  warningsSent: number; 
  error?: string 
}> {
  try {
    // Get all open tickets that are not resolved
    const openTickets = await TicketService.getAllTickets();
    
    // Filter only open tickets
    const activeTickets = openTickets.filter(ticket => 
      ['Open', 'In Progress', 'Pending'].includes(ticket.status)
    );

    let processedTickets = 0;
    let warningsSent = 0;

    for (const ticket of activeTickets) {
      processedTickets++;
      
      // Skip tickets without creation date
      if (!ticket.createdAt) continue;
      
      // Get project data if ticket has projectId
      let project: Project | undefined = undefined;
      if (ticket.projectId) {
        try {
          project = await getProjectById(ticket.projectId) || undefined;
        } catch {
          console.warn(`Failed to get project ${ticket.projectId} for ticket ${ticket.ticketNumber}`);
        }
      }
      
      // Use the helper function to process each ticket
      const warningSent = await processSlaWarningForTicket(ticket, project);
      if (warningSent) {
        warningsSent++;
      }
    }

    console.log(`✅ SLA warning check completed. Processed: ${processedTickets}, Warnings sent: ${warningsSent}`);
    
    return {
      success: true,
      processedTickets,
      warningsSent
    };
    
  } catch (error) {
    console.error('Error in checkAndSendSlaWarnings:', error);
    return {
      success: false,
      processedTickets: 0,
      warningsSent: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
