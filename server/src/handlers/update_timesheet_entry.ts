import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type UpdateTimesheetEntryInput, type TimesheetEntry } from '../schema';
import { eq, isNull } from 'drizzle-orm';

export const updateTimesheetEntry = async (input: UpdateTimesheetEntryInput): Promise<TimesheetEntry> => {
  try {
    // First, check if the entry exists
    const existingEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, input.id))
      .execute();

    if (existingEntries.length === 0) {
      throw new Error(`Timesheet entry with id ${input.id} not found`);
    }

    const existingEntry = existingEntries[0];

    // Check if the entry is currently running (end_time is null)
    if (existingEntry.end_time === null) {
      throw new Error('Cannot update a timesheet entry that is currently running. Stop the timer first.');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.category !== undefined) {
      updateData.category = input.category;
    }
    
    if (input.ticket_activity_number !== undefined) {
      updateData.ticket_activity_number = input.ticket_activity_number;
    }
    
    if (input.number_of_line_items !== undefined) {
      updateData.number_of_line_items = input.number_of_line_items;
    }

    // Perform the update
    const result = await db.update(timesheetEntriesTable)
      .set(updateData)
      .where(eq(timesheetEntriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Timesheet entry update failed:', error);
    throw error;
  }
};