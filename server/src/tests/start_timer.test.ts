import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type StartTimerInput } from '../schema';
import { startTimer } from '../handlers/start_timer';
import { eq } from 'drizzle-orm';

// Test input for timer start
const testInput: StartTimerInput = {
  name: 'Test Task',
  category: 'Development & Testing',
  ticket_activity_number: 'TICKET-123',
  number_of_line_items: 5
};

describe('startTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start a timer and create a timesheet entry', async () => {
    const result = await startTimer(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Task');
    expect(result.category).toEqual('Development & Testing');
    expect(result.ticket_activity_number).toEqual('TICKET-123');
    expect(result.number_of_line_items).toEqual(5);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Timer-specific validations
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.end_time).toBeNull(); // Timer is running
    expect(result.duration_seconds).toBeNull(); // Not calculated yet
  });

  it('should save timer entry to database', async () => {
    const result = await startTimer(testInput);

    // Query database to verify entry was created
    const entries = await db.select()
      .from(timesheetEntriesTable)
      .where(eq(timesheetEntriesTable.id, result.id))
      .execute();

    expect(entries).toHaveLength(1);
    
    const entry = entries[0];
    expect(entry.name).toEqual('Test Task');
    expect(entry.category).toEqual('Development & Testing');
    expect(entry.ticket_activity_number).toEqual('TICKET-123');
    expect(entry.number_of_line_items).toEqual(5);
    expect(entry.start_time).toBeInstanceOf(Date);
    expect(entry.end_time).toBeNull();
    expect(entry.duration_seconds).toBeNull();
    expect(entry.created_at).toBeInstanceOf(Date);
  });

  it('should handle null ticket_activity_number', async () => {
    const inputWithNullTicket: StartTimerInput = {
      name: 'Task without ticket',
      category: 'Meeting',
      ticket_activity_number: null,
      number_of_line_items: 0
    };

    const result = await startTimer(inputWithNullTicket);

    expect(result.name).toEqual('Task without ticket');
    expect(result.category).toEqual('Meeting');
    expect(result.ticket_activity_number).toBeNull();
    expect(result.number_of_line_items).toEqual(0);
    expect(result.start_time).toBeInstanceOf(Date);
    expect(result.end_time).toBeNull();
    expect(result.duration_seconds).toBeNull();
  });

  it('should create entries with different categories', async () => {
    const categories = ['Ticket', 'Meeting', 'Other'] as const;
    const results = [];

    for (const category of categories) {
      const input: StartTimerInput = {
        name: `Task for ${category}`,
        category,
        ticket_activity_number: `${category}-001`,
        number_of_line_items: 1
      };

      const result = await startTimer(input);
      results.push(result);
    }

    // Verify all entries were created with correct categories
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.category).toEqual(categories[index]);
      expect(result.name).toEqual(`Task for ${categories[index]}`);
      expect(result.start_time).toBeInstanceOf(Date);
      expect(result.end_time).toBeNull();
    });
  });

  it('should set start_time close to current time', async () => {
    const beforeStart = new Date();
    const result = await startTimer(testInput);
    const afterStart = new Date();

    // Verify start_time is within reasonable range (should be very close to current time)
    expect(result.start_time.getTime()).toBeGreaterThanOrEqual(beforeStart.getTime());
    expect(result.start_time.getTime()).toBeLessThanOrEqual(afterStart.getTime());
  });

  it('should handle zero line items', async () => {
    const inputWithZeroItems: StartTimerInput = {
      name: 'Task with zero items',
      category: 'Koordinasi & kegiatan pendukung lainnya',
      ticket_activity_number: 'COORD-001',
      number_of_line_items: 0
    };

    const result = await startTimer(inputWithZeroItems);

    expect(result.number_of_line_items).toEqual(0);
    expect(result.name).toEqual('Task with zero items');
    expect(result.category).toEqual('Koordinasi & kegiatan pendukung lainnya');
  });
});