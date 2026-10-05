import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export interface FilterState {
  category: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  search: string;
}

interface MarketFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  onClear: () => void;
}

export function MarketFilters({ filters, setFilters, onClear }: MarketFiltersProps) {
  const categories = ['Ders Kitabı & Not', 'Elektronik', 'Yurt & Ev Eşyası', 'Giyim & Aksesuar', 'Kırtasiye & Hobi', 'Diğer'];
  const conditions = ['Sıfır', 'Çok İyi / Yeni Gibi', 'Kullanılmış / İyi'];

  const hasActiveFilters = filters.category || filters.condition || filters.minPrice || filters.maxPrice || filters.search;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
      <div className="font-semibold text-lg border-b pb-2">Filtrele</div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Arama</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="İlan ara..." 
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Kategori</label>
        <Select 
          value={filters.category} 
          onValueChange={(val) => setFilters({ ...filters, category: val === 'all' || !val ? '' : val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Durum</label>
        <Select 
          value={filters.condition} 
          onValueChange={(val) => setFilters({ ...filters, condition: val === 'all' || !val ? '' : val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            {conditions.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Fiyat Aralığı (TL)</label>
        <div className="flex items-center gap-2">
          <Input 
            type="number" 
            placeholder="Min" 
            value={filters.minPrice}
            onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
            className="w-full"
          />
          <span>-</span>
          <Input 
            type="number" 
            placeholder="Max" 
            value={filters.maxPrice}
            onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            className="w-full"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full mt-2" onClick={onClear}>
          <X className="w-4 h-4 mr-2" />
          Filtreleri Temizle
        </Button>
      )}
    </div>
  );
}
