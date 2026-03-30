/**
 * Report Types
 * TypeScript types for Reports & Analytics System
 */

// ============================================================================
// Base Report Types
// ============================================================================

export type ReportType = 
  | 'daily_tickets'
  | 'monthly_tickets'
  | 'response_time'
  | 'resolution_time'
  | 'category_breakdown'
  | 'priority_breakdown'
  | 'status_distribution'
  | 'supplier_performance'
  | 'satisfaction_score';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

// ============================================================================
// Filter & Date Range
// ============================================================================

export interface DateRange {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
}

export interface ReportFilters {
  dateRange: DateRange;
  period?: ReportPeriod;
  projectId?: string;
  category?: string;
  priority?: string;
  status?: string;
  supplierId?: string;
}

// ============================================================================
// Ticket Statistics
// ============================================================================

export interface TicketCountStats {
  date: string;
  count: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface DailyTicketStats extends TicketCountStats {
  type: 'daily';
}

export interface MonthlyTicketStats extends TicketCountStats {
  type: 'monthly';
  month: string; // YYYY-MM format
}

// ============================================================================
// Time Statistics
// ============================================================================

export interface TimeStats {
  average: number;    // in hours
  median: number;     // in hours
  min: number;        // in hours
  max: number;        // in hours
  total: number;      // in hours
  count: number;      // number of tickets
}

export interface ResponseTimeStats {
  overall: TimeStats;
  byPriority: {
    urgent: TimeStats;
    high: TimeStats;
    medium: TimeStats;
    low: TimeStats;
  };
  byCategory: Record<string, TimeStats>;
}

export interface ResolutionTimeStats {
  overall: TimeStats;
  byPriority: {
    urgent: TimeStats;
    high: TimeStats;
    medium: TimeStats;
    low: TimeStats;
  };
  byCategory: Record<string, TimeStats>;
}

// ============================================================================
// Category & Priority Breakdown
// ============================================================================

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
}

export interface PriorityBreakdown {
  priority: 'High' | 'Medium' | 'Low';
  count: number;
  percentage: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  closedCount: number;
}

// ============================================================================
// Status Distribution
// ============================================================================

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

// ============================================================================
// Supplier Performance
// ============================================================================

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  totalAssigned: number;
  totalCompleted: number;
  totalInProgress: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  onTimeCompletion: number; // percentage
  slaCompliance: number;    // percentage
}

// ============================================================================
// SLA Compliance
// ============================================================================

export interface SLAComplianceStats {
  overall: {
    total: number;
    compliant: number;
    breached: number;
    complianceRate: number; // percentage
  };
  byPriority: Record<string, {
    total: number;
    compliant: number;
    breached: number;
    complianceRate: number;
  }>;
  byProject: Record<string, {
    projectName: string;
    total: number;
    compliant: number;
    breached: number;
    complianceRate: number;
  }>;
}

// ============================================================================
// Satisfaction Stats
// ============================================================================

export interface SatisfactionStats {
  averageRating: number;
  totalResponses: number;
  ratingDistribution: {
    rating: number;
    count: number;
    percentage: number;
  }[];
  byCategory: Record<string, {
    averageRating: number;
    totalResponses: number;
  }>;
  bySupplier: Record<string, {
    supplierName: string;
    averageRating: number;
    totalResponses: number;
  }>;
}

// ============================================================================
// Comprehensive Report Data
// ============================================================================

export interface ReportData {
  filters: ReportFilters;
  generatedAt: string;
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
    slaComplianceChange?: number; // เปลี่ยนแปลงจากเดือนที่แล้ว (%) - บวกคือดีขึ้น, ลบคือแย่ลง
    avgSatisfactionScore?: number;
    effectiveResolvedTickets: number; // Tickets that are Resolved/Closed AND have solution/resolvedAt
  };
  dailyStats?: DailyTicketStats[];
  monthlyStats?: MonthlyTicketStats[];
  responseTimeStats?: ResponseTimeStats;
  resolutionTimeStats?: ResolutionTimeStats;
  categoryBreakdown?: CategoryBreakdown[];
  priorityBreakdown?: PriorityBreakdown[];
  statusDistribution?: StatusDistribution[];
  supplierPerformance?: SupplierPerformance[];
  slaCompliance?: SLAComplianceStats;
  satisfactionStats?: SatisfactionStats;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  includeCharts?: boolean;
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  content?: string;      // CSV content string OR base64 encoded Excel file
  contentType?: string;  // MIME type for the content
  downloadUrl?: string;  // Deprecated: Blob URLs don't work in Server Actions
  error?: string;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number; // Allow additional properties
}

export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
  }[];
}

export interface PieChartData {
  labels: string[];
  data: number[];
  backgroundColor?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ReportAPIResponse {
  success: boolean;
  data?: ReportData;
  error?: string;
  message?: string;
}
