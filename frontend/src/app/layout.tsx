import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'ViTale — Hành trình Văn hoá Việt', template: '%s | ViTale' },
  description: 'Khám phá văn hoá Hà Nội qua bộ sưu tập búp bê dân tộc và nhân vật 3D AI. Check-in tại các điểm lịch sử, nhận tem hộ chiếu và ưu đãi độc quyền.',
  keywords: ['vitale', 'văn hoá việt nam', 'búp bê dân tộc', 'du lịch hà nội', 'AI', '3D'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ViTale',
  },
  openGraph: {
    title: 'ViTale — Hành trình Văn hoá Việt',
    description: 'Khám phá văn hoá Hà Nội qua bộ sưu tập búp bê dân tộc và nhân vật 3D AI.',
    type: 'website',
    locale: 'vi_VN',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f5f3ef' }}>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
