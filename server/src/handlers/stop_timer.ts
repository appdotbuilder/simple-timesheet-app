import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type StopTimerInput, type TimesheetEntry } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const stopTimer = async (input: StopTimerInput): Promise<TimesheetEntry> => {
  try {
    const now = new Date();
    
    // First, get the existing entry to validate it exists and timer is running
    const existingEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(
        and(
          eq(timesheetEntriesTable.id, input.id),
          isNull(timesheetEntriesTable.end_time) // Only entries with running timers
        )
      )
      .execute();

    if (existingEntries.length === 0) {
      throw new Error(`No running timer found with id ${input.id}`);
    }

    const existingEntry = existingEntries[0];
    
    // Calculate duration in seconds
    const startTime = existingEntry.start_time;
    const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    // Update the entry with end_time and duration_seconds
    const result = await db.update(timesheetEntriesTable)
      .set({
        end_time: now,
        duration_seconds: durationSeconds
      })
      .where(eq(timesheetEntriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Timer stop failed:', error);
    throw error;
  }
};