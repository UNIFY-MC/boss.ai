import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Deals Machine",
  description: "B2B cold-call agent cockpit",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.fonts.ready.then(function(){document.documentElement.classList.add('icons-loaded')})`,
          }}
        />
      </head>
      <body className="bg-background text-on-background min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
