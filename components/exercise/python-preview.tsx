export function PythonPreview({ code }: { code: string }) {
  return (
    <div className="h-full overflow-auto rounded-[28px] border border-[#2c2542] bg-[#171224] p-5 text-sm text-[#f5f3ff] shadow-[0_25px_80px_-40px_rgba(91,33,182,0.45)]">
      <div className="mb-4 text-xs uppercase tracking-[0.24em] text-[#c4b5fd]">Generated Python</div>
      <pre className="font-mono leading-7 text-[#ede9fe]">
        <code>{code || "# Blocks will generate Python here."}</code>
      </pre>
    </div>
  );
}
