import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/UserContext";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Gang Wars",
  description: "A modern turn-based crime strategy game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="min-h-screen">
        <UserProvider>
          <ToastProvider>{children}</ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
