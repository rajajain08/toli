import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import '@toli/ui/tokens.css';
import { Providers } from '@/components/Providers';
import { ServiceWorker } from '@/components/ServiceWorker';

// Display face: one static Fraunces instance, subset to Latin (docs/design/brand/build-font.py).
const display = localFont({
  src: '../fonts/fraunces-toli.woff2',
  weight: '500',
  display: 'swap',
  variable: '--toli-face-display',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

const TAGLINE = 'Know whose card to use before the bill comes.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Toli',
  description: TAGLINE,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  openGraph: {
    siteName: 'Toli',
    title: 'Toli',
    description: TAGLINE,
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: `Toli. ${TAGLINE}` }],
  },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'Toli', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#F5F6FC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
