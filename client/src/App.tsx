import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { TimerCard } from '@/components/TimerCard';
import { SearchFilterCard } from '@/components/SearchFilterCard';
import { TimesheetTable } from '@/components/TimesheetTable';
import type { TimesheetEntry, StartTimerInput, Category } from '../../server/src/schema';

// Default user name - in a real app, this would come from auth context
const DEFAULT_USER_NAME = "Current User";

function App() {
  // State management
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimesheetEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState<StartTimerInput>({
    name: DEFAULT_USER_NAME,
    category: 'Development & Testing',
    ticket_activity_number: null,
    number_of_line_items: 0
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  
  // Edit state
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [entriesResult, activeTimerResult] = await Promise.all([
        trpc.getTimesheetEntries.query(),
        trpc.getActiveTimer.query()
      ]);
      setEntries(entriesResult);
      setActiveTimer(activeTimerResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate current duration for active timer
  const getCurrentDuration = (): string => {
    if (!activeTimer || !activeTimer.start_time) return '00:00:00';
    const startTime = new Date(activeTimer.start_time);
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    return formatDuration(elapsed);
  };

  // Start timer
  const handleStartTimer = async () => {
    if (activeTimer) return; // Don't start if timer is already running
    
    setIsLoading(true);
    try {
      const newTimer = await trpc.startTimer.mutate(formData);
      setActiveTimer(newTimer);
      // Reset form for next entry
      setFormData({
        name: DEFAULT_USER_NAME,
        category: 'Development & Testing',
        ticket_activity_number: null,
        number_of_line_items: 0
      });
    } catch (error) {
      console.error('Failed to start timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop timer
  const handleStopTimer = async () => {
    if (!activeTimer) return;
    
    setIsLoading(true);
    try {
      const stoppedTimer = await trpc.stopTimer.mutate({ id: activeTimer.id });
      setActiveTimer(null);
      // Add the completed entry to the list
      setEntries((prev: TimesheetEntry[]) => [stoppedTimer, ...prev]);
    } catch (error) {
      console.error('Failed to stop timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Search entries
  const handleSearch = async () => {
    try {
      const results = await trpc.searchTimesheetEntries.query({
        search_term: searchTerm || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter
      });
      setEntries(results);
    } catch (error) {
      console.error('Failed to search entries:', error);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id: number) => {
    try {
      await trpc.deleteTimesheetEntry.mutate({ id });
      setEntries((prev: TimesheetEntry[]) => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  // Update entry
  const handleUpdateEntry = async (updatedEntry: TimesheetEntry) => {
    try {
      const result = await trpc.updateTimesheetEntry.mutate({
        id: updatedEntry.id,
        name: updatedEntry.name,
        category: updatedEntry.category,
        ticket_activity_number: updatedEntry.ticket_activity_number,
        number_of_line_items: updatedEntry.number_of_line_items
      });
      
      // Update the entry in the list
      setEntries((prev: TimesheetEntry[]) => 
        prev.map(entry => entry.id === result.id ? result : entry)
      );
      
      setEditingEntry(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  // Close edit dialog
  const handleCloseEdit = () => {
    setEditingEntry(null);
  };

  // Export data
  const handleExportData = async () => {
    try {
      const exportResult = await trpc.exportTimesheetData.query();
      // Create blob and download
      const blob = new Blob([exportResult.csv_content], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  // Reset search to show all entries
  const handleResetSearch = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              ⏰ Timesheet Application
            </h1>
            <p className="text-lg text-muted-foreground">
              Track your work activities and manage your time efficiently ⚡
            </p>
            <div className="mt-4 flex justify-center items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Active Timer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Completed Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>Saved Entries</span>
              </div>
            </div>
          </div>

          {/* Timer Input Form */}
          <TimerCard
            activeTimer={activeTimer}
            formData={formData}
            setFormData={setFormData}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            isLoading={isLoading}
            currentDuration={getCurrentDuration()}
          />

          {/* Search and Filter */}
          <SearchFilterCard
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            onSearch={handleSearch}
            onReset={handleResetSearch}
            onExport={handleExportData}
          />

          {/* Timesheet Entries Table */}
          <TimesheetTable
            entries={entries}
            onDeleteEntry={handleDeleteEntry}
            onEditEntry={setEditingEntry}
            onUpdateEntry={handleUpdateEntry}
            onCloseEdit={handleCloseEdit}
            editingEntry={editingEntry}
            formatDuration={formatDuration}
          />

          {/* Footer */}
          <div className="text-center py-8 text-sm text-gray-500">
            <p>💡 Tip: Use the search functionality to quickly find specific entries</p>
            <p>📊 Export your data anytime to analyze your productivity patterns</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;