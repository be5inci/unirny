import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

export type MarketItem = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  status: 'active' | 'sold' | 'reserved';
  location: string;
  contact_phone: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

interface MarketItemCardProps {
  item: MarketItem;
  onClick?: () => void;
}

export function MarketItemCard({ item, onClick }: MarketItemCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Sıfır': return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Çok İyi / Yeni Gibi': return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300';
      case 'Kullanılmış / İyi': return 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300';
      default: return 'bg-secondary';
    }
  };

  const primaryImage = item.images && item.images.length > 0 ? item.images[0] : null;
  const imageCount = item.images ? item.images.length : 0;

  return (
    <Card 
      className={`overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow ${item.status !== 'active' ? 'opacity-70 grayscale-[30%]' : ''}`}
      onClick={onClick}
    >
      <div className="relative aspect-square bg-muted">
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
        
        {/* Status Badge overlays */}
        {item.status === 'sold' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <span className="bg-red-600 text-white font-bold py-2 px-6 rounded-md transform -rotate-12 text-lg uppercase tracking-wider shadow-lg">
              Satıldı
            </span>
          </div>
        )}
        {item.status === 'reserved' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <span className="bg-amber-500 text-white font-bold py-2 px-6 rounded-md transform -rotate-12 text-lg uppercase tracking-wider shadow-lg">
              Rezerve
            </span>
          </div>
        )}

        {/* Image count badge */}
        {imageCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm">
            <ImageIcon className="w-3 h-3" />
            <span>{imageCount}</span>
          </div>
        )}
        
        {/* Category Badge */}
        <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground hover:bg-background/90" variant="outline">
          {item.category}
        </Badge>
      </div>

      <CardHeader className="p-4 pb-0 flex-grow">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{item.title}</h3>
        </div>
        <div className="font-bold text-xl text-primary mt-2">
          {formatPrice(item.price)}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-3 flex-grow flex flex-col justify-end gap-2">
        <div className="flex flex-wrap gap-1">
          <Badge className={`text-xs ${getConditionColor(item.condition)}`} variant="secondary">
            {item.condition}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 text-sm text-muted-foreground flex justify-between items-center">
        <div className="flex items-center gap-1 max-w-[70%]">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.location}</span>
        </div>
        <div className="text-xs">
          {new Date(item.created_at).toLocaleDateString('tr-TR')}
        </div>
      </CardFooter>
    </Card>
  );
}
