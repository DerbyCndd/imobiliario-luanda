import Script from 'next/script';

export const metadata = {
  title: 'Imobiliário Luanda',
  description: 'Jogo de tabuleiro online para 2 a 12 jogadores',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>" },
};
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;600;700;800&display=swap" />
        <link rel="stylesheet" href="/style.css" />
        <Script src="/engine.js" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
