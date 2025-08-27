import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type UpdateTimesheetEntryInput, type CreateTimesheetEntryInput } from '../schema';
import { updateTimesheetEntry } from '../handlers/update_timesheet_entry';
import { eq } from 'drizzle-orm';

// Test data for creating initial entries
const testTimesheetEntry: CreateTimesheetEntryInput = {
  name: 'Test Task',
  category: 'Development & Testing',
  ticket_activity_number: 'TICKET-001',
  number_of_line_items: 5
};

const createCompletedTimesheetEntry = async () => {
  const startTime = new Date('2024-01-15T09:00:00Z');
  const endTime = new Date('2024-01-15T10:30:00Z');
  const durationSeconds = 5400; // 1.5 hours

  const result = await db.insert(timesheetEntriesTable)
    .values({
      name: testTimesheetEntry.name,
      start_time: startTime,
      end_time: endTime,
      category: testTimesheetEntry.category,
      ticket_activity_number: testTimesheetEntry.ticket_activity_number,
      number_of_line_items: testTimesheetEntry.number_of_line_items,
      duration_seconds: durationSeconds
    })
    .returning()
    .execute();

  return result[0];
};

const createRunningTimesheetEntry = async () => {
  const startTime = new Date('2024-01-15T09:00:00Z');

  const result = await db.insert(timesheetEntriesTable)
    .values({
      name: testTimesheetEntry.name,
      start_time: startTime,
      end_time: null,
      category: testTimesheetEntry.category,
      ticket_activity_number: testTimesheetEntry.ticket_activity_number,
      number_of_line_items: testTimesheetEntry.number_of_line_items,
      duration_seconds: null
    })
    .returning()
    .execute();

  return result[0];
};

describe('updateTimesheetEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a completed timesheet entry', async () => {
    const entry = await createCompletedTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: entry.id,
      name: 'Updated Task Name',
      category: 'Meeting',
      ticket_activity_number: 'TICKET-002',
      number_of_line_items: 10
    };

    const result = await updateTimesheetEntry(updateInput);

    expect(result.id).toEqual(entry.id);
    expect(result.name).toEqual('Updated Task Name');
    expect(result.category).toEqual('Meeting');
    expect(result.ticket_activity_number).toEqual('TICKET-002');
    expect(result.number_of_line_items).toEqual(10);
    expect(result.start_time).toEqual(entry.start_time);
    expect(result.end_time).toEqual(entry.end_time);
    expect(result.duration_seconds).toEqual(entry.duration_seconds);
    expect(result.created_at).toEqual(entry.created_at);
  });

  it('should update partial fields only', async () => {
    const entry = await createCompletedTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: entry.id,
      name: 'Partially Updated Name',
      number_of_line_items: 8
    };

    const result = await updateTimesheetEntry(updateInput);

    expect(result.id).toEqual(entry.id);
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.category).toEqual(entry.category); // Should remain unchanged
    expect(result.ticket_activity_number).toEqual(entry.ticket_activity_number); // Should remain unchanged
    expect(result.number_of_line_items).toEqual(8);
  });

  it('should update ticket_activity_number to null', async () => {
    const entry = await createCompletedTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: entry.id,
      ticket_activity_number: null
    };

    const result = await updateTimesheetEntry(updateInput);

    expect(result.id).toEqual(entry.id);
    expect(result.ticket_activity_number).toBeNull();
    expect(result.name).toEqual(entry.name); // Should remain unchanged
    expect(result.category).toEqual(entry.category); // Should remain unchanged
  });

  it('should save updated entry to database', async () => {
    const entry = await createCompletedTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: entry.id,
      name: 'Database Update Test',
      category: 'Other'
    };

    await updateTimesheetEntry(updateInput);

    // Verify the change was persisted
    const updatedEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, entry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    expect(updatedEntries[0].name).toEqual('Database Update Test');
    expect(updatedEntries[0].category).toEqual('Other');
    expect(updatedEntries[0].ticket_activity_number).toEqual(entry.ticket_activity_number); // Unchanged
  });

  it('should throw error when updating non-existent entry', async () => {
    const updateInput: UpdateTimesheetEntryInput = {
      id: 999,
      name: 'Non-existent Entry'
    };

    await expect(updateTimesheetEntry(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error when updating a running timesheet entry', async () => {
    const runningEntry = await createRunningTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: runningEntry.id,
      name: 'Should Not Update'
    };

    await expect(updateTimesheetEntry(updateInput)).rejects.toThrow(/currently running/i);
  });

  it('should handle updates with all possible categories', async () => {
    const entry = await createCompletedTimesheetEntry();

    const categories = [
      'Ticket',
      'Koordinasi & kegiatan pendukung lainnya',
      'Meeting',
      'Adhoc/project',
      'Development & Testing',
      'Other'
    ] as const;

    for (const category of categories) {
      const updateInput: UpdateTimesheetEntryInput = {
        id: entry.id,
        category: category
      };

      const result = await updateTimesheetEntry(updateInput);
      expect(result.category).toEqual(category);
    }
  });

  it('should handle zero line items update', async () => {
    const entry = await createCompletedTimesheetEntry();

    const updateInput: UpdateTimesheetEntryInput = {
      id: entry.id,
      number_of_line_items: 0
    };

    const result = await updateTimesheetEntry(updateInput);

    expect(result.number_of_line_items).toEqual(0);
  });
});