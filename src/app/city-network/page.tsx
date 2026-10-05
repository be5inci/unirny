import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPinIcon, CalendarIcon, UsersIcon } from 'lucide-react';

const MOCK_CITY_EVENTS = [
  {
    id: 1,
    title: 'Ankara Yüz Yüze Tanışma Toplantısı',
    date: '18 Eylül 2026 - 14:00',
    location: 'Kızılay Kahve Dünyası',
    attendees: 24,
    type: 'Buluşma',
  },
  {
    id: 2,
    title: 'Hackathon Ankara Ekibi Ön Hazırlık',
    date: '20 Eylül 2026 - 10:00',
    location: 'ODTÜ Teknokent',
    attendees: 8,
    type: 'Görev',
  }
];

export default function CityNetworkPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Şehir Ağı & Lokal Topluluk</h1>
          <p className="text-muted-foreground mt-1">Kendi ilinizdeki üyelere ulaşın, lokal görevlere ve fiziki buluşmalara katılın.</p>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-5 h-5 text-muted-foreground" />
          <Select defaultValue="Ankara">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Şehir Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ankara">Ankara Ağı</SelectItem>
              <SelectItem value="İstanbul">İstanbul Ağı</SelectItem>
              <SelectItem value="İzmir">İzmir Ağı</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Lokal Toplantı & Görev Panosu</CardTitle>
                <CardDescription>Ankara ağındaki yaklaşan etkinlikler</CardDescription>
              </div>
              <Button size="sm">+ Yeni Etkinlik / Görev</Button>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4">
              {MOCK_CITY_EVENTS.map(event => (
                <div key={event.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={event.type === 'Görev' ? 'secondary' : 'default'}>{event.type}</Badge>
                      <h4 className="font-semibold">{event.title}</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {event.date}</span>
                      <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {event.location}</span>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center gap-4">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                      <UsersIcon className="w-4 h-4" />
                      {event.attendees} Katılımcı
                    </span>
                    <Button variant="outline" size="sm">Katıl</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Ankara Ağı İstatistikleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Aktif Üye</span>
                <span className="font-bold text-lg">342</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Devam Eden Proje</span>
                <span className="font-bold text-lg">14</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-muted-foreground">Gerçekleşen Buluşma</span>
                <span className="font-bold text-lg">56</span>
              </div>
              <Button className="w-full mt-2" variant="default">Ağ Temsilcisi ile İletişime Geç</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
