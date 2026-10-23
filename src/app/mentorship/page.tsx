"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Clock, CheckCircle, XCircle, Sparkles, UserCheck, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';

export default function MentorshipPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  
  // Requests State
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  // Mentor Application Modal
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [isSubmittingMentor, setIsSubmittingMentor] = useState(false);
  const [mentorFormData, setMentorFormData] = useState({
    major: '',
    skills: '',
    interests: '',
    city: ''
  });

  // Request Mentorship Modal (Araya talep adımı)
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    focus_area: 'Genel Mentörlük',
    note: ''
  });

  const supabase = createClient();
  const router = useRouter();

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    if (user) {
      // 1. Profil bilgisini çek
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setCurrentUserProfile(profile);
        setMentorFormData({
          major: profile.major || '',
          skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
          interests: Array.isArray(profile.interests) ? profile.interests.join(', ') : '',
          city: profile.city || ''
        });
      }

      // 2. Mentör için gelen talepler
      const { data: incoming } = await supabase
        .from('mentorships')
        .select('*, mentee:mentee_id(name, avatar, major, email)')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });
      setIncomingRequests(incoming || []);

      // 3. Danışan olarak gönderilen talepler
      const { data: sent } = await supabase
        .from('mentorships')
        .select('*, mentor:mentor_id(name, avatar, major, email)')
        .eq('mentee_id', user.id)
        .order('created_at', { ascending: false });
      setSentRequests(sent || []);

      // 4. Aktif seansı kontrol et
      const active = (incoming || []).concat(sent || []).find((s: any) => s.status === 'Active');
      if (active) {
        setActiveSessionId(active.id);
      } else {
        setActiveSessionId(null);
      }
    }

    // 5. Mentörleri getir
    let { data: mentorsData } = await supabase
      .from('profiles')
      .select('*')
      .ilike('purpose', '%mentor%');

    // Eğer hiç mentör bulunamazsa, sistemdeki diğer profilleri fallback olarak getir
    if (!mentorsData || mentorsData.length === 0) {
      const { data: fallbackData } = await supabase
        .from('profiles')
        .select('*');
        
      if (fallbackData) {
        mentorsData = user ? fallbackData.filter((p: any) => p.id !== user.id) : fallbackData;
      }
    }

    if (mentorsData) {
      setMentors(mentorsData);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  // Mentör Başvurusu Formu Gönderimi
  async function handleApplyMentor(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Mentör başvurusu yapmak için giriş yapmalısınız.');
      return;
    }

    if (!mentorFormData.major.trim()) {
      toast.error('Lütfen uzmanlık veya bölüm bilginizi girin.');
      return;
    }

    if (isSubmittingMentor) return;
    setIsSubmittingMentor(true);

    try {
      const skillsArray = mentorFormData.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const interestsArray = mentorFormData.interests
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const updatePayload: any = {
        purpose: 'Mentor',
        major: mentorFormData.major.trim(),
        skills: skillsArray,
        interests: interestsArray
      };

      if (mentorFormData.city.trim()) {
        updatePayload.city = mentorFormData.city.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', currentUser.id);

      if (error) {
        throw error;
      }

      toast.success('Mentörlük başvurunuz başarıyla kaydedildi! Artık mentör vitrininde listeleniyorsunuz.');
      setMentorModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Mentör başvuru hatası:', err);
      toast.error('Başvuru kaydedilemedi: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setIsSubmittingMentor(false);
    }
  }

  // Mentörlük Talebi Modalını Aç
  function openRequestModal(mentor: any) {
    if (!currentUser) {
      toast.error('Mentörlük talep etmek için giriş yapmalısınız.');
      return;
    }

    if (currentUser.id === mentor.id) {
      toast.error('Kendinize mentörlük talebi gönderemezsiniz.');
      return;
    }

    setSelectedMentor(mentor);
    setRequestFormData({
      focus_area: 'Genel Mentörlük & Kariyer Rehberliği',
      note: ''
    });
    setRequestModalOpen(true);
  }

  // Seans / Randevu Talebi Gönderimi (Pending durumu ile araya talep adımı)
  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !selectedMentor) return;

    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);

    try {
      // Doğrudan Active yapmak yerine 'Pending' (Onay Bekliyor) durumunda kaydediyoruz
      const { data: newSession, error } = await supabase
        .from('mentorships')
        .insert({
          mentee_id: currentUser.id,
          mentor_id: selectedMentor.id,
          focus_area: requestFormData.focus_area.trim() || 'Genel Mentörlük',
          status: 'Pending',
          current_score: 100
        })
        .select()
        .single();

      if (error || !newSession) {
        throw error || new Error('Kayıt oluşturulamadı.');
      }

      // Mentöre bildirim gönder
      await supabase.from('notifications').insert({
        user_id: selectedMentor.id,
        type: 'new_mentorship_request',
        message: `${currentUserProfile?.name || currentUser.email || 'Bir kullanıcı'} sizden mentörlük talebinde bulundu (${requestFormData.focus_area}).`,
        related_entity_id: newSession.id
      });

      toast.success('Mentörlük talebiniz mentöre iletildi! Mentör onayladığında seans bağlantısı aktif olacaktır.');
      setRequestModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Mentörlük talebi hatası:', err);
      toast.error('Talep oluşturulurken bir hata oluştu: ' + (err?.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  // Mentörün Talebi Onaylaması veya Reddetmesi
  async function handleRespondRequest(requestId: string, newStatus: 'Active' | 'Terminated', menteeId: string) {
    if (processingActionId) return;
    setProcessingActionId(requestId);

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Active') {
        updateData.start_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('mentorships')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(newStatus === 'Active' ? 'Mentörlük talebi onaylandı! Seans başlatıldı.' : 'Talep reddedildi.');

      // Danışana bildirim gönder
      await supabase.from('notifications').insert({
        user_id: menteeId,
        type: newStatus === 'Active' ? 'mentorship_accepted' : 'mentorship_rejected',
        message: newStatus === 'Active' 
          ? 'Mentörlük talebiniz mentörünüz tarafından onaylandı! Artık seansa katılabilirsiniz.' 
          : 'Mentörlük talebiniz sonlandırıldı.',
        related_entity_id: requestId
      });

      await loadData();
    } catch (err: any) {
      console.error('İşlem hatası:', err);
      toast.error('İşlem tamamlanamadı: ' + (err?.message || 'Hata oluştu'));
    } finally {
      setProcessingActionId(null);
    }
  }

  const isUserMentor = currentUserProfile?.purpose?.toLowerCase()?.includes('mentor');
  const pendingIncomingCount = incomingRequests.filter(r => r.status === 'Pending').length;
  const pendingSentCount = sentRequests.filter(r => r.status === 'Pending').length;
  const totalUserRequests = incomingRequests.length + sentRequests.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mentörlük Vitrini</h1>
          <p className="text-muted-foreground mt-1">Sektör profesyonellerinden kariyeriniz için birebir mentörlük alın veya mentör olarak topluluğa rehberlik edin.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {currentUser && (
            <Button 
              variant={isUserMentor ? "outline" : "default"} 
              onClick={() => setMentorModalOpen(true)}
              className="gap-2"
            >
              {isUserMentor ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Mentör Profilini Güncelle
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Mentör Ol / Başvur
                </>
              )}
            </Button>
          )}

          {activeSessionId && (
            <Button render={<Link href={`/mentorship/session/${activeSessionId}`} />} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <CheckCircle className="w-4 h-4" />
              Aktif Seansıma Git
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Mentörleri Keşfet & Taleplerim */}
      <Tabs defaultValue="mentors" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="mentors">Mentörleri Keşfet</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Taleplerim & Seanslarım
            {(pendingIncomingCount > 0 || pendingSentCount > 0) && (
              <span className="ml-2 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                {pendingIncomingCount + pendingSentCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Mentörler Listesi */}
        <TabsContent value="mentors">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Mentörler yükleniyor...</div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 border border-dashed rounded-lg">
              <p className="text-muted-foreground">Şu anda aktif mentör bulunmamaktadır.</p>
              <Button className="mt-4" onClick={() => setMentorModalOpen(true)}>İlk Mentör Siz Olun</Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentors.map((mentor) => {
                const isSelf = currentUser?.id === mentor.id;
                return (
                  <Card key={mentor.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="text-center">
                      <Avatar className="h-24 w-24 mx-auto mb-4 border-2 border-primary/20">
                        <AvatarImage src={mentor.avatar || mentor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name || 'M')}`} alt={mentor.name} />
                        <AvatarFallback>{mentor.name?.charAt(0) || 'M'}</AvatarFallback>
                      </Avatar>
                      <CardTitle className="text-xl flex items-center justify-center gap-1.5">
                        {mentor.name}
                        {mentor.purpose?.toLowerCase()?.includes('mentor') && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 inline-block" title="Doğrulanmış Mentör" />
                        )}
                      </CardTitle>
                      <CardDescription>{mentor.major || 'Uzman'} {mentor.city ? `• ${mentor.city}` : ''}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="flex-1 space-y-4">
                      {mentor.university && (
                        <p className="text-xs text-center text-muted-foreground">🎓 {mentor.university}</p>
                      )}
                      
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-center text-muted-foreground">Uzmanlık & İlgi Alanları:</p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {mentor.interests && mentor.interests.length > 0 ? (
                            mentor.interests.map((exp: string) => (
                              <Badge key={exp} variant="secondary" className="text-xs font-normal">{exp}</Badge>
                            ))
                          ) : mentor.skills && mentor.skills.length > 0 ? (
                            mentor.skills.map((skill: string) => (
                              <Badge key={skill} variant="outline" className="text-xs font-normal">{skill}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Genel Mentörlük</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="pt-2 border-t">
                      <Button 
                        className="w-full" 
                        variant={isSelf ? "ghost" : "default"}
                        disabled={isSelf}
                        onClick={() => openRequestModal(mentor)}
                      >
                        {isSelf ? 'Kendi Profiliniz' : 'Mentörlük Talep Et'}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Talepler & Seanslar Yönetimi */}
        <TabsContent value="requests" className="space-y-8">
          {!currentUser ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground mb-4">Taleplerinizi ve seanslarınızı görüntülemek için giriş yapmalısınız.</p>
              <Button render={<Link href="/login" />}>Giriş Yap</Button>
            </div>
          ) : totalUserRequests === 0 ? (
            <div className="text-center py-12 bg-muted/20 border border-dashed rounded-lg">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-base mb-1">Henüz bir seans veya talebiniz yok</h3>
              <p className="text-sm text-muted-foreground">Mentör vitrininden dilediğiniz mentöre randevu talebi gönderebilirsiniz.</p>
            </div>
          ) : (
            <>
              {/* Mentör Olarak Gelen Talepler */}
              {isUserMentor && incomingRequests.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      Gelen Mentörlük Talepleri
                      {pendingIncomingCount > 0 && (
                        <Badge className="bg-amber-500 text-white text-xs">{pendingIncomingCount} Bekleyen</Badge>
                      )}
                    </h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {incomingRequests.map((req) => {
                      const isPending = req.status === 'Pending';
                      const isActive = req.status === 'Active';
                      const isProcessing = processingActionId === req.id;

                      return (
                        <Card key={req.id} className="border flex flex-col justify-between">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <CardTitle className="text-base">{req.mentee?.name || 'Danışan'}</CardTitle>
                                <CardDescription className="text-xs">{req.mentee?.major || 'Öğrenci'}</CardDescription>
                              </div>
                              <Badge variant={isPending ? "secondary" : isActive ? "default" : "destructive"}>
                                {isPending ? 'Onay Bekliyor' : isActive ? 'Aktif Seans' : 'Sonlandı'}
                              </Badge>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="text-sm space-y-1 text-muted-foreground pb-4">
                            <p><strong className="text-foreground">Konu:</strong> {req.focus_area}</p>
                            <p className="text-xs">Tarih: {new Date(req.created_at).toLocaleDateString('tr-TR')}</p>
                          </CardContent>

                          <CardFooter className="pt-3 border-t flex justify-end gap-2">
                            {isPending ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  disabled={isProcessing}
                                  onClick={() => handleRespondRequest(req.id, 'Terminated', req.mentee_id)}
                                >
                                  Reddet
                                </Button>
                                <Button 
                                  size="sm" 
                                  disabled={isProcessing}
                                  onClick={() => handleRespondRequest(req.id, 'Active', req.mentee_id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                                >
                                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                  Talebi Onayla ve Başlat
                                </Button>
                              </>
                            ) : isActive ? (
                              <Button size="sm" render={<Link href={`/mentorship/session/${req.id}`} />} className="w-full gap-1.5">
                                Seansa Git <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Süreç tamamlandı.</span>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Danışan Olarak Gönderilen Talepler */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Danışan Olarak Gönderdiğim Talepler
                  {pendingSentCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{pendingSentCount} Onay Bekliyor</Badge>
                  )}
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {sentRequests.map((req) => {
                    const isPending = req.status === 'Pending';
                    const isActive = req.status === 'Active';

                    return (
                      <Card key={req.id} className="border flex flex-col justify-between">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <CardTitle className="text-base">Mentör: {req.mentor?.name || 'Uzman'}</CardTitle>
                              <CardDescription className="text-xs">{req.mentor?.major || 'Mentör'}</CardDescription>
                            </div>
                            <Badge 
                              variant={isPending ? "secondary" : isActive ? "default" : "destructive"}
                              className={isPending ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : isActive ? "bg-emerald-600 text-white" : ""}
                            >
                              {isPending ? 'Onay Bekliyor' : isActive ? 'Onaylandı / Aktif' : 'Reddedildi / Sonlandı'}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="text-sm space-y-2 text-muted-foreground pb-4">
                          <p><strong className="text-foreground">Konu:</strong> {req.focus_area}</p>
                          {isPending && (
                            <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>Mentör henüz onaylamadı. Onay verildiğinde seans bağlantısı aktif olacaktır.</span>
                            </div>
                          )}
                          <p className="text-xs">Talep Tarihi: {new Date(req.created_at).toLocaleDateString('tr-TR')}</p>
                        </CardContent>

                        <CardFooter className="pt-3 border-t">
                          {isActive ? (
                            <Button size="sm" render={<Link href={`/mentorship/session/${req.id}`} />} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                              Seansa Katıl <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button size="sm" disabled variant="outline" className="w-full">
                              {isPending ? 'Mentör Onayı Bekleniyor' : 'Seans Kapalı'}
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Mentör Başvuru / Profil Formu */}
      <Dialog open={mentorModalOpen} onOpenChange={(open) => { if (!isSubmittingMentor) setMentorModalOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {isUserMentor ? 'Mentör Profilini Güncelle' : 'Mentör Olarak Kaydol / Başvur'}
            </DialogTitle>
            <DialogDescription>
              Bilgilerinizi kaydederek topluluktaki öğrencilere kariyerlerinde rehberlik etmeye başlayın.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyMentor} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Uzmanlık Alanı / Meslek <span className="text-destructive">*</span></label>
              <Input 
                placeholder="Örn: Kıdemli Frontend Geliştirici" 
                value={mentorFormData.major} 
                onChange={(e) => setMentorFormData({ ...mentorFormData, major: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Yetenekler (Virgülle ayırın)</label>
              <Input 
                placeholder="Örn: React, Next.js, TypeScript, UI/UX" 
                value={mentorFormData.skills} 
                onChange={(e) => setMentorFormData({ ...mentorFormData, skills: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Danışmanlık / İlgi Alanları (Virgülle ayırın)</label>
              <Input 
                placeholder="Örn: Kariyer Planlama, Mülakat Koçluğu, Kod İnceleme" 
                value={mentorFormData.interests} 
                onChange={(e) => setMentorFormData({ ...mentorFormData, interests: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Şehir (Opsiyonel)</label>
              <Input 
                placeholder="Örn: İstanbul" 
                value={mentorFormData.city} 
                onChange={(e) => setMentorFormData({ ...mentorFormData, city: e.target.value })} 
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" disabled={isSubmittingMentor} onClick={() => setMentorModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmittingMentor}>
                {isSubmittingMentor && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmittingMentor ? 'Kaydediliyor...' : 'Mentör Olarak Kaydet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Mentörlük Talep Etme Formu (Araya Talep Adımı) */}
      <Dialog open={requestModalOpen} onOpenChange={(open) => { if (!isSubmittingRequest) setRequestModalOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Mentörlük Talebi Oluştur
            </DialogTitle>
            <DialogDescription>
              {selectedMentor?.name} için mentörlük randevu talebi gönderin. Talep mentör tarafından onaylandığında seans bağlantısı aktif hale gelecektir.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedMentor?.avatar || selectedMentor?.avatar_url} />
                <AvatarFallback>{selectedMentor?.name?.charAt(0) || 'M'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{selectedMentor?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMentor?.major || 'Mentör'}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mentörlük Konusu / Hedef Alan <span className="text-destructive">*</span></label>
              <Input 
                placeholder="Örn: React Kariyer Rehberliği ve Portfolyo İnceleme" 
                value={requestFormData.focus_area} 
                onChange={(e) => setRequestFormData({ ...requestFormData, focus_area: e.target.value })} 
                required 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Talep Notu / Kendinizi Tanıtın (Opsiyonel)</label>
              <Textarea 
                placeholder="Mentörünüze iletmek istediğiniz detaylar, sorularınız veya uygun olduğunuz zaman aralıkları..." 
                value={requestFormData.note} 
                onChange={(e) => setRequestFormData({ ...requestFormData, note: e.target.value })} 
                rows={3} 
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" disabled={isSubmittingRequest} onClick={() => setRequestModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmittingRequest} className="bg-primary">
                {isSubmittingRequest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmittingRequest ? 'Talep Gönderiliyor...' : 'Talebi İlet'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
