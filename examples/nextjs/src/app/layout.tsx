import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import '@incld/react/styles.css';
import '@incld/react-schedules/styles.css';
import '@incld/react-approvals/styles.css';
import '@incld/react-audit/styles.css';
import '@incld/react-bulk/styles.css';
import './globals.css';

const sans = Geist({variable: '--font-geist-sans', subsets: ['latin']});
const mono = Geist_Mono({variable: '--font-geist-mono', subsets: ['latin']});

export const metadata: Metadata = {
  title: '@incld Next.js reference',
  description: 'Reference integration for @incld components and framework handlers.',
  icons: {
    icon: '/brand/incld-app-icon.svg',
  },
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
