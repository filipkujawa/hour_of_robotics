"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/course-data";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Add Supabase environment variables to enable authentication.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    setLoading(true);
    setMessage(null);

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
                role
              }
            }
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md p-8">
      <h1 className="font-display text-4xl tracking-tight text-text">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-3 text-sm leading-7 text-muted">
        {mode === "login" ? "Pick up where you left off with MARS." : "Start the robotics course with a structured path through every chapter."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {mode === "signup" ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-text">Display name</span>
            <input
              name="displayName"
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-primary/40"
              placeholder="Ada Lovelace"
              required
            />
          </label>
        ) : null}
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">Email</span>
          <input
            name="email"
            type="email"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-primary/40"
            placeholder="student@school.edu"
            required
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-text">Password</span>
          <input
            name="password"
            type="password"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-primary/40"
            placeholder="••••••••"
            required
          />
        </label>
        {mode === "signup" ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">Role</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["student", "teacher"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    role === value ? "border-primary bg-tintSoft text-primary" : "border-border bg-surface text-muted"
                  }`}
                >
                  <div className="font-medium capitalize text-text">{value}</div>
                  <div className="mt-1 text-xs">{value === "teacher" ? "All lessons unlocked." : "Sequential course progression."}</div>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
        {message ? <p className="text-sm text-primary">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Working..." : mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="text-primary">
          {mode === "login" ? "Sign up" : "Log in"}
        </Link>
      </p>
    </Card>
  );
}
