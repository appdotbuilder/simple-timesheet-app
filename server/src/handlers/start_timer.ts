import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type StartTimerInput, type TimesheetEntry } from '../schema';

export const startTimer = async (input: StartTimerInput): Promise<TimesheetEntry> => {
  try {
    // Insert new timesheet entry with start_time as current time
    // end_time and duration_seconds are null (timer is running)
    const result = await db.insert(timesheetEntriesTable)
      .values({
        name: input.name,
        start_time: new Date(), // Current time when timer starts
        end_time: null, // Timer is running
        category: input.category,
        ticket_activity_number: input.ticket_activity_number,
        number_of_line_items: input.number_of_line_items,
        duration_seconds: null, // Not calculated yet
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Timer start failed:', error);
    throw error;
  }
};