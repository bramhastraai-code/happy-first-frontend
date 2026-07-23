import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/providers/QueryProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import PwaProvider from '@/components/providers/PwaProvider';
import { siteMetadata } from '@/lib/site-metadata';
import { BRAND_NAME } from '@/lib/brand';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  ...siteMetadata,
  other: {
    'apple-mobile-web-app-title': BRAND_NAME,
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ea580c' },
    { media: '(prefers-color-scheme: dark)', color: '#ea580c' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <PwaProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
