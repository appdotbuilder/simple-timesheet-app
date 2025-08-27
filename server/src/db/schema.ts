import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// Enum for timesheet categories
export const categoryEnum = pgEnum('category', [
  'Ticket',
  'Koordinasi & kegiatan pendukung lainnya',
  'Meeting',
  'Adhoc/project',
  'Development & Testing',
  'Other'
]);

// Timesheet entries table
export const timesheetEntriesTable = pgTable('timesheet_entries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'), // Nullable - null while timer is running
  category: categoryEnum('category').notNull(),
  ticket_activity_number: text('ticket_activity_number'), // Nullable
  number_of_line_items: integer('number_of_line_items').notNull(),
  duration_seconds: integer('duration_seconds'), // Nullable - calculated when timer stops
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schema
export type TimesheetEntry = typeof timesheetEntriesTable.$inferSelect; // For SELECT operations
export type NewTimesheetEntry = typeof timesheetEntriesTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { timesheetEntries: timesheetEntriesTable };