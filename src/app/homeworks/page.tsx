"use client";

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download as DownloadIcon, UploadCloud, BookOpen, ThumbsUp, Star, ShieldCheck, Eye, X } from 'lucide-react';

function HomeworksContent() {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [searchCode, setSearchCode] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterExamType, setFilterExamType] = useState('All');
  
  // Upload Modal State
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_code: '',
    department: '',
    university: '',
    faculty: '',
    exam_type: 'Vize'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ url: string, id: string, name: string } | null>(null);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', user.id).single();
      if (profile && profile.platform_role === 'admin') setIsAdmin(true);
    }

    let query = supabase.from('homeworks').select(`
      *,
      homework_ratings ( user_id, rating, is_helpful )
    `).order('created_at', { ascending: false });
    
    if (filterExamType && filterExamType !== 'All') {
      const typeVal = filterExamType.trim();
      const lower = typeVal.toLowerCase();
      if (typeVal === 'Çözüm' || lower === 'çözüm' || lower === 'cozum' || lower === 'solution') {
        // Multi-column and case-insensitive matching for 'Çözüm' / 'cozum' / 'solution'
        query = query.or('exam_type.ilike.%Çözüm%,type.ilike.%Çözüm%,exam_type.ilike.%çözüm%,type.ilike.%çözüm%,exam_type.ilike.%cozum%,type.ilike.%cozum%,exam_type.ilike.%solution%,type.ilike.%solution%');
      } else if (typeVal === 'Ödev' || typeVal.startsWith('Ödev')) {
        query = query.or('exam_type.ilike.%Ödev%,type.ilike.%Ödev%,exam_type.ilike.%ödev%,type.ilike.%ödev%,exam_type.ilike.%odev%,type.ilike.%odev%');
      } else if (typeVal === 'Ders Notu') {
        query = query.or('exam_type.ilike.%Ders Notu%,type.ilike.%Ders Notu%,exam_type.ilike.%ders notu%,type.ilike.%ders notu%');
      } else {
        query = query.or(`exam_type.ilike.%${typeVal}%,type.ilike.%${typeVal}%`);
      }
    }
    if (searchCode) query = query.ilike('course_code', `%${searchCode.trim()}%`);
    if (filterUniversity) query = query.ilike('university', `%${filterUniversity.trim()}%`);
    if (filterFaculty) query = query.ilike('faculty', `%${filterFaculty.trim()}%`);

    const { data: hwData, error: hwError } = await query;

    if (hwData && hwData.length > 0) {
      const uploaderIds = Array.from(new Set(hwData.map(h => h.uploader_id)));
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', uploaderIds);
      
      const enrichedData = hwData.map(hw => {
        const ratings = hw.homework_ratings || [];
        const totalRating = ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
        const ratingCount = ratings.filter((r: any) => r.rating > 0).length;
        const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '0.0';
        const helpfulCount = ratings.filter((r: any) => r.is_helpful).length;
        const userRating = user ? ratings.find((r: any) => r.user_id === user.id) : null;
        const normalizedCategory = (hw.exam_type || hw.type || 'Diğer').trim();

        return {
          ...hw,
          category: normalizedCategory,
          exam_type: normalizedCategory,
          type: normalizedCategory,
          uploader: profiles?.find(p => p.id === hw.uploader_id),
          avgRating,
          ratingCount,
          helpfulCount,
          userRating
        };
      });
      setHomeworks(enrichedData);
    } else {
      setHomeworks([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterExamType, searchCode, filterUniversity, filterFaculty]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Kaynak yüklemek için giriş yapmalısınız.');
    if (!selectedFile) return toast.error('Lütfen bir dosya seçin.');
    if (!formData.title || !formData.course_code) return toast.error('Başlık ve ders kodu zorunludur.');

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('homework_files')
        .upload(filePath, selectedFile);

      if (uploadError) throw new Error(`Dosya yüklenemedi: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('homework_files')
        .getPublicUrl(filePath);

      const categoryValue = (formData.exam_type || 'Vize').trim();
      const newHomework = {
        uploader_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        course_code: formData.course_code.toUpperCase().trim(),
        department: formData.department.trim(),
        university: formData.university.trim(),
        faculty: formData.faculty.trim(),
        exam_type: categoryValue,
        type: categoryValue, // Maintain backwards compatibility with legacy schema
        file_url: publicUrl
      };

      const { error: dbError } = await supabase.from('homeworks').insert(newHomework);
      if (dbError) throw dbError;

      toast.success('Kaynak başarıyla yüklendi!');
      setOpen(false);
      setFormData({ title: '', description: '', course_code: '', department: '', university: '', faculty: '', exam_type: 'Vize' });
      setSelectedFile(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Yükleme sırasında bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (hw: any) => {
    setPreviewFile({ url: hw.file_url, id: hw.id, name: hw.title });
    // Increment view count via RPC
    await supabase.rpc('increment_homework_views', { target_id: hw.id });
    
    // Optimistic Update
    setHomeworks(prev => prev.map(h => h.id === hw.id ? { ...h, view_count: (h.view_count || 0) + 1 } : h));
  };

  const handleDownload = async (hw: any, e: React.MouseEvent) => {
    // Let the default anchor click happen, but also track it
    // Wait slightly to not block the navigation
    setTimeout(async () => {
      await supabase.rpc('increment_homework_downloads', { target_id: hw.id });
      // Optimistic Update
      setHomeworks(prev => prev.map(h => h.id === hw.id ? { ...h, download_count: (h.download_count || 0) + 1 } : h));
    }, 100);
  };

  const handleRate = async (hwId: string, rating: number, isHelpful: boolean, existingRating: any) => {
    if (!user) return toast.error('Değerlendirme yapmak için giriş yapmalısınız.');

    try {
      if (existingRating) {
        await supabase.from('homework_ratings').update({
          rating: rating || existingRating.rating,
          is_helpful: isHelpful !== null ? isHelpful : existingRating.is_helpful
        }).eq('id', existingRating.id);
      } else {
        await supabase.from('homework_ratings').insert({
          homework_id: hwId,
          user_id: user.id,
          rating: rating || null,
          is_helpful: isHelpful || false
        });
      }
      toast.success('Değerlendirmeniz kaydedildi.');
      loadData();
    } catch (error) {
      toast.error('Değerlendirme kaydedilemedi.');
    }
  };

  const toggleVerify = async (hwId: string, currentStatus: boolean) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('homeworks').update({ is_verified: !currentStatus }).eq('id', hwId);
    if (!error) {
      toast.success('Kaynak doğrulama durumu güncellendi.');
      loadData();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kaynak Kütüphanesi</h1>
          <p className="text-muted-foreground mt-1">Ders notları, çıkmış sorular ve proje örneklerini keşfedin.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <UploadCloud className="w-4 h-4 mr-2" />
                Yeni Kaynak Yükle
              </Button>
            }
          />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Kaynak Yükle</DialogTitle>
              <DialogDescription>Ders materyallerini toplulukla paylaşın.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dosya</label>
                <Input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg" required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Başlık</label>
                  <Input placeholder="Örn: Vize Hazırlık Notları" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ders Kodu</label>
                  <Input placeholder="Örn: CENG101" value={formData.course_code} onChange={e => setFormData({...formData, course_code: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sınav Türü / Kategori</label>
                  <Select value={formData.exam_type} onValueChange={v => setFormData({...formData, exam_type: v || 'Vize'})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ders Notu">Ders Notu</SelectItem>
                      <SelectItem value="Vize">Vize</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                      <SelectItem value="Büt">Büt</SelectItem>
                      <SelectItem value="Ödev">Ödev / Proje</SelectItem>
                      <SelectItem value="Çözüm">Çözüm</SelectItem>
                      <SelectItem value="Diğer">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bölüm (Opsiyonel)</label>
                  <Input placeholder="Örn: Bilgisayar Mühendisliği" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Üniversite (Opsiyonel)</label>
                  <Input placeholder="Örn: İTÜ" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fakülte (Opsiyonel)</label>
                  <Input placeholder="Örn: Bilgisayar ve Bilişim Fakültesi" value={formData.faculty} onChange={e => setFormData({...formData, faculty: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Açıklama (Opsiyonel)</label>
                <Input placeholder="Kısa bir açıklama..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" className="mr-2" onClick={() => setOpen(false)}>İptal</Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Yükleniyor...' : 'Yükle ve Paylaş'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Advanced Filters */}
      <div className="bg-card border rounded-lg p-4 mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Gelişmiş Filtreleme</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input 
            placeholder="Üniversite Ara..." 
            value={filterUniversity}
            onChange={(e) => setFilterUniversity(e.target.value)}
          />
          <Input 
            placeholder="Fakülte Ara..." 
            value={filterFaculty}
            onChange={(e) => setFilterFaculty(e.target.value)}
          />
          <Input 
            placeholder="Ders Kodu (Örn: MATH101)" 
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <Select onValueChange={(val) => setFilterExamType(val || "")} value={filterExamType}>
            <SelectTrigger>
              <SelectValue placeholder="Sınav Türü / Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Tüm Türler</SelectItem>
              <SelectItem value="Çözüm">Çözüm</SelectItem>
              <SelectItem value="Ders Notu">Ders Notu</SelectItem>
              <SelectItem value="Vize">Vize</SelectItem>
              <SelectItem value="Final">Final</SelectItem>
              <SelectItem value="Büt">Büt</SelectItem>
              <SelectItem value="Ödev">Ödev / Proje</SelectItem>
              <SelectItem value="Diğer">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kategori Filtre Butonları / Sekmeleri */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { label: 'Tüm Kaynaklar', value: 'All' },
          { label: 'Çözüm', value: 'Çözüm' },
          { label: 'Ders Notu', value: 'Ders Notu' },
          { label: 'Vize', value: 'Vize' },
          { label: 'Final', value: 'Final' },
          { label: 'Büt', value: 'Büt' },
          { label: 'Ödev / Proje', value: 'Ödev' },
          { label: 'Diğer', value: 'Diğer' },
        ].map(cat => {
          const isActive = filterExamType === cat.value || (cat.value === 'All' && (!filterExamType || filterExamType === 'All'));
          return (
            <Button
              key={cat.value}
              type="button"
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full text-xs h-8 px-3.5 transition-all cursor-pointer",
                isActive ? "shadow-xs font-semibold" : "bg-card hover:bg-muted text-muted-foreground"
              )}
              onClick={() => setFilterExamType(cat.value)}
            >
              {cat.label}
            </Button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : homeworks.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Bu kriterlerde kaynak bulunamadı.</h3>
          <p className="text-sm text-muted-foreground mt-1">İlk kaynağı yükleyen siz olun!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {homeworks.map(hw => (
            <Card key={hw.id} className="flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
              <CardHeader className="pt-4 px-5 pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/5 font-semibold text-xs px-2.5 py-0.5">
                    {hw.course_code}
                  </Badge>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5">
                      {hw.exam_type || hw.type}
                    </Badge>
                    {hw.is_verified && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-2 py-0.5 flex items-center gap-1 text-xs font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Doğrulanmış
                      </Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold leading-normal line-clamp-1" title={hw.title}>
                  {hw.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px] mt-1 text-sm leading-relaxed">
                  {hw.description || 'Açıklama yok'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 px-5 pb-3 text-sm text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-xs uppercase tracking-wider">Yükleyen:</span>
                  <span className="truncate">{hw.uploader?.name || 'Anonim'}</span>
                </div>
                {(hw.university || hw.department) && (
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs">
                      {[hw.university, hw.faculty, hw.department].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                )}

                {/* Metrics */}
                <div className="flex gap-4 pt-2 border-t mt-3">
                  <div className="flex items-center gap-1 text-xs" title="Görüntülenme">
                    <Eye className="w-3 h-3" /> {hw.view_count || 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs" title="İndirme">
                    <DownloadIcon className="w-3 h-3" /> {hw.download_count || 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium" title="Ortalama Puan">
                    <Star className="w-3 h-3 fill-current" /> {hw.avgRating} ({hw.ratingCount})
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 font-medium" title="Faydalı Bulunan">
                    <ThumbsUp className="w-3 h-3" /> {hw.helpfulCount}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="px-5 pt-3 pb-4 border-t flex flex-col gap-3">
                <div className="flex w-full justify-between items-center">
                  <Button variant="outline" size="sm" className="flex-1 mr-2" onClick={() => handlePreview(hw)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Önizle
                  </Button>
                  <Button render={<a href={hw.file_url} target="_blank" rel="noopener noreferrer" />} size="sm" variant="default" className="flex-1" onClick={(e) => handleDownload(hw, e as any)}>
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    İndir
                  </Button>
                </div>
                
                {/* Rating & Actions Bar */}
                <div className="flex w-full justify-between items-center bg-muted/30 p-2 rounded-md">
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-muted-foreground mr-1">Puanla:</span>
                    {[1,2,3,4,5].map(star => (
                      <button 
                        key={star} 
                        onClick={() => handleRate(hw.id, star, hw.userRating?.is_helpful, hw.userRating)}
                        className={`hover:text-yellow-500 transition-colors ${hw.userRating?.rating >= star ? 'text-yellow-500' : 'text-muted-foreground/40'}`}
                      >
                        <Star className={`w-4 h-4 ${hw.userRating?.rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-7 px-2 text-xs ${hw.userRating?.is_helpful ? 'text-green-600 bg-green-50' : 'text-muted-foreground'}`}
                    onClick={() => handleRate(hw.id, hw.userRating?.rating, !hw.userRating?.is_helpful, hw.userRating)}
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Faydalı
                  </Button>
                </div>
                
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-7 text-xs" 
                    onClick={() => toggleVerify(hw.id, hw.is_verified)}
                  >
                    {hw.is_verified ? 'Doğrulamayı Kaldır' : 'Doğrula (Admin)'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* In-App Viewer Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b bg-muted/10">
            <h3 className="font-semibold">{previewFile?.name}</h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewFile(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 w-full h-full bg-secondary/20 relative">
            {previewFile && (
              <object 
                data={previewFile.url} 
                className="w-full h-full border-none"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <div className="bg-background p-6 rounded-lg shadow-sm border max-w-sm">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">Önizleme Desteklenmiyor</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tarayıcınız bu dosya türünün doğrudan görüntülenmesini desteklemiyor olabilir. (Örn: Word veya Zip dosyası)
                    </p>
                    <Button render={<a href={previewFile.url} target="_blank" rel="noopener noreferrer" />} className="w-full">
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Dosyayı İndir
                    </Button>
                  </div>
                </div>
              </object>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomeworksPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <HomeworksContent />
    </Suspense>
  );
}
