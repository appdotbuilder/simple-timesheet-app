import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { TimesheetEntry, Category } from '../../../server/src/schema';

// Category options for the dropdown
const CATEGORIES: Category[] = [
  'Ticket',
  'Koordinasi & kegiatan pendukung lainnya', 
  'Meeting',
  'Adhoc/project',
  'Development & Testing',
  'Other'
];

interface EditEntryDialogProps {
  entry: TimesheetEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedEntry: TimesheetEntry) => Promise<void>;
  formatDuration: (seconds: number) => string;
}

export function EditEntryDialog({ 
  entry, 
  isOpen, 
  onClose, 
  onSave, 
  formatDuration 
}: EditEntryDialogProps) {
  // Initialize edit form data with current entry values
  const [editFormData, setEditFormData] = useState({
    name: entry?.name || '',
    category: entry?.category || 'Development & Testing' as Category,
    ticket_activity_number: entry?.ticket_activity_number || '',
    number_of_line_items: entry?.number_of_line_items || 0
  });

  const [isSaving, setIsSaving] = useState(false);

  // Update form data when entry changes
  if (entry && (
    editFormData.name !== entry.name ||
    editFormData.category !== entry.category ||
    editFormData.ticket_activity_number !== (entry.ticket_activity_number || '') ||
    editFormData.number_of_line_items !== entry.number_of_line_items
  )) {
    setEditFormData({
      name: entry.name,
      category: entry.category,
      ticket_activity_number: entry.ticket_activity_number || '',
      number_of_line_items: entry.number_of_line_items
    });
  }

  if (!entry) return null;

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedEntry: TimesheetEntry = {
        ...entry,
        name: editFormData.name,
        category: editFormData.category,
        ticket_activity_number: editFormData.ticket_activity_number || null,
        number_of_line_items: editFormData.number_of_line_items
      };
      
      await onSave(updatedEntry);
      onClose();
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset form data when closing
    setEditFormData({
      name: entry.name,
      category: entry.category,
      ticket_activity_number: entry.ticket_activity_number || '',
      number_of_line_items: entry.number_of_line_items
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✏️ Edit Timesheet Entry #{entry.id}
          </DialogTitle>
          <DialogDescription>
            Modify the details of this completed timesheet entry. Start time, end time, and duration cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Read-only information */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Entry Details (Read-only)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">🕐 Start Time:</span>
                <div className="font-mono">{formatDateTime(entry.start_time)}</div>
              </div>
              <div>
                <span className="text-gray-600">🕕 End Time:</span>
                <div className="font-mono">
                  {entry.end_time ? formatDateTime(entry.end_time) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-600">⏱️ Duration:</span>
                <div className="font-mono font-bold text-green-600">
                  {entry.duration_seconds !== null 
                    ? formatDuration(entry.duration_seconds) 
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700">✏️ Editable Fields</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="flex items-center gap-1">
                  👤 Name
                </Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="flex items-center gap-1">
                  📋 Category
                </Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(value: Category) => 
                    setEditFormData(prev => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
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
                <Label htmlFor="edit-ticket" className="flex items-center gap-1">
                  🎫 Ticket/Activity Number
                </Label>
                <Input
                  id="edit-ticket"
                  placeholder="Optional"
                  value={editFormData.ticket_activity_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData(prev => ({ 
                      ...prev, 
                      ticket_activity_number: e.target.value 
                    }))
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-line-items" className="flex items-center gap-1">
                  📊 Number of Line Items
                </Label>
                <Input
                  id="edit-line-items"
                  type="number"
                  min="0"
                  value={editFormData.number_of_line_items}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData(prev => ({ 
                      ...prev, 
                      number_of_line_items: parseInt(e.target.value) || 0 
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !editFormData.name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Saving...' : '💾 Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}