import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BREWW 1671 | Cold Brew Business Operating System',
  description:
    'Internal business operating system for BREWW 1671. Traceable production, dual inventory, 50/50 partner settlements, and B2B café sales.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="min-h-screen bg-[#0d0e12] text-zinc-100 font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
