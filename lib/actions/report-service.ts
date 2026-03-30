'use server';

/**
 * Report Service
 * Generates reports from SharePoint data
 */

import { 
  ReportData, 
  ReportFilters,
  CategoryBreakdown,
  PriorityBreakdown,
  StatusDistribution,
  DailyTicketStats
} from '@/types/report';
import { getAllTickets } from '@/lib/actions/sharepoint-ticket-service';
import { getAllProjects } from '@/lib/actions/sharepoint-project-service';

/**
 * Generate report data from SharePoint
 */
export async function generateReport(filters: ReportFilters): Promise<ReportData> {
  try {
    // 1. Fetch all tickets and projects
    const [allTickets, allProjects] = await Promise.all([
      getAllTickets(),
      getAllProjects()
    ]);
    
    // Create Supplier Lookup Map
    const supplierLookup: Record<string, { name: string, email: string }> = {};
    allProjects.forEach(project => {
      if (project.suppliers && Array.isArray(project.suppliers)) {
        project.suppliers.forEach(supplier => {
          if (supplier.id) {
            supplierLookup[supplier.id] = {
              name: supplier.name || supplier.id,
              email: supplier.email || ''
            };
          }
        });
      }
    });
    
    // 2. Filter tickets based on date range
    const startDate = new Date(filters.dateRange.startDate);
    const endDate = new Date(filters.dateRange.endDate);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    const filteredTickets = allTickets.filter(ticket => {
      if (!ticket.createdAt) return false;
      const createdDate = new Date(ticket.createdAt);
      return createdDate >= startDate && createdDate <= endDate;
    });

    // 2.1 Calculate tickets resolved in this period (for Performance Stats)
    // This allows capturing resolution stats for tickets created in previous periods
    const ticketsResolvedInPeriod = allTickets.filter(t => {
      if (t.status !== 'Resolved' && t.status !== 'Closed') return false;
      // Use resolvedAt or closedAt to catch all finished tickets for SLA
      const finishDateStr = t.resolvedAt || t.closedAt;
      if (!finishDateStr) return false;
      
      const finishDate = new Date(finishDateStr);
      if (finishDate < startDate || finishDate > endDate) return false;

      // Strict Check: Match Dashboard Logic
      // Filter out tickets that are Closed but not actually worked on (e.g. Cancelled)
      // Must have resolvedAt OR solution evidence
      if (t.resolvedAt) return true;
      if (t.solution || t.problemFound) return true;

      return false;
    });
    
    // 3. Calculate Summary Stats
    const totalTickets = filteredTickets.length;
    const openTickets = filteredTickets.filter(t => t.status === 'Open').length;
    const inProgressTickets = filteredTickets.filter(t => t.status === 'In Progress').length;
    // Note: These refer to tickets created in this period that are currently Resolved/Closed
    // To match Dashboard "Resolved Count" behavior, we should use ticketsResolvedInPeriod IF the user expects "Throughput".
    // But traditionally "Report Summary" counts based on the filtered set (Cohort).
    // Dashboard shows "Monthly Stats" -> Throughput.
    // Report shows "Report for Period" -> Usually Cohort or Throughput depending on metric.
    // Given the confusion, let's keep the Counts based on Cohort (filteredTickets) for consistency with "Total Tickets".
    // BUT Average Times are calculated based on ticketsResolvedInPeriod (Performance).
    
    // Status counts (Cohort based):
    const resolvedTickets = filteredTickets.filter(t => t.status === 'Resolved').length;
    const closedTickets = filteredTickets.filter(t => t.status === 'Closed').length;

    // Calculate Effective Resolved Tickets
    // Only count tickets that are currently 'Resolved' OR 'Closed' with a valid resolvedAt date
    const effectiveResolvedTickets = filteredTickets.filter(t => {
      if (t.status === 'Resolved') return true;
      if (t.status === 'Closed') {
        // Only count Closed tickets if they have been marked as resolved (have a resolvedAt date)
        return !!t.resolvedAt;
      }
      return false;
    }).length;
    
    // Calculate average resolution time (Use tickets RESOLVED in this period)
    // Note: For time calculation, we MUST include Closed tickets to have historical data
    let totalResolutionTimeHours = 0;
    ticketsResolvedInPeriod.forEach(t => {
      if (!t.createdAt) return;
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.resolvedAt || t.closedAt || new Date()).getTime();
      if (end >= start) {
        totalResolutionTimeHours += (end - start) / (1000 * 60 * 60);
      }
    });
    
    const avgResolutionTime = ticketsResolvedInPeriod.length > 0 
      ? totalResolutionTimeHours / ticketsResolvedInPeriod.length 
      : 0;

    // Calculate Average Response Time
    // Response time = Time from Created to In Progress
    // We stick to 'filteredTickets' (Created in period) for specific cohort analysis?
    // OR we use 'respondedInPeriod'? Usually Response Time tracks how fast we respond NOW.
    // Let's use 'filteredTickets' for now to match 'Distribution' logic unless requested.
    // Actually, to match Dashboard's feel of "Current Performance", we should use Response in Period.
    // But Dashboard doesn't show Response Time. 
    // Let's stick to filteredTickets for Response Time for consistency with cohort.
    const respondedTickets = filteredTickets.filter(t => t.createdAt && t.inprogressAt);
    let totalResponseTimeHours = 0;
    
    respondedTickets.forEach(t => {
      const start = new Date(t.createdAt!).getTime();
      const end = new Date(t.inprogressAt!).getTime();
      // Ensure end > start to avoid negative values (clock skew etc)
      if (end > start) {
        totalResponseTimeHours += (end - start) / (1000 * 60 * 60);
      }
    });

    const avgResponseTime = respondedTickets.length > 0 
      ? totalResponseTimeHours / respondedTickets.length 
      : 0;

    // Calculate SLA Compliance (Use tickets RESOLVED in this period)
    // Formula: (Tickets Met SLA / Tickets With SLA) * 100
    // Exclude tickets without SLA deadline or invalid dates from the calculation
    const ticketsWithSla = ticketsResolvedInPeriod.filter(t => 
      t.slaDeadline && !isNaN(new Date(t.slaDeadline).getTime())
    );
    
    const slaCompliantTickets = ticketsWithSla.filter(t => {
      // resolvedAt is guaranteed by ticketsResolvedInPeriod filter
      // If resolvedAt is missing, use closedAt
      const finishDateStr = t.resolvedAt || t.closedAt;
      if (!finishDateStr) return false;

      const deadline = new Date(t.slaDeadline!).getTime();
      const resolved = new Date(finishDateStr).getTime();
      
      // Ensure specific comparison
      return resolved <= deadline;
    });
    
    const slaComplianceRate = ticketsWithSla.length > 0
      ? (slaCompliantTickets.length / ticketsWithSla.length) * 100
      : 100; // Default to 100% if no tickets with SLA

    // 4. Calculate Breakdowns
    
    // Status Distribution
    const statusCounts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    
    const statusDistribution: StatusDistribution[] = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / totalTickets) * 100
    }));

    // Priority Breakdown
    const priorityCounts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    });
    
    const priorityBreakdown: PriorityBreakdown[] = Object.entries(priorityCounts).map(([priority, count]) => {
      // Calculate stats for this priority
      const ticketsInPriority = filteredTickets.filter(t => t.priority === priority);
      
      // Response Time
      const respondedInPriority = ticketsInPriority.filter(t => t.createdAt && t.inprogressAt);
      let priorityResponseTime = 0;
      respondedInPriority.forEach(t => {
           const start = new Date(t.createdAt!).getTime();
           const end = new Date(t.inprogressAt!).getTime();
           if (end > start) priorityResponseTime += (end - start) / (1000 * 60 * 60);
      });
      const avgResponseTime = respondedInPriority.length > 0 ? priorityResponseTime / respondedInPriority.length : 0;

      // Resolution Time
      const completedInPriority = ticketsInPriority.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && t.createdAt && (t.resolvedAt || t.closedAt));
      let priorityResolutionTime = 0;
      completedInPriority.forEach(t => {
           const start = new Date(t.createdAt!).getTime();
           const end = new Date(t.resolvedAt || t.closedAt!).getTime();
           if (end > start) priorityResolutionTime += (end - start) / (1000 * 60 * 60);
      });
      const avgResolutionTime = completedInPriority.length > 0 ? priorityResolutionTime / completedInPriority.length : 0;

      return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        priority: priority as any,
        count,
        percentage: (count / totalTickets) * 100,
        avgResponseTime,
        avgResolutionTime,
        openCount: ticketsInPriority.filter(t => t.status === 'Open').length,
        inProgressCount: ticketsInPriority.filter(t => t.status === 'In Progress').length,
        resolvedCount: ticketsInPriority.filter(t => t.status === 'Resolved').length,
        closedCount: ticketsInPriority.filter(t => t.status === 'Closed').length
      };
    });

    // Category Breakdown
    const categoryCounts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });
    
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: (count / totalTickets) * 100,
      avgResponseTime: 0,
      avgResolutionTime: 0,
      openCount: filteredTickets.filter(t => t.category === category && t.status === 'Open').length,
      inProgressCount: filteredTickets.filter(t => t.category === category && t.status === 'In Progress').length,
      resolvedCount: filteredTickets.filter(t => t.category === category && t.status === 'Resolved').length,
      closedCount: filteredTickets.filter(t => t.category === category && t.status === 'Closed').length
    }));

    // 5. Daily Stats
    // Group by date (YYYY-MM-DD)
    const dailyMap: Record<string, DailyTicketStats> = {};
    
    // Initialize map with 0 for all days in range (optional, but good for charts)
    // For now, just map existing tickets
    
    filteredTickets.forEach(t => {
      if (!t.createdAt) return;
      const date = t.createdAt.split('T')[0]; // YYYY-MM-DD
      
      if (!dailyMap[date]) {
        dailyMap[date] = {
          date,
          type: 'daily',
          count: 0,
          open: 0,
          inProgress: 0,
          resolved: 0,
          closed: 0
        };
      }
      
      dailyMap[date].count++;
      if (t.status === 'Open') dailyMap[date].open++;
      if (t.status === 'In Progress') dailyMap[date].inProgress++;
      if (t.status === 'Resolved') dailyMap[date].resolved++;
      if (t.status === 'Closed') dailyMap[date].closed++;
    });
    
    const dailyStats = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 6. Supplier Performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supplierMap: Record<string, any> = {};
    
    filteredTickets.forEach(t => {
      if (!t.assignedTo) return;
      
      // Resolve Supplier Name for grouping
      const rawAssignedTo = t.assignedTo;
      const lookup = supplierLookup[rawAssignedTo];
      const supplierName = (lookup?.name || rawAssignedTo).trim();
      
      // Use Name as Key to merge same suppliers with different IDs/Emails
      const key = supplierName;
      
      if (!supplierMap[key]) {
        supplierMap[key] = {
          supplierId: rawAssignedTo,
          supplierName: supplierName,
          supplierEmail: lookup?.email || '',
          totalAssigned: 0,
          totalCompleted: 0,
          totalInProgress: 0,
          totalResolutionTime: 0,
          totalResponseTime: 0,
          responseCount: 0,
          slaCompliantCount: 0
        };
      }
      
      const stats = supplierMap[key];
      stats.totalAssigned++;
      
      // Response Time Calculation
      if (t.createdAt && t.inprogressAt) {
        const start = new Date(t.createdAt).getTime();
        const end = new Date(t.inprogressAt).getTime();
        if (end > start) {
          stats.totalResponseTime += (end - start) / (1000 * 60 * 60);
          stats.responseCount++;
        }
      }
      
      if (t.status === 'Resolved' || t.status === 'Closed') {
        stats.totalCompleted++;
        
        // Resolution time
        if (t.createdAt && (t.resolvedAt || t.closedAt)) {
          const start = new Date(t.createdAt).getTime();
          const end = new Date(t.resolvedAt || t.closedAt!).getTime();
          stats.totalResolutionTime += (end - start) / (1000 * 60 * 60);
        }
        
        // SLA Compliance
        if (t.slaDeadline) {
          const deadline = new Date(t.slaDeadline).getTime();
          const resolved = new Date(t.resolvedAt || t.closedAt!).getTime();
          if (resolved <= deadline) {
            stats.slaCompliantCount++;
          }
        } else {
           stats.slaCompliantCount++; // Assume compliant if no deadline
        }
      } else if (t.status === 'In Progress') {
        stats.totalInProgress++;
      }
    });
    
    const supplierPerformance = Object.values(supplierMap).map(s => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      supplierEmail: s.supplierEmail,
      totalAssigned: s.totalAssigned,
      totalCompleted: s.totalCompleted,
      totalInProgress: s.totalInProgress,
      avgResponseTime: s.responseCount > 0 ? s.totalResponseTime / s.responseCount : 0,
      avgResolutionTime: s.totalCompleted > 0 ? s.totalResolutionTime / s.totalCompleted : 0,
      onTimeCompletion: 0, // Not tracked separately from SLA
      slaCompliance: s.totalCompleted > 0 ? (s.slaCompliantCount / s.totalCompleted) * 100 : 100
    }));

    return {
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        avgResponseTime,
        avgResolutionTime,
        slaComplianceRate,
        effectiveResolvedTickets // Include the strict count
      },
      dailyStats,
      monthlyStats: [],
      categoryBreakdown,
      priorityBreakdown,
      statusDistribution,
      supplierPerformance
    };

  } catch (error) {
    console.error('Error generating report:', error);
    // Return empty data on error
    return {
      filters,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        slaComplianceRate: 0,
        effectiveResolvedTickets: 0
      },
      dailyStats: [],
      monthlyStats: [],
      categoryBreakdown: [],
      priorityBreakdown: [],
      statusDistribution: [],
      supplierPerformance: []
    };
  }
}

/**
 * Get report data (alias for generateReport)
 */
export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  return generateReport(filters);
}

/**
 * Export report data (stub implementation)
 */
export async function exportReport(
  filters: ReportFilters,
  format: 'csv' | 'excel' | 'pdf'
): Promise<{ success: boolean; url?: string; error?: string }> {
  console.warn('exportReport not implemented', { filters, format });
  return {
    success: false,
    error: 'Export functionality not implemented yet'
  };
}
