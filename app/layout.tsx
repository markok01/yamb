import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme-init-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jamb",
  description: "Jamb — Ex-YU verzija, online višeigrački režim",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr"
      className="h-full antialiased"
      style={
        {
          "--font-system":
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
        } as React.CSSProperties
      }
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
