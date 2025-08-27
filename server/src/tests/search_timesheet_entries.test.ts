import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type SearchTimesheetEntriesInput } from '../schema';
import { searchTimesheetEntries } from '../handlers/search_timesheet_entries';

describe('searchTimesheetEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data helper
  const createTestEntries = async () => {
    const testEntries = [
      {
        name: 'Fix login bug',
        start_time: new Date('2024-01-01T09:00:00Z'),
        end_time: new Date('2024-01-01T11:00:00Z'),
        category: 'Ticket' as const,
        ticket_activity_number: 'TKT-123',
        number_of_line_items: 5,
        duration_seconds: 7200
      },
      {
        name: 'Team meeting',
        start_time: new Date('2024-01-01T14:00:00Z'),
        end_time: new Date('2024-01-01T15:00:00Z'),
        category: 'Meeting' as const,
        ticket_activity_number: null,
        number_of_line_items: 0,
        duration_seconds: 3600
      },
      {
        name: 'Code review',
        start_time: new Date('2024-01-02T10:00:00Z'),
        end_time: new Date('2024-01-02T11:30:00Z'),
        category: 'Development & Testing' as const,
        ticket_activity_number: 'DEV-456',
        number_of_line_items: 3,
        duration_seconds: 5400
      },
      {
        name: 'Bug investigation',
        start_time: new Date('2024-01-02T16:00:00Z'),
        end_time: null, // Active timer
        category: 'Ticket' as const,
        ticket_activity_number: 'TKT-789',
        number_of_line_items: 2,
        duration_seconds: null
      }
    ];

    const results = await db.insert(timesheetEntriesTable)
      .values(testEntries)
      .returning()
      .execute();

    return results;
  };

  it('should return all entries when no filters applied', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {};
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(4);
    expect(results[0].name).toBeDefined();
    expect(results[0].category).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by search term matching name (case-insensitive)', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'bug'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(2); // "Fix login bug" and "Bug investigation"
    expect(results.every(r => r.name.toLowerCase().includes('bug'))).toBe(true);
  });

  it('should filter by search term matching ticket_activity_number', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'TKT-123'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Fix login bug');
    expect(results[0].ticket_activity_number).toBe('TKT-123');
  });

  it('should filter by search term with partial match on ticket number', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'TKT'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(2); // TKT-123 and TKT-789
    expect(results.every(r => r.ticket_activity_number?.includes('TKT'))).toBe(true);
  });

  it('should filter by category', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      category: 'Ticket'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(2);
    expect(results.every(r => r.category === 'Ticket')).toBe(true);
  });

  it('should filter by both search term and category', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'bug',
      category: 'Ticket'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(2); // Both entries with "bug" are Ticket category
    expect(results.every(r => 
      r.name.toLowerCase().includes('bug') && r.category === 'Ticket'
    )).toBe(true);
  });

  it('should return empty array when no matches found', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'nonexistent'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(0);
  });

  it('should handle search term with special characters', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'DEV-456'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Code review');
    expect(results[0].ticket_activity_number).toBe('DEV-456');
  });

  it('should handle null ticket_activity_number correctly', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'meeting'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Team meeting');
    expect(results[0].ticket_activity_number).toBe(null);
  });

  it('should return results ordered by created_at', async () => {
    const entries = await createTestEntries();

    const input: SearchTimesheetEntriesInput = {};
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(4);
    // Results should be ordered by created_at (first entry created should be first)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].created_at.getTime()).toBeGreaterThanOrEqual(
        results[i - 1].created_at.getTime()
      );
    }
  });

  it('should handle case-insensitive search correctly', async () => {
    await createTestEntries();

    const input: SearchTimesheetEntriesInput = {
      search_term: 'TEAM'
    };
    const results = await searchTimesheetEntries(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Team meeting');
  });

  it('should filter correctly with multiple categories', async () => {
    await createTestEntries();

    // Test with Meeting category
    const meetingInput: SearchTimesheetEntriesInput = {
      category: 'Meeting'
    };
    const meetingResults = await searchTimesheetEntries(meetingInput);

    expect(meetingResults).toHaveLength(1);
    expect(meetingResults[0].category).toBe('Meeting');

    // Test with Development & Testing category
    const devInput: SearchTimesheetEntriesInput = {
      category: 'Development & Testing'
    };
    const devResults = await searchTimesheetEntries(devInput);

    expect(devResults).toHaveLength(1);
    expect(devResults[0].category).toBe('Development & Testing');
  });
});