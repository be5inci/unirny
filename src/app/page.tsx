import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon } from 'lucide-react';
import AnnouncementBanner from '@/components/common/AnnouncementBanner';

const MOCK_EVENTS: Array<{ id: string; title: string; date: string; location: string; type: string; description?: string; speaker?: string }> = [
  { id: 'e1', title: 'Yapay Zeka ve Gelecek Zirvesi', date: '15 Ekim 2026', location: 'Merkez Kampüs', type: 'Konferans' },
  { id: 'e2', title: 'Web Geliştirme Bootcamp', date: '20 Ekim 2026', location: 'Online', type: 'Eğitim' },
  { id: 'e3', title: 'Start-Up Pitch Day', date: '1 Kasım 2026', location: 'Teknokent', type: 'Yarışma' }
];

const MOCK_ANNOUNCEMENTS = [
  { id: 'a1', title: 'Yeni Mentörlük Programı Başlıyor!', date: 'Bugün', content: 'Sektör profesyonellerinden birebir destek almak için başvurular açıldı.', priority: 'High', tag: 'Program' },
  { id: 'a2', title: 'Güz Dönemi Proje Destekleri', date: 'Dün', content: 'Topluluk projeleri için bütçe başvuru sonuçları açıklandı.', priority: 'Normal', tag: 'Duyuru' }
];

export default function HomePage() {
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
          </div>
          <div className="grid gap-4">
            {MOCK_EVENTS.map(event => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={event.type === 'Online' ? 'secondary' : 'default'}>
                      {event.type}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </CardDescription>
                  <CardDescription className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" />
                    {event.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  {event.speaker && (
                    <p className="text-sm font-medium mt-2">Konuşmacı: {event.speaker}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Duyurular Panosu */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Duyurular Panosu</h2>
          </div>
          <div className="grid gap-4">
            {MOCK_ANNOUNCEMENTS.map(announcement => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <Badge variant={announcement.priority === 'High' ? 'destructive' : 'secondary'}>
                      {announcement.priority}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(announcement.date).toLocaleDateString('tr-TR')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{announcement.content}</p>
                  <div className="mt-4">
                    <Badge variant="outline">{announcement.tag}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Faaliyet Vitrini (Özet) */}
      <section className="space-y-6 pt-8">
        <h2 className="text-2xl font-bold tracking-tight text-center">Neler Yaptık?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Hackathon 2025</CardTitle>
              <CardDescription>48 Saatlik Kodlama Maratonu</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">150+ katılımcı ile gerçekleşen hackathon etkinliğimizde birbirinden yenilikçi 20 proje geliştirildi.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sektör Buluşmaları</CardTitle>
              <CardDescription>Yapay Zeka Semineri</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Endüstri liderlerinin katıldığı seminer serimizde yapay zekanın geleceği tartışıldı.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Güz Kampı</CardTitle>
              <CardDescription>Oryantasyon & Networking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Yeni katılan üyelerimizle kaynaşma ve strateji planlama odaklı hafta sonu kampımız.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
