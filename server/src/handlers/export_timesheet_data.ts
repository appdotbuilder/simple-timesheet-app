import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type ExportTimesheetDataResponse } from '../schema';
import { asc } from 'drizzle-orm';

export const exportTimesheetData = async (): Promise<ExportTimesheetDataResponse> => {
  try {
    // Fetch all timesheet entries ordered by creation date
    const entries = await db.select()
      .from(timesheetEntriesTable)
      .orderBy(asc(timesheetEntriesTable.created_at))
      .execute();

    // CSV headers
    const headers = [
      'ID',
      'Name',
      'Start Time',
      'End Time',
      'Category',
      'Ticket/Activity Number',
      'Number of Line Items',
      'Duration'
    ];

    // Helper function to format duration from seconds to HH:MM:SS
    const formatDuration = (seconds: number | null): string => {
      if (seconds === null) return 'N/A';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Helper function to format date to ISO string or return empty string
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toISOString();
    };

    // Helper function to escape CSV values (handle commas, quotes, newlines)
    const escapeCsvValue = (value: string | number | null): string => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      
      // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    // Convert entries to CSV rows
    const csvRows = entries.map(entry => {
      const row = [
        entry.id,
        entry.name,
        formatDate(entry.start_time),
        formatDate(entry.end_time),
        entry.category,
        entry.ticket_activity_number || '',
        entry.number_of_line_items,
        formatDuration(entry.duration_seconds)
      ];

      return row.map(value => escapeCsvValue(value)).join(',');
    });

    // Combine headers and data rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Generate filename with current timestamp
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `timesheet_export_${dateString}.csv`;

    return {
      csv_content: csvContent,
      filename: filename
    };
  } catch (error) {
    console.error('Timesheet data export failed:', error);
    throw error;
  }
};