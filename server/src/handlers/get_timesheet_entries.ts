import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type TimesheetEntry } from '../schema';
import { desc } from 'drizzle-orm';

export const getTimesheetEntries = async (): Promise<TimesheetEntry[]> => {
  try {
    // Fetch all timesheet entries ordered by created_at descending (most recent first)
    const results = await db.select()
      .from(timesheetEntriesTable)
      .orderBy(desc(timesheetEntriesTable.created_at))
      .execute();

    // Return the results - all fields are already in the correct format
    // (integers remain integers, timestamps are Date objects, strings remain strings)
    return results;
  } catch (error) {
    console.error('Failed to fetch timesheet entries:', error);
    throw error;
  }
};