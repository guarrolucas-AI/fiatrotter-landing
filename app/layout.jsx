import './globals.css';

export const metadata = {
  title: 'Rotter | Digital Campaigns Performance',
  description: 'Dashboard de performance de campañas digitales - Wikinbound',
  icons: {
    icon: '/logo-wikinbound.svg',
    shortcut: '/logo-wikinbound.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
