import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Download, RotateCcw } from 'lucide-react';
import type { Category } from '../../../server/src/schema';

// Category options for the dropdown
const CATEGORIES: Category[] = [
  'Ticket',
  'Koordinasi & kegiatan pendukung lainnya', 
  'Meeting',
  'Adhoc/project',
  'Development & Testing',
  'Other'
];

interface SearchFilterCardProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: Category | 'all';
  setCategoryFilter: (category: Category | 'all') => void;
  onSearch: () => Promise<void>;
  onReset: () => void;
  onExport: () => Promise<void>;
}

export function SearchFilterCard({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  onSearch,
  onReset,
  onExport
}: SearchFilterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          🔍 Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="🔍 Search by name or ticket number..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onSearch()}
              className="custom-focus"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={categoryFilter}
              onValueChange={(value: Category | 'all') => setCategoryFilter(value)}
            >
              <SelectTrigger className="custom-focus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📋 All Categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onSearch} 
              variant="outline" 
              className="hover:bg-blue-50 hover:border-blue-300"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button 
              onClick={onReset} 
              variant="outline"
              className="hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button 
              onClick={onExport} 
              variant="outline"
              className="export-btn hover:bg-green-50 hover:border-green-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}