import './globals.css';

export const metadata = {
  title: 'AI Tech News',
  description: 'AI-curated tech news, summarized, tagged, and ranked for you.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-800 p-4">
          <h1 className="text-xl font-semibold">AI Tech News</h1>
        </header>
        <main className="max-w-3xl mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
