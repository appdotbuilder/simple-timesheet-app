import { z } from 'zod';

// Category enum for timesheet entries
export const categoryEnum = z.enum([
  'Ticket',
  'Koordinasi & kegiatan pendukung lainnya',
  'Meeting',
  'Adhoc/project',
  'Development & Testing',
  'Other'
]);

export type Category = z.infer<typeof categoryEnum>;

// Timesheet entry schema
export const timesheetEntrySchema = z.object({
  id: z.number(),
  name: z.string(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  category: categoryEnum,
  ticket_activity_number: z.string().nullable(),
  number_of_line_items: z.number().int().nonnegative(),
  duration_seconds: z.number().int().nonnegative().nullable(), // Duration in seconds, calculated when timer stops
  created_at: z.coerce.date()
});

export type TimesheetEntry = z.infer<typeof timesheetEntrySchema>;

// Input schema for creating timesheet entries
export const createTimesheetEntryInputSchema = z.object({
  name: z.string(),
  category: categoryEnum,
  ticket_activity_number: z.string().nullable(),
  number_of_line_items: z.number().int().nonnegative()
});

export type CreateTimesheetEntryInput = z.infer<typeof createTimesheetEntryInputSchema>;

// Input schema for starting a timer
export const startTimerInputSchema = z.object({
  name: z.string(),
  category: categoryEnum,
  ticket_activity_number: z.string().nullable(),
  number_of_line_items: z.number().int().nonnegative()
});

export type StartTimerInput = z.infer<typeof startTimerInputSchema>;

// Input schema for stopping a timer
export const stopTimerInputSchema = z.object({
  id: z.number()
});

export type StopTimerInput = z.infer<typeof stopTimerInputSchema>;

// Input schema for updating timesheet entries
export const updateTimesheetEntryInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  category: categoryEnum.optional(),
  ticket_activity_number: z.string().nullable().optional(),
  number_of_line_items: z.number().int().nonnegative().optional()
});

export type UpdateTimesheetEntryInput = z.infer<typeof updateTimesheetEntryInputSchema>;

// Input schema for deleting timesheet entries
export const deleteTimesheetEntryInputSchema = z.object({
  id: z.number()
});

export type DeleteTimesheetEntryInput = z.infer<typeof deleteTimesheetEntryInputSchema>;

// Input schema for searching timesheet entries
export const searchTimesheetEntriesInputSchema = z.object({
  search_term: z.string().optional(), // Search by name or ticket/activity number
  category: categoryEnum.optional() // Filter by category
});

export type SearchTimesheetEntriesInput = z.infer<typeof searchTimesheetEntriesInputSchema>;

// Response schema for CSV export
export const exportTimesheetDataResponseSchema = z.object({
  csv_content: z.string(),
  filename: z.string()
});

export type ExportTimesheetDataResponse = z.infer<typeof exportTimesheetDataResponseSchema>;