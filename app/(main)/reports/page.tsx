import React, { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import { ReportFilters } from '@/types/report';
import { getReportData } from '@/lib/actions/report-service';
import { getDateRangeForPreset } from '@/lib/utils/date-range-utils';
import { ReportsClient } from './components/ReportsClient';

// Cache configuration
const getCachedReportData = unstable_cache(
  async (filters: ReportFilters) => getReportData(filters),
  ['report-data'],
  { revalidate: 60, tags: ['reports'] }
);

export default async function ReportsPage() {
  // Default filters: This Year (to ensure data visibility)
  const dateRange = getDateRangeForPreset('this_year');

  const filters: ReportFilters = {
    dateRange: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    },
    period: 'daily'
  };

  try {
    // Use cached data fetching
    const reportData = await getCachedReportData(filters);
    
    // Debug: Log server-side data before passing to client
    console.log('[ReportsPage Server] reportData.statusDistribution:', reportData.statusDistribution);
    console.log('[ReportsPage Server] reportData.summary.totalTickets:', reportData.summary.totalTickets);

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Suspense fallback={<div className="text-center py-12">กำลังโหลดรายงาน...</div>}>
          <ReportsClient 
            initialData={reportData} 
            initialFilters={filters}
            initialPreset="this_year"
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error('[ReportsPage] Error:', error);
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-2xl mx-auto">
          <h2 className="text-red-800 font-semibold mb-2 text-lg">เกิดข้อผิดพลาดในการโหลดรายงาน</h2>
          <p className="text-red-600">
            ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาลองใหม่อีกครั้งภายหลัง
          </p>
        </div>
      </div>
    );
  }
}
