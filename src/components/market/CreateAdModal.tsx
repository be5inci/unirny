'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function CreateAdModal({ isOpen, onClose, onSuccess, userId }: CreateAdModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const categories = ['Ders Kitabı & Not', 'Elektronik', 'Yurt & Ev Eşyası', 'Giyim & Aksesuar', 'Kırtasiye & Hobi', 'Diğer'];
  const conditions = ['Sıfır', 'Çok İyi / Yeni Gibi', 'Kullanılmış / İyi'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (files.length + selectedFiles.length > 5) {
        toast.error('En fazla 5 fotoğraf yükleyebilirsiniz.');
        return;
      }
      setFiles((prev) => [...prev, ...selectedFiles]);
      
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !category || !condition || !location) {
      toast.error('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      const uploadedImageUrls: string[] = [];
      
      // Upload images
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('market_images')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Resim yükleme hatası: ${uploadError.message}`);
          }
          
          if (data) {
            const { data: publicUrlData } = supabase.storage
              .from('market_images')
              .getPublicUrl(data.path);
            uploadedImageUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // Insert record
      const { error: insertError } = await supabase
        .from('market_items')
        .insert({
          user_id: userId,
          title,
          description,
          price: parseFloat(price),
          category,
          condition,
          location,
          contact_phone: contactPhone || null,
          images: uploadedImageUrls,
          status: 'active'
        });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      toast.success('İlanınız başarıyla eklendi!');
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Insert error:', error);
      toast.error(error.message || error.details || 'İlan eklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCategory('');
    setCondition('');
    setLocation('');
    setContactPhone('');
    setFiles([]);
    setPreviews([]);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni İlan Ver</DialogTitle>
          <DialogDescription>
            İkinci el eşyanızı, kitabınızı veya kullanmadığınız ekipmanınızı kampüsteki diğer öğrencilerle paylaşın.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fotoğraflar (Max 5)</label>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, index) => (
                <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <label className="w-20 h-20 rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Yükle</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">İlan Başlığı *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Calculus 1 Kitabı" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fiyat (TL) *</label>
              <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kategori *</label>
              <Select value={category} onValueChange={(val) => setCategory(val || '')} required>
                <SelectTrigger><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Durum *</label>
              <Select value={condition} onValueChange={(val) => setCondition(val || '')} required>
                <SelectTrigger><SelectValue placeholder="Kullanım Durumu" /></SelectTrigger>
                <SelectContent>
                  {conditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kampüs/Teslimat Yeri *</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Örn: Merkez Kampüs Kütüphane önü" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WhatsApp No (Opsiyonel)</label>
              <Input 
                value={contactPhone} 
                onChange={(e) => setContactPhone(e.target.value)} 
                placeholder="Örn: +905551234567" 
              />
              <p className="text-[10px] text-muted-foreground">Boş bırakırsanız sadece profil linkiniz görünür.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Açıklama</label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Ürün hakkında ek bilgiler, deformasyonlar vb." 
              rows={4} 
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              İlanı Yayınla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
