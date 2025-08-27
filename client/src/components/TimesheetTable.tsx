import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, Timer, Trash2, Edit } from 'lucide-react';
import { EditEntryDialog } from '@/components/EditEntryDialog';
import type { TimesheetEntry } from '../../../server/src/schema';

interface TimesheetTableProps {
  entries: TimesheetEntry[];
  onDeleteEntry: (id: number) => Promise<void>;
  onEditEntry: (entry: TimesheetEntry) => void;
  onUpdateEntry: (updatedEntry: TimesheetEntry) => Promise<void>;
  onCloseEdit: () => void;
  editingEntry: TimesheetEntry | null;
  formatDuration: (seconds: number) => string;
}

export function TimesheetTable({ 
  entries, 
  onDeleteEntry, 
  onEditEntry, 
  onUpdateEntry, 
  onCloseEdit,
  editingEntry, 
  formatDuration 
}: TimesheetTableProps) {
  // Format date for better readability
  const formatDateTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Get category emoji
  const getCategoryEmoji = (category: string): string => {
    const emojiMap: Record<string, string> = {
      'Ticket': '🎫',
      'Koordinasi & kegiatan pendukung lainnya': '🤝',
      'Meeting': '🏢',
      'Adhoc/project': '⚡',
      'Development & Testing': '💻',
      'Other': '📝'
    };
    return emojiMap[category] || '📋';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              📊 Timesheet Entries ({entries.length})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Timer className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">No timesheet entries found</h3>
            <p>Start your first timer to begin tracking your work! ⏱️</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar mobile-table-scroll">
            <Table className="mobile-table">
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">👤 Name</TableHead>
                  <TableHead className="font-semibold">🕐 Start Time</TableHead>
                  <TableHead className="font-semibold">🕕 End Time</TableHead>
                  <TableHead className="font-semibold">📋 Category</TableHead>
                  <TableHead className="font-semibold">🎫 Ticket/Activity</TableHead>
                  <TableHead className="font-semibold">📊 Line Items</TableHead>
                  <TableHead className="font-semibold">⏱️ Duration</TableHead>
                  <TableHead className="font-semibold">🔧 Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry: TimesheetEntry) => (
                  <TableRow key={entry.id} className="timesheet-row hover:bg-gray-50/70">
                    <TableCell className="font-mono text-sm font-medium">
                      #{entry.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(entry.start_time)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.end_time ? (
                        formatDateTime(entry.end_time)
                      ) : (
                        <Badge variant="secondary" className="status-badge-running">
                          🟢 Running
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryEmoji(entry.category)} {entry.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.ticket_activity_number || (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {entry.number_of_line_items}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {entry.duration_seconds !== null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          {formatDuration(entry.duration_seconds)}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="status-badge-active">
                          🔵 Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Edit button - only show for completed entries (not running timers) */}
                        {entry.end_time && entry.duration_seconds !== null && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => onEditEntry(entry)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit entry"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                🗑️ Delete Timesheet Entry
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this timesheet entry?
                                <div className="mt-2 p-3 bg-gray-50 rounded border text-sm">
                                  <strong>Entry #{entry.id}</strong><br />
                                  Name: {entry.name}<br />
                                  Category: {entry.category}<br />
                                  {entry.ticket_activity_number && (
                                    <>Ticket: {entry.ticket_activity_number}<br /></>
                                  )}
                                  Duration: {entry.duration_seconds !== null 
                                    ? formatDuration(entry.duration_seconds) 
                                    : 'Active timer'
                                  }
                                </div>
                                <br />
                                <strong>This action cannot be undone.</strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteEntry(entry.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                🗑️ Delete Entry
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Edit Entry Dialog */}
    <EditEntryDialog
      entry={editingEntry}
      isOpen={editingEntry !== null}
      onClose={onCloseEdit} 
      onSave={onUpdateEntry}
      formatDuration={formatDuration}
    />
  </>
  );
}