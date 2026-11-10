import type { Metadata } from "next";
import { Gloock, Martian_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Gloock: high-contrast display serif, like hand-cut market signage.
// Schibsted Grotesk: a newspaper grotesk, plain and warm for chat.
// Martian Mono: prices, receipts and order numbers.
const gloock = Gloock({ variable: "--font-gloock", subsets: ["latin", "latin-ext"], weight: "400" });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin", "latin-ext"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Oja · the AI sales agent that gets you paid",
  description: "Oja answers buyers in chat, haggles within your limits, quotes delivery, and collects payment through PayPal. Web chat, WhatsApp, Messenger and Instagram.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gloock.variable} ${schibsted.variable} ${martian.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
