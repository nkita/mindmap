import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'MindMap App',
  description: 'A simple and intuitive mind mapping application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MindMap App'
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-icon-180x180.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaid = process.env.GAID
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="MindMap App" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MindMap App" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script src={"https://www.googletagmanager.com/gtag/js?id=" + gaid} />
        <Script id="google-analytics">
          {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
 
                gtag('config', "${gaid}");
            `}
        </Script>
        {children}
      </body>
    </html>
  );
}
