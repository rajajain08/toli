import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@toli/ui/tokens.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Toli',
  description: 'Know whose card to use before the bill comes.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Toli', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#FAF9F5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
