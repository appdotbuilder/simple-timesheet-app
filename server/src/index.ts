import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  startTimerInputSchema,
  stopTimerInputSchema,
  updateTimesheetEntryInputSchema,
  deleteTimesheetEntryInputSchema,
  searchTimesheetEntriesInputSchema
} from './schema';

// Import handlers
import { startTimer } from './handlers/start_timer';
import { stopTimer } from './handlers/stop_timer';
import { getTimesheetEntries } from './handlers/get_timesheet_entries';
import { searchTimesheetEntries } from './handlers/search_timesheet_entries';
import { updateTimesheetEntry } from './handlers/update_timesheet_entry';
import { deleteTimesheetEntry } from './handlers/delete_timesheet_entry';
import { exportTimesheetData } from './handlers/export_timesheet_data';
import { getActiveTimer } from './handlers/get_active_timer';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Timer management
  startTimer: publicProcedure
    .input(startTimerInputSchema)
    .mutation(({ input }) => startTimer(input)),

  stopTimer: publicProcedure
    .input(stopTimerInputSchema)
    .mutation(({ input }) => stopTimer(input)),

  getActiveTimer: publicProcedure
    .query(() => getActiveTimer()),

  // Timesheet entry management
  getTimesheetEntries: publicProcedure
    .query(() => getTimesheetEntries()),

  searchTimesheetEntries: publicProcedure
    .input(searchTimesheetEntriesInputSchema)
    .query(({ input }) => searchTimesheetEntries(input)),

  updateTimesheetEntry: publicProcedure
    .input(updateTimesheetEntryInputSchema)
    .mutation(({ input }) => updateTimesheetEntry(input)),

  deleteTimesheetEntry: publicProcedure
    .input(deleteTimesheetEntryInputSchema)
    .mutation(({ input }) => deleteTimesheetEntry(input)),

  // Export functionality
  exportTimesheetData: publicProcedure
    .query(() => exportTimesheetData()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();