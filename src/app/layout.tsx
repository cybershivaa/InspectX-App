import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'InspectX',
  description: 'Streamlined Electrical Inspections',
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/app-logo.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-logo.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/app-logo.png',
    shortcut: '/app-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InspectX',
  },
  formatDetection: {
    telephone: false,
  },
};


export const viewport: Viewport = {
  themeColor: "#29ABE2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-clear stale service worker caches
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) {
                    registration.update();
                  });
                });
                // Clear old caches that might serve stale content
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) {
                      if (name.includes('workbox') || name.includes('next')) {
                        caches.delete(name);
                      }
                    });
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegistration />
        </AppProvider>
      </body>
    </html>
  );
}
