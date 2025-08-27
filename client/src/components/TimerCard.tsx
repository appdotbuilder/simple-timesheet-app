import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Timer } from 'lucide-react';
import type { TimesheetEntry, StartTimerInput, Category } from '../../../server/src/schema';

// Category options for the dropdown
const CATEGORIES: Category[] = [
  'Ticket',
  'Koordinasi & kegiatan pendukung lainnya', 
  'Meeting',
  'Adhoc/project',
  'Development & Testing',
  'Other'
];

interface TimerCardProps {
  activeTimer: TimesheetEntry | null;
  formData: StartTimerInput;
  setFormData: React.Dispatch<React.SetStateAction<StartTimerInput>>;
  onStartTimer: () => Promise<void>;
  onStopTimer: () => Promise<void>;
  isLoading: boolean;
  currentDuration: string;
}

export function TimerCard({
  activeTimer,
  formData,
  setFormData,
  onStartTimer,
  onStopTimer,
  isLoading,
  currentDuration
}: TimerCardProps) {
  return (
    <Card className={activeTimer ? 'timer-card border-green-300' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          {activeTimer ? 'Active Timer' : 'New Timesheet Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTimer ? (
          // Active timer display
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <div className="text-sm text-green-700 mb-2 font-medium">⏱️ Timer Running</div>
              <div className="text-4xl font-mono font-bold text-green-800 mb-3 timer-pulse">
                {currentDuration}
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div><strong>👤 {activeTimer.name}</strong></div>
                <div>📋 {activeTimer.category}</div>
                {activeTimer.ticket_activity_number && (
                  <div>🎫 Ticket: {activeTimer.ticket_activity_number}</div>
                )}
                <div>📊 Line Items: {activeTimer.number_of_line_items}</div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button 
                onClick={onStopTimer} 
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg"
                size="lg"
              >
                <Square className="h-5 w-5 mr-2" />
                {isLoading ? 'Stopping...' : 'Stop Timer'}
              </Button>
            </div>
          </div>
        ) : (
          // Form for new entry
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                👤 Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                readOnly
                className="bg-gray-50 font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category" className="flex items-center gap-1">
                📋 Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: Category) => 
                  setFormData((prev: StartTimerInput) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="custom-focus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ticket" className="flex items-center gap-1">
                🎫 Ticket/Activity Number
              </Label>
              <Input
                id="ticket"
                placeholder="Optional"
                value={formData.ticket_activity_number || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: StartTimerInput) => ({
                    ...prev,
                    ticket_activity_number: e.target.value || null
                  }))
                }
                className="custom-focus"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lineItems" className="flex items-center gap-1">
                📊 Number of Line Items
              </Label>
              <Input
                id="lineItems"
                type="number"
                min="0"
                value={formData.number_of_line_items}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: StartTimerInput) => ({
                    ...prev,
                    number_of_line_items: parseInt(e.target.value) || 0
                  }))
                }
                className="custom-focus"
              />
            </div>
            
            <div className="md:col-span-2 flex justify-center pt-4">
              <Button 
                onClick={onStartTimer}
                disabled={isLoading || !formData.name.trim()}
                className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                {isLoading ? 'Starting...' : 'Start Timer'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}