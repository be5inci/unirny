import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand & About */}
          <div className="space-y-4">
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

          {/* Contact & Social */}
          <div className="space-y-4">
            <h3 className="font-semibold">İletişim</h3>
            <div className="space-y-3">
              <a 
                href="https://instagram.com/unirny.network" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border bg-background/50 hover:bg-primary/5 hover:border-primary/40 text-sm font-medium transition-all group"
              >
                <div className="bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-1.5 rounded-md text-white shadow-xs group-hover:scale-105 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] text-muted-foreground">Instagram</span>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">unirny.network</span>
                </div>
              </a>
              <p className="text-xs text-muted-foreground">
                Tüm soru, öneri ve işbirlikleri için Instagram hesabımız üzerinden bize ulaşabilirsiniz.
              </p>
            </div>
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
