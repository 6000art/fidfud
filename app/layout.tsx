import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fidfud | Food & Video E-commerce',
  description: 'Commandez vos plats préférés directement depuis des vidéos immersives en direct de la cuisine.',
  keywords: ['food delivery', 'video commerce', 'restaurants', 'fidfud', 'click and collect'],
  openGraph: {
    title: 'Fidfud - Food & Video',
    description: 'La première plateforme de commande de plats par vidéo immersive.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground selection:bg-[#FF5C00] selection:text-white">
        {children}
      </body>
    </html>
  );
}
