'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, 
  TicketStatus, 
  TicketPriority
} from '@/types/ticket';
import { Project } from '@/types/project';
import { getAllTicketsAction } from '@/lib/actions/ticket-actions';
import { getProjectById } from '@/lib/actions/sharepoint-project-service';
import { formatRemainingTime, getSlaStatusColor, calculateSlaDeadline } from '@/lib/sla-utils';
import { formatDateForUI } from '@/lib/date-utils';

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Open': 'bg-blue-500',
  'In Progress': 'bg-yellow-500',
  'Resolved': 'bg-green-500',
  'Closed': 'bg-gray-500'
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  'Low': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-orange-100 text-orange-800'
};

interface ProjectTicketsPageProps {
  projectId: string;
}

export default function ProjectTicketsPage({ projectId }: ProjectTicketsPageProps) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | 'all'>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const [projectData, allTickets] = await Promise.all([
          getProjectById(projectId),
          getAllTicketsAction()
        ]);
        
        if (!projectData) {
          router.push('/projects');
          return;
        }

        setProject(projectData);
        
        // Filter tickets for this project
        const projectTickets = allTickets
          .filter(ticket => ticket.projectId === projectId)
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
        setTickets(projectTickets);
        setFilteredTickets(projectTickets);
        
      } catch (error) {
        console.error('Error loading project tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, router]);

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
          ticket.reporterEmail.toLowerCase().includes(search)
        );
      }

      // Apply status filter
      if (selectedStatus !== 'all') {
        filtered = filtered.filter(ticket => ticket.status === selectedStatus);
      }

      // Apply priority filter  
      if (selectedPriority !== 'all') {
        filtered = filtered.filter(ticket => ticket.priority === selectedPriority);
      }

      setFilteredTickets(filtered);
    };

    applyFilters();
  }, [tickets, searchTerm, selectedStatus, selectedPriority]);

  const formatDate = (dateString: string) => {
    if (!mounted) return '...';
    try {
      return formatDateForUI(dateString, { includeTime: true });
    } catch {
      return dateString;
    }
  };

  const getTicketStats = () => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      inProgress: tickets.filter(t => t.status === 'In Progress').length,
      resolved: tickets.filter(t => t.status === 'Resolved').length,
      closed: tickets.filter(t => t.status === 'Closed').length,
      highPriority: tickets.filter(t => t.priority === 'High').length
    };
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedPriority('all');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบโครงการ</h1>
          <Button onClick={() => router.push('/projects')}>
            กลับไปหน้ารายการโครงการ
          </Button>
        </div>
      </div>
    );
  }

  const stats = getTicketStats();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/projects')}
          className="mb-4"
        >
          ← กลับไปหน้าโครงการ
        </Button>
        
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tickets ในโครงการ {project.projectCode}
            </h1>
            <p className="text-xl text-gray-600">{project.projectName}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">ทั้งหมด</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-sm text-gray-600">open</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">in progress</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-600">resolved</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-sm text-gray-600">closed</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <div className="text-sm text-gray-600">ความสำคัญสูง</div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Input
              id="search"
              placeholder="ค้นหาจากหมายเลข Ticket, ชื่อผู้แจ้ง, หัวข้อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <select
              id="status"
              className="text-sm w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TicketStatus | 'all')}
            >
              <option value="all" className="text-gray-500">สถานะ</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <select
              id="priority"
              className="text-sm w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as TicketPriority | 'all')}
            >
              <option value="all" className=" text-gray-500">ความเร่งด่วน</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters} className="w-full">
              ล้างตัวกรอง
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          แสดง {filteredTickets.length} จาก {tickets.length} tickets
        </div>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              {tickets.length === 0 ? (
                <>
                  <h3 className="text-lg font-medium mb-2">ยังไม่มี Tickets ในโครงการนี้</h3>
                  <p className="mb-4">เริ่มต้นสร้าง Ticket แรกของคุณ</p>
                  <Button 
                    onClick={() => router.push(`/tickets/create?projectId=${projectId}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    สร้าง Ticket ใหม่
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium mb-2">ไม่พบ Tickets ที่ตรงกับเงื่อนไข</h3>
                  <p className="mb-4">ลองปรับเงื่อนไขการค้นหาใหม่</p>
                  <Button variant="outline" onClick={clearFilters}>
                    ล้างตัวกรอง
                  </Button>
                </>
              )}
            </div>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link 
                      href={`/tickets/${ticket.id}`}
                      className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                    >
                      {ticket.ticketNumber}
                    </Link>
                    <Badge className={STATUS_COLORS[ticket.status]}>
                      {ticket.status}
                    </Badge>
                    <Badge className={PRIORITY_COLORS[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                  </div>
                  
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {ticket.subject}
                  </h3>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    ผู้แจ้ง: {ticket.reporterName} ({ticket.reporterEmail})
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    หมวดหมู่: {ticket.category}
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-sm text-gray-600 mb-1">
                    สร้างเมื่อ: {ticket.createdAt ? formatDate(ticket.createdAt) : 'ไม่ระบุ'}
                  </div>
                  
                  {ticket.assignedTo && (
                    <div className="text-sm text-gray-600 mb-1">
                      มอบหมายให้: {project?.suppliers?.find(s => s.id === ticket.assignedTo)?.name || ticket.assignedTo}
                    </div>
                  )}
                  
                  {project && (ticket.slaDeadline || ticket.createdAt) && (
                    <div className="text-sm">
                      {(() => {
                        let slaDeadline: Date;
                        
                        if (ticket.slaDeadline) {
                           slaDeadline = new Date(ticket.slaDeadline);
                        } else {
                           // Fallback calculation (should rarely happen for new tickets)
                           slaDeadline = calculateSlaDeadline(
                             ticket.priority,
                             project,
                             ticket.createdAt ? new Date(ticket.createdAt) : new Date()
                           );
                        }
                        
                        return (
                          <Badge className={getSlaStatusColor(slaDeadline)}>
                            SLA: {formatRemainingTime(slaDeadline)}
                          </Badge>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {ticket.description && (
                <div className="bg-gray-50 rounded-md p-3 mb-4">
                  <p className="text-sm text-gray-700 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const
                  }}>
                    {ticket.description}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tickets/${ticket.id}`}>
                      ดูรายละเอียด
                    </Link>
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500">
                  อัปเดตล่าสุด: {ticket.updatedAt ? formatDate(ticket.updatedAt) : 'ไม่ระบุ'}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
