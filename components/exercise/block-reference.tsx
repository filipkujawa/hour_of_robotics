import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export interface BlockReferenceItem {
  category: string;
  name: string;
  description: string;
}

export const blockReferenceItems: BlockReferenceItem[] = [
  { category: "Movement", name: "move forward/back", description: "Drive the base a set distance in meters." },
  { category: "Movement", name: "turn left/right", description: "Rotate MARS by a chosen angle." },
  { category: "Movement", name: "set speed", description: "Set the base movement speed before motion." },
  { category: "Arm", name: "wave", description: "Run a built-in arm wave gesture." },
  { category: "Arm", name: "set joint position", description: "Move a named arm joint to a numeric position." },
  { category: "Arm", name: "open/close gripper", description: "Control the end effector." },
  { category: "Sensing", name: "get distance", description: "Read the current measured distance ahead." },
  { category: "Sensing", name: "detect object color", description: "Return the detected color label." },
  { category: "Sensing", name: "is obstacle ahead", description: "Check whether movement is blocked." },
  { category: "Speech", name: "say [text]", description: "Speak a short phrase aloud." },
  { category: "Speech", name: "listen for command", description: "Listen for a spoken command string." },
  { category: "Logic", name: "if/then", description: "Run blocks only when a condition is true." },
  { category: "Logic", name: "repeat N times", description: "Repeat a block stack a fixed number of times." },
  { category: "Logic", name: "wait N seconds", description: "Pause before continuing." }
];

export function BlockReference({
  open,
  onToggle
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`relative border-l border-[#2c2542] bg-[#120e1d] text-[#f5f3ff] transition-all duration-300 ${
        open ? "w-[320px]" : "w-12"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse block reference" : "Expand block reference"}
        className="absolute left-0 top-5 z-10 translate-x-[-50%] rounded-full border border-[#2c2542] bg-[#171224] p-2 text-[#f5f3ff]"
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="h-full overflow-y-auto px-5 py-6">
          <div className="mb-5">
            <div className="text-xs uppercase tracking-[0.18em] text-[#c4b5fd]">Reference</div>
            <h3 className="mt-2 font-display text-2xl tracking-tight">MARS blocks</h3>
          </div>
          <div className="space-y-4">
            {blockReferenceItems.map((item) => (
              <div key={`${item.category}-${item.name}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <Badge className="border-white/10 bg-white/10 text-[#ddd6fe]">{item.category}</Badge>
                <div className="mt-3 text-sm font-medium text-white">{item.name}</div>
                <p className="mt-2 text-sm leading-6 text-[#d4d0df]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
