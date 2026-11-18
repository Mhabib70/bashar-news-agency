import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { UpdateBanner } from "@/components/app/update-banner";

export const metadata: Metadata = {
  title: "خبرگزاری بسیج شهر رشت | اپ خبرنگاران",
  description: "خبرگزاری بسیج شهر رشت — روایت‌گر حقیقت، صدای بسیج. ارسال خبر، چرخه بررسی سه‌مرحله‌ای، امتیاز، سطح و چالش",
  icons: { icon: "/img/logo-mark.png", apple: "/img/logo-mark.png" },
};

export const viewport: Viewport = {
  themeColor: "#f7f2f2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          <Toaster />
          <UpdateBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
