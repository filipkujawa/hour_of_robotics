"use client";

import Link from "next/link";
import { ArrowRight, Camera, Map, Mic } from "lucide-react";

import { useAuthSession } from "@/components/auth/use-auth-session";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const buildOutcomes = [
  { title: "Greeting routines", description: "Make MARS speak, navigate, and react to people entering a space.", icon: Mic },
  { title: "Perception behaviors", description: "Use camera, depth, and LiDAR concepts to interpret the environment.", icon: Camera },
  { title: "Spatial intelligence", description: "Understand localization, path planning, and map-based robot memory.", icon: Map }
];

export default function HomePage() {
  const { hasSession } = useAuthSession();
  const primaryHref = hasSession ? "/dashboard" : "/signup";

  return (
    <AppShell>
      <section className="border-b border-border/70">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
          <div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl tracking-tight text-text sm:text-6xl lg:text-7xl">
              Learn robotics from zero to one.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-muted">
              Hour of Robotics combines clear explanations, structured lessons, and a polished coding environment with the Innate MARS robot so students can understand real robotics concepts before they ever feel lost.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href={primaryHref}>
                <Button className="gap-2">
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/learn">
                <Button variant="secondary">View curriculum</Button>
              </Link>
            </div>
          </div>

          <Card className="overflow-hidden bg-hero-grid bg-[length:auto,40px_40px,40px_40px] p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[#0D1726]">
              <video
                className="aspect-[4/3] w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="https://assets.tina.io/35da1824-072c-49aa-976b-db509bc0db80/videos/Complete-compressed.mp4" type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09111d]/85 via-[#09111d]/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/80">
                  MARS in motion
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-primary">What students build</div>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-text sm:text-5xl">Real robot behaviors, not abstract exercises</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-muted">
            Every chapter leads toward physical capability on MARS: sensing the environment, making decisions, and moving through space with intent.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {buildOutcomes.map((item) => (
            <Card key={item.title} className="p-6 transition hover:-translate-y-1">
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-5 font-display text-2xl tracking-tight text-text">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-primary">The platform</div>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-text sm:text-5xl">Innate MARS gives robotics ideas a body.</h2>
            <p className="mt-6 text-base leading-8 text-muted">
              MARS is a strong teaching robot because the same system can speak, move, sense depth, manipulate with an arm, and expose those capabilities through programmable skills. Students can see the full sensing-decision-action loop in one machine.
            </p>
          </div>
          <Card className="p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-[26px] border border-border bg-white p-5">
                <div className="text-sm font-semibold text-text">Perception</div>
                <p className="mt-2 text-sm leading-7 text-muted">Camera, stereo depth, LiDAR, audio, and fused sensing pathways.</p>
              </div>
              <div className="rounded-[26px] border border-border bg-white p-5">
                <div className="text-sm font-semibold text-text">Action</div>
                <p className="mt-2 text-sm leading-7 text-muted">Mobile base, robotic arm, gripper control, and speech output.</p>
              </div>
              <div className="rounded-[26px] border border-border bg-white p-5">
                <div className="text-sm font-semibold text-text">Programming</div>
                <p className="mt-2 text-sm leading-7 text-muted">Blockly for structured starts, live Python for conceptual transfer.</p>
              </div>
              <div className="rounded-[26px] border border-border bg-white p-5">
                <div className="text-sm font-semibold text-text">Progression</div>
                <p className="mt-2 text-sm leading-7 text-muted">A clear curriculum that unlocks skills in an intentional order.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
