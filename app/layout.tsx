import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nansen Telegram Bot',
  description: 'Generate and send Nansen onchain content to Telegram',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
