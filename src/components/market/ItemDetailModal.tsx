'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarketItem } from './MarketItemCard';
import { MapPin, MessageCircle, User, ChevronLeft, ChevronRight, Trash2, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

interface ItemDetailModalProps {
  item: MarketItem | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onItemUpdated: () => void;
}

export function ItemDetailModal({ item, isOpen, onClose, currentUserId, onItemUpdated }: ItemDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();

  if (!item) return null;

  const isOwner = currentUserId === item.user_id;

  const nextImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % item.images.length);
    }
  };

  const prevImage = () => {
    if (item.images && item.images.length > 0) {
      setCurrentImageIndex((prev) => (prev === 0 ? item.images.length - 1 : prev - 1));
    }
  };

  const handleMarkAsSold = async () => {
    if (!confirm('Bu ürünü satıldı olarak işaretlemek istediğinize emin misiniz?')) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('market_items')
        .update({ status: 'sold' })
        .eq('id', item.id);
        
      if (error) throw error;
      toast.success('Ürün satıldı olarak işaretlendi!');
      onItemUpdated();
      onClose();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bu ilanı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('market_items')
        .delete()
        .eq('id', item.id);
        
      if (error) throw error;
      toast.success('İlan başarıyla silindi.');
      onItemUpdated();
      onClose();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
  };

  const whatsappUrl = item.contact_phone 
    ? `https://wa.me/${item.contact_phone.replace(/[^0-9]/g, '')}?text=Merhaba, "${item.title}" ilanınızla ilgileniyorum.`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col md:flex-row">
        
        {/* Left Side: Images */}
        <div className="w-full md:w-1/2 bg-muted relative h-64 md:h-auto min-h-[300px]">
          {item.images && item.images.length > 0 ? (
            <>
              <Image
                src={item.images[currentImageIndex]}
                alt={item.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {item.images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {item.images.map((_, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <span className="mb-2">Görsel Yok</span>
            </div>
          )}
          
          {item.status === 'sold' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
               <span className="bg-red-600 text-white font-bold py-3 px-8 rounded-md transform -rotate-12 text-2xl uppercase tracking-wider shadow-lg">
                 Satıldı
               </span>
             </div>
          )}
        </div>

        {/* Right Side: Details */}
        <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
          <DialogHeader className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline">{item.category}</Badge>
              <Badge variant="secondary">{item.condition}</Badge>
            </div>
            <DialogTitle className="text-2xl font-bold leading-tight">{item.title}</DialogTitle>
            <div className="text-3xl font-bold text-primary mt-2">{formatPrice(item.price)}</div>
          </DialogHeader>

          <div className="text-sm text-muted-foreground flex items-center gap-2 mb-6">
            <MapPin className="w-4 h-4" /> {item.location}
            <span className="mx-2">•</span>
            <span>{new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
          </div>

          <div className="flex-grow">
            <h4 className="font-semibold mb-2">Açıklama</h4>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {item.description || "Açıklama girilmemiş."}
            </p>
          </div>

          {/* Seller Info */}
          <div className="mt-8 border-t pt-6">
            <h4 className="font-semibold mb-4">Satıcı Bilgileri</h4>
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-12 w-12 border">
                <AvatarImage src={item.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${item.profiles?.full_name || 'User'}`} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{item.profiles?.full_name || 'Bilinmeyen Kullanıcı'}</div>
                {item.profiles?.username && <div className="text-sm text-muted-foreground">@{item.profiles.username}</div>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isOwner ? (
                <div className="flex gap-2">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleMarkAsSold}
                    disabled={isUpdating || item.status === 'sold'}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {item.status === 'sold' ? 'Zaten Satıldı' : 'Satıldı Olarak İşaretle'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isUpdating}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {whatsappUrl && (
                    <Button className="w-full bg-[#25D366] hover:bg-[#20b958] text-white" render={<a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />}>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp'tan Ulaş
                    </Button>
                  )}
                  <Button variant={whatsappUrl ? "outline" : "default"} className="w-full" render={<Link href={`/profile/${item.user_id}`} />}>
                      <User className="w-4 h-4 mr-2" />
                      Satıcı Profilini Gör
                  </Button>
                </>
              )}
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
