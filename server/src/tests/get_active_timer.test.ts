import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { timesheetEntriesTable } from '../db/schema';
import { type CreateTimesheetEntryInput } from '../schema';
import { getActiveTimer } from '../handlers/get_active_timer';

// Test input for creating timesheet entries
const testInput: CreateTimesheetEntryInput = {
  name: 'Test Timer',
  category: 'Development & Testing',
  ticket_activity_number: 'TKT-123',
  number_of_line_items: 5
};

describe('getActiveTimer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no active timer exists', async () => {
    const result = await getActiveTimer();
    
    expect(result).toBeNull();
  });

  it('should return null when all timers are completed', async () => {
    // Create a completed timer entry (with end_time)
    const now = new Date();
    const endTime = new Date(now.getTime() + 3600000); // 1 hour later
    
    await db.insert(timesheetEntriesTable)
      .values({
        name: testInput.name,
        start_time: now,
        end_time: endTime,
        category: testInput.category,
        ticket_activity_number: testInput.ticket_activity_number,
        number_of_line_items: testInput.number_of_line_items,
        duration_seconds: 3600 // 1 hour in seconds
      })
      .execute();

    const result = await getActiveTimer();
    
    expect(result).toBeNull();
  });

  it('should return active timer when one exists', async () => {
    // Create an active timer entry (without end_time)
    const startTime = new Date();
    
    const inserted = await db.insert(timesheetEntriesTable)
      .values({
        name: testInput.name,
        start_time: startTime,
        end_time: null, // Active timer
        category: testInput.category,
        ticket_activity_number: testInput.ticket_activity_number,
        number_of_line_items: testInput.number_of_line_items,
        duration_seconds: null
      })
      .returning()
      .execute();

    const result = await getActiveTimer();
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(inserted[0].id);
    expect(result!.name).toEqual(testInput.name);
    expect(result!.category).toEqual(testInput.category);
    expect(result!.ticket_activity_number).toEqual(testInput.ticket_activity_number);
    expect(result!.number_of_line_items).toEqual(testInput.number_of_line_items);
    expect(result!.start_time).toBeInstanceOf(Date);
    expect(result!.end_time).toBeNull();
    expect(result!.duration_seconds).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return most recent active timer when multiple exist', async () => {
    const baseTime = new Date();
    
    // Create first active timer
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'First Timer',
        start_time: baseTime,
        end_time: null,
        category: 'Meeting',
        ticket_activity_number: 'TKT-001',
        number_of_line_items: 1,
        duration_seconds: null
      })
      .execute();

    // Wait a moment and create second active timer (more recent)
    const laterTime = new Date(baseTime.getTime() + 1000);
    const secondTimer = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Second Timer',
        start_time: laterTime,
        end_time: null,
        category: 'Development & Testing',
        ticket_activity_number: 'TKT-002',
        number_of_line_items: 3,
        duration_seconds: null,
        created_at: laterTime
      })
      .returning()
      .execute();

    const result = await getActiveTimer();
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(secondTimer[0].id);
    expect(result!.name).toEqual('Second Timer');
    expect(result!.ticket_activity_number).toEqual('TKT-002');
  });

  it('should ignore completed timers when active timer exists', async () => {
    const now = new Date();
    
    // Create a completed timer
    await db.insert(timesheetEntriesTable)
      .values({
        name: 'Completed Timer',
        start_time: now,
        end_time: new Date(now.getTime() + 1800000), // 30 minutes later
        category: 'Meeting',
        ticket_activity_number: 'TKT-DONE',
        number_of_line_items: 2,
        duration_seconds: 1800
      })
      .execute();

    // Create an active timer
    const activeTimer = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Active Timer',
        start_time: new Date(now.getTime() + 3600000), // 1 hour later
        end_time: null,
        category: testInput.category,
        ticket_activity_number: testInput.ticket_activity_number,
        number_of_line_items: testInput.number_of_line_items,
        duration_seconds: null
      })
      .returning()
      .execute();

    const result = await getActiveTimer();
    
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(activeTimer[0].id);
    expect(result!.name).toEqual('Active Timer');
    expect(result!.end_time).toBeNull();
  });

  it('should handle different category types correctly', async () => {
    // Create active timer with different category
    const inserted = await db.insert(timesheetEntriesTable)
      .values({
        name: 'Koordinasi Timer',
        start_time: new Date(),
        end_time: null,
        category: 'Koordinasi & kegiatan pendukung lainnya',
        ticket_activity_number: null, // Test null ticket number
        number_of_line_items: 0,
        duration_seconds: null
      })
      .returning()
      .execute();

    const result = await getActiveTimer();
    
    expect(result).not.toBeNull();
    expect(result!.category).toEqual('Koordinasi & kegiatan pendukung lainnya');
    expect(result!.ticket_activity_number).toBeNull();
    expect(result!.number_of_line_items).toEqual(0);
  });
});