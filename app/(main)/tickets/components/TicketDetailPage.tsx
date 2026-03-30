'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, 
  TicketStatus, 
  TicketChangeLog,
  Attachment
} from '@/types/ticket';
import { Project } from '@/types/project';
import { updateTicketStatusWithEmail, updateTicketResolution } from '@/lib/actions/ticket-actions';
import { uploadTicketAttachments, deleteTicketAttachment } from '@/lib/actions/sharepoint-attachments-service';
import { formatRemainingTime, getSlaStatusColor } from '@/lib/sla-utils';
import { formatThailandTime } from '@/lib/date-utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, X, File as FileIcon, Loader2 } from 'lucide-react';

const STATUS_OPTIONS: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Open': 'bg-blue-500 text-white',
  'In Progress': 'bg-yellow-500 text-white',
  'Resolved': 'bg-green-500 text-white',
  'Closed': 'bg-gray-500 text-white'
};

interface TicketDetailPageProps {
  ticket: Ticket;
  project: Project | null;
  changeLogs: TicketChangeLog[];
}

export default function TicketDetailPage({ 
  ticket: initialTicket, 
  project, 
  changeLogs
}: TicketDetailPageProps) {
  const router = useRouter();
  
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [updating, setUpdating] = useState(false);
  const [localChangeLogs, setLocalChangeLogs] = useState<TicketChangeLog[]>(changeLogs);

  // Sync ticket state with server data when it changes
  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  // Sync logs state with server data when it changes
  useEffect(() => {
    setLocalChangeLogs(changeLogs);
  }, [changeLogs]);

  // Resolution state
  const [resolvedBy, setResolvedBy] = useState(ticket.resolvedBy || '');
  const [problemFound, setProblemFound] = useState(ticket.problemFound || '');
  const [solution, setSolution] = useState(ticket.solution || '');
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [existingResolutionAttachments, setExistingResolutionAttachments] = useState<Attachment[]>(ticket.resolutionAttachments || []);
  const [isEditingResolution, setIsEditingResolution] = useState(false);
  const [savingResolution, setSavingResolution] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  // Sync resolution state
  useEffect(() => {
    setResolvedBy(ticket.resolvedBy || '');
    setProblemFound(ticket.problemFound || '');
    setSolution(ticket.solution || '');
    setExistingResolutionAttachments(ticket.resolutionAttachments || []);
  }, [ticket]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate file size (max 4MB per file)
      const maxSize = 4 * 1024 * 1024; // 4MB
      const oversizedFiles = files.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        alert(`ไฟล์ต่อไปนี้มีขนาดเกิน 4MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
        // Reset input
        e.target.value = '';
        return;
      }

      setResolutionFiles(prev => [...prev, ...files]);
    }
  };

  const removeNewResolutionFile = (index: number) => {
    setResolutionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteResolutionAttachment = async (attachment: Attachment) => {
    if (!project) return;
    if (!confirm('คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?')) return;

    setDeletingAttachmentId(attachment.id);
    try {
      const result = await deleteTicketAttachment(
        project.projectCode,
        ticket.ticketNumber,
        attachment.filename,
        'resolution'
      );

      if (result.success) {
        setExistingResolutionAttachments(prev => prev.filter(a => a.id !== attachment.id));
      } else {
        alert('ไม่สามารถลบไฟล์แนบได้: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('เกิดข้อผิดพลาดในการลบไฟล์แนบ');
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleSaveResolution = async () => {
    setSavingResolution(true);
    try {
      // Upload files if any
      if (resolutionFiles.length > 0 && project?.projectCode) {
        // Ensure we are using the correct ticket number
        console.log(`Uploading resolution files for ticket: ${ticket.ticketNumber}`);
        
        const uploadResult = await uploadTicketAttachments(
          resolutionFiles,
          project.projectCode,
          ticket.ticketNumber,
          'resolution'
        );
        
        if (uploadResult.errors.length > 0) {
          console.error('Upload errors:', uploadResult.errors);
          alert(`บางไฟล์อัปโหลดไม่สำเร็จ: ${uploadResult.errors.join(', ')}`);
        }
      }

      await updateTicketResolution(ticket.id!, {
        resolvedBy,
        problemFound,
        solution
      });
      setIsEditingResolution(false);
      setResolutionFiles([]);
      router.refresh();
      alert('บันทึกข้อมูลการแก้ไขเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving resolution:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSavingResolution(false);
    }
  };

  // Find assigned supplier
  const assignedSupplier = project?.suppliers?.find(s => s.id === ticket.assignedTo) || null;

  const updateTicketStatus = async (newStatus: TicketStatus) => {
    if (updating) return;
    
    const oldStatus = ticket.status;
    const oldLogs = [...localChangeLogs];
    
    // 1. Optimistic Update
    setTicket(prev => ({ ...prev, status: newStatus }));
    
    // Add optimistic log
    const optimisticLog: TicketChangeLog = {
      id: `temp-${Date.now()}`,
      ticketId: ticket.id!,
      action: 'status_changed',
      userId: 'current-user',
      userName: 'คุณ (กำลังอัปเดต...)',
      description: `Status changed from ${oldStatus} to ${newStatus}`,
      oldValue: oldStatus,
      newValue: newStatus,
      createdAt: new Date().toISOString()
    };
    setLocalChangeLogs(prev => [optimisticLog, ...prev]);
    
    setUpdating(true);

    try {
      const result = await updateTicketStatusWithEmail(ticket.id!, newStatus);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update ticket status');
      }
      
      // Show resolution form when ticket is resolved/closed
      if ((newStatus === 'Resolved' || newStatus === 'Closed')) {
        setIsEditingResolution(true);
      }
      
      router.refresh(); // Refresh server data
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      
      // Revert on error
      setTicket(prev => ({ ...prev, status: oldStatus }));
      setLocalChangeLogs(oldLogs);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatThailandTime(dateString, true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => {
            router.push('/tickets');
          }}
          className="mb-4"
        >
          ← กลับไปหน้ารายการ
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {ticket.ticketNumber}
            </h1>
            <p className="text-xl text-gray-600">{ticket.subject}</p>
          </div>
          
          <div className="flex gap-2">
            <Badge className={STATUS_COLORS[ticket.status]}>
              {ticket.status}
            </Badge>
            <Badge variant="outline">
              {ticket.priority}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">รายละเอียด Ticket</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-sm font-medium text-gray-500">ผู้แจ้งปัญหา</Label>
                <p className="text-gray-900">{ticket.reporterName}</p>
                <p className="text-gray-600 text-sm">{ticket.reporterEmail}</p>
                {ticket.reporterPhone && (
                  <p className="text-gray-600 text-sm">{ticket.reporterPhone}</p>
                )}
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">หมวดหมู่</Label>
                <p className="text-gray-900">{ticket.category}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">ความเร่งด่วน</Label>
                <p className="text-gray-900">{ticket.priority}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">วันที่สร้าง</Label>
                <p className="text-gray-900">
                  {ticket.createdAt && formatDate(ticket.createdAt)}
                </p>
              </div>

              {ticket.receivedAt && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">เวลารับแจ้ง (SLA Start)</Label>
                  <p className="text-gray-900">
                    {formatDate(ticket.receivedAt)}
                  </p>
                </div>
              )}

              {/* Project Information */}
              <div>
                <Label className="text-sm font-medium text-gray-500">โครงการที่เกี่ยวข้อง</Label>
                {project ? (
                  <div>
                    <p className="text-gray-900">{project.projectName}</p>
                    <p className="text-gray-600 text-sm">รหัส: {project.projectCode}</p>
                  </div>
                ) : ticket.projectId ? (
                  <p className="text-gray-500 text-sm">กำลังโหลด...</p>
                ) : (
                  <p className="text-gray-500 text-sm">ไม่ได้ระบุโครงการ</p>
                )}
              </div>
              
              {/* Assigned Supplier */}
              <div>
                <Label className="text-sm font-medium text-gray-500">ผู้ดูแลที่ได้รับมอบหมาย</Label>
                {assignedSupplier ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-gray-900 font-medium">{assignedSupplier.name}</p>
                      <Badge className="bg-green-500 text-white text-xs">ได้รับมอบหมาย</Badge>
                    </div>
                    <p className="text-gray-600 text-sm">{assignedSupplier.email}</p>
                    <p className="text-gray-600 text-sm">{assignedSupplier.telephone}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-medium">Ruthvictor</p>
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 text-xs">Default</Badge>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-500">รายละเอียดปัญหา</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </div>
            
            {/* Attachments Section */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mb-4">
                <Label className="text-sm font-medium text-gray-500">ไฟล์แนบ</Label>
                <div className="mt-2 space-y-2">
                  {ticket.attachments.map((attachment, index) => (
                    <div key={attachment.id || index} className="bg-gray-50 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                            title={attachment.filename}
                          >
                            {attachment.filename}
                          </a>
                          <p className="text-xs text-gray-500 mt-1">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {ticket.slaDeadline && ticket.status !== 'Closed' && (
              <div>
                <Label className="text-sm font-medium text-gray-500">SLA Status</Label>
                <div className="mt-2">
                  <Badge className={getSlaStatusColor(new Date(ticket.slaDeadline))}>
                    {formatRemainingTime(new Date(ticket.slaDeadline))}
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Comments Section - Removed as per requirement */}

          {/* Resolution Details Section - Show when Resolved or Closed */}
          {(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">บันทึกการแก้ไข</h3>
                {!isEditingResolution && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingResolution(true)}>
                    แก้ไข
                  </Button>
                )}
              </div>
              
              {isEditingResolution ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resolvedBy">เคสนี้แก้ไขโดยใคร</Label>
                    <Input
                      id="resolvedBy"
                      value={resolvedBy}
                      onChange={(e) => setResolvedBy(e.target.value)}
                      placeholder="ระบุชื่อผู้แก้ไข"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="problemFound">ปัญหาที่พบ</Label>
                    <Textarea
                      id="problemFound"
                      value={problemFound}
                      onChange={(e) => setProblemFound(e.target.value)}
                      placeholder="ระบุปัญหาที่พบ"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="solution">วิธีแก้ไข</Label>
                    <Textarea
                      id="solution"
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      placeholder="ระบุวิธีแก้ไข"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="attachments">ไฟล์แนบ (เช่น ใบ Service Report) ไม่เกิน 4 MB</Label>
                    
                    {/* Existing Attachments */}
                    {existingResolutionAttachments.length > 0 && (
                      <div className="mt-2 mb-3 space-y-2">
                        <Label className="text-xs text-gray-500">ไฟล์แนบเดิม:</Label>
                        <div className="grid grid-cols-1 gap-2">
                          {existingResolutionAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200">
                              <div className="flex items-center space-x-2 overflow-hidden">
                                <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                <a 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline truncate"
                                >
                                  {attachment.filename}
                                </a>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  ({(attachment.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteResolutionAttachment(attachment)}
                                disabled={deletingAttachmentId === attachment.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                {deletingAttachmentId === attachment.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="mt-1"
                    />
                    
                    {/* New Files List */}
                    {resolutionFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs text-gray-500">ไฟล์ที่เลือกใหม่:</Label>
                        {resolutionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-100">
                            <div className="flex items-center space-x-2 overflow-hidden">
                              <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNewResolutionFile(index)}
                              className="text-gray-500 hover:text-red-500 h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEditingResolution(false)} disabled={savingResolution}>
                      ยกเลิก
                    </Button>
                    <Button onClick={handleSaveResolution} disabled={savingResolution}>
                      {savingResolution ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">เคสนี้แก้ไขโดยใคร</Label>
                    <p className="text-gray-900 mt-1">{ticket.resolvedBy || '-'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">ปัญหาที่พบ</Label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{ticket.problemFound || '-'}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-500">วิธีแก้ไข</Label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{ticket.solution || '-'}</p>
                  </div>

                  {ticket.resolutionAttachments && ticket.resolutionAttachments.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">ไฟล์แนบการแก้ไข</Label>
                      <div className="mt-2 space-y-2">
                        {ticket.resolutionAttachments.map((attachment, index) => (
                          <div key={attachment.id || index} className="bg-gray-50 rounded-md p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
                                  title={attachment.filename}
                                >
                                  {attachment.filename}
                                </a>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.type}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">จัดการสถานะ</h3>
            
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  variant={ticket.status === status ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => updateTicketStatus(status)}
                  disabled={updating || ticket.status === status}
                >
                  {status}
                </Button>
              ))}
            </div>
          </Card>

          {/* Change Log */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">ประวัติการเปลี่ยนแปลง</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {localChangeLogs.map((log) => (
                <div key={log.id} className="text-sm">
                  <div className="flex justify-between items-start">
                    <p className="text-gray-900">{log.description}</p>
                    <p className="text-gray-500 text-xs">
                      {log.createdAt && formatDate(log.createdAt)}
                    </p>
                  </div>
                  <p className="text-gray-600">{log.userName}</p>
                </div>
              ))}
              
              {localChangeLogs.length === 0 && (
                <p className="text-gray-500 text-center py-4">ไม่มีประวัติการเปลี่ยนแปลง</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
