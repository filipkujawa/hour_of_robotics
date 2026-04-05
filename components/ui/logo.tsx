import Link from "next/link";
import Image from "next/image";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3 text-text">
      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl border border-primary/15 bg-[#120e1d] p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <Image src="/innate-logo.png" alt="Innate logo" width={40} height={40} className="h-full w-full object-contain" priority />
      </div>
      <div>
        <div className="font-display text-xl leading-none tracking-tight">Hour of Robotics</div>
        <div className="text-xs text-muted">for Innate MARS</div>
      </div>
    </Link>
  );
}
