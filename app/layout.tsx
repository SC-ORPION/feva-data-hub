import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from 'next/font/google';
import { APP_NAME } from '@/lib/config';
import './globals.css';

const sans = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson' });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-atkinson-mono' });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'Run a fair, secret vote for your school, church or group. Voters use their phone. Results count themselves.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1412' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
