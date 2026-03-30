'use server';

/**
 * Export Service
 * Server actions for exporting report data to CSV and Excel formats
 */

import { ReportData, ExportFormat, ExportResult } from '@/types/report';
import * as XLSX from 'xlsx';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format time (hours) to appropriate unit
 * Returns time in hours
 */
function formatTime(hours: number): string {
  return hours.toFixed(2);
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          const stringValue = value !== null && value !== undefined ? String(value) : '';
          // Escape quotes and wrap in quotes if contains comma or newline
          if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    )
  ];

  return csvRows.join('\n');
}

/**
 * Export report data to CSV format
 */
export async function exportToCSV(reportData: ReportData): Promise<ExportResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `support-ticket-report-${timestamp}.csv`;

    // Prepare data sections
    const sections: string[] = [];

    // 1. Summary section
    sections.push('SUMMARY');
    sections.push(arrayToCSV([reportData.summary]));
    sections.push('');

    // 2. Daily stats
    if (reportData.dailyStats && reportData.dailyStats.length > 0) {
      sections.push('DAILY TICKET STATISTICS');
      sections.push(arrayToCSV(reportData.dailyStats as unknown as Record<string, unknown>[]));
      sections.push('');
    }

    // 3. Monthly stats
    if (reportData.monthlyStats && reportData.monthlyStats.length > 0) {
      sections.push('MONTHLY TICKET STATISTICS');
      sections.push(arrayToCSV(reportData.monthlyStats as unknown as Record<string, unknown>[]));
      sections.push('');
    }

    // 4. Category breakdown - Ensure all 6 categories are present
    if (reportData.categoryBreakdown) {
      const allCategories = ['Hardware', 'Software', 'Network', 'Security', 'Database', 'Other'];
      
      // Create complete category data with all 6 categories
      const completeCategoryData = allCategories.map(cat => {
        const found = reportData.categoryBreakdown!.find(item => item.category === cat);
        return found || {
          category: cat,
          count: 0,
          percentage: 0,
          avgResponseTime: 0,
          avgResolutionTime: 0,
          openCount: 0,
          resolvedCount: 0,
          closedCount: 0
        };
      });

      sections.push('CATEGORY BREAKDOWN');
      sections.push(arrayToCSV(completeCategoryData as unknown as Record<string, unknown>[]));
      sections.push('');
    }

    // 5. Priority breakdown
    if (reportData.priorityBreakdown && reportData.priorityBreakdown.length > 0) {
      sections.push('PRIORITY BREAKDOWN');
      sections.push(arrayToCSV(reportData.priorityBreakdown as unknown as Record<string, unknown>[]));
      sections.push('');
    }

    // 6. Supplier performance
    if (reportData.supplierPerformance && reportData.supplierPerformance.length > 0) {
      sections.push('SUPPLIER PERFORMANCE');
      
      // Transform data to add completed format
      const supplierData = reportData.supplierPerformance.map(supplier => ({
        supplierName: supplier.supplierName,
        supplierEmail: supplier.supplierEmail,
        totalAssigned: supplier.totalAssigned,
        completed: `${supplier.totalCompleted}/${supplier.totalAssigned}`,
        avgResolutionTime: formatTime(supplier.avgResolutionTime),
        slaCompliance: `${supplier.slaCompliance.toFixed(0)}%`
      }));
      
      sections.push(arrayToCSV(supplierData as unknown as Record<string, unknown>[]));
      sections.push('');
    }

    // 7. Satisfaction statistics
    if (reportData.satisfactionStats) {
      sections.push('SATISFACTION STATISTICS');
      sections.push('');
      sections.push('Overall Summary');
      sections.push(`Average Rating,${reportData.satisfactionStats.averageRating.toFixed(2)}/5`);
      sections.push(`Total Responses,${reportData.satisfactionStats.totalResponses} responses`);
      sections.push('');
      
      sections.push('Rating Distribution (Detailed)');
      sections.push('Rating,Stars,Count,Percentage');
      reportData.satisfactionStats.ratingDistribution.forEach(rating => {
        const stars = '⭐'.repeat(rating.rating);
        sections.push(`${rating.rating},"${stars}",${rating.count},${rating.percentage.toFixed(2)}%`);
      });
      sections.push('');

      // By category
      if (reportData.satisfactionStats.byCategory && Object.keys(reportData.satisfactionStats.byCategory).length > 0) {
        sections.push('By Category');
        const categoryData = Object.entries(reportData.satisfactionStats.byCategory).map(([category, stats]) => ({
          category,
          averageRating: stats.averageRating.toFixed(2),
          totalResponses: stats.totalResponses
        }));
        sections.push(arrayToCSV(categoryData as unknown as Record<string, unknown>[]));
        sections.push('');
      }

      // By supplier
      if (reportData.satisfactionStats.bySupplier && Object.keys(reportData.satisfactionStats.bySupplier).length > 0) {
        sections.push('By Supplier');
        const supplierData = Object.entries(reportData.satisfactionStats.bySupplier).map(([, stats]) => ({
          supplierName: stats.supplierName,
          averageRating: stats.averageRating.toFixed(2),
          totalResponses: stats.totalResponses
        }));
        sections.push(arrayToCSV(supplierData as unknown as Record<string, unknown>[]));
        sections.push('');
      }
    }

    // 8. SLA compliance
    if (reportData.slaCompliance) {
      sections.push('SLA COMPLIANCE STATISTICS');
      sections.push('Overall Compliance');
      sections.push(`Total Tickets,${reportData.slaCompliance.overall.total}`);
      sections.push(`Compliant,${reportData.slaCompliance.overall.compliant}`);
      sections.push(`Breached,${reportData.slaCompliance.overall.breached}`);
      sections.push(`Compliance Rate (%),${reportData.slaCompliance.overall.complianceRate.toFixed(2)}`);
      sections.push('');

      // By priority
      if (reportData.slaCompliance.byPriority && Object.keys(reportData.slaCompliance.byPriority).length > 0) {
        sections.push('By Priority');
        const priorityData = Object.entries(reportData.slaCompliance.byPriority).map(([priority, stats]) => ({
          priority,
          total: stats.total,
          compliant: stats.compliant,
          breached: stats.breached,
          complianceRate: stats.complianceRate.toFixed(2)
        }));
        sections.push(arrayToCSV(priorityData as unknown as Record<string, unknown>[]));
        sections.push('');
      }

      // By project
      if (reportData.slaCompliance.byProject && Object.keys(reportData.slaCompliance.byProject).length > 0) {
        sections.push('By Project');
        const projectData = Object.entries(reportData.slaCompliance.byProject).map(([, stats]) => ({
          projectName: stats.projectName,
          total: stats.total,
          compliant: stats.compliant,
          breached: stats.breached,
          complianceRate: stats.complianceRate.toFixed(2)
        }));
        sections.push(arrayToCSV(projectData as unknown as Record<string, unknown>[]));
        sections.push('');
      }
    }

    const csvContent = sections.join('\n');

    // Return content string - client will create blob
    return {
      success: true,
      filename,
      content: csvContent
    };
  } catch (error) {
    console.error('[exportToCSV] Error:', error);
    return {
      success: false,
      filename: '',
      error: 'Failed to export to CSV'
    };
  }
}

// ============================================================================
// Excel Export (Real .xlsx format using xlsx library)
// ============================================================================

/**
 * Export report data to real Excel format (.xlsx)
 * Single sheet format - similar to CSV layout
 */
export async function exportToExcel(reportData: ReportData): Promise<ExportResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `support-ticket-report-${timestamp}.xlsx`;

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Prepare all data in single array (similar to CSV)
    const allData: (string | number)[][] = [];

    // ========================================================================
    // 1. Summary Section
    // ========================================================================
    allData.push(['SUMMARY']);
    allData.push([]);
    
    // Custom header row for summary
    // Calculate Resolution Rate
    const effectiveCompleted = reportData.summary.effectiveResolvedTickets !== undefined
      ? reportData.summary.effectiveResolvedTickets
      : (reportData.summary.resolvedTickets + reportData.summary.closedTickets);
      
    const resolutionRate = reportData.summary.totalTickets > 0 
      ? ((effectiveCompleted / reportData.summary.totalTickets) * 100).toFixed(2)
      : '0.00';

    const summaryHeaders = [
      'totalTickets', 
      'openTickets', 
      'inProgressTickets', 
      'resolvedTickets', 
      'closedTickets', 
      'effectiveResolvedTickets', // Add this column for transparency
      'resolutionRate (%)',
      'avgResponseTime (hr)', 
      'avgResolutionTime (hr)', 
      'slaComplianceRate (%)'
    ];

    const summaryValues = [
      reportData.summary.totalTickets,
      reportData.summary.openTickets,
      reportData.summary.inProgressTickets,
      reportData.summary.resolvedTickets,
      reportData.summary.closedTickets,
      effectiveCompleted, // Add value
      parseFloat(resolutionRate),
      reportData.summary.avgResponseTime,
      reportData.summary.avgResolutionTime,
      reportData.summary.slaComplianceRate
    ];

    // Add satisfaction score if available
    if (reportData.summary.avgSatisfactionScore !== undefined) {
        summaryHeaders.push('avgSatisfactionScore');
        summaryValues.push(reportData.summary.avgSatisfactionScore);
    }

    allData.push(summaryHeaders);
    
    // Add values row
    allData.push(summaryValues);
    allData.push([]);

    // ========================================================================
    // 2. Daily Statistics
    // ========================================================================
    if (reportData.dailyStats && reportData.dailyStats.length > 0) {
      allData.push(['DAILY TICKET STATISTICS']);
      allData.push([]);
      
      // Add headers
      const dailyHeaders = Object.keys(reportData.dailyStats[0]);
      allData.push(dailyHeaders);
      
      // Add data rows
      reportData.dailyStats.forEach(stat => {
        allData.push(Object.values(stat));
      });
      allData.push([]);
    }

    // ========================================================================
    // 3. Monthly Statistics
    // ========================================================================
    if (reportData.monthlyStats && reportData.monthlyStats.length > 0) {
      allData.push(['MONTHLY TICKET STATISTICS']);
      allData.push([]);
      
      const monthlyHeaders = Object.keys(reportData.monthlyStats[0]);
      allData.push(monthlyHeaders);
      
      reportData.monthlyStats.forEach(stat => {
        allData.push(Object.values(stat));
      });
      allData.push([]);
    }

    // ========================================================================
    // 4. Category Breakdown - Ensure all 6 categories are present
    // ========================================================================
    if (reportData.categoryBreakdown) {
      const allCategories = ['Hardware', 'Software', 'Network', 'Security', 'Database', 'Other'];
      
      // Create complete category data with all 6 categories
      const completeCategoryData = allCategories.map(cat => {
        const found = reportData.categoryBreakdown!.find(item => item.category === cat);
        return found || {
          category: cat,
          count: 0,
          percentage: 0,
          avgResponseTime: 0,
          avgResolutionTime: 0,
          openCount: 0,
          inProgressCount: 0,
          resolvedCount: 0,
          closedCount: 0
        };
      });

      allData.push(['CATEGORY BREAKDOWN']);
      allData.push([]);
      
      // Use headers from first item or define manually
      const categoryHeaders = ['category', 'count', 'percentage', 'openCount', 'inProgressCount', 'resolvedCount', 'closedCount'];
      allData.push(categoryHeaders);
      
      completeCategoryData.forEach(item => {
        allData.push([
          item.category,
          item.count,
          item.percentage,
          item.openCount,
          item.inProgressCount,
          item.resolvedCount,
          item.closedCount
        ]);
      });
      allData.push([]);
    }

    // ========================================================================
    // 5. Priority Breakdown
    // ========================================================================
    if (reportData.priorityBreakdown && reportData.priorityBreakdown.length > 0) {
      allData.push(['PRIORITY BREAKDOWN']);
      allData.push([]);
      
      const priorityHeaders = [
        'priority', 
        'count', 
        'percentage', 
        'avgResponseTime (hr)', 
        'avgResolutionTime (hr)', 
        'openCount', 
        'inProgressCount', 
        'resolvedCount', 
        'closedCount'
      ];
      allData.push(priorityHeaders);
      
      reportData.priorityBreakdown.forEach(item => {
        allData.push([
          item.priority,
          item.count,
          item.percentage,
          item.avgResponseTime.toFixed(2),
          item.avgResolutionTime.toFixed(2),
          item.openCount,
          item.inProgressCount,
          item.resolvedCount,
          item.closedCount
        ]);
      });
      allData.push([]);
    }

    // ========================================================================
    // 6. Supplier Performance
    // ========================================================================
    if (reportData.supplierPerformance && reportData.supplierPerformance.length > 0) {
      allData.push(['SUPPLIER PERFORMANCE']);
      allData.push([]);
      
      // Define headers manually to control order
      const supplierHeaders = ['supplierName', 'supplierEmail', 'totalAssigned', 'completed', 'avgResponseTime (hr)', 'avgResolutionTime (hr)', 'slaCompliance'];
      allData.push(supplierHeaders);
      
      // Transform and add data rows
      reportData.supplierPerformance.forEach(supplier => {
        allData.push([
          supplier.supplierName,
          supplier.supplierEmail,
          supplier.totalAssigned,
          `${supplier.totalCompleted}/${supplier.totalAssigned}`,
          formatTime(supplier.avgResponseTime),
          formatTime(supplier.avgResolutionTime),
          `${supplier.slaCompliance.toFixed(0)}%`
        ]);
      });
      allData.push([]);
    }

    // ========================================================================
    // 7. Satisfaction Statistics
    // ========================================================================
    if (reportData.satisfactionStats) {
      allData.push(['SATISFACTION STATISTICS']);
      allData.push([]);
      
      // Overall Summary
      allData.push(['Overall Summary']);
      allData.push(['Average Rating', `${reportData.satisfactionStats.averageRating.toFixed(2)}/5`]);
      allData.push(['Total Responses', `${reportData.satisfactionStats.totalResponses} responses`]);
      allData.push([]);
      
      // Rating Distribution (Detailed)
      allData.push(['Rating Distribution (Detailed)']);
      allData.push(['Rating', 'Stars', 'Count', 'Percentage']);
      
      if (reportData.satisfactionStats.ratingDistribution.length > 0) {
        reportData.satisfactionStats.ratingDistribution.forEach(rating => {
          const stars = '⭐'.repeat(rating.rating);
          allData.push([
            rating.rating,
            stars,
            rating.count,
            `${rating.percentage.toFixed(2)}%`
          ]);
        });
        allData.push([]);
      }

      // By category
      if (reportData.satisfactionStats.byCategory && Object.keys(reportData.satisfactionStats.byCategory).length > 0) {
        allData.push(['By Category']);
        allData.push(['category', 'averageRating', 'totalResponses']);
        
        Object.entries(reportData.satisfactionStats.byCategory).forEach(([category, stats]) => {
          allData.push([category, stats.averageRating.toFixed(2), stats.totalResponses]);
        });
        allData.push([]);
      }

      // By supplier
      if (reportData.satisfactionStats.bySupplier && Object.keys(reportData.satisfactionStats.bySupplier).length > 0) {
        allData.push(['By Supplier']);
        allData.push(['supplierName', 'averageRating', 'totalResponses']);
        
        Object.entries(reportData.satisfactionStats.bySupplier).forEach(([, stats]) => {
          allData.push([stats.supplierName, stats.averageRating.toFixed(2), stats.totalResponses]);
        });
        allData.push([]);
      }
    }

    // ========================================================================
    // 8. SLA Compliance
    // ========================================================================
    if (reportData.slaCompliance) {
      allData.push(['SLA COMPLIANCE STATISTICS']);
      allData.push([]);
      allData.push(['Overall Compliance']);
      allData.push(['Total Tickets', reportData.slaCompliance.overall.total]);
      allData.push(['Compliant', reportData.slaCompliance.overall.compliant]);
      allData.push(['Breached', reportData.slaCompliance.overall.breached]);
      allData.push(['Compliance Rate (%)', reportData.slaCompliance.overall.complianceRate.toFixed(2)]);
      allData.push([]);

      // By priority
      if (reportData.slaCompliance.byPriority && Object.keys(reportData.slaCompliance.byPriority).length > 0) {
        allData.push(['By Priority']);
        allData.push(['priority', 'total', 'compliant', 'breached', 'complianceRate']);
        
        Object.entries(reportData.slaCompliance.byPriority).forEach(([priority, stats]) => {
          allData.push([
            priority,
            stats.total,
            stats.compliant,
            stats.breached,
            stats.complianceRate.toFixed(2)
          ]);
        });
        allData.push([]);
      }

      // By project
      if (reportData.slaCompliance.byProject && Object.keys(reportData.slaCompliance.byProject).length > 0) {
        allData.push(['By Project']);
        allData.push(['projectName', 'total', 'compliant', 'breached', 'complianceRate']);
        
        Object.entries(reportData.slaCompliance.byProject).forEach(([, stats]) => {
          allData.push([
            stats.projectName,
            stats.total,
            stats.compliant,
            stats.breached,
            stats.complianceRate.toFixed(2)
          ]);
        });
      }
    }

    // Create single sheet with all data
    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

    // Convert workbook to binary string
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Convert to base64 for transfer
    const base64 = Buffer.from(excelBuffer).toString('base64');

    return {
      success: true,
      filename,
      content: base64,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  } catch (error) {
    console.error('[exportToExcel] Error:', error);
    return {
      success: false,
      filename: '',
      error: 'Failed to export to Excel'
    };
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export report data in the specified format
 */
export async function exportReport(
  reportData: ReportData,
  format: ExportFormat
): Promise<ExportResult> {
  if (format === 'csv') {
    return exportToCSV(reportData);
  } else if (format === 'excel') {
    return exportToExcel(reportData);
  }

  return {
    success: false,
    filename: '',
    error: 'Invalid export format'
  };
}
