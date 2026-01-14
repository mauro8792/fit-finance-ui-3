import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a date string treating it as local time (not UTC)
 * Use this for date-only strings like "2026-01-08" to avoid timezone issues
 */
export function parseLocalDate(dateString: string | Date | null | undefined): Date | null {
  if (!dateString) return null;
  
  if (dateString instanceof Date) return dateString;
  
  // If it's a date-only string (YYYY-MM-DD), parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // For ISO strings with time, just parse normally
  return new Date(dateString);
}

/**
 * Formats a date to a localized string (Argentina locale)
 * Handles UTC timezone issues by parsing as local date first
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: '2-digit' }
): string {
  const date = parseLocalDate(dateString);
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', options);
}

/**
 * Formats a date with weekday
 */
export function formatDateWithWeekday(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: '2-digit' 
  });
}

/**
 * Formats a date for display (full format)
 */
export function formatDateFull(dateString: string | Date | null | undefined): string {
  return formatDate(dateString, { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

/**
 * Formats a date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date as YYYY-MM-DD string (local time)
 */
export function getTodayString(): string {
  return formatDateForInput(new Date());
}

/**
 * Checks if a date is today (local time)
 */
export function isToday(dateString: string | Date | null | undefined): boolean {
  const date = parseLocalDate(dateString);
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
