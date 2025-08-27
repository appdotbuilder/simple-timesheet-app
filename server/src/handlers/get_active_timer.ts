import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type TimesheetEntry } from '../schema';
import { isNull, desc } from 'drizzle-orm';

export const getActiveTimer = async (): Promise<TimesheetEntry | null> => {
  try {
    // Query for entries where end_time is null (active timer)
    // Order by created_at desc to get the most recent active timer if multiple exist
    const results = await db.select()
      .from(timesheetEntriesTable)
      .where(isNull(timesheetEntriesTable.end_time))
      .orderBy(desc(timesheetEntriesTable.created_at))
      .limit(1)
      .execute();

    // Return the first result or null if no active timer found
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to get active timer:', error);
    throw error;
  }
};