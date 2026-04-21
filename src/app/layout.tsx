import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthEx Technical Exercise",
  description: "Clinical history viewer scaffold for the HealthEx candidate exercise.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
