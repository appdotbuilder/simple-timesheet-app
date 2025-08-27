import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type StopTimerInput } from '../schema';
import { stopTimer } from '../handlers/stop_timer';
import { eq } from 'drizzle-orm';

describe('stopTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should stop a running timer and calculate duration', async () => {
    // Create a running timesheet entry (no end_time, no duration)
    const startTime = new Date(Date.now() - 5000); // 5 seconds ago
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Test Task',
        start_time: startTime,
        end_time: null, // Running timer
        category: 'Development & Testing',
        ticket_activity_number: 'TICKET-123',
        number_of_line_items: 5,
        duration_seconds: null // Not calculated yet
      })
      .returning()
      .execute();

    const createdEntry = insertResult[0];
    const input: StopTimerInput = { id: createdEntry.id };

    // Stop the timer
    const result = await stopTimer(input);

    // Validate the result
    expect(result.id).toBe(createdEntry.id);
    expect(result.name).toBe('Test Task');
    expect(result.start_time).toEqual(startTime);
    expect(result.end_time).toBeInstanceOf(Date);
    expect(result.end_time!.getTime()).toBeGreaterThan(startTime.getTime());
    expect(result.category).toBe('Development & Testing');
    expect(result.ticket_activity_number).toBe('TICKET-123');
    expect(result.number_of_line_items).toBe(5);
    expect(result.duration_seconds).toBeTypeOf('number');
    expect(result.duration_seconds!).toBeGreaterThanOrEqual(5); // At least 5 seconds
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save timer stop to database correctly', async () => {
    // Create a running timesheet entry
    const startTime = new Date(Date.now() - 10000); // 10 seconds ago
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Database Test Task',
        start_time: startTime,
        end_time: null,
        category: 'Meeting',
        ticket_activity_number: null,
        number_of_line_items: 1,
        duration_seconds: null
      })
      .returning()
      .execute();

    const createdEntry = insertResult[0];
    const input: StopTimerInput = { id: createdEntry.id };

    // Stop the timer
    await stopTimer(input);

    // Verify in database
    const updatedEntries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, createdEntry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    const updatedEntry = updatedEntries[0];
    
    expect(updatedEntry.end_time).toBeInstanceOf(Date);
    expect(updatedEntry.end_time!.getTime()).toBeGreaterThan(startTime.getTime());
    expect(updatedEntry.duration_seconds).toBeTypeOf('number');
    expect(updatedEntry.duration_seconds!).toBeGreaterThanOrEqual(10); // At least 10 seconds
  });

  it('should calculate duration correctly', async () => {
    // Create entry with specific start time for precise duration testing
    const startTime = new Date(Date.now() - 60000); // Exactly 1 minute ago
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Duration Test Task',
        start_time: startTime,
        end_time: null,
        category: 'Ticket',
        ticket_activity_number: 'DURATION-001',
        number_of_line_items: 2,
        duration_seconds: null
      })
      .returning()
      .execute();

    const createdEntry = insertResult[0];
    const input: StopTimerInput = { id: createdEntry.id };

    // Stop the timer
    const result = await stopTimer(input);

    // Duration should be approximately 60 seconds (allowing for small execution time)
    expect(result.duration_seconds!).toBeGreaterThanOrEqual(60);
    expect(result.duration_seconds!).toBeLessThan(65); // Should not be much more than 60
  });

  it('should throw error for non-existent timer', async () => {
    const input: StopTimerInput = { id: 99999 };

    await expect(stopTimer(input)).rejects.toThrow(/No running timer found with id 99999/i);
  });

  it('should throw error for already stopped timer', async () => {
    // Create an already stopped timesheet entry
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Already Stopped Task',
        start_time: new Date(Date.now() - 3600000), // 1 hour ago
        end_time: new Date(), // Already stopped
        category: 'Other',
        ticket_activity_number: null,
        number_of_line_items: 3,
        duration_seconds: 3600 // Already calculated
      })
      .returning()
      .execute();

    const createdEntry = insertResult[0];
    const input: StopTimerInput = { id: createdEntry.id };

    await expect(stopTimer(input)).rejects.toThrow(/No running timer found/i);
  });

  it('should handle different categories correctly', async () => {
    // Test with 'Koordinasi & kegiatan pendukung lainnya' category
    const startTime = new Date(Date.now() - 2000); // 2 seconds ago
    const insertResult = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Coordination Task',
        start_time: startTime,
        end_time: null,
        category: 'Koordinasi & kegiatan pendukung lainnya',
        ticket_activity_number: 'COORD-456',
        number_of_line_items: 0,
        duration_seconds: null
      })
      .returning()
      .execute();

    const createdEntry = insertResult[0];
    const input: StopTimerInput = { id: createdEntry.id };

    // Stop the timer
    const result = await stopTimer(input);

    expect(result.category).toBe('Koordinasi & kegiatan pendukung lainnya');
    expect(result.duration_seconds).toBeGreaterThanOrEqual(2);
  });
});