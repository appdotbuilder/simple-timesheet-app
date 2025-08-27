import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type DeleteTimesheetEntryInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteTimesheetEntry = async (input: DeleteTimesheetEntryInput): Promise<{ success: boolean; message: string }> => {
  try {
    // First, check if the timesheet entry exists
    const existingEntry = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, input.id))
      .execute();

    if (existingEntry.length === 0) {
      return {
        success: false,
        message: `Timesheet entry with ID ${input.id} not found.`
      };
    }

    // Delete the timesheet entry
    const result = await db.delete(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, input.id))
      .execute();

    return {
      success: true,
      message: `Timesheet entry with ID ${input.id} has been deleted successfully.`
    };
  } catch (error) {
    console.error('Timesheet entry deletion failed:', error);
    throw error;
  }
};