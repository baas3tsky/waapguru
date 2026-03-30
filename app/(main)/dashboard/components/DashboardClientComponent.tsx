'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, RefreshCw, Plus, Ticket, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import type { DashboardStats, Ticket as TicketType, TicketFilters, TicketStatus, TicketPriority } from '@/types/ticket'
import type { Project } from '@/types/project'
import { formatDateForUI } from '@/lib/date-utils'

// สี่ constants สำหรับ UI
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

const PRIORITY_OPTIONS: TicketPriority[] = ['Low', 'Medium', 'High'];
const STATUS_OPTIONS: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

interface DashboardClientProps {
  initialProjects: Project[];
  initialTickets: TicketType[];
  initialStats: DashboardStats | null;
}

export default function DashboardClient({ 
  initialProjects, 
  initialTickets, 
  initialStats 
}: DashboardClientProps) {
  const [tickets] = useState<TicketType[]>(initialTickets)
  const [projects] = useState<Project[]>(initialProjects)
  const [filteredTickets, setFilteredTickets] = useState<TicketType[]>(initialTickets)
  const [ticketStats] = useState<DashboardStats | null>(initialStats)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<TicketFilters>({})
  const [selectedDateRange, setSelectedDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [calculatedStats, setCalculatedStats] = useState({
    percentIncrease: 0,
    unassignedCount: 0,
    resolutionRate: 0,
    avgResolutionDays: 0
  })
  const [monthlyStats, setMonthlyStats] = useState({
    opened: 0,
    resolved: 0,
    avgResolutionDays: 0,
    slaComplianceRate: 100
  })

  // คำนวณสถิติเมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    // ป้องกันกรณีมีข้อมูลซ้ำซ้อน
    const uniqueTickets = Array.from(new Map(tickets.map(item => [item.id, item])).values());

    // คำนวณสถิติจากข้อมูลจริง
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // หาเดือนที่แล้ว
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    
    // นับ tickets ในเดือนปัจจุบัน (Opened)
    const currentMonthTickets = uniqueTickets.filter((ticket: TicketType) => {
      if (!ticket.createdAt) return false
      const ticketDate = new Date(ticket.createdAt)
      return ticketDate.getMonth() === currentMonth && ticketDate.getFullYear() === currentYear
    }).length
    
    // นับ tickets ในเดือนที่แล้ว
    const lastMonthTickets = uniqueTickets.filter((ticket: TicketType) => {
      if (!ticket.createdAt) return false
      const ticketDate = new Date(ticket.createdAt)
      return ticketDate.getMonth() === lastMonth && ticketDate.getFullYear() === lastMonthYear
    }).length
    
    // คำนวณเปอร์เซ็นต์การเพิ่มขึ้น
    const percentIncrease = lastMonthTickets > 0 
      ? Math.round(((currentMonthTickets - lastMonthTickets) / lastMonthTickets) * 100)
      : 0
    
    // นับ tickets ที่ยังไม่ได้มอบหมาย (Open และยังไม่มี assignedTo)
    const unassignedCount = uniqueTickets.filter((ticket: TicketType) => 
      (ticket.status === 'Open' || ticket.status === 'In Progress') && !ticket.assignedTo
    ).length
    
    // คำนวณอัตราการแก้ไข (Resolved + Closed / Total × 100) - Global
    const resolvedTickets = uniqueTickets.filter((ticket: TicketType) => 
      ticket.status === 'Resolved' || ticket.status === 'Closed'
    ).length
    const resolutionRate = uniqueTickets.length > 0 
      ? Math.round((resolvedTickets / uniqueTickets.length) * 100)
      : 0
    
    // คำนวณเวลาเฉลี่ยในการแก้ไข - Global
    const closedTickets = uniqueTickets.filter((ticket: TicketType) => 
      (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
      ticket.createdAt && 
      ticket.updatedAt
    )
    
    let avgResolutionDays = 0
    if (closedTickets.length > 0) {
      const totalDays = closedTickets.reduce((sum: number, ticket: TicketType) => {
        const createdDate = new Date(ticket.createdAt!)
        const closedDate = new Date(ticket.updatedAt!)
        const diffTime = Math.abs(closedDate.getTime() - createdDate.getTime())
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return sum + diffDays
      }, 0)
      avgResolutionDays = Math.round((totalDays / closedTickets.length) * 10) / 10 // ทศนิยม 1 ตำแหน่ง
    }
    
    setCalculatedStats({
      percentIncrease,
      unassignedCount,
      resolutionRate,
      avgResolutionDays
    })

    // --- คำนวณสถิติรายเดือน (Monthly Stats) ---
    // 1. Tickets ที่แก้ไขเสร็จสิ้น (Resolved Count) - นับเฉพาะที่มีการ Solve จริง
    const resolvedThisMonthTickets = uniqueTickets.filter(t => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') return false
      
      const resolvedDateStr = t.resolvedAt
      if (!resolvedDateStr) return false
      
      const d = new Date(resolvedDateStr)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    
    const resolvedThisMonthCount = resolvedThisMonthTickets.length

    // 2. Tickets ที่จบงานทั้งหมด (Finished for SLA/Time) - รวม Closed ที่อาจไม่มี resolvedAt ด้วย
    const finishedThisMonthTickets = uniqueTickets.filter(t => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') return false
      
      // SLA คิดจากวันที่งานจบจริง (Resolved หรือ Closed โดยไม่สนใจว่า resolvedAt หรือไม่)
      // กรณี Closed แต่ไม่มี resolvedAt ให้ใช้ closedAt แทน เพื่อดูว่าจบตามเวลา SLA ไหม
      const finishDateStr = t.resolvedAt || t.closedAt
      if (!finishDateStr) return false
      
      const d = new Date(finishDateStr)
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false

      // กรอง Ticket ที่สถานะ Closed แต่ไม่มีรายละเอียดการแก้ปัญหา (อาจจะเป็น Cancelled)
      // เก็บไว้เฉพาะที่มี resolvedAt หรือมีข้อมูล solution/problemFound
      if (t.resolvedAt) return true
      if (t.solution || t.problemFound) return true
      
      return false
    })

    // เวลาเฉลี่ยในการแก้ไข (เฉพาะเดือนนี้) - คิดจากกลุ่ม finished เพื่อความครอบคลุม
    let monthlyAvgResDays = 0
    if (finishedThisMonthTickets.length > 0) {
      const totalDays = finishedThisMonthTickets.reduce((sum, t) => {
         const createdDate = new Date(t.createdAt || 0)
         const finishDate = new Date(t.resolvedAt || t.closedAt || new Date())
         if (createdDate.getTime() === 0 || finishDate.getTime() === 0) return sum
         const diff = Math.abs(finishDate.getTime() - createdDate.getTime())
         return sum + (diff / (1000 * 60 * 60 * 24))
      }, 0)
      monthlyAvgResDays = Math.round((totalDays / finishedThisMonthTickets.length) * 10) / 10
    }

    // SLA Compliance (เฉพาะเดือนนี้)
    let monthlySla = 100
    // กรองเอาเฉพาะ Ticket ที่มี SLA Deadline และข้อมูลวันที่ถูกต้อง จากกลุ่ม Finished ทั้งหมด
    const ticketsWithSla = finishedThisMonthTickets.filter(t => 
      t.slaDeadline && !isNaN(new Date(t.slaDeadline).getTime())
    )
    
    if (ticketsWithSla.length > 0) {
      console.log('SLA Calculation Debug:', {
        finished: finishedThisMonthTickets.length,
        withSla: ticketsWithSla.length,
        tickets: ticketsWithSla.map(t => ({
          no: t.ticketNumber, 
          status: t.status, 
          resolved: t.resolvedAt, 
          closed: t.closedAt,
          sla: t.slaDeadline
        }))
      })
      const metSlaCount = ticketsWithSla.filter(t => {
        // ใช้เวลาจบงานจริง (Resolved หรือ Closed) เทียบกับ Deadline
        const finishDate = new Date(t.resolvedAt || t.closedAt!)
        const deadline = new Date(t.slaDeadline!)
        
        return finishDate.getTime() <= deadline.getTime()
      }).length
      
      monthlySla = Math.round((metSlaCount / ticketsWithSla.length) * 100)
    } else {
      monthlySla = 100
    }

    setMonthlyStats({
      opened: currentMonthTickets,
      resolved: resolvedThisMonthCount,
      avgResolutionDays: monthlyAvgResDays,
      slaComplianceRate: monthlySla
    })

  }, [tickets])

  // กรองข้อมูล
  useEffect(() => {
    const applyFilters = () => {
      let filtered = [...tickets]

      // ค้นหาด้วยคีย์เวิร์ด
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase()
        filtered = filtered.filter(ticket => 
          ticket.ticketNumber.toLowerCase().includes(search) ||
          ticket.reporterName.toLowerCase().includes(search) ||
          ticket.subject.toLowerCase().includes(search) ||
          ticket.reporterEmail.toLowerCase().includes(search) ||
          ticket.description.toLowerCase().includes(search)
        )
      }

      // กรองตามสถานะ
      if (filters.status && filters.status.length > 0) {
        filtered = filtered.filter(ticket => filters.status!.includes(ticket.status))
      }

      // กรองตามความเร่งด่วน
      if (filters.priority && filters.priority.length > 0) {
        filtered = filtered.filter(ticket => filters.priority!.includes(ticket.priority))
      }

      // กรองตามหมวดหมู่
      if (filters.category && filters.category.length > 0) {
        filtered = filtered.filter(ticket => filters.category!.includes(ticket.category))
      }

      // กรองตามผู้แจ้ง
      if (filters.reporterName && filters.reporterName.trim()) {
        const reporter = filters.reporterName.toLowerCase()
        filtered = filtered.filter(ticket => 
          ticket.reporterName.toLowerCase().includes(reporter) ||
          ticket.reporterEmail.toLowerCase().includes(reporter)
        )
      }

      // กรองตามช่วงวันที่
      if (selectedDateRange.from || selectedDateRange.to) {
        filtered = filtered.filter(ticket => {
          if (!ticket.createdAt) return false
          
          const ticketDate = new Date(ticket.createdAt)
          const fromDate = selectedDateRange.from ? new Date(selectedDateRange.from) : null
          const toDate = selectedDateRange.to ? new Date(selectedDateRange.to + 'T23:59:59') : null
          
          if (fromDate && ticketDate < fromDate) return false
          if (toDate && ticketDate > toDate) return false
          
          return true
        })
      }

      // เรียงลำดับตามวันที่สร้างล่าสุด
      filtered.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })

      setFilteredTickets(filtered)
    }

    applyFilters()
  }, [tickets, searchTerm, filters, selectedDateRange])

  const clearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setSelectedDateRange({ from: '', to: '' })
  }

  // รีเฟรชข้อมูล
  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const formatDate = (dateString: string) => {
    return formatDateForUI(dateString, { includeTime: false })
  }

  const getAssignedSupplier = (ticket: TicketType) => {
    if (!ticket.assignedTo || !ticket.projectId) return null
    const project = projects.find(p => p.id === ticket.projectId)
    const supplier = project?.suppliers.find(s => s.id === ticket.assignedTo)
    return supplier
  }

  // สถิติสำหรับแสดงผล
  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key as keyof TicketFilters]
    return Array.isArray(value) ? value.length > 0 : value && value.toString().trim()
  }).length + (searchTerm ? 1 : 0) + (selectedDateRange.from || selectedDateRange.to ? 1 : 0)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-300 rounded w-24"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-80 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-gray-600 mt-2">
            ภาพรวมระบบจัดการ Ticket
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tickets/create">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              สร้าง Ticket
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ticket ทั้งหมด */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ticket ทั้งหมด</CardTitle>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{ticketStats?.totalTickets || 0}</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              {calculatedStats.percentIncrease > 0 ? '+' : ''}{calculatedStats.percentIncrease}% จากเดือนที่แล้ว
            </p>
          </CardContent>
        </Card>

        {/* กำลังดำเนินการ */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">กำลังดำเนินการ</CardTitle>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {calculatedStats.unassignedCount} Ticket รอการมอบหมาย
            </p>
          </CardContent>
        </Card>

        {/* แก้ไขเสร็จสิ้น */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">แก้ไขเสร็จสิ้น</CardTitle>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              อัตราการแก้ไข {calculatedStats.resolutionRate}%
            </p>
          </CardContent>
        </Card>

        {/* เกิน SLA */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">เกิน SLA</CardTitle>
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{ticketStats?.overdueSlaTickets || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              ต้องติดตามเร่งด่วน
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                ล้างตัวกรอง ({activeFiltersCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Single Row Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
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

            {/* Date Range - From */}
            <div>
              <Input
                type="date"
                placeholder="วันที่เริ่มต้น"
                value={selectedDateRange.from}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Date Range - To */}
            <div>
              <Input
                type="date"
                placeholder="วันที่สิ้นสุด"
                value={selectedDateRange.to}
                onChange={(e) => setSelectedDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Ticket List (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ticket ล่าสุด</CardTitle>
                  <CardDescription>
                    รายการ Ticket ที่สร้างล่าสุด
                  </CardDescription>
                </div>
                <Link href="/tickets">
                  <Button variant="outline" size="sm">
                    ดูทั้งหมด
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTickets.slice(0, 3).map((ticket) => {
                  const project = projects.find(p => p.id === ticket.projectId)
                  const supplier = getAssignedSupplier(ticket)
                  
                  return (
                    <Link 
                      key={ticket.id} 
                      href={`/tickets/${ticket.id}`}
                      className="block"
                    >
                      <div className="border rounded-lg p-4 hover:shadow-md transition-all hover:border-blue-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-semibold text-blue-600">
                                {ticket.ticketNumber}
                              </span>
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
                            <h3 className="font-medium text-gray-900 mb-1">
                              {ticket.subject}
                            </h3>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>โครงการ: {project ? `${project.projectName}` : 'ไม่ระบุ'}</div>
                              <div>ผู้รับผิดชอบ: {supplier ? supplier.name : 'ไม่ได้กำหนด'}</div>
                              <div className="text-xs text-gray-500">
                                {ticket.createdAt && formatDate(ticket.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                
                {filteredTickets.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-lg">ไม่พบ Tickets</div>
                    <div className="text-gray-400 text-sm mt-2">
                      {tickets.length === 0 ? 'ยังไม่มี Tickets ในระบบ' : 'ไม่มี Tickets ที่ตรงกับเงื่อนไขการค้นหา'}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Statistics (1/3 width) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>สถิติรายเดือน</CardTitle>
              <CardDescription>
                ข้อมูลการจัดการ Ticket ในเดือนนี้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* เปิดใหม่ */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-700">เปิดใหม่</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">
                    {monthlyStats.opened} Tickets
                  </span>
                </div>
              </div>

              {/* แก้ไขเสร็จสิ้น */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">แก้ไขเสร็จสิ้น</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {monthlyStats.resolved} Tickets
                  </span>
                </div>
              </div>

              {/* เวลาเฉลี่ยในการแก้ไข */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium text-gray-700">เวลาเฉลี่ยในการแก้ไข</span>
                  </div>
                  <span className="text-sm font-bold text-orange-600">
                    {monthlyStats.avgResolutionDays > 0 ? `${monthlyStats.avgResolutionDays} วัน` : 'ไม่มีข้อมูล'}
                  </span>
                </div>
              </div>

              {/* อัตราการปฏิบัติตาม SLA */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium text-gray-700">อัตราการปฏิบัติตาม SLA</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600">{monthlyStats.slaComplianceRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project SLA Overview */}
      {projects.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ภาพรวม SLA ของโครงการ</CardTitle>
            <CardDescription>
              แสดงระดับ SLA ที่กำหนดไว้สำหรับแต่ละโครงการ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const projectTickets = tickets.filter(t => t.projectId === project.id)
                const openTickets = projectTickets.filter(t => t.status === 'Open' || t.status === 'In Progress')
                
                return (
                  <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{project.projectCode}</h4>
                        <p className="text-sm text-gray-600">{project.projectName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {openTickets.length} เปิด
                        </div>
                        <div className="text-xs text-gray-500">
                          {projectTickets.length} ทั้งหมด
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">SLA สูง:</span>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          {project.slaLevel.high} ชั่วโมง
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">SLA ปานกลาง:</span>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          {project.slaLevel.medium} ชั่วโมง
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">SLA ต่ำ:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {project.slaLevel.low} ชั่วโมง
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
