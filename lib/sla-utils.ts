import { TicketPriority } from '@/types/ticket';
import { Project, SLALevel } from '@/types/project';

/**
 * Calculate SLA deadline based on priority and project SLA settings
 * @param priority - Ticket priority
 * @param project - Project with SLA settings
 * @param createdAt - Ticket creation date
 * @returns SLA deadline date
 */
export const calculateSlaDeadline = (
  priority: TicketPriority,
  project?: Project,
  createdAt: Date = new Date()
): Date => {
  // Default SLA hours if no project is specified
  const defaultSla: SLALevel = {
    high: 4,      // 4 hours for high priority
    medium: 8,    // 8 hours for medium priority
    low: 24       // 24 hours for low priority
  };

  const sla = project?.slaLevel || defaultSla;
  
  // Normalize keys to lowercase just in case SharePoint stores them as capitalized
  const safeSla = {
    high: (sla as any).high ?? (sla as any).High ?? defaultSla.high,
    medium: (sla as any).medium ?? (sla as any).Medium ?? defaultSla.medium,
    low: (sla as any).low ?? (sla as any).Low ?? defaultSla.low
  };
  
  let hoursToAdd: number;
  
  switch (priority) {
    case 'High':
      hoursToAdd = safeSla.high;
      break;
    case 'Medium':
      hoursToAdd = safeSla.medium;
      break;
    case 'Low':
      hoursToAdd = safeSla.low;
      break;
    default:
      hoursToAdd = safeSla.medium;
  }

  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + hoursToAdd);
  
  return deadline;
};

/**
 * Check if ticket is overdue based on SLA
 * @param slaDeadline - SLA deadline date
 * @param resolvedAt - Date when ticket was resolved (optional)
 * @returns True if ticket is overdue
 */
export const isTicketOverdue = (
  slaDeadline: Date,
  resolvedAt?: Date
): boolean => {
  const compareDate = resolvedAt || new Date();
  return compareDate > slaDeadline;
};

/**
 * Get remaining time until SLA deadline
 * @param slaDeadline - SLA deadline date
 * @returns Object with remaining time information
 */
export const getRemainingTime = (slaDeadline: Date) => {
  const now = new Date();
  const diff = slaDeadline.getTime() - now.getTime();
  
  if (diff <= 0) {
    return {
      isOverdue: true,
      hours: 0,
      minutes: 0,
      totalMinutes: 0
    };
  }
  
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    isOverdue: false,
    hours,
    minutes,
    totalMinutes
  };
};

/**
 * Format remaining time as human readable string
 * @param slaDeadline - SLA deadline date
 * @returns Formatted time string
 */
export const formatRemainingTime = (slaDeadline: Date): string => {
  const remaining = getRemainingTime(slaDeadline);
  
  if (remaining.isOverdue) {
    return 'Overdue';
  }
  
  if (remaining.hours > 24) {
    const days = Math.floor(remaining.hours / 24);
    const hours = remaining.hours % 24;
    return `${days}d ${hours}h remaining`;
  }
  
  if (remaining.hours > 0) {
    return `${remaining.hours}h ${remaining.minutes}m remaining`;
  }
  
  return `${remaining.minutes}m remaining`;
};

/**
 * Get SLA status color based on remaining time
 * @param slaDeadline - SLA deadline date
 * @returns Color class for styling
 */
export const getSlaStatusColor = (slaDeadline: Date): string => {
  const remaining = getRemainingTime(slaDeadline);
  
  if (remaining.isOverdue) {
    return 'text-red-600 bg-red-50';
  }
  
  if (remaining.totalMinutes < 60) {
    return 'text-orange-600 bg-orange-50';
  }
  
  if (remaining.totalMinutes < 240) { // Less than 4 hours
    return 'text-yellow-600 bg-yellow-50';
  }
  
  return 'text-green-600 bg-green-50';
};

/**
 * Check if ticket is approaching SLA deadline (80% threshold)
 * @param priority - Ticket priority
 * @param createdAt - Ticket creation date
 * @param project - Project with SLA settings
 * @returns True if ticket is in warning zone (80% of SLA time has passed)
 */
export const isSlaWarning = (
  priority: TicketPriority,
  createdAt: Date,
  project?: Project
): boolean => {
  const slaDeadline = calculateSlaDeadline(priority, project, createdAt);
  const now = new Date();
  
  // Calculate total SLA time in milliseconds
  const totalSlaTime = slaDeadline.getTime() - createdAt.getTime();
  
  // Calculate elapsed time
  const elapsedTime = now.getTime() - createdAt.getTime();
  
  // Check if 80% of SLA time has passed
  const warningThreshold = totalSlaTime * 0.8;
  
  // Return true if we passed the threshold AND have not exceeded the deadline
  return elapsedTime >= warningThreshold && now < slaDeadline;
};

/**
 * Get SLA warning percentage (how much of SLA time has passed)
 * @param priority - Ticket priority
 * @param createdAt - Ticket creation date
 * @param project - Project with SLA settings
 * @returns Percentage of SLA time elapsed (0-100)
 */
export const getSlaUsagePercentage = (
  priority: TicketPriority,
  createdAt: Date,
  project?: Project
): number => {
  const slaDeadline = calculateSlaDeadline(priority, project, createdAt);
  const now = new Date();
  
  // Calculate total SLA time in milliseconds
  const totalSlaTime = slaDeadline.getTime() - createdAt.getTime();
  
  // Calculate elapsed time
  const elapsedTime = now.getTime() - createdAt.getTime();
  
  // Calculate percentage
  const percentage = (elapsedTime / totalSlaTime) * 100;
  
  // Cap at 100%
  return Math.min(100, Math.max(0, percentage));
};
