import { Resend } from 'resend';

// Initialize Resend only on server-side to prevent client-side errors
const resend = typeof window === 'undefined' && process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailTemplate {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: {
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    content_id?: string;
  }[];
}

/**
 * ส่งอีเมลผ่าน Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
  attachments
}: EmailTemplate) {
  try {
    // Check if running on server-side
    if (typeof window !== 'undefined') {
      console.warn('Email service cannot be used on client-side');
      return { success: false, error: 'Email service only available on server-side' };
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not configured, email will not be sent');
      return { success: false, error: 'Email service not configured' };
    }

    if (!resend) {
      console.error('Resend client is not initialized');
      return { success: false, error: 'Email service initialization failed' };
    }

    // ใช้ domain ที่ verify แล้วจาก environment variable
    // ต้องตั้งค่า EMAIL_FROM ใน .env.local เป็น email ที่ใช้ verified domain
    // เช่น: noreply@yourdomain.com หรือ support@yourdomain.com
    const fromAddress = from || process.env.EMAIL_FROM ;

    // Simple email sending - using type assertion for Resend API compatibility
    console.log('📧 Attempting to send email:', { from: fromAddress, to: Array.isArray(to) ? to : [to], subject, attachmentsCount: attachments?.length });
    
    const result = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      ...(html && { html }),
      ...(text && { text }),
      ...(attachments && { attachments })
    } as Parameters<typeof resend.emails.send>[0]);

    console.log('✅ Email sent successfully:', result);
    return { success: true, data: result };

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Email Templates สำหรับระบบ Support Ticket
 */
export const emailTemplates = {
  /**
   * แจ้งเตือนเมื่อมีการสร้าง Ticket ใหม่
   */
  ticketCreated: (data: {
    ticketNumber: string;
    title: string;
    projectName: string;
    priority: string;
    assignedTo?: string;
    createdBy: string;
    description: string;
  }) => ({
    subject: `🎫 New Ticket Created: ${data.ticketNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Ticket Created</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .priority-high { border-left: 4px solid #ef4444; }
            .priority-medium { border-left: 4px solid #f59e0b; }
            .priority-low { border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎫 New Support Ticket Created</h1>
            </div>
            <div class="content">
              <div class="ticket-info priority-${data.priority.toLowerCase()}">
                <h2>${data.title}</h2>
                <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
                <p><strong>Project:</strong> ${data.projectName}</p>
                <p><strong>Priority:</strong> ${data.priority}</p>
                <p><strong>Created By:</strong> ${data.createdBy}</p>
                ${data.assignedTo ? `<p><strong>Assigned To:</strong> ${data.assignedTo}</p>` : ''}
                <p><strong>Description:</strong></p>
                <p>${data.description}</p>
              </div>
              <p>Please check your dashboard for more details and to take action on this ticket.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Support Ticket System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New Support Ticket Created

Ticket Number: ${data.ticketNumber}
Title: ${data.title}
Project: ${data.projectName}
Priority: ${data.priority}
Created By: ${data.createdBy}
${data.assignedTo ? `Assigned To: ${data.assignedTo}` : ''}

Description:
${data.description}

Please check your dashboard for more details.
    `
  }),

  /**
   * แจ้งเตือนเมื่อสถานะ Ticket เปลี่ยนแปลง
   */
  ticketStatusChanged: (data: {
    ticketNumber: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    updatedBy: string;
    comment?: string;
  }) => ({
    subject: `📋 Ticket Status Updated: ${data.ticketNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket Status Updated</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .status-change { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .status-badge { padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }
            .status-open { background: #3b82f6; }
            .status-in-progress { background: #f59e0b; }
            .status-resolved { background: #10b981; }
            .status-closed { background: #6b7280; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Ticket Status Updated</h1>
            </div>
            <div class="content">
              <div class="status-change">
                <h2>${data.title}</h2>
                <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
                <p><strong>Status Changed:</strong></p>
                <p>
                  <span class="status-badge status-${data.oldStatus.toLowerCase().replace(' ', '-')}">${data.oldStatus}</span>
                  →
                  <span class="status-badge status-${data.newStatus.toLowerCase().replace(' ', '-')}">${data.newStatus}</span>
                </p>
                <p><strong>Updated By:</strong> ${data.updatedBy}</p>
                ${data.comment ? `<p><strong>Comment:</strong></p><p>${data.comment}</p>` : ''}
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from Support Ticket System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Ticket Status Updated

Ticket Number: ${data.ticketNumber}
Title: ${data.title}
Status Changed: ${data.oldStatus} → ${data.newStatus}
Updated By: ${data.updatedBy}
${data.comment ? `Comment: ${data.comment}` : ''}
    `
  }),

  /**
   * แจ้งเตือน SLA ใกล้หมดอายุ
   */
  slaWarning: (data: {
    ticketNumber: string;
    title: string;
    slaDeadline: string;
    timeRemaining: string;
    assignedTo: string;
  }) => ({
    subject: `⚠️ SLA Warning: ${data.ticketNumber} - ${data.timeRemaining} remaining`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SLA Warning</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ SLA Warning</h1>
            </div>
            <div class="content">
              <div class="warning">
                <h2>${data.title}</h2>
                <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
                <p><strong>Assigned To:</strong> ${data.assignedTo}</p>
                <p><strong>SLA Deadline:</strong> ${data.slaDeadline}</p>
                <p><strong>Time Remaining:</strong> ${data.timeRemaining}</p>
              </div>
              <p>This ticket is approaching its SLA deadline. Please take action soon to avoid SLA breach.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Support Ticket System</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
SLA Warning

Ticket Number: ${data.ticketNumber}
Title: ${data.title}
Assigned To: ${data.assignedTo}
SLA Deadline: ${data.slaDeadline}
Time Remaining: ${data.timeRemaining}

This ticket is approaching its SLA deadline. Please take action soon.
    `
  })
};

/**
 * ส่งอีเมลแจ้งเตือนตาม Template
 */
export async function sendNotificationEmail(
  template: keyof typeof emailTemplates,
  recipients: string | string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emailTemplate = (emailTemplates[template] as any)(data);
  
  return await sendEmail({
    to: recipients,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text
  });
}
