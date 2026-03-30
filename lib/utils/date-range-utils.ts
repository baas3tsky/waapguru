/**
 * Date Range Utilities
 * Helper functions for calculating date ranges
 */

export type DateRangePreset = 
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface DateRangeOption {
  value: DateRangePreset;
  label: string;
  startDate: string;
  endDate: string;
}

/**
 * Get start and end dates for a preset range
 */
export function getDateRangeForPreset(preset: DateRangePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const day = now.getDay();

  let startDate: Date;
  let endDate: Date = new Date(now);

  switch (preset) {
    case 'today':
      startDate = new Date(year, month, date);
      endDate = new Date(year, month, date);
      break;

    case 'this_week':
      // Start from Monday (day 1)
      const mondayOffset = day === 0 ? -6 : 1 - day;
      startDate = new Date(year, month, date + mondayOffset);
      endDate = new Date(year, month, date + mondayOffset + 6);
      break;

    case 'this_month':
      // Start from first day of current month
      startDate = new Date(year, month, 1);
      // End on last day of current month
      endDate = new Date(year, month + 1, 0);
      break;

    case 'last_month':
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      break;

    case 'this_quarter':
      const quarterStartMonth = Math.floor(month / 3) * 3;
      startDate = new Date(year, quarterStartMonth, 1);
      endDate = new Date(year, quarterStartMonth + 3, 0);
      break;

    case 'this_year':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      break;

    case 'last_year':
      startDate = new Date(year - 1, 0, 1);
      endDate = new Date(year - 1, 11, 31);
      break;

    default:
      // Default to last 30 days
      startDate = new Date(year, month, date - 30);
      endDate = new Date(year, month, date);
  }

  return {
    startDate: formatDateToISO(startDate),
    endDate: formatDateToISO(endDate)
  };
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all available date range presets with Thai labels
 */
export function getDateRangePresets(): DateRangeOption[] {
  return [
    {
      value: 'today',
      label: 'วันนี้',
      ...getDateRangeForPreset('today')
    },
    {
      value: 'this_week',
      label: 'สัปดาห์นี้',
      ...getDateRangeForPreset('this_week')
    },
    {
      value: 'this_month',
      label: 'เดือนนี้',
      ...getDateRangeForPreset('this_month')
    },
    {
      value: 'last_month',
      label: 'เดือนที่แล้ว',
      ...getDateRangeForPreset('last_month')
    },
    {
      value: 'this_quarter',
      label: 'ไตรมาสนี้',
      ...getDateRangeForPreset('this_quarter')
    },
    {
      value: 'this_year',
      label: 'ปีนี้',
      ...getDateRangeForPreset('this_year')
    },
    {
      value: 'last_year',
      label: 'ปีที่แล้ว',
      ...getDateRangeForPreset('last_year')
    }
  ];
}

/**
 * Format date range to Thai display format
 */
export function formatDateRangeThai(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };

  const startStr = start.toLocaleDateString('th-TH', options);
  const endStr = end.toLocaleDateString('th-TH', options);

  if (startDate === endDate) {
    return startStr;
  }

  return `${startStr} - ${endStr}`;
}
