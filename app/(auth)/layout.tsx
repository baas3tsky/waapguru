import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Support Ticket System",
  description: "Sign in to access the support ticket system",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}