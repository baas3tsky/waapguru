'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search, Briefcase, AlertTriangle, Users, Ticket as TicketIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/types/project'
import { formatDateForUI } from '@/lib/date-utils'
import { getAllTicketsAction } from '@/lib/actions/ticket-actions'
import type { Ticket } from '@/types/ticket'
import { calculateProjectStatus, getProjectStatusBadgeConfig } from '@/lib/project-utils'
import { autoSyncProjectStatuses } from '@/lib/actions/project-sync-actions'

interface ProjectListPageProps {
  projects: Project[]
  tickets?: Ticket[]
  isLoading?: boolean
}

export function ProjectListPage({ 
  projects,
  tickets: initialTickets = [],
  isLoading = false 
}: ProjectListPageProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [mounted, setMounted] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalSuppliers: 0,
    totalTickets: 0
  })

  // Auto-sync check on mount
  useEffect(() => {
    if (mounted && projects.length > 0 && tickets.length > 0) {
      const updates: { id: string, status: string }[] = [];
      
      projects.forEach(project => {
        if (!project.id) return;
        
        const projectTickets = tickets.filter(t => t.projectId === project.id);
        const calculatedStatus = calculateProjectStatus(project, projectTickets);
        
        if (project.status !== calculatedStatus) {
          updates.push({ id: project.id, status: calculatedStatus });
        }
      });

      if (updates.length > 0) {
        console.log(`🔄 Auto-syncing ${updates.length} projects...`);
        autoSyncProjectStatuses(updates).then(result => {
          if (result.success && (result.count || 0) > 0) {
            console.log('✅ Auto-sync completed');
            router.refresh();
          }
        });
      }
    }
  }, [mounted, projects, tickets, router]);

  useEffect(() => {
    setMounted(true)
    // Only load if not provided (though we plan to always provide it)
    if (initialTickets.length === 0) {
        loadTicketsAndCalculateStats()
    }
  }, [initialTickets])

  useEffect(() => {
    if (mounted) {
      calculateStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, tickets, mounted])

  const loadTicketsAndCalculateStats = async () => {
    try {
      const ticketsData = await getAllTicketsAction()
      setTickets(ticketsData)
    } catch (error) {
      console.error('Failed to load tickets:', error)
    }
  }

  const calculateStats = () => {
    // Total projects
    const totalProjects = projects.length

    // Active projects (projects with open or in-progress tickets)
    const activeProjectIds = new Set(
      tickets
        .filter(t => t.status === 'Open' || t.status === 'In Progress')
        .map(t => t.projectId)
    )
    const activeProjects = activeProjectIds.size

    // Total suppliers across all projects
    const totalSuppliers = projects.reduce((sum, project) => sum + project.suppliers.length, 0)

    // Total tickets
    const totalTickets = tickets.length

    setStats({
      totalProjects,
      activeProjects,
      totalSuppliers,
      totalTickets
    })
  }

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">โครงการทั้งหมด</h1>
              <p className="text-muted-foreground">จัดการข้อมูลโครงการและผู้ดูแลโครงการ</p>
            </div>
            <div className="h-9 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const filteredProjects = [...projects]
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .filter(project =>
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectManager.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const formatDate = (dateString: string) => {
    if (!mounted) return '...' // แสดง placeholder แทน empty string
    try {
      // ใช้ formatDateForUI เพื่อความสอดคล้องและป้องกัน hydration mismatch
      return formatDateForUI(dateString)
    } catch {
      return dateString // fallback to original string if parsing fails
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">จัดการโครงการ</h1>
          <p className="text-muted-foreground">จัดการข้อมูลโครงการและผู้ดูแลโครงการ</p>
        </div>
        <Button onClick={() => router.push('/projects/create')} suppressHydrationWarning className="bg-blue-700 text-white hover:bg-blue-800">
          <Plus className="w-4 h-4 mr-2" />
          สร้างโครงการใหม่
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">โครงการทั้งหมด</CardTitle>
            <Briefcase className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">โครงการที่กำลังดำเนินการอยู่</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Supplier ทั้งหมด</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ticket รวม</CardTitle>
            <TicketIcon className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTickets}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="ค้นหาโครงการ (ชื่อโครงการ, เลขที่สัญญา, ผู้จัดการโครงการ)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              suppressHydrationWarning
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm ? 'ไม่พบโครงการที่ตรงกับการค้นหา' : 'ยังไม่มีโครงการ'}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-blue-700 hover:bg-blue-800 text-white" 
                onClick={() => router.push('/projects/create')}
                suppressHydrationWarning
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างโครงการแรก
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const projectTickets = tickets.filter(t => t.projectId === project.id)
            
            // คำนวณสถานะโครงการแบบ dynamic
            const projectStatus = calculateProjectStatus(project, projectTickets);
            const statusBadge = getProjectStatusBadgeConfig(projectStatus);
            
            return (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header Row */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{project.projectName}</h3>
                      <span className={statusBadge.className}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{projectTickets.length} Tickets</div>
                      <div className="text-xs text-gray-500">
                        {projectTickets.filter(t => t.status !== 'Closed').length} Active
                      </div>
                    </div>
                  </div>

                  {/* Project Info */}
                  {/* Three Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                    {/* Left Column - Project Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลโครงการ</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 min-w-[100px]">📅 วันที่เซ็นสัญญา:</span>
                          <span className="text-gray-900">{formatDate(project.signDate)}</span>
                        </div>
                        {project.endDate && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 min-w-[100px]">🏁 วันที่สิ้นสุดโครงการ:</span>
                            <span className="text-gray-900">{formatDate(project.endDate)}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 min-w-[100px]">🕒 วันที่สร้างโครงการ:</span>
                          <span className="text-gray-900">{formatDateForUI(project.createdAt, { includeTime: true })}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          <span className="text-blue-600 min-w-[100px]">🔢 เลขที่สัญญา: </span>
                          <span className="font-mono text-gray-900">{project.projectCode}</span>  
                        </div>
                      </div>

                      <h5 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Project Manager</h5>
                      <div className="space-y-1">
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 min-w-[60px]">ชื่อ:</span>
                          <span className="text-gray-900">{project.projectManager.name}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 min-w-[60px]">อีเมล:</span>
                          <span className="text-gray-900">{project.projectManager.email}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-blue-600 min-w-[60px]">โทรศัพท์:</span>
                          <span className="text-gray-900">{project.projectManager.telephone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Supplier Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูล Supplier</h4>
                      {project.suppliers.length > 0 ? (
                        project.suppliers.map((supplier, index) => (
                          <div key={supplier.id || index} className="space-y-1 mb-3">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">บริษัท:</span>
                              <span className="text-gray-900 ">{supplier.name}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">อีเมล:</span>
                              <span className="text-gray-900">{supplier.email}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">โทรศัพท์:</span>
                              <span className="text-gray-900">{supplier.telephone}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">ยังไม่มีข้อมูล Supplier</p>
                      )}
                    </div>

                    {/* Right Column - Reporter Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">ข้อมูลผู้แจ้งปัญหา</h4>
                      {(project.reporters && project.reporters.length > 0) ? (
                        project.reporters.map((reporter, index) => (
                          <div key={reporter.id ? `${reporter.id}-${index}` : index} className="space-y-1 mb-3">
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">ชื่อ:</span>
                              <span className="text-gray-900">{reporter.name}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">อีเมล:</span>
                              <span className="text-gray-900">{reporter.email}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                              <span className="text-blue-600 min-w-[60px]">โทรศัพท์:</span>
                              <span className="text-gray-900">{reporter.telephone}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">ยังไม่มีข้อมูลผู้แจ้งปัญหา</p>
                      )}
                    </div>
                  </div>

                  {/* SLA Configuration */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">การกำหนดค่า SLA (ชั่วโมง (วัน))</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
                        <div className="text-xs text-red-600 font-medium mb-1">High</div>
                        <div className="text-3xl font-bold text-red-600">
                          {project.slaLevel.high} {project.slaLevel.high >= 24 && <span className="text-sm font-normal">({Math.floor(project.slaLevel.high / 24)} วัน)</span>}
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 text-center">
                        <div className="text-xs text-yellow-600 font-medium mb-1">Medium</div>
                        <div className="text-3xl font-bold text-yellow-600">
                          {project.slaLevel.medium} {project.slaLevel.medium >= 24 && <span className="text-sm font-normal">({Math.floor(project.slaLevel.medium / 24)} วัน)</span>}
                        </div>
                      </div>
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                        <div className="text-xs text-green-600 font-medium mb-1">Low</div>
                        <div className="text-3xl font-bold text-green-600">
                          {project.slaLevel.low} {project.slaLevel.low >= 24 && <span className="text-sm font-normal">({Math.floor(project.slaLevel.low / 24)} วัน)</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/projects/${project.id}/edit`)}
                      suppressHydrationWarning
                    >
                      แก้ไขข้อมูล
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/projects/${project.id}/tickets`)}
                      suppressHydrationWarning
                    >
                      ดู Tickets
                    </Button>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                      onClick={() => router.push(`/tickets/create?projectId=${project.id}`)}
                      suppressHydrationWarning
                    >
                      สร้าง Ticket ใหม่
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
