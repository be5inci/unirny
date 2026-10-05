"use client";

import { useEffect, useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { SendIcon, AlertTriangleIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const scoreSchema = z.object({
  score: z.coerce.number().min(0, "Puan 0'dan küçük olamaz").max(100, "Puan 100'den büyük olamaz"),
});

type ScoreFormValues = z.infer<typeof scoreSchema>;

export default function MentorshipSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const sessionId = unwrappedParams.id;
  
  const [session, setSession] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();

  const form = useForm({
    resolver: zodResolver(scoreSchema),
    defaultValues: { score: 100 },
  });

  useEffect(() => {
    let channel: any;

    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Oturum bilgisini çek
      const { data: sessionData, error: sessionError } = await supabase
        .from('mentorships')
        .select('*, mentor:mentor_id(name), mentee:mentee_id(name)')
        .eq('id', sessionId)
        .single();
      
      if (sessionData) {
        setSession(sessionData);
        
        // Geçmiş puanları çek
        const { data: scores } = await supabase
          .from('mentorship_score_history')
          .select('*')
          .eq('mentorship_id', sessionId)
          .order('created_at', { ascending: true });
        
        if (scores) {
          const formatted = scores.map((s, index) => ({
            day: `Değerlendirme ${index + 1}`,
            score: s.score
          }));
          setChartData(formatted);
        }

        // Geçmiş mesajları çek
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*, sender:profiles!messages_sender_id_fkey(name)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        
        if (messagesData) {
          setMessages(messagesData);
        }

        // Realtime Mesaj Dinleme
        channel = supabase
          .channel(`realtime-messages-${sessionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `session_id=eq.${sessionId}`,
            },
            async (payload) => {
              const newMsg = payload.new;
              // Gönderici ismini çekmek için manuel sorgu (çünkü payload join yapmaz)
              const { data: senderData } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', newMsg.sender_id)
                .single();
              
              const msgWithSender = {
                ...newMsg,
                sender: senderData || { name: 'Bilinmiyor' }
              };
              
              setMessages((prev) => [...prev, msgWithSender]);
            }
          )
          .subscribe();
      }
      setLoading(false);
    }

    loadData();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  async function onScoreSubmit(data: ScoreFormValues) {
    if (!session || session.status === 'Terminated') return;

    // Puanı ekle
    const { error: insertError } = await supabase.from('mentorship_score_history').insert({
      mentorship_id: sessionId,
      score: data.score
    });

    if (insertError) {
      toast.error('Puan eklenirken hata oluştu.');
      return;
    }

    toast.success('Puan eklendi.');

    // Güncel puanların ortalamasını al
    const { data: allScores } = await supabase
      .from('mentorship_score_history')
      .select('score')
      .eq('mentorship_id', sessionId);
    
    if (allScores && allScores.length > 0) {
      const sum = allScores.reduce((acc, curr) => acc + curr.score, 0);
      const avg = sum / allScores.length;

      const startDate = new Date(session.start_date || session.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays >= 5 && avg < 50) {
        // Fesih kuralı çalıştı
        await supabase.from('mentorships').update({ status: 'Terminated' }).eq('id', sessionId);
        toast.error('Ortalama puan 50 altına düştüğü için mentörlük feshedildi.');
        
        await supabase.from('notifications').insert([
          {
            user_id: session.mentee_id,
            type: 'mentorship_terminated',
            message: `Mentörlük oturumunuz ortalama puanın düşük olması nedeniyle sonlandırıldı.`,
            related_entity_id: sessionId
          },
          {
            user_id: session.mentor_id,
            type: 'mentorship_terminated',
            message: `Danışanınızla olan mentörlük oturumunuz otomatik olarak sonlandırıldı.`,
            related_entity_id: sessionId
          }
        ]);
      }
    }

    form.reset();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentUser || session.status === 'Terminated') return;

    const msgText = newMessage.trim();
    setNewMessage(''); // Hızlı UI tepkisi

    const { error } = await supabase.from('messages').insert({
      session_id: sessionId,
      sender_id: currentUser.id,
      content: msgText
    });

    if (error) {
      toast.error('Mesaj gönderilemedi.');
      setNewMessage(msgText); // Hata durumunda geri yükle
    }
  }

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (!session) return <div className="p-8 text-center">Mentörlük oturumu bulunamadı.</div>;

  const isActive = session.status !== 'Terminated';
  const isMentor = currentUser?.id === session.mentor_id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mentörlük Süreci: {session.mentor?.name || 'Mentör'} & {session.mentee?.name || 'Danışan'}</h1>
          <p className="text-muted-foreground text-sm">Hedef Alan: {session.focus_area}</p>
        </div>
        {!isActive ? (
          <Badge variant="destructive" className="text-sm py-1 px-3">Süreç Sonlandı (Puan &lt; 50)</Badge>
        ) : (
          <Badge variant="default" className="text-sm py-1 px-3">Aktif Süreç</Badge>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 flex-1">
        {/* Sol Panel: Sohbet */}
        <Card className="md:col-span-2 flex flex-col min-h-[500px]">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-lg">Özel Sohbet Kanalı</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground my-auto">
                Henüz mesaj yok. İlk mesajı siz gönderin.
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="text-xs text-muted-foreground mb-1 ml-1 mr-1">
                      {msg.sender?.name}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 mx-1">
                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
            
            {!isActive && (
              <div className="flex justify-center mt-auto pt-4">
                <div className="bg-destructive/10 text-destructive text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2">
                  <AlertTriangleIcon className="w-4 h-4" />
                  Sistem: Ortalama puan 50'nin altına düştüğü için bu mentörlük süreci otomatik olarak arşivlenmiştir.
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 border-t bg-background flex items-center gap-2">
            <Input 
              disabled={!isActive} 
              placeholder={isActive ? "Mesajınızı yazın..." : "Sohbet arşive alındı."} 
              className="flex-1"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button disabled={!isActive || !newMessage.trim()} size="icon" onClick={sendMessage}>
              <SendIcon className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Sağ Panel: Performans Grafiği & Puanlama */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mentörlük Performansı</CardTitle>
              <CardDescription>Danışan memnuniyet ve gelişim puanları (Ort. &lt; 50 fesih sebebidir)</CardDescription>
            </CardHeader>
            <CardContent className="p-0 pb-4 h-[250px]">
              <div className="h-full w-full px-4 pt-4">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Henüz puan girilmemiş.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <ReferenceLine y={50} stroke="red" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {isMentor && isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Danışan Değerlendirmesi</CardTitle>
                <CardDescription>Danışanın performansını puanlayın.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onScoreSubmit as any)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puan (0-100)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} value={field.value as number} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">Puanı Kaydet</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
