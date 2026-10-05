'use client';

import React, { useState, useEffect } from 'react';
import { MarketFilters, FilterState } from './MarketFilters';
import { MarketItemCard, MarketItem } from './MarketItemCard';
import { CreateAdModal } from './CreateAdModal';
import { ItemDetailModal } from './ItemDetailModal';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface MarketClientProps {
  initialItems: MarketItem[];
  currentUserId?: string;
}

export function MarketClient({ initialItems, currentUserId }: MarketClientProps) {
  const [items, setItems] = useState<MarketItem[]>(initialItems);
  const [filteredItems, setFilteredItems] = useState<MarketItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const [filters, setFilters] = useState<FilterState>({
    category: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    search: ''
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('market_items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error in MarketClient.tsx:', error);
    }
    
    console.log('Fetched items in MarketClient.tsx:', data);

    if (!error && data) {
      setItems(data as MarketItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    let result = items;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(q) || 
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    if (filters.category) {
      result = result.filter(i => i.category === filters.category);
    }
    if (filters.condition) {
      result = result.filter(i => i.condition === filters.condition);
    }
    if (filters.minPrice) {
      result = result.filter(i => i.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter(i => i.price <= parseFloat(filters.maxPrice));
    }

    setFilteredItems(result);
  }, [filters, items]);

  const handleClearFilters = () => {
    setFilters({ category: '', condition: '', minPrice: '', maxPrice: '', search: '' });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Öğrenci Pazarı</h1>
          <p className="text-muted-foreground mt-1">Kampüs içi ikinci el eşya, ders kitabı ve ekipman alım satımı.</p>
        </div>
        
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          İlan Ver
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-20">
            <MarketFilters filters={filters} setFilters={setFilters} onClear={handleClearFilters} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
              <h3 className="text-lg font-medium">İlan bulunamadı</h3>
              <p className="text-muted-foreground mt-2 mb-4">Arama kriterlerinize uygun sonuç yok veya henüz ilan eklenmemiş.</p>
              <Button variant="outline" onClick={handleClearFilters}>Filtreleri Temizle</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <MarketItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setSelectedItem(item)} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {currentUserId && (
        <CreateAdModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchItems();
          }}
          userId={currentUserId}
        />
      )}

      <ItemDetailModal 
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        currentUserId={currentUserId}
        onItemUpdated={fetchItems}
      />
    </div>
  );
}
