'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/project';
import { Ticket } from '@/types/ticket';
import { formatDateForUI } from '@/lib/date-utils';

interface ProjectDetailPageProps {
  project: Project;
  tickets: Ticket[];
}

export default function ProjectDetailPage({ project, tickets }: ProjectDetailPageProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate statistics
  const assignedTickets = tickets.filter(t => t.assignedTo);
  const unassignedTickets = tickets.filter(t => !t.assignedTo);
  
  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
    closed: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length,
    assigned: assignedTickets.length,
    unassigned: unassignedTickets.length,
    avgResponseTime: 0 // TODO: Calculate average response time
  };

  const formatDate = (dateString: string) => {
    if (!mounted) return '...'
    try {
      return formatDateForUI(dateString, { includeTime: true })
    } catch {
      return dateString
    }
  }

  const formatDateSimple = (dateString: string) => {
    if (!mounted) return '...'
    try {
      return formatDateForUI(dateString)
    } catch {
      return dateString
    }
  }

  const getSlaColor = (hours: number) => {
    if (hours <= 4) return 'bg-red-500 text-white';
    if (hours <= 8) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/projects')}
          className="mb-4"
        >
          ← กลับไปหน้ารายการ
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.projectCode}
            </h1>
            <p className="text-xl text-gray-600">{project.projectName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Details */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">รายละเอียดโครงการ</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label className="text-sm font-medium text-gray-500">รหัสโครงการ</Label>
                <p className="text-gray-900">{project.projectCode}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">ชื่อโครงการ</Label>
                <p className="text-gray-900">{project.projectName}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">เบอร์ติดต่อ</Label>
                <p className="text-gray-900">{project.contactNumber}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">วันที่เซ็นสัญญา</Label>
                <p className="text-gray-900">
                  {formatDateSimple(project.signDate)}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">วันที่สร้าง</Label>
                <p className="text-gray-900">
                  {project.createdAt && formatDate(project.createdAt)}
                </p>
              </div>

              {project.updatedAt && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">วันที่อัปเดตล่าสุด</Label>
                  <p className="text-gray-900">
                    {formatDate(project.updatedAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Project Manager */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-500">ผู้จัดการโครงการ</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">ชื่อ</p>
                    <p className="text-gray-900">{project.projectManager.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">อีเมล</p>
                    <p className="text-gray-900">{project.projectManager.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">โทรศัพท์</p>
                    <p className="text-gray-900">{project.projectManager.telephone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reporters */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-500">ผู้แจ้งปัญหา (Reporters)</Label>
              <div className="mt-2 space-y-3">
                {project.reporters?.map((reporter, index) => (
                  <div key={reporter.id || index} className="p-4 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">ชื่อ</p>
                        <p className="text-gray-900">{reporter.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">อีเมล</p>
                        <p className="text-gray-900">{reporter.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">โทรศัพท์</p>
                        <p className="text-gray-900">{reporter.telephone || '-'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!project.reporters || project.reporters.length === 0) && (
                  <p className="text-gray-500 py-4">ยังไม่มีข้อมูลผู้แจ้งปัญหา</p>
                )}
              </div>
            </div>

            {/* Suppliers */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-500">ผู้ให้บริการ</Label>
              <div className="mt-2 space-y-3">
                {project.suppliers.map((supplier, index) => (
                  <div key={supplier.id || index} className="p-4 bg-gray-50 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">ชื่อบริษัท</p>
                        <p className="text-gray-900">{supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">อีเมล</p>
                        <p className="text-gray-900">{supplier.email}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">โทรศัพท์</p>
                        <p className="text-gray-900">{supplier.telephone}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {project.suppliers.length === 0 && (
                  <p className="text-gray-500 py-4">ยังไม่มีข้อมูลผู้ให้บริการ</p>
                )}
              </div>
            </div>

            {/* SLA Levels */}
            <div>
              <Label className="text-sm font-medium text-gray-500">ระดับ SLA</Label>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-red-50 rounded-md border border-red-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-800">สูง (High)</span>
                    <Badge className={getSlaColor(project.slaLevel.high)}>
                      {project.slaLevel.high} ชั่วโมง
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-800">กลาง (Medium)</span>
                    <Badge className={getSlaColor(project.slaLevel.medium)}>
                      {project.slaLevel.medium} ชั่วโมง
                    </Badge>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">ต่ำ (Low)</span>
                    <Badge className={getSlaColor(project.slaLevel.low)}>
                      {project.slaLevel.low} ชั่วโมง
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การดำเนินการ</h3>
            
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                onClick={() => router.push(`/projects/${project.id}/edit`)}
                variant="outline"
              >
                แก้ไขโครงการ
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => router.push(`/tickets/create?projectId=${project.id}`)}
                variant="outline"
              >
                สร้าง Ticket ใหม่
              </Button>
              <Button
                className="w-full justify-start"
                onClick={() => router.push(`/projects/${project.id}/tickets`)}
                variant="outline"
              >
                ดู Tickets ในโครงการ
              </Button>
            </div>
          </Card>

          {/* Project Statistics */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">สถิติโครงการ</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets รวม</span>
                <Badge variant="outline">{ticketStats.total}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets เปิด</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {ticketStats.open}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets ปิด</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {ticketStats.closed}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">เวลาตอบสนองเฉลี่ย</span>
                <Badge variant="outline">-</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets ที่มอบหมายแล้ว</span>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  {ticketStats.assigned}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets ที่ยังไม่มอบหมาย</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {ticketStats.unassigned}
                </Badge>
              </div>
            </div>
            
            {ticketStats.total > 0 ? (
              <p className="text-xs text-gray-500 mt-4">
                * สถิติอัปเดตแล้วจากข้อมูล Tickets ล่าสุด
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-4">
                * ยังไม่มี Tickets ในโครงการนี้
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
