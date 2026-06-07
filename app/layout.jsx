import './globals.css';

export const metadata = {
  title: 'Rotter | Digital Campaigns Performance',
  description: 'Dashboard de performance de campañas digitales - Wikinbound',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
