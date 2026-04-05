"use client";

import Link from "next/link";
import { ArrowRight, Camera, Map, Mic, Cpu, Hand, Brain } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

const features = [
  { title: "Sense", description: "Camera, LiDAR, depth sensing, and microphone input.", icon: Camera },
  { title: "Act", description: "Drive, move an arm, grip objects, and speak.", icon: Hand },
  { title: "Decide", description: "State machines, conditionals, and LLM reasoning.", icon: Brain },
];

const stats = [
  { value: "7", label: "Chapters" },
  { value: "40+", label: "Lessons" },
  { value: "0", label: "Prerequisites" },
];

export default function HomePage() {
  return (
    <AppShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97706]">
            Hour of Robotics
          </div>
          <h1 className="mt-4 text-[42px] font-bold leading-[1.1] tracking-tight text-[#1a1a19]">
            Learn robotics<br />from zero to one.
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6b6b69] max-w-lg">
            A block-based curriculum that takes high school students from their first robot command to building autonomous behaviors with the Innate MARS robot.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-md bg-[#1a1a19] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#333332] transition"
            >
              Start Learning
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/learn"
              className="inline-flex items-center rounded-md border border-[#e2e1de] bg-white px-5 py-2.5 text-[13px] font-medium text-[#1a1a19] hover:bg-[#fafaf9] transition"
            >
              View curriculum
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-14 flex gap-10">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-[28px] font-bold text-[#1a1a19] tracking-tight">{s.value}</div>
              <div className="text-[11px] text-[#9c9c9a] font-medium uppercase tracking-[0.1em]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Video */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="relative overflow-hidden rounded-xl border border-[#e2e1de] bg-[#0D1726]">
          <video
            className="aspect-[21/9] w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          >
            <source src="https://assets.tina.io/35da1824-072c-49aa-976b-db509bc0db80/videos/Complete-compressed.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1726]/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-5">
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/60 font-medium">
              MARS in motion
            </span>
          </div>
        </div>
      </section>

      {/* Sense / Act / Decide */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97706]">
            What students learn
          </div>
          <h2 className="mt-2 text-[24px] font-bold tracking-tight text-[#1a1a19]">
            The full robotics loop
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-[#e2e1de] bg-white p-5">
              <f.icon className="h-5 w-5 text-[#d97706]" />
              <h3 className="mt-4 text-[15px] font-semibold text-[#1a1a19]">{f.title}</h3>
              <p className="mt-2 text-[12px] text-[#6b6b69] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section className="border-t border-[#e2e1de] bg-[#fafaf9]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d97706]">
                The platform
              </div>
              <h2 className="mt-2 text-[24px] font-bold tracking-tight text-[#1a1a19]">
                Innate MARS gives robotics ideas a body.
              </h2>
              <p className="mt-4 text-[13px] text-[#6b6b69] leading-7">
                MARS is a mobile manipulator with onboard AI compute. It can speak, move, see in depth, manipulate with an arm, and expose those capabilities through programmable skills. Students see the full sensing-decision-action loop in one machine.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { t: "Perception", d: "Camera, stereo depth, LiDAR, audio." },
                { t: "Action", d: "Mobile base, arm, gripper, speech." },
                { t: "Programming", d: "Blocks to start, Python to grow." },
                { t: "Curriculum", d: "7 chapters, structured progression." },
              ].map((item) => (
                <div key={item.t} className="rounded-lg border border-[#e2e1de] bg-white p-4">
                  <div className="text-[12px] font-semibold text-[#1a1a19]">{item.t}</div>
                  <p className="mt-1.5 text-[11px] text-[#9c9c9a] leading-relaxed">{item.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
