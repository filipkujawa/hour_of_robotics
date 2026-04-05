"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { useAuthSession } from "@/components/auth/use-auth-session";

export default function SignUpPage() {
  const router = useRouter();
  const { hasSession, isLoading } = useAuthSession();

  useEffect(() => {
    if (!isLoading && hasSession) {
      router.replace("/dashboard");
    }
  }, [hasSession, isLoading, router]);

  if (isLoading || hasSession) {
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <AuthForm mode="signup" />
    </div>
  );
}
