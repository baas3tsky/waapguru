'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Ticket, 
  TicketFilters, 
  TicketStatus, 
  TicketPriority,
  TicketCategory,
  DashboardStats,
  Attachment 
} from '@/types/ticket';
import { Project } from '@/types/project';
import { getDashboardStatsAction, deleteTicketAction } from '@/lib/actions/ticket-actions';
import { formatRemainingTime } from '@/lib/sla-utils';
import { formatDateForUI } from '@/lib/date-utils';
import { Clock, RotateCcw, Search, Paperclip, X, ExternalLink } from 'lucide-react';

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Open': 'bg-blue-500 text-white',
  'In Progress': 'bg-yellow-500 text-white',
  'Resolved': 'bg-green-500 text-white',
  'Closed': 'bg-gray-500 text-white'
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  'Low': 'bg-green-100 text-green-800 border-green-200',
  'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'High': 'bg-orange-100 text-orange-800 border-orange-200'
};

const CATEGORY_OPTIONS: TicketCategory[] = ['Hardware', 'Software', 'Network', 'Security', 'Database', 'Other'];
const PRIORITY_OPTIONS: TicketPriority[] = ['Low', 'Medium', 'High'];
const STATUS_OPTIONS: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

interface TicketsListPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  initialTickets: Ticket[];
  initialProjects: Project[];
  initialStats: DashboardStats | null;
}

export default function TicketsListPage({ 
  searchParams,
  initialTickets,
  initialProjects,
  initialStats
}: TicketsListPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  // projects state is initialized but never updated, so we don't need the setter
  const [projects] = useState<Project[]>(initialProjects);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>(initialTickets);
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);
  // loading state was unused
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    // Initialize filters from URL params
    const projectId = searchParams?.projectId as string;
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      setSelectedProject(project || null);
      setFilters(prev => ({ ...prev, projectId }));
    }

    const urlStatus = searchParams?.status as string;
    if (urlStatus) {
      const statusArray = urlStatus.split(',') as TicketStatus[];
      setFilters(prev => ({ ...prev, status: statusArray }));
    }

    const urlPriority = searchParams?.priority as string;
    if (urlPriority) {
      const priorityArray = urlPriority.split(',') as TicketPriority[];
      setFilters(prev => ({ ...prev, priority: priorityArray }));
    }
  }, [searchParams, projects]);

  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...tickets];

      // Apply search term
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(ticket => 
          ticket.ticketNumber.toLowerCase().includes(search) ||
          ticket.reporterName.toLowerCase().includes(search) ||
          ticket.subject.toLowerCase().includes(search) ||
          ticket.reporterEmail.toLowerCase().includes(search) ||
          ticket.description.toLowerCase().includes(search)
        );
      }

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        filtered = filtered.filter(ticket => filters.status!.includes(ticket.status));
      }

      if (filters.priority && filters.priority.length > 0) {
        filtered = filtered.filter(ticket => filters.priority!.includes(ticket.priority));
      }

      if (filters.category && filters.category.length > 0) {
        filtered = filtered.filter(ticket => filters.category!.includes(ticket.category));
      }

      if (filters.projectId) {
        filtered = filtered.filter(ticket => ticket.projectId === filters.projectId);
      }

      if (filters.reporterName && filters.reporterName.trim()) {
        const reporter = filters.reporterName.toLowerCase();
        filtered = filtered.filter(ticket => 
          ticket.reporterName.toLowerCase().includes(reporter) ||
          ticket.reporterEmail.toLowerCase().includes(reporter)
        );
      }

      // Sort by creation date (newest first)
      filtered.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setFilteredTickets(filtered);
    };

    applyFilters();
  }, [filters, searchTerm, tickets]);

  const handleStatusCardClick = (status: TicketStatus) => {
    setFilters(prev => {
      // ถ้ากำลังกรองสถานะนี้อยู่แล้ว ให้ยกเลิกการกรอง (กลับไปแสดงทั้งหมด)
      if (prev.status && prev.status.length === 1 && prev.status[0] === status) {
        return { ...prev, status: [] };
      }
      // ถ้ายังไม่ได้กรองหรือกรองสถานะอื่น ให้กรองสถานะที่เลือก
      return { ...prev, status: [status] };
    });
  }

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setSelectedProject(null);
  };

  const handleDeleteTicket = async (ticketId: string, ticketNumber: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ Ticket ${ticketNumber}?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }

    try {
      setDeletingTicket(ticketId);
      
      const success = await deleteTicketAction(ticketId);
      
      if (success) {
        // Remove from local state
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        setFilteredTickets(prev => prev.filter(t => t.id !== ticketId));
        
        // Refresh stats
        const newStats = await getDashboardStatsAction();
        setStats(newStats);
        
        alert('ลบ Ticket เรียบร้อยแล้ว');
      } else {
        alert('เกิดข้อผิดพลาดในการลบ Ticket');
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('เกิดข้อผิดพลาดในการลบ Ticket');
    } finally {
      setDeletingTicket(null);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateForUI(dateString, { includeTime: true })
  };

  const getAssignedSupplier = (ticket: Ticket) => {
    if (!ticket.assignedTo) {
      return null;
    }
    
    // Find project by ID or by name
    let project = projects.find(p => p.id === ticket.projectId);
    if (!project && ticket.projectName) {
      project = projects.find(p => p.projectName === ticket.projectName);
    }
    
    if (!project) {
      return null;
    }
    
    // assignedTo could be already parsed object or string
    let supplierId = ticket.assignedTo;
    
    // If it's an object, extract the id
    if (typeof ticket.assignedTo === 'object' && ticket.assignedTo !== null) {
      const assigned = ticket.assignedTo as unknown as { id: string };
      supplierId = assigned.id || String(ticket.assignedTo);
    }
    // If it's a string starting with {, parse it
    else if (typeof ticket.assignedTo === 'string' && ticket.assignedTo.startsWith('{')) {
      try {
        const parsed = JSON.parse(ticket.assignedTo);
        supplierId = parsed.id || parsed;
      } catch {
        // Ignore parse error
      }
    }
    
    const supplier = project.suppliers.find(s => s.id === supplierId);
    return supplier;
  };

  const isImageFile = (attachment: Attachment) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(attachment.type.toLowerCase()) || 
           /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.filename);
  };

  const handleImageClick = (attachment: Attachment) => {
    setSelectedImage(attachment);
    setIsImageModalOpen(true);
  };

  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof TicketFilters];
    return Array.isArray(value) ? value.length > 0 : value && value.toString().trim();
  }).length + (searchTerm ? 1 : 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedProject ? `Tickets - ${selectedProject.projectName}` : 'จัดการ Ticket'}
            </h1>
            <p className="text-muted-foreground">รายการ Ticket ทั้งหมดในระบบ</p>
            {selectedProject && (
              <p className="text-gray-600 mt-1">
                โครงการ: {selectedProject.projectCode} | จำนวน Suppliers: {selectedProject.suppliers.length}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/tickets/create">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white flex items-center">
                + สร้าง Ticket ใหม่
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card className="p-4">
            <div className="text-sm text-gray-600">ทั้งหมด</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTickets}</div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:bg-blue-50" 
                onClick={() => handleStatusCardClick('Open')}>
            <div className="text-sm text-gray-600">เปิด</div>
            <div className="text-2xl font-bold text-blue-600">{stats.openTickets}</div>
            <div className="text-xs text-gray-500">
              {(filters.status || []).includes('Open') && '✓ กรองแล้ว'}
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:bg-yellow-50"
                onClick={() => handleStatusCardClick('In Progress')}>
            <div className="text-sm text-gray-600">กำลังดำเนินการ</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgressTickets}</div>
            <div className="text-xs text-gray-500">
              {(filters.status || []).includes('In Progress') && '✓ กรองแล้ว'}
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:bg-green-50"
                onClick={() => handleStatusCardClick('Resolved')}>
            <div className="text-sm text-gray-600">แก้ไขแล้ว</div>
            <div className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</div>
            <div className="text-xs text-gray-500">
              {(filters.status || []).includes('Resolved') && '✓ กรองแล้ว'}
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => handleStatusCardClick('Closed')}>
            <div className="text-sm text-gray-600">ปิดแล้ว</div>
            <div className="text-2xl font-bold text-gray-600">{stats.closedTickets}</div>
            <div className="text-xs text-gray-500">
              {(filters.status || []).includes('Closed') && '✓ กรองแล้ว'}
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="text-sm text-gray-600">เกิน SLA</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdueSlaTickets}</div>
          </Card>
        </div>
      )}

      {/* Advanced Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters} size="sm" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                ล้างตัวกรอง ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Single Row Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="ค้นหา Ticket ID, ชื่อ, หัวข้อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={filters.status && filters.status.length === 1 ? filters.status[0] : ""}
                onValueChange={(value) => {
                  if (value === 'all' || !value) {
                    setFilters(prev => ({ ...prev, status: [] }))
                  } else if (value) {
                    setFilters(prev => ({ ...prev, status: [value as TicketStatus] }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {(!filters.status || filters.status.length === 0) && '✓ '}ทั้งหมด
                  </SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div>
              <Select
                value={filters.priority && filters.priority.length === 1 ? filters.priority[0] : ""}
                onValueChange={(value) => {
                  if (value === 'all' || !value) {
                    setFilters(prev => ({ ...prev, priority: [] }))
                  } else if (value) {
                    setFilters(prev => ({ ...prev, priority: [value as TicketPriority] }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ความเร่งด่วน" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {(!filters.priority || filters.priority.length === 0) && '✓ '}ทั้งหมด
                  </SelectItem>
                  {PRIORITY_OPTIONS.map(priority => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div>
              <Select
                value={filters.category && filters.category.length === 1 ? filters.category[0] : ""}
                onValueChange={(value) => {
                  if (value === 'all' || !value) {
                    setFilters(prev => ({ ...prev, category: [] }))
                  } else if (value) {
                    setFilters(prev => ({ ...prev, category: [value as TicketCategory] }))
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="หมวดหมู่" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">
                    {(!filters.category || filters.category.length === 0) && '✓ '}ทั้งหมด
                  </SelectItem>
                  {CATEGORY_OPTIONS.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reporter Filter */}
            <div>
              <Input
                placeholder="ชื่อผู้แจ้ง..."
                value={filters.reporterName || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, reporterName: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>รายการ Tickets</CardTitle>
              <CardDescription>
                แสดง {filteredTickets.length} จาก {tickets.length} รายการ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">ไม่พบ Tickets</div>
              <div className="text-gray-400 text-sm mt-2">
                {tickets.length === 0 ? 'ยังไม่มี Tickets ในระบบ' : 'ไม่มี Tickets ที่ตรงกับเงื่อนไขการค้นหา'}
              </div>
              <div className="mt-4">
                <Link href="/tickets/create">
                  <Button className="bg-blue-700 hover:bg-blue-800 text-white">
                    สร้าง Ticket แรก
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const ticketProject = projects.find(p => p.id === ticket.projectId);
                const assignedSupplier = getAssignedSupplier(ticket);
                
                return (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/tickets/${ticket.id}`}>
                          <span className="text-base font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">
                            {ticket.ticketNumber}
                          </span>
                        </Link>
                        <Badge 
                          variant="outline" 
                          className={PRIORITY_COLORS[ticket.priority]}
                        >
                          {ticket.priority}
                        </Badge>
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {ticket.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        {ticket.slaDeadline && ticket.status !== 'Closed' && (
                          <div className="text-sm font-medium text-orange-600">
                            {formatRemainingTime(new Date(ticket.slaDeadline))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          SLA: {ticket.slaDeadline && formatDate(ticket.slaDeadline)}
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <h3 className="text-base font-medium text-gray-900 mb-3">
                      {ticket.subject}
                    </h3>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4">
                      {/* โครงการ */}
                      <div>
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 flex items-center gap-1 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            โครงการ:
                          </span>
                          <div className="font-medium text-gray-900">
                            {ticketProject ? `${ticketProject.projectName} (${ticketProject.projectCode})` : 'ไม่ระบุโครงการ'}
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mt-1">
                          <span className="text-gray-500 flex items-center gap-1 flex-shrink-0">
                            <svg className="w-4 h-4 invisible" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            หมวดหมู่:
                          </span>
                          <div className="text-gray-500">{ticket.category}</div>
                        </div>
                        {/* ไฟล์แนบ */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="flex items-start gap-2 mt-1">
                            <span className="text-gray-500 flex items-center gap-1 flex-shrink-0">
                              <Paperclip className="w-4 h-4" />
                              ไฟล์แนบ:
                            </span>
                            <div className="flex flex-col gap-1">
                              {ticket.attachments.map((attachment, index) => {
                                const isImage = isImageFile(attachment);
                                return (
                                  <div key={attachment.id || index}>
                                    {isImage ? (
                                      <button
                                        onClick={() => handleImageClick(attachment)}
                                        className="text-blue-600 hover:text-blue-800 hover:underline text-left flex items-center gap-1"
                                      >
                                        <span>{attachment.filename}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    ) : (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                      >
                                        <span>{attachment.filename}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ผู้แจ้ง */}
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 flex items-center gap-1 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          ผู้แจ้ง:
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{ticket.reporterName}</div>
                          <div className="text-xs text-gray-500">{ticket.reporterEmail}</div>
                          {ticket.reporterPhone && (
                            <div className="text-xs text-gray-500">{ticket.reporterPhone}</div>
                          )}
                        </div>
                      </div>

                      {/* ผู้รับผิดชอบ */}
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 flex items-center gap-1 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          ผู้รับผิดชอบ:
                        </span>
                        {assignedSupplier ? (
                          <div>
                            <div className="font-medium text-gray-900">{assignedSupplier.name}</div>
                            <div className="text-xs text-gray-500">{assignedSupplier.email}</div>
                            {assignedSupplier.telephone && (
                              <div className="text-xs text-gray-500">{assignedSupplier.telephone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-900 font-medium text-sm">Ruthvictor</span>
                        )}
                      </div>
                    </div>

                    {/* Date and Actions Row */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>สร้าง: {ticket.createdAt && formatDate(ticket.createdAt)}</span>
                        <span className="mx-2">•</span>
                        <span>อัปเดต: {ticket.updatedAt && formatDate(ticket.updatedAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link href={`/tickets/${ticket.id}/edit`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            แก้ไข/มอบหมายผู้รับผิดชอบ
                          </Button>
                        </Link>
                        <Link href={`/tickets/${ticket.id}`} prefetch={false}>
                          <Button variant="outline" size="sm" className="text-xs text-blue-600 hover:text-blue-800">
                            รายละเอียด/อัปเดตสถานะ
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => handleDeleteTicket(ticket.id!, ticket.ticketNumber)}
                          disabled={deletingTicket === ticket.id}
                        >
                          {deletingTicket === ticket.id ? '...' : 'ลบ'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-lg font-semibold truncate pr-4">
                {selectedImage?.filename}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsImageModalOpen(false)}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="px-6 pb-6">
              <div className="relative w-full bg-gray-50 rounded-lg overflow-hidden mb-4">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain"
                  style={{ maxHeight: '70vh' }}
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <p>ขนาดไฟล์: {(selectedImage.size / 1024).toFixed(2)} KB</p>
                  <p>ประเภท: {selectedImage.type}</p>
                </div>
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    เปิดในแท็บใหม่
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
