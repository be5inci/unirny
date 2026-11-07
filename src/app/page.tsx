import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, ArrowRight } from 'lucide-react';
import AnnouncementBanner from '@/components/common/AnnouncementBanner';
import { createClient } from '@/utils/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: events }, { data: announcements }, { data: showcaseItems }] = await Promise.all([
    supabase.from('events').select('*').order('created_at', { ascending: false }).limit(6),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(6),
    supabase.from('showcase_items').select('*').order('created_at', { ascending: false }).limit(6)
  ]);

  const eventsList = events || [];
  // Aktif olanları filtrele (is_active null veya undefined ise de göster)
  const announcementsList = (announcements || []).filter((a: any) => a.is_active !== false);
  const showcaseList = showcaseItems || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      <AnnouncementBanner />
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12 md:py-24">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          unirny <span className="text-primary">Topluluk Platformu</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Projeler üretin, yeni insanlarla tanışın ve mentörlük süreçleriyle kariyerinize yön verin.
        </p>
        <div className="flex justify-center gap-4">
          <Button render={<Link href="/feed" />} size="lg">
            Hemen Başla
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/about" />}>
            Daha Fazla Bilgi
          </Button>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Etkinlik Takvimi */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Yaklaşan Etkinlikler</h2>
            <Link href="/events" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid gap-4">
            {eventsList.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground">Yaklaşan etkinlik bulunmuyor.</p>
              </Card>
            ) : (
              eventsList.map((event: any) => {
                const eventDateVal = event.event_date || event.date;
                return (
                  <Card key={event.id} className="hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <Badge variant={event.category === 'Online' || event.type === 'Online' ? 'secondary' : 'default'}>
                          {event.category || event.type || 'Etkinlik'}
                        </Badge>
                      </div>
                      {eventDateVal && (
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(eventDateVal).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </CardDescription>
                      )}
                      {event.location && (
                        <CardDescription className="flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4" />
                          {event.location}
                        </CardDescription>
                      )}
                    </CardHeader>
                    {event.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                        {event.speaker && (
                          <p className="text-sm font-medium mt-2">Konuşmacı: {event.speaker}</p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Duyurular Panosu */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Duyurular Panosu</h2>
          </div>
          <div className="grid gap-4">
            {announcementsList.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground">Aktif duyuru bulunmuyor.</p>
              </Card>
            ) : (
              announcementsList.map((announcement: any) => (
                <Card key={announcement.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <Badge variant={announcement.type === 'warning' || announcement.priority === 'High' ? 'destructive' : 'secondary'}>
                        {announcement.type === 'warning' ? 'Uyarı' : announcement.type === 'info' ? 'Bilgi' : (announcement.type || 'Duyuru')}
                      </Badge>
                    </div>
                    {announcement.created_at && (
                      <CardDescription>
                        {new Date(announcement.created_at).toLocaleDateString('tr-TR')}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Faaliyet Vitrini (Neler Yaptık?) */}
      <section className="space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Neler Yaptık?</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Topluluğumuz bünyesinde hayata geçirilen projeler, etkinlikler ve kazanımlar.
          </p>
        </div>

        {showcaseList.length === 0 ? (
          <Card className="p-8 text-center border-dashed max-w-lg mx-auto">
            <p className="text-sm text-muted-foreground">Henüz vitrin içeriği eklenmedi.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {showcaseList.map((item: any) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
                    {item.metric && (
                      <Badge variant="secondary" className="font-bold text-primary bg-primary/10 shrink-0">
                        {item.metric}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <CardDescription className="text-sm leading-relaxed mt-2 line-clamp-3">
                      {item.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {item.link && (
                  <CardContent className="pt-0">
                    <Button render={<Link href={item.link} />} variant="link" size="sm" className="px-0 text-primary flex items-center gap-1">
                      İncele <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
