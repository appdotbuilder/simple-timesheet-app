import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type CreateTimesheetEntryInput } from '../schema';
import { getTimesheetEntries } from '../handlers/get_timesheet_entries';

// Test data for creating timesheet entries
const testEntry1: CreateTimesheetEntryInput & { start_time: Date } = {
  name: 'Fix login bug',
  category: 'Ticket',
  ticket_activity_number: 'TICKET-001',
  number_of_line_items: 5,
  start_time: new Date('2024-01-01T09:00:00Z')
};

const testEntry2: CreateTimesheetEntryInput & { start_time: Date } = {
  name: 'Team standup meeting',
  category: 'Meeting',
  ticket_activity_number: null,
  number_of_line_items: 0,
  start_time: new Date('2024-01-02T10:00:00Z')
};

const testEntry3: CreateTimesheetEntryInput & { start_time: Date } = {
  name: 'Database optimization',
  category: 'Development & Testing',
  ticket_activity_number: 'DEV-123',
  number_of_line_items: 12,
  start_time: new Date('2024-01-03T14:30:00Z')
};

describe('getTimesheetEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no entries exist', async () => {
    const result = await getTimesheetEntries();
    
    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('should return all timesheet entries', async () => {
    // Create test entries
    await db.insert(timesheetEntriesTable).values([
      {
        name: testEntry1.name,
        category: testEntry1.category,
        ticket_activity_number: testEntry1.ticket_activity_number,
        number_of_line_items: testEntry1.number_of_line_items,
        start_time: testEntry1.start_time
      },
      {
        name: testEntry2.name,
        category: testEntry2.category,
        ticket_activity_number: testEntry2.ticket_activity_number,
        number_of_line_items: testEntry2.number_of_line_items,
        start_time: testEntry2.start_time
      }
    ]).execute();

    const result = await getTimesheetEntries();

    expect(result).toHaveLength(2);
    
    // Verify entries are returned with correct data
    expect(result[0].name).toBeDefined();
    expect(result[0].category).toBeDefined();
    expect(result[0].start_time).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(typeof result[0].number_of_line_items).toBe('number');
  });

  it('should return entries ordered by created_at descending (most recent first)', async () => {
    // Insert entries with different creation times by adding small delays
    const entry1 = await db.insert(timesheetEntriesTable).values({
      name: testEntry1.name,
      category: testEntry1.category,
      ticket_activity_number: testEntry1.ticket_activity_number,
      number_of_line_items: testEntry1.number_of_line_items,
      start_time: testEntry1.start_time
    }).returning().execute();

    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const entry2 = await db.insert(timesheetEntriesTable).values({
      name: testEntry2.name,
      category: testEntry2.category,
      ticket_activity_number: testEntry2.ticket_activity_number,
      number_of_line_items: testEntry2.number_of_line_items,
      start_time: testEntry2.start_time
    }).returning().execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const entry3 = await db.insert(timesheetEntriesTable).values({
      name: testEntry3.name,
      category: testEntry3.category,
      ticket_activity_number: testEntry3.ticket_activity_number,
      number_of_line_items: testEntry3.number_of_line_items,
      start_time: testEntry3.start_time
    }).returning().execute();

    const result = await getTimesheetEntries();

    expect(result).toHaveLength(3);
    
    // Verify ordering - most recent (entry3) should be first
    expect(result[0].name).toBe(testEntry3.name);
    expect(result[1].name).toBe(testEntry2.name);
    expect(result[2].name).toBe(testEntry1.name);

    // Verify created_at timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should handle entries with different field combinations correctly', async () => {
    // Create entries with various field combinations
    await db.insert(timesheetEntriesTable).values([
      {
        name: 'Entry with ticket number',
        category: 'Ticket',
        ticket_activity_number: 'TICKET-001',
        number_of_line_items: 5,
        start_time: new Date(),
        end_time: new Date(),
        duration_seconds: 3600 // 1 hour
      },
      {
        name: 'Entry without ticket number',
        category: 'Meeting',
        ticket_activity_number: null,
        number_of_line_items: 0,
        start_time: new Date(),
        end_time: null, // Timer still running
        duration_seconds: null
      }
    ]).execute();

    const result = await getTimesheetEntries();

    expect(result).toHaveLength(2);
    
    // Find entries by name to verify data
    const ticketEntry = result.find(e => e.name === 'Entry with ticket number');
    const meetingEntry = result.find(e => e.name === 'Entry without ticket number');

    expect(ticketEntry).toBeDefined();
    expect(ticketEntry!.ticket_activity_number).toBe('TICKET-001');
    expect(ticketEntry!.end_time).toBeInstanceOf(Date);
    expect(ticketEntry!.duration_seconds).toBe(3600);

    expect(meetingEntry).toBeDefined();
    expect(meetingEntry!.ticket_activity_number).toBeNull();
    expect(meetingEntry!.end_time).toBeNull();
    expect(meetingEntry!.duration_seconds).toBeNull();
  });

  it('should return entries with all required fields', async () => {
    await db.insert(timesheetEntriesTable).values({
      name: testEntry1.name,
      category: testEntry1.category,
      ticket_activity_number: testEntry1.ticket_activity_number,
      number_of_line_items: testEntry1.number_of_line_items,
      start_time: testEntry1.start_time
    }).execute();

    const result = await getTimesheetEntries();

    expect(result).toHaveLength(1);
    
    const entry = result[0];
    
    // Verify all required fields are present and have correct types
    expect(typeof entry.id).toBe('number');
    expect(typeof entry.name).toBe('string');
    expect(entry.start_time).toBeInstanceOf(Date);
    expect(['Ticket', 'Koordinasi & kegiatan pendukung lainnya', 'Meeting', 'Adhoc/project', 'Development & Testing', 'Other']).toContain(entry.category);
    expect(typeof entry.number_of_line_items).toBe('number');
    expect(entry.created_at).toBeInstanceOf(Date);

    // Verify nullable fields can be null or have correct types
    if (entry.ticket_activity_number !== null) {
      expect(typeof entry.ticket_activity_number).toBe('string');
    }
    if (entry.end_time !== null) {
      expect(entry.end_time).toBeInstanceOf(Date);
    }
    if (entry.duration_seconds !== null) {
      expect(typeof entry.duration_seconds).toBe('number');
    }
  });
});