import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Serif } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ChatProvider } from '../context/ChatContext';
import { ThemeProvider } from '../context/ThemeContext';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const notoSerif = Noto_Serif({
  variable: '--font-playfair', // Keeping the variable name to avoid breaking existing Tailwind classes that might rely on it
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
    <html lang="vi" className={`${inter.variable} ${notoSerif.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'transparent', color: 'var(--body-text, #1c1917)' }}>
        <LanguageProvider>
          <AuthProvider>
            <ThemeProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </ThemeProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
