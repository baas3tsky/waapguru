'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const { session, loading, isAuthenticated } = useSession();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [session, loading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
