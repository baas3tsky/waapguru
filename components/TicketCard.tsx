import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, TicketStatus, TicketPriority } from '@/types/ticket';
import { formatRemainingTime, getSlaStatusColor } from '@/lib/sla-utils';
import { formatDateForUI } from '@/lib/date-utils';

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

interface TicketCardProps {
  ticket: Ticket;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Open': 'bg-blue-500 text-white',
  'In Progress': 'bg-yellow-500 text-white',
  'Resolved': 'bg-green-500 text-white',
  'Closed': 'bg-gray-500 text-white'
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  'Low': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-orange-100 text-orange-800'
};

export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <Link href={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline font-semibold">
              {ticket.ticketNumber}
            </Link>
            <h3 className="text-lg font-medium text-gray-900 mt-1 line-clamp-2">
              {ticket.subject}
            </h3>
          </div>
          <div className="flex gap-2 ml-4">
            <Badge className={STATUS_COLORS[ticket.status]}>
              {ticket.status}
            </Badge>
            <Badge className={PRIORITY_COLORS[ticket.priority]}>
              {ticket.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Reporter Information */}
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">ผู้แจ้ง:</span>
            <span className="ml-2">{ticket.reporterName}</span>
            <span className="mx-2">•</span>
            <span>{ticket.reporterEmail}</span>
          </div>

          {/* Category and Created Date */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <span className="font-medium">หมวดหมู่:</span>
              <span className="ml-2">{ticket.category}</span>
            </div>
            {ticket.createdAt && (
              <span>สร้างเมื่อ: {formatDateForUI(ticket.createdAt)}</span>
            )}
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <span className="font-medium text-gray-600">📎 ไฟล์แนบ:</span>
              {ticket.attachments.map((attachment, index) => (
                <a
                  key={attachment.id || index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                  title={`${attachment.filename} (${formatFileSize(attachment.size)})`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[150px]">{attachment.filename}</span>
                </a>
              ))}
            </div>
          )}

          {/* Description Preview */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {ticket.description}
          </p>

          {/* SLA Information */}
          {ticket.slaDeadline && ticket.status !== 'Closed' && (
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 mr-2">SLA:</span>
              <Badge className={getSlaStatusColor(new Date(ticket.slaDeadline))}>
                {formatRemainingTime(new Date(ticket.slaDeadline))}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Link href={`/tickets/${ticket.id}`}>
              <Button variant="outline" size="sm" className="flex-1">
                ดูรายละเอียด
              </Button>
            </Link>
            {ticket.status === 'Open' && (
              <Link href={`/tickets/${ticket.id}/edit`}>
                <Button variant="outline" size="sm">
                  แก้ไข
                </Button>
              </Link>
            )}
            <Link href={`/tickets/${ticket.id}/comments`}>
              <Button variant="outline" size="sm">
                ความคิดเห็น
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
