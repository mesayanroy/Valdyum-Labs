import type { Metadata } from "next";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import AppShell from "@/components/AppShell";
import AblyNotifications from "@/components/AblyNotifications";

export const metadata: Metadata = {
  title: "Valdyum — AI Agent Marketplace on Solana",
  description:
    "Build, monetize, and deploy AI agents on the Solana blockchain. Pay per request with 0x402 protocol.",
  icons: {
    icon: "/brand/valdyumlogofevicon.png",
    shortcut: "/brand/valdyumlogofevicon.png",
    apple: "/brand/valdyumlogofevicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand/valdyumlogofevicon.png" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Cinzel:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-[var(--color-bg)] text-[#111111]" suppressHydrationWarning>
        <NavbarWrapper />
        <main>
          <AppShell>{children}</AppShell>
        </main>
        <AblyNotifications />
      </body>
    </html>
  );
}

