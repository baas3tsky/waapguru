'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ticket, TicketCategory, TicketPriority, Attachment } from '@/types/ticket';
import { Project } from '@/types/project';
import { updateTicketAction } from '@/lib/actions/ticket-actions';
import { uploadTicketAttachments, deleteTicketAttachment } from '@/lib/actions/sharepoint-attachments-service';
import { X, Upload, File as FileIcon, Trash2, Loader2 } from 'lucide-react';

const CATEGORIES: TicketCategory[] = ['Hardware', 'Software', 'Network', 'Security', 'Database', 'Other'];
const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High'];

interface EditTicketPageProps {
  ticket: Ticket;
  project: Project | null;
}

export default function EditTicketPage({ ticket, project }: EditTicketPageProps) {
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>(ticket.attachments || []);
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    reporterName: ticket.reporterName,
    reporterEmail: ticket.reporterEmail,
    reporterPhone: ticket.reporterPhone || '',
    category: ticket.category,
    priority: ticket.priority,
    subject: ticket.subject,
    description: ticket.description,
    assignedTo: ticket.assignedTo || '',
    receivedAt: ticket.receivedAt ? (() => {
      const date = new Date(ticket.receivedAt);
      const offset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    })() : ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReporterSelect = (reporterId: string) => {
    const reporter = project?.reporters?.find(r => r.id === reporterId);
    if (reporter) {
      setFormData(prev => ({
        ...prev,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        reporterPhone: reporter.telephone
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reporterName.trim()) {
      newErrors.reporterName = 'ชื่อผู้แจ้งปัญหาจำเป็นต้องกรอก';
    }

    if (!formData.reporterEmail.trim()) {
      newErrors.reporterEmail = 'อีเมลจำเป็นต้องกรอก';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporterEmail)) {
      newErrors.reporterEmail = 'รูปแบบอีเมลไม่ถูกต้อง';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'หัวข้อปัญหาจำเป็นต้องกรอก';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'รายละเอียดปัญหาจำเป็นต้องกรอก';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!project) return;
    if (!confirm('คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?')) return;

    setDeletingAttachmentId(attachment.id);
    try {
      const result = await deleteTicketAttachment(
        project.projectCode,
        ticket.ticketNumber,
        attachment.filename
      );

      if (result.success) {
        setExistingAttachments(prev => prev.filter(a => a.id !== attachment.id));
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Validate file size (4MB)
      const validFiles = files.filter(file => {
        if (file.size > 4 * 1024 * 1024) {
          alert(`ไฟล์ ${file.name} มีขนาดเกิน 4MB`);
          return false;
        }
        return true;
      });

      setNewAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // 1. Update ticket fields
      await updateTicketAction(ticket.id!, {
        reporterName: formData.reporterName,
        reporterEmail: formData.reporterEmail,
        reporterPhone: formData.reporterPhone || undefined,
        category: formData.category,
        priority: formData.priority,
        subject: formData.subject,
        description: formData.description,
        assignedTo: formData.assignedTo || undefined,
        receivedAt: formData.receivedAt ? new Date(formData.receivedAt).toISOString() : undefined
      });

      // 2. Upload new attachments if any
      if (newAttachments.length > 0 && project) {
        const uploadResult = await uploadTicketAttachments(
          newAttachments,
          project.projectCode,
          ticket.ticketNumber
        );
        
        if (uploadResult.errors.length > 0) {
          alert('บางไฟล์ไม่สามารถอัปโหลดได้: ' + uploadResult.errors.join(', '));
        }
      }
      
      // Redirect back to tickets list
      router.push('/tickets');
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไข Ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              แก้ไข Ticket: {ticket.ticketNumber}
            </h1>
            <p className="text-gray-600">แก้ไขข้อมูล Ticket</p>
            {project && (
              <div className="mt-2 text-sm text-blue-600">
                โครงการ: {project.projectName} ({project.projectCode})
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reporter Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">ข้อมูลผู้แจ้ง</h3>
              
              {project?.reporters && project.reporters.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <Label className="mb-2 block">เลือกรายชื่อผู้แจ้ง (ข้อมูลเดิมจะถูกแทนที่)</Label>
                  <Select onValueChange={handleReporterSelect} defaultValue={ticket.reporterId ? project.reporters.find(r => r.id === ticket.reporterId)?.id : undefined}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="-- เลือกผู้แจ้งปัญหาจากรายชื่อ --" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {project.reporters.map((reporter) => (
                        <SelectItem key={reporter.id} value={reporter.id || 'unknown'}>
                          {reporter.name} {reporter.email ? `(${reporter.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Read Only Reporter Information - Displaying selected/current data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded bg-slate-50">
                <div>
                  <Label className="text-xs text-muted-foreground">ชื่อผู้แจ้งปัญหา</Label>
                  <p className="font-medium text-sm mt-1">{formData.reporterName || '-'}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">อีเมล</Label>
                   <p className="font-medium text-sm mt-1">{formData.reporterEmail || '-'}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">เบอร์โทร</Label>
                   <p className="font-medium text-sm mt-1">{formData.reporterPhone || '-'}</p>
                </div>
              </div>
            </div>

            {/* Ticket Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">รายละเอียด Ticket</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">หมวดหมู่ *</Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="priority">ระดับความเร่งด่วน *</Label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="receivedAt">วันที่รับแจ้ง</Label>
                  <Input
                    id="receivedAt"
                    name="receivedAt"
                    type="datetime-local"
                    value={formData.receivedAt}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">หัวข้อปัญหา *</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={errors.subject ? 'border-red-500' : ''}
                  placeholder="สรุปปัญหาโดยย่อ"
                />
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">รายละเอียดของปัญหา *</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="อธิบายรายละเอียดของปัญหาที่พบ"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">ไฟล์แนบ</h3>
              
              {/* Existing Attachments */}
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <Label>ไฟล์แนบเดิม:</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {existingAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <FileIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
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
                          onClick={() => handleDeleteAttachment(attachment)}
                          disabled={deletingAttachmentId === attachment.id}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

              {/* New Attachments */}
              <div className="space-y-2">
                <Label htmlFor="attachments">เพิ่มไฟล์แนบใหม่ (สูงสุด 4MB/ไฟล์):</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="attachments"
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4" />
                    เลือกไฟล์
                  </Label>
                  <span className="text-sm text-gray-500">
                    {newAttachments.length > 0 
                      ? `เลือกแล้ว ${newAttachments.length} ไฟล์` 
                      : 'ยังไม่ได้เลือกไฟล์'}
                  </span>
                </div>

                {/* New Attachments List */}
                {newAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {newAttachments.map((file, index) => (
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
                          onClick={() => removeNewAttachment(index)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Section */}
            {project ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">จัดการผู้ดูแล</h3>
                
                {/* ผู้ดูแลปัจจุบัน */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">ผู้ดูแลปัจจุบัน:</Label>
                  {formData.assignedTo ? (
                    (() => {
                      const assignedSupplier = project.suppliers.find(s => s.id === formData.assignedTo);
                      return assignedSupplier ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{assignedSupplier.name}</div>
                          <div className="text-gray-600">{assignedSupplier.email}</div>
                          <div className="text-gray-600">{assignedSupplier.telephone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">ไม่พบข้อมูลผู้ดูแล</span>
                      );
                    })()
                  ) : (
                    <span className="text-gray-500">ยังไม่ได้มอบหมายให้ผู้ดูแล</span>
                  )}
                </div>

                {/* เปลี่ยนผู้ดูแล */}
                <div>
                  <Label htmlFor="assignedTo">เปลี่ยนผู้ดูแล:</Label>
                  <select
                    id="assignedTo"
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกผู้ดูแลใหม่ --</option>
                    {project.suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.email})
                      </option>
                    ))}
                  </select>
                  {project.suppliers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      ไม่มีผู้ให้บริการในโครงการนี้
                    </p>
                  )}
                </div>
              </div>
            ) : ticket.projectId ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">จัดการผู้ดูแล</h3>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ไม่สามารถโหลดข้อมูลโครงการได้ กรุณาลองใหม่อีกครั้ง
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">จัดการผู้ดูแล</h3>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                  <p className="text-sm text-gray-600">
                    Ticket นี้ไม่ได้เชื่อมโยงกับโครงการใดๆ จึงไม่สามารถมอบหมายผู้ดูแลได้
                  </p>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push('/tickets')}
                disabled={saving}
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
