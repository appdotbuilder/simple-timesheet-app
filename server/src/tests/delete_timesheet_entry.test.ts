import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type DeleteTimesheetEntryInput } from '../schema';
import { deleteTimesheetEntry } from '../handlers/delete_timesheet_entry';
import { eq } from 'drizzle-orm';

describe('deleteTimesheetEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing timesheet entry', async () => {
    // Create a test timesheet entry first
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Test Entry',
        start_time: new Date(),
        category: 'Ticket',
        ticket_activity_number: 'TEST-123',
        number_of_line_items: 5
      })
      .returning()
      .execute();

    const entryId = insertResult[0].id;

    // Test input for deletion
    const testInput: DeleteTimesheetEntryInput = {
      id: entryId
    };

    // Delete the entry
    const result = await deleteTimesheetEntry(testInput);

    // Verify success response
    expect(result.success).toBe(true);
    expect(result.message).toEqual(`Timesheet entry with ID ${entryId} has been deleted successfully.`);

    // Verify the entry is actually deleted from the database
    const remainingEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, entryId))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });

  it('should return failure for non-existent timesheet entry', async () => {
    const nonExistentId = 99999;
    const testInput: DeleteTimesheetEntryInput = {
      id: nonExistentId
    };

    const result = await deleteTimesheetEntry(testInput);

    // Verify failure response
    expect(result.success).toBe(false);
    expect(result.message).toEqual(`Timesheet entry with ID ${nonExistentId} not found.`);
  });

  it('should not affect other timesheet entries when deleting one', async () => {
    // Create multiple test entries
    const insertResults = await db.insert(timesheetEntriesTable)
      .values([
        {
          name: 'Entry 1',
          start_time: new Date(),
          category: 'Ticket',
          ticket_activity_number: 'TEST-001',
          number_of_line_items: 3
        },
        {
          name: 'Entry 2',
          start_time: new Date(),
          category: 'Meeting',
          ticket_activity_number: null,
          number_of_line_items: 1
        },
        {
          name: 'Entry 3',
          start_time: new Date(),
          category: 'Development & Testing',
          ticket_activity_number: 'DEV-456',
          number_of_line_items: 10
        }
      ])
      .returning()
      .execute();

    const entryToDelete = insertResults[1].id;

    // Delete the middle entry
    const testInput: DeleteTimesheetEntryInput = {
      id: entryToDelete
    };

    const result = await deleteTimesheetEntry(testInput);

    // Verify deletion succeeded
    expect(result.success).toBe(true);

    // Verify only the specified entry was deleted
    const remainingEntries = await db.select()
      .from(timesheetEntriesTable)
      .execute();

    expect(remainingEntries).toHaveLength(2);
    
    // Verify the correct entries remain
    const remainingIds = remainingEntries.map(entry => entry.id);
    expect(remainingIds).toContain(insertResults[0].id);
    expect(remainingIds).toContain(insertResults[2].id);
    expect(remainingIds).not.toContain(entryToDelete);
  });

  it('should delete completed timesheet entries with end_time and duration', async () => {
    // Create a completed timesheet entry
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Completed Entry',
        start_time: new Date('2024-01-01T09:00:00'),
        end_time: new Date('2024-01-01T17:00:00'),
        category: 'Development & Testing',
        ticket_activity_number: 'COMP-789',
        number_of_line_items: 8,
        duration_seconds: 28800 // 8 hours in seconds
      })
      .returning()
      .execute();

    const entryId = insertResult[0].id;

    const testInput: DeleteTimesheetEntryInput = {
      id: entryId
    };

    const result = await deleteTimesheetEntry(testInput);

    // Verify successful deletion
    expect(result.success).toBe(true);
    expect(result.message).toEqual(`Timesheet entry with ID ${entryId} has been deleted successfully.`);

    // Verify entry is removed from database
    const remainingEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, entryId))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });

  it('should delete active timesheet entries with null end_time', async () => {
    // Create an active (running) timesheet entry
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Active Entry',
        start_time: new Date(),
        end_time: null, // Still running
        category: 'Adhoc/project',
        ticket_activity_number: 'ACTIVE-111',
        number_of_line_items: 2,
        duration_seconds: null // Not calculated yet
      })
      .returning()
      .execute();

    const entryId = insertResult[0].id;

    const testInput: DeleteTimesheetEntryInput = {
      id: entryId
    };

    const result = await deleteTimesheetEntry(testInput);

    // Verify successful deletion
    expect(result.success).toBe(true);
    expect(result.message).toEqual(`Timesheet entry with ID ${entryId} has been deleted successfully.`);

    // Verify entry is removed from database
    const remainingEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, entryId))
      .execute();

    expect(remainingEntries).toHaveLength(0);
  });
});