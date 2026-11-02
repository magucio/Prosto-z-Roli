import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prosto z Roli — panel administratora',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-[#FAF7F2] text-[#1F1B16] antialiased">{children}</body>
    </html>
  );
}
