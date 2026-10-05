import Link from 'next/link';
import { Send, Mail, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & About */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-xl font-bold tracking-tight">unirny</h2>
            <p className="text-sm text-muted-foreground">
              Öğrencileri, projeleri ve mentörleri bir araya getiren yeni nesil üniversite topluluk platformu. Birlikte üretin, birlikte gelişin.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Hızlı Bağlantılar</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">Hakkımızda</Link></li>
              <li><Link href="/projects" className="hover:text-primary transition-colors">Projeler</Link></li>
              <li><Link href="/mentorship" className="hover:text-primary transition-colors">Mentörlük</Link></li>
              <li><Link href="/groups" className="hover:text-primary transition-colors">Gruplar</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">İletişim</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href="mailto:hello@unirny.com" className="hover:text-primary transition-colors">hello@unirny.com</a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Teknokent / Kuluçka Merkezi</span>
              </li>
            </ul>
          </div>

          {/* Social & Community */}
          <div className="space-y-4">
            <h3 className="font-semibold">Topluluğa Katıl</h3>
            <div className="flex gap-4">
              <a 
                href="https://chat.whatsapp.com/unirny" 
                target="_blank" 
                rel="noreferrer"
                className="bg-primary/10 p-2 rounded-full text-primary hover:bg-primary hover:text-white transition-all"
                title="WhatsApp Topluluğu"
              >
                <Send className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com/unirny" 
                target="_blank" 
                rel="noreferrer"
                className="bg-primary/10 p-2 rounded-full text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center"
                title="Instagram Hesabı"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Etkinlikler ve duyurular için sosyal medyadan bizi takip edin.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} unirny Platform. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">Kullanım Koşulları</Link>
            <Link href="/privacy" className="hover:text-foreground">Gizlilik Politikası</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
