import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { ReactQueryProvider } from "../lib/react-query";
import { NotificationProvider } from "../lib/notification-context";
import { Toaster } from "sonner";

export const metadata = {
  title: "Nigcomsat PMS - Performance Management System",
  description: "Comprehensive performance management system for Nigcomsat",
  icons: {
    icon: [
      { url: "/favicon_light.png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon_dark.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReactQueryProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                }}
              />
            </NotificationProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
