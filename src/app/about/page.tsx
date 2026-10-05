import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ShieldCheck, Target, Lightbulb, Rocket } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl space-y-20">
      
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Hakkımızda
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          unirny, üniversite öğrencilerinin fikirlerini projelere dönüştürdüğü, ekipler kurduğu ve deneyimli mentörlerle buluştuğu yenilikçi bir topluluk platformudur.
        </p>
      </section>

      {/* Misyon & Vizyon */}
      <section className="grid md:grid-cols-2 gap-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Misyonumuz</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            Akademik sınırların ötesine geçerek öğrencileri pratik ve inovatif projeler etrafında birleştirmek. Teknolojiyi ve işbirliğini kullanarak, üniversite ekosistemini üretken bir kuluçka merkezine dönüştürmek istiyoruz.
          </CardContent>
        </Card>

        <Card className="border-secondary/20 bg-secondary/5">
          <CardHeader>
            <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
              <Lightbulb className="w-6 h-6 text-secondary-foreground" />
            </div>
            <CardTitle className="text-2xl">Vizyonumuz</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed">
            Sadece bir üniversite kulübü değil, binlerce öğrencinin kariyer yolculuğuna yön veren, start-up ruhunu kampüs kültürüne entegre eden global standartlarda bir yetenek platformu olmak.
          </CardContent>
        </Card>
      </section>

      {/* Ekip & Yapılanma */}
      <section className="space-y-10">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Ekibimiz ve Yapılanma</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Topluluğumuz, işini tutkuyla yapan gönüllü öğrenciler ve profesyonel mentörlerden oluşmaktadır.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8" />
              </div>
              <CardTitle>Kurucu Ekip</CardTitle>
              <CardDescription>Platform Geliştiricileri</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              unirny'nin temelini atan, teknik altyapıyı kodlayan ve vizyonu belirleyen çekirdek geliştirici kadromuz.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <CardTitle>Topluluk Liderleri</CardTitle>
              <CardDescription>Etkinlik & Organizasyon</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              Buluşmalar, hackathonlar ve eğitim bootcamp'lerini organize eden, üyeler arası etkileşimi sıcak tutan ekibimiz.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <CardTitle>Moderasyon</CardTitle>
              <CardDescription>Güvenlik & Kalite</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              Platformdaki proje ilanlarını, grupları ve mentörlük taleplerini denetleyerek güvenli ve nezih bir ortam sağlayan moderatörlerimiz.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* İletişim / Call to Action */}
      <section className="bg-muted/40 rounded-2xl p-8 md:p-12 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold">Sen de Aramıza Katıl!</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Fikrini projeye dönüştürmek, yeteneklerine uygun bir ekip bulmak veya deneyimlerini paylaşmak için hemen topluluğumuzun bir parçası ol.
        </p>
      </section>
      
    </div>
  );
}
