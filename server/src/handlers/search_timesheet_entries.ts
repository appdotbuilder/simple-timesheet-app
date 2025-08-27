import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type SearchTimesheetEntriesInput, type TimesheetEntry } from '../schema';
import { and, or, ilike, eq, SQL } from 'drizzle-orm';

export const searchTimesheetEntries = async (input: SearchTimesheetEntriesInput): Promise<TimesheetEntry[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Add search term filter (case-insensitive partial match on name or ticket_activity_number)
    if (input.search_term) {
      const searchTerm = `%${input.search_term}%`;
      conditions.push(
        or(
          ilike(timesheetEntriesTable.name, searchTerm),
          ilike(timesheetEntriesTable.ticket_activity_number, searchTerm)
        )!
      );
    }

    // Add category filter (exact match)
    if (input.category) {
      conditions.push(eq(timesheetEntriesTable.category, input.category));
    }

    // Execute query based on whether we have conditions
    const results = conditions.length > 0
      ? await db.select()
          .from(timesheetEntriesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(timesheetEntriesTable.created_at)
          .execute()
      : await db.select()
          .from(timesheetEntriesTable)
          .orderBy(timesheetEntriesTable.created_at)
          .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Search timesheet entries failed:', error);
    throw error;
  }
};