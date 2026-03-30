'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TicketFormData, TicketCategory, TicketPriority } from '@/types/ticket';
import { Project } from '@/types/project';
import { createTicketWithEmail, assignTicketWithEmail } from '@/lib/actions/ticket-actions';
// Note: Validation logic and imports might need adjustments
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES: TicketCategory[] = ['Hardware', 'Software', 'Network', 'Security', 'Database', 'Other'];
const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High'];

interface CreateTicketFormProps {
  projects: Project[];
  frequentReporters?: {
    name: string;
    email: string;
    phone: string;
  }[];
}

export default function CreateTicketForm({ projects = [] }: CreateTicketFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<TicketFormData>({
    reporterName: '',
    reporterEmail: '',
    reporterPhone: '',
    category: 'Other',
    priority: 'Medium',
    subject: '',
    description: '',
    projectId: '',
    attachments: []
  });
  const [assignedSupplierId, setAssignedSupplierId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCustomReporter, setIsCustomReporter] = useState(false);

  useEffect(() => {
    if (projectIdFromUrl && projects.length > 0) {
      const project = projects.find(p => p.id === projectIdFromUrl);
      if (project) {
        setFormData(prev => ({ ...prev, projectId: projectIdFromUrl }));
        setSelectedProject(project);
      }
    }
  }, [projectIdFromUrl, projects]);

  // Handle project change
  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
    setFormData(prev => ({
      ...prev,
      projectId: projectId,
      // Reset reporter fields if not custom
      ...(!isCustomReporter ? {
        reporterId: '',
        reporterName: '',
        reporterEmail: '',
        reporterPhone: ''
      } : {})
    }));
  };

  // Handle reporter selection
  const handleReporterSelect = (reporterId: string) => {
    // Custom option removed
    setIsCustomReporter(false);
    const reporter = selectedProject?.reporters?.find(r => r.id === reporterId);
    if (reporter) {
      setFormData(prev => ({
        ...prev,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        reporterPhone: reporter.telephone
      }));
    }
  };

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup is handled in onLoad event of images
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reporterName.trim()) {
      newErrors.reporterName = 'กรุณาเลือกรายชื่อผู้แจ้งปัญหา';
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

    // Validate project selection - required
    if (!formData.projectId) {
      newErrors.projectId = 'กรุณาเลือกโครงการที่เกี่ยวข้อง';
    }

    // Note: Supplier selection is now optional
    // Tickets will be created in "Open" status and can be assigned later

    setErrors(newErrors);

    // Show alert if there are errors (specifically for reporter which might be missed)
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors);
      if (newErrors.reporterName) {
        alert('กรุณาเลือกรายชื่อผู้แจ้งปัญหา');
      } else {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      }
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Process attachments - in a real app, you'd upload to cloud storage
      const processedAttachments: File[] = attachments;

      // Find selected project if any
      const selectedProject = formData.projectId ? 
        projects.find(p => p.id === formData.projectId) : undefined;

      const ticketData: TicketFormData = {
        ...formData,
        assignedTo: assignedSupplierId || undefined, // Use supplier ID directly
        attachments: processedAttachments
      };

      const result = await createTicketWithEmail(ticketData, selectedProject || {} as Project);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create ticket');
      }
      
      const ticket = result.data;
      console.log('Created ticket:', ticket); // Debug log
      
      // Auto-assign to supplier if one was selected
      if (assignedSupplierId && selectedProject && ticket?.id) {
        console.log('Assigning ticket to selected supplier:', assignedSupplierId); // Debug log
        const assignResult = await assignTicketWithEmail(ticket.id, assignedSupplierId, 'system');
        console.log('Assignment result:', assignResult); // Debug log
      }
      // Note: If no supplier selected, ticket remains in "Open" status
      
      // Redirect to tickets list page
      router.push('/tickets');
    } catch (error) {
      console.error('Error creating ticket:', error);
      
      // Show more specific error message
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้าง Ticket';
      
      if (error instanceof Error) {
        if (error.message.includes('storage')) {
          errorMessage = 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ แต่ Ticket ได้ถูกสร้างแล้ว กรุณาแนบไฟล์ภายหลัง';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองอีกครั้ง';
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Handle project selection
    if (name === 'projectId') {
      const project = projects.find(p => p.id === value);
      setSelectedProject(project || null);
      
      // Reset supplier selection when project changes
      setAssignedSupplierId('');
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // Validate file size (max 4MB per file)
      const maxSize = 4 * 1024 * 1024; // 4MB
      const oversizedFiles = fileArray.filter(file => file.size > maxSize);
      
      if (oversizedFiles.length > 0) {
        alert(`ไฟล์ต่อไปนี้มีขนาดเกิน 4MB: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      // Validate file types (images, documents, etc.)
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ];
      
      const invalidFiles = fileArray.filter(file => !allowedTypes.includes(file.type));
      
      if (invalidFiles.length > 0) {
        alert(`ไฟล์ต่อไปนี้ไม่รองรับ: ${invalidFiles.map(f => f.name).join(', ')}`);
        return;
      }
      
      setAttachments(prev => [...prev, ...fileArray]);
      setFormData(prev => ({ 
        ...prev, 
        attachments: [...(prev.attachments || []), ...fileArray] 
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">สร้าง Ticket ใหม่</h1>
            <p className="text-gray-600">กรอกข้อมูลเพื่อแจ้งปัญหาหรือขอความช่วยเหลือ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reporter Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">ข้อมูลผู้แจ้ง</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="project">โครงการ *</Label>
                  <select
                    id="project"
                    name="projectId"
                    value={formData.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className={`w-full mt-1 border rounded-md p-2 bg-background ${errors.projectId ? 'border-red-500' : ''}`}
                    disabled={!!projectIdFromUrl} 
                  >
                    <option value="">-- เลือกโครงการ --</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.projectCode}   {project.projectName}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && <span className="text-red-500 text-sm">{errors.projectId}</span>}
                </div>

                {selectedProject && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                    <div className="space-y-2">
                       <Label>เลือกรายชื่อผู้แจ้งปัญหา</Label>
                       {(selectedProject.reporters && selectedProject.reporters.length > 0) ? (
                         <div className="space-y-1">
                           <Select onValueChange={handleReporterSelect}>
                             <SelectTrigger className={`w-full bg-background ${errors.reporterName ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="-- เลือกผู้แจ้งปัญหาจากรายชื่อ --" />
                             </SelectTrigger>
                             <SelectContent className="bg-white">
                               {selectedProject.reporters.map((reporter) => (
                                 <SelectItem key={reporter.id} value={reporter.id || 'unknown'}>
                                   {reporter.name} {reporter.email ? `(${reporter.email})` : ''}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           {errors.reporterName && (
                             <p className="text-red-500 text-sm">{errors.reporterName}</p>
                           )}
                         </div>
                       ) : (
                         <div className="text-sm text-muted-foreground p-2 border border-dashed rounded bg-background/50">
                           <span className="text-amber-600">ℹ️ โครงการนี้ยังไม่มีรายชื่อผู้แจ้งปัญหาที่ลงทะเบียนไว้</span>
                           <p className="mt-1 text-xs text-gray-500">
                             กรุณาเพิ่มรายชื่อผู้แจ้งปัญหาในเมนู จัดการโครงการ ก่อนสร้าง Ticket
                           </p>
                         </div>
                       )}

                       {/* แสดงข้อมูลผู้แจ้งที่เลือก */}
                       {formData.reporterName && !isCustomReporter && (
                          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded border">
                                <Label className="text-xs text-gray-500">ชื่อผู้แจ้ง</Label>
                                <p className="font-medium text-sm">{formData.reporterName}</p>
                            </div>
                            <div className="bg-white p-3 rounded border">
                                <Label className="text-xs text-gray-500">อีเมล</Label>
                                <p className="text-sm">{formData.reporterEmail || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded border">
                                <Label className="text-xs text-gray-500">เบอร์โทรศัพท์</Label>
                                <p className="text-sm">{formData.reporterPhone || '-'}</p>
                            </div>
                          </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Manual inputs removed as requested */}
            </div>

            {/* Ticket Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">รายละเอียด Ticket</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div>
                <Label htmlFor="receivedAt">เวลารับแจ้ง (ถ้ามี)</Label>
                <Input
                  id="receivedAt"
                  name="receivedAt"
                  type="datetime-local"
                  value={formData.receivedAt || ''}
                  onChange={handleInputChange}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  หากระบุ ระบบจะเริ่มนับ SLA จากเวลานี้ (ถ้าไม่ระบุจะนับจากเวลาที่สร้าง Ticket)
                </p>
              </div>

              {projects.length > 0 && selectedProject && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm md:col-span-2">
                   <h4 className="font-semibold text-blue-900 mb-2">ข้อมูล SLA ของโครงการ: {selectedProject.projectName}</h4>
                   <div className="space-y-2 text-blue-800">
                     <p><strong>ระยะเวลาแก้ไขตามระดับความเร่งด่วน:</strong></p>
                     <ul className="list-disc list-inside ml-2 space-y-1">
                       <li>High: {selectedProject.slaLevel.high} ชั่วโมง</li>
                       <li>Medium: {selectedProject.slaLevel.medium} ชั่วโมง</li>
                       <li>Low: {selectedProject.slaLevel.low} ชั่วโมง</li>
                     </ul>
                     <p className="mt-3 font-medium bg-blue-100/50 p-2 rounded inline-block">
                       SLA สำหรับ Ticket นี้ ({formData.priority}): {
                         formData.priority === 'High' ? selectedProject.slaLevel.high :
                         formData.priority === 'Medium' ? selectedProject.slaLevel.medium :
                         selectedProject.slaLevel.low
                       } ชั่วโมง
                     </p>
                   </div>
                </div>
              )}

              {/* Supplier Selection (Optional) */}
              {selectedProject && selectedProject.suppliers && selectedProject.suppliers.length > 0 && (
                <div>
                  <Label htmlFor="assignedSupplierId">ผู้ให้บริการที่รับผิดชอบ (ไม่จำเป็น)</Label>
                  <select
                    id="assignedSupplierId"
                    value={assignedSupplierId}
                    onChange={(e) => setAssignedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- ไม่ระบุ (สามารถมอบหมายภายหลัง) --</option>
                    {selectedProject.suppliers.map((supplier, index) => {
                      const supplierId = supplier.id || `${selectedProject.id}-supplier-${index}`;
                      return (
                        <option key={supplierId} value={supplierId}>
                          {supplier.name} ({supplier.email})
                        </option>
                      );
                    })}
                  </select>
                  
                  {assignedSupplierId && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      {(() => {
                        const supplierIndex = selectedProject.suppliers.findIndex(s => 
                          (s.id || `${selectedProject.id}-supplier-${selectedProject.suppliers.indexOf(s)}`) === assignedSupplierId
                        );
                        const supplier = supplierIndex >= 0 ? selectedProject.suppliers[supplierIndex] : null;
                        
                        if (!supplier) return null;
                        
                        return (
                          <div>
                            <h4 className="text-sm font-medium text-green-900 mb-2">ข้อมูลผู้ให้บริการที่เลือก</h4>
                            <div className="text-sm text-green-800">
                              <p><strong>ชื่อ:</strong> {supplier.name}</p>
                              <p><strong>อีเมล:</strong> {supplier.email}</p>
                              <p><strong>โทรศัพท์:</strong> {supplier.telephone}</p>
                              <p className="mt-2 text-xs italic bg-yellow-100 p-2 rounded">
                                ✓ Ticket จะถูกมอบหมายให้ผู้ให้บริการนี้ (สถานะยังคงเป็น Open)
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

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
                <Label htmlFor="description">รายละเอียดปัญหา (ข้อมูลเคส) *</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={formData.description}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="อธิบายรายละเอียดของปัญหาที่พบ เพื่อให้ทีมงานสามารถช่วยเหลือได้อย่างมีประสิทธิภาพ"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              {/* File Attachments */}
              <div>
                <Label htmlFor="attachments">แนบไฟล์ (ไม่บังคับ)</Label>
                <div className="mt-1">
                  <input
                    id="attachments"
                    name="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    รองรับไฟล์: รูปภาพ (PNG, JPG), PDF, Word, Excel, Text (ไฟล์ละไม่เกิน 4MB)
                  </p>
                </div>
                
                {/* Display selected files */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <p className="text-sm font-medium text-gray-700">ไฟล์ที่เลือก ({attachments.length} ไฟล์):</p>
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="ml-3 w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors text-sm font-bold"
                            title="ลบไฟล์"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? 'กำลังสร้าง...' : 'สร้าง Ticket'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  if (projectIdFromUrl) {
                    router.push('/projects');
                  } else {
                    router.push('/tickets');
                  }
                }}
                disabled={loading}
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
