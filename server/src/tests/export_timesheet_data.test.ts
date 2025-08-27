import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { exportTimesheetData } from '../handlers/export_timesheet_data';

describe('exportTimesheetData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should export empty CSV with headers when no entries exist', async () => {
    const result = await exportTimesheetData();

    expect(result.csv_content).toEqual('ID,Name,Start Time,End Time,Category,Ticket/Activity Number,Number of Line Items,Duration');
    expect(result.filename).toMatch(/^timesheet_export_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('should export single timesheet entry to CSV', async () => {
    // Create test entry
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T17:00:00Z');
    const durationSeconds = 8 * 60 * 60; // 8 hours in seconds

    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Test Task',
        start_time: startTime,
        end_time: endTime,
        category: 'Development & Testing',
        ticket_activity_number: 'TICKET-123',
        number_of_line_items: 5,
        duration_seconds: durationSeconds,
      })
      .execute();

    const result = await exportTimesheetData();

    const lines = result.csv_content.split('\n');
    expect(lines).toHaveLength(2); // Header + 1 data row
    
    // Check headers
    expect(lines[0]).toEqual('ID,Name,Start Time,End Time,Category,Ticket/Activity Number,Number of Line Items,Duration');
    
    // Check data row - should contain all fields
    const dataRow = lines[1];
    expect(dataRow).toContain('Test Task');
    expect(dataRow).toContain('2024-01-15T09:00:00.000Z');
    expect(dataRow).toContain('2024-01-15T17:00:00.000Z');
    expect(dataRow).toContain('Development & Testing');
    expect(dataRow).toContain('TICKET-123');
    expect(dataRow).toContain('5');
    expect(dataRow).toContain('08:00:00'); // 8 hours formatted as HH:MM:SS
  });

  it('should export multiple timesheet entries ordered by creation date', async () => {
    const baseTime = new Date('2024-01-15T09:00:00Z');
    
    // Create first entry
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'First Task',
        start_time: baseTime,
        end_time: new Date(baseTime.getTime() + 3600000), // +1 hour
        category: 'Ticket',
        ticket_activity_number: 'TICKET-456',
        number_of_line_items: 2,
        duration_seconds: 3600, // 1 hour
      })
      .execute();

    // Small delay to ensure different creation timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second entry
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Second Task',
        start_time: new Date(baseTime.getTime() + 60000), // +1 minute
        end_time: null, // Running timer
        category: 'Meeting',
        ticket_activity_number: null,
        number_of_line_items: 3,
        duration_seconds: null,
      })
      .execute();

    const result = await exportTimesheetData();

    const lines = result.csv_content.split('\n');
    expect(lines).toHaveLength(3); // Header + 2 data rows

    // Entries should be ordered by creation date (First Task, then Second Task)
    expect(lines[1]).toContain('First Task');
    expect(lines[2]).toContain('Second Task');
  });

  it('should handle null values correctly', async () => {
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Task with nulls',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: null, // Null end time
        category: 'Other',
        ticket_activity_number: null, // Null ticket number
        number_of_line_items: 1,
        duration_seconds: null, // Null duration
      })
      .execute();

    const result = await exportTimesheetData();

    const lines = result.csv_content.split('\n');
    const dataRow = lines[1];
    
    // Check that null values are handled properly
    expect(dataRow).toContain('Task with nulls');
    expect(dataRow).toContain(',,'); // Empty end_time between start_time and category
    expect(dataRow).toContain(',Other,,'); // Empty ticket_activity_number between category and number_of_line_items
    expect(dataRow).toContain(',N/A'); // Duration shows as N/A for null
  });

  it('should format duration correctly in HH:MM:SS', async () => {
    const testCases = [
      { seconds: 0, expected: '00:00:00' },
      { seconds: 59, expected: '00:00:59' },
      { seconds: 60, expected: '00:01:00' },
      { seconds: 3661, expected: '01:01:01' }, // 1 hour, 1 minute, 1 second
      { seconds: 7200, expected: '02:00:00' }, // 2 hours
      { seconds: 86400, expected: '24:00:00' }, // 24 hours
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      await db.insert(timesheetEntriesTable)
        .values({
          name: `Duration Test ${i + 1}`,
          start_time: new Date(),
          end_time: new Date(),
          category: 'Other',
          ticket_activity_number: null,
          number_of_line_items: 1,
          duration_seconds: testCase.seconds,
        })
        .execute();
    }

    const result = await exportTimesheetData();
    const lines = result.csv_content.split('\n');

    // Check each duration formatting (skip header line)
    for (let i = 0; i < testCases.length; i++) {
      const dataRow = lines[i + 1];
      expect(dataRow).toContain(testCases[i].expected);
    }
  });

  it('should escape CSV values containing commas and quotes', async () => {
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Task with, comma and "quotes"', // Contains comma and quotes
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z'),
        category: 'Other',
        ticket_activity_number: 'TICKET,WITH,COMMAS', // Contains commas
        number_of_line_items: 1,
        duration_seconds: 3600,
      })
      .execute();

    const result = await exportTimesheetData();

    const lines = result.csv_content.split('\n');
    const dataRow = lines[1];
    
    // Check that values with commas and quotes are properly escaped
    expect(dataRow).toContain('"Task with, comma and ""quotes"""'); // Escaped name
    expect(dataRow).toContain('"TICKET,WITH,COMMAS"'); // Escaped ticket number
  });

  it('should generate filename with current date', async () => {
    const result = await exportTimesheetData();

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const expectedFilename = `timesheet_export_${today}.csv`;
    
    expect(result.filename).toEqual(expectedFilename);
  });

  it('should handle entries with category containing special characters', async () => {
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Special Category Task',
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T10:00:00Z'),
        category: 'Koordinasi & kegiatan pendukung lainnya', // Contains & and spaces
        ticket_activity_number: null,
        number_of_line_items: 1,
        duration_seconds: 3600,
      })
      .execute();

    const result = await exportTimesheetData();

    const lines = result.csv_content.split('\n');
    const dataRow = lines[1];
    
    // Check that special characters in category are preserved
    expect(dataRow).toContain('Koordinasi & kegiatan pendukung lainnya');
  });
});