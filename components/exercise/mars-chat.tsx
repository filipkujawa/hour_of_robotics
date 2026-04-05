"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "mars" | "student";
  content: string;
}

const RESPONSES: Record<string, string[]> = {
  greeting: ["Hey there! Ready to program some robots?", "Let's build something awesome!"],
  hint: [
    "Think about what MARS needs to do first. What's the very first action?",
    "You're on the right track! Look at the blocks on the left — which category might help?",
    "Try thinking step by step — what does the robot sense, then decide, then do?",
  ],
  success: ["That's it! Your robot is officially smarter than my toaster.", "Nailed it!"],
  stuck: [
    "No worries — debugging is 90% of robotics. Even NASA engineers deal with this.",
    "Let's break it down. What's the last thing that worked correctly?",
  ],
  encourage: [
    "Every robotics engineer started exactly where you are right now.",
    "You're building real skills here — same thinking as self-driving cars!",
  ],
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  const pick = (k: string) => { const r = RESPONSES[k]; return r[Math.floor(Math.random() * r.length)]; };
  if (lower.includes("help") || lower.includes("stuck")) return pick("stuck");
  if (lower.includes("hint")) return pick("hint");
  if (lower.includes("hello") || lower.includes("hi")) return pick("greeting");
  if (lower.includes("did it") || lower.includes("worked")) return pick("success");
  return pick("encourage");
}

export function MarsChat({ exercisePrompt }: { exercisePrompt: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: "intro", role: "mars", content: exercisePrompt + " Need help? Just ask!" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((p) => [...p, { id: Date.now().toString(), role: "student", content: text.trim() }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: "mars", content: getResponse(text) }]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "mars" ? (
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded bg-[#d97706] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-white">M</span>
                </div>
                <div className="text-[12px] text-[#6b6b69] leading-relaxed">{msg.content}</div>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed bg-[#1a1a19] text-white">{msg.content}</div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2.5 items-start">
            <div className="w-5 h-5 rounded bg-[#d97706] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-white">M</span>
            </div>
            <div className="flex gap-1 items-center py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4d3d0] animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4d3d0] animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4d3d0] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
        {["Give me a hint", "I'm stuck", "Explain this"].map((q) => (
          <button key={q} onClick={() => send(q)} className="text-[10px] font-medium px-2.5 py-1 rounded-md border border-[#e2e1de] text-[#9c9c9a] hover:text-[#6b6b69] transition-colors">
            {q}
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-[#e2e1de]">
        <div className="flex gap-2">
          <input
            type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask Mars something..."
            className="flex-1 bg-[#fafaf9] border border-[#e2e1de] rounded-md px-3 py-1.5 text-[12px] text-[#1a1a19] placeholder-[#d4d3d0] focus:outline-none focus:border-[#d97706] focus:ring-1 focus:ring-[#d97706]/20 transition-all"
          />
          <button onClick={() => send(input)} disabled={!input.trim()} className="px-2.5 py-1.5 bg-[#1a1a19] hover:bg-[#333] disabled:bg-[#f0efed] disabled:text-[#d4d3d0] text-white rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
