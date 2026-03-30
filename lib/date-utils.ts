/**
 * Date utilities for handling timezone and formatting
 * 
 * Key principles:
 * 1. Store timestamps in UTC format in database
 * 2. Display timestamps in Thailand timezone (UTC+7)
 * 3. Consistent formatting to avoid hydration issues
 */

// Get current timestamp in UTC
export function getCurrentUTCTimestamp(): Date {
  return new Date();
}

// Get current timestamp in Thailand timezone (UTC+7)
export function getCurrentThailandTime(): Date {
  const now = new Date();
  const thailandOffset = 7 * 60; // UTC+7 in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (thailandOffset * 60000));
}

// Convert UTC date to Thailand timezone
export function utcToThailand(utcDate: Date): Date {
  const thailandOffset = 7 * 60; // UTC+7 in minutes
  const utc = utcDate.getTime() + (utcDate.getTimezoneOffset() * 60000);
  return new Date(utc + (thailandOffset * 60000));
}

// Format date for database (ISO string)
export function formatForDatabase(date: Date = new Date()): string {
  return date.toISOString();
}

// Format date for display in Thai format
export function formatForDisplay(date: Date | string, includeTime: boolean = true): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Bangkok'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat('th-TH', options).format(dateObj);
}

// Get timestamp for created_at field (UTC format for consistency)
export function getCreatedAtTimestamp(): string {
  return new Date().toISOString();
}

// Convert UTC timestamp to Thailand time and format for display
export function formatThailandTime(utcTimestamp: string, includeTime: boolean = true): string {
  if (!utcTimestamp) return '';
  
  try {
    const date = new Date(utcTimestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return utcTimestamp;
    }
    
    // Format in Thailand timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }
    
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    return formatter.format(date);
  } catch {
    return utcTimestamp;
  }
}

// Parse database timestamp and display in local time
export function parseAndDisplayTimestamp(dbTimestamp: string): string {
  const date = new Date(dbTimestamp);
  return formatForDisplay(date);
}

// Check if date is today
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.getFullYear() === today.getFullYear() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getDate() === today.getDate();
}

// Format date for UI display (Thai locale with Bangkok timezone)
// Safe for SSR/Hydration by using predictable formatting
export function formatDateForUI(dateString: string | Date | undefined | null, options?: {
  includeTime?: boolean;
  locale?: string;
}): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return typeof dateString === 'string' ? dateString : '';
    }
    
    const { includeTime = false } = options || {};
    
    // Convert to Thailand timezone (UTC+7)
    const thailandTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    
    // Use predictable formatting to avoid hydration mismatches
    const year = thailandTime.getFullYear();
    const month = String(thailandTime.getMonth() + 1).padStart(2, '0');
    const day = String(thailandTime.getDate()).padStart(2, '0');
    
    let result = `${day}/${month}/${year}`;
    
    if (includeTime) {
      const hours = String(thailandTime.getHours()).padStart(2, '0');
      const minutes = String(thailandTime.getMinutes()).padStart(2, '0');
      result += ` ${hours}:${minutes}`;
    }
    
    return result;
  } catch {
    // Fallback to original string if parsing fails
    return typeof dateString === 'string' ? dateString : '';
  }
}

/**
 * Converts a date string (ISO or otherwise) to YYYY-MM-DD format
 * for use in HTML input type="date" elements.
 * Handles Timezone offsets by ensuring we get the local date part intended.
 */
export function toInputDateString(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // If it's already in YYYY-MM-DD format, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // For input type="date", we need YYYY-MM-DD.
    // If we use .toISOString().split('T')[0], it converts to UTC 
    // which might be the previous day for Thailand dates (UTC+7).
    // So we should format it using the local component values if valid,
    // OR shift it to cover the offset.
    
    // Simplest robust way for our context (assuming dates are stored/retrieved correctly):
    // If the input is ISO from SharePoint (UTC), and we want to show it as the day it represents in Thailand:
    
    // However, usually SharePoint returns UTC for the start of the day if it's a date-only field,
    // OR it returns a full timestamp.
    
    // Let's use the year, month, day directly
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error in toInputDateString:', error);
    return '';
  }
}