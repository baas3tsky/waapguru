'use client';

import React, { useState, useTransition } from 'react';
import { ReportData, ReportFilters, ExportFormat } from '@/types/report';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TicketBreakdownChart } from '@/components/reports/TicketBreakdownChart';
import { PriorityPieChart } from '@/components/reports/PriorityPieChart';
import { SupplierTable } from '@/components/reports/SupplierTable';
import { DateRangeSelector } from '@/components/reports/DateRangeSelector';
import { Download, FileText, Printer } from 'lucide-react';
import { DateRangePreset, getDateRangeForPreset } from '@/lib/utils/date-range-utils';

interface ReportsClientProps {
  initialData: ReportData;
  initialFilters: ReportFilters;
  initialPreset?: DateRangePreset;
}

export function ReportsClient({ initialData, initialFilters, initialPreset = 'this_month' }: ReportsClientProps) {
  const [reportData, setReportData] = useState<ReportData>(initialData);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(initialPreset);
  const [isExporting, setIsExporting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Handle date range change
  const handleDateRangeChange = async (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    
    const dateRange = getDateRangeForPreset(preset);
    const newFilters: ReportFilters = {
      ...filters,
      dateRange
    };

    setFilters(newFilters);

    // Fetch new data
    startTransition(async () => {
      try {
        const response = await fetch('/api/reports/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFilters),
        });
        
        if (!response.ok) throw new Error('Failed to fetch report data');
        
        const newData = await response.json();
        setReportData(newData);
      } catch (error) {
        console.error('[DateRangeChange] Error:', error);
        alert('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
      }
    });
  };

  const handleExport = async (format: ExportFormat) => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData, format }),
      });

      if (!response.ok) throw new Error('Failed to export report');

      const result = await response.json();
      
      if (result.success && result.content) {
        let blob: Blob;
        
        if (result.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          // Excel file - decode base64
          const binaryString = atob(result.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: result.contentType });
        } else {
          // CSV file - plain text
          const mimeType = 'text/csv;charset=utf-8;';
          blob = new Blob([result.content], { type: mimeType });
        }
        
        // Create download URL
        const url = URL.createObjectURL(blob);
        
        // Trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } else {
        alert(`การส่งออกล้มเหลว: ${result.error || 'ไม่มีข้อมูล'}`);
      }
    } catch (error) {
      console.error('[Export] Error:', error);
      alert('การส่งออกล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper function for time formatting
  const formatAvgTime = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    
    if (totalMinutes < 60) {
      return { value: totalMinutes.toString(), unit: 'นาที' };
    }
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    if (m === 0) {
      return { value: h.toString(), unit: 'ชั่วโมง' };
    }
    
    return { 
      value: (
        <div className="flex flex-col">
          <span>{h} ชม.</span>
          <span>{m} นาที</span>
        </div>
      ), 
      unit: '' 
    };
  };

  const avgTimeDisplay = formatAvgTime(reportData.summary.avgResponseTime);
  const avgResolutionDisplay = formatAvgTime(reportData.summary.avgResolutionTime);

  // Calculate resolution rate using effectiveResolvedTickets if available, 
  // otherwise fallback to legacy method (resolved+closed) for backward compatibility
  const effectiveCompleted = reportData.summary.effectiveResolvedTickets !== undefined
    ? reportData.summary.effectiveResolvedTickets
    : (reportData.summary.resolvedTickets + reportData.summary.closedTickets);

  const resolutionRate = reportData.summary.totalTickets > 0 
    ? ((effectiveCompleted / reportData.summary.totalTickets) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
              <h1 className="text-3xl font-bold text-gray-900">รายงานและสถิติ</h1>
              <p className="text-gray-600 mt-1">
                สรุปและวิเคราะห์ข้อมูลการจัดการ Ticket
              </p>
            </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <DateRangeSelector 
            value={selectedPreset} 
            onChange={handleDateRangeChange}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleExport('pdf')}
              disabled={isExporting || isPending}
              variant="outline"
              size="default"
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </Button>
            
            <Button
              onClick={() => handleExport('excel')}
              disabled={isExporting || isPending}
              className="gap-2 bg-green-600 hover:bg-green-700"
              size="default"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">รายงานสรุป Support Ticket</h1>
        <div className="text-gray-600 mt-2">
          <p>
            <span className="font-semibold">ช่วงเวลาข้อมูล:</span>{' '}
            {new Date(reportData.filters.dateRange.startDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' - '}
            {new Date(reportData.filters.dateRange.endDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })} {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards - 5 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Tickets */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <FileText className="w-4 h-4" />
                  <span>Ticket ทั้งหมด</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {reportData.summary.totalTickets}
                </div>
                <div className="text-sm text-gray-500">
                  จากทั้งหมด
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Resolution Rate */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>อัตราการแก้ไข Ticket</span>
                </div>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {resolutionRate}%
                </div>
                <div className="text-sm text-gray-500">{effectiveCompleted} จาก {reportData.summary.totalTickets} tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Average Response Time */}
        <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span> เวลาตอบสนองเฉลี่ย</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {avgTimeDisplay.value}
                </div>
                <div className="text-sm text-gray-500">{avgTimeDisplay.unit}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Average Resolution Time */}
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>เวลาแก้ไขปัญหาเฉลี่ย</span>
                </div>
                <div className="text-3xl font-bold text-indigo-600 mb-1">
                  {avgResolutionDisplay.value}
                </div>
                <div className="text-sm text-gray-500">{avgResolutionDisplay.unit}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: SLA Compliance */}
        <Card className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>การปฏิบัติตาม SLA</span>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {reportData.summary.slaComplianceRate.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  {reportData.summary.slaComplianceChange !== undefined ? (
                    <>
                      {reportData.summary.slaComplianceChange > 0 ? (
                        <>
                          <span className="text-green-600 font-semibold">
                            ↑ +{reportData.summary.slaComplianceChange.toFixed(1)}%
                          </span>
                          <span>จากช่วงที่แล้ว</span>
                        </>
                      ) : reportData.summary.slaComplianceChange < 0 ? (
                        <>
                          <span className="text-red-600 font-semibold">
                            ↓ {reportData.summary.slaComplianceChange.toFixed(1)}%
                          </span>
                          <span>จากช่วงที่แล้ว</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-600 font-semibold">
                            → 0.0%
                          </span>
                          <span>ไม่เปลี่ยนแปลง</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span>จาก 100%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 && (
          <TicketBreakdownChart
            data={reportData.categoryBreakdown}
            title="การวิเคราะห์ตามหมวดหมู่"
            description="จำนวน Ticket แยกตามประเภทปัญหา"
            type="category"
          />
        )}

        {/* Priority Distribution */}
        <PriorityPieChart
          data={reportData.priorityBreakdown || []}
          title="การกระจายตามความเร่งด่วน"
          description="สัดส่วน Ticket ตามระดับความเร่งด่วน"
        />
      </div>

      {/* Supplier Performance Table */}
      {reportData.supplierPerformance && reportData.supplierPerformance.length > 0 && (
        <SupplierTable data={reportData.supplierPerformance} />
      )}
    </div>
  );
}
