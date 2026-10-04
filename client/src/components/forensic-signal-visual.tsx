import React from "react";

interface ForensicSignalVisualProps {
  status?: "idle" | "ready" | "analyzing" | "complete";
  className?: string;
}

export function ForensicSignalVisual({
  status = "idle",
  className = "",
}: ForensicSignalVisualProps) {
  // 18 decorative bars representing localized spatial frequency / channel sampling
  const bars = [
    { h: 32, delay: "0s" },
    { h: 48, delay: "0.15s" },
    { h: 25, delay: "0.3s" },
    { h: 65, delay: "0.1s" },
    { h: 40, delay: "0.25s" },
    { h: 80, delay: "0.05s" },
    { h: 55, delay: "0.35s" },
    { h: 30, delay: "0.2s" },
    { h: 70, delay: "0.12s" },
    { h: 90, delay: "0.28s" },
    { h: 45, delay: "0.08s" },
    { h: 60, delay: "0.22s" },
    { h: 35, delay: "0.18s" },
    { h: 75, delay: "0.04s" },
    { h: 50, delay: "0.32s" },
    { h: 28, delay: "0.14s" },
    { h: 62, delay: "0.26s" },
    { h: 42, delay: "0.07s" },
  ];

  return (
    <div
      className={`p-3.5 rounded-xl bg-card/60 backdrop-blur-xs border border-border/80 space-y-2 select-none ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider">
        <span className="text-muted-foreground uppercase flex items-center gap-1.5 font-semibold">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status === "analyzing"
                ? "bg-primary animate-pulse"
                : status === "ready"
                ? "bg-emerald-500"
                : "bg-muted-foreground/60"
            }`}
          />
          CARRIER SIGNAL TRACE
        </span>
        <span className="text-muted-foreground/80">
          {status === "analyzing"
            ? "ACTIVE SAMPLING"
            : status === "ready"
            ? "TARGET STAGED"
            : status === "complete"
            ? "ACQUISITION DONE"
            : "STANDBY"}
        </span>
      </div>

      {/* Decorative Waveform / Histogram Bar Grid */}
      <div className="h-8 flex items-end gap-1 px-1 py-0.5 rounded bg-muted/30 border border-border/40 overflow-hidden">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`flex-1 rounded-xs transition-all duration-300 ${
              status === "analyzing"
                ? "bg-primary"
                : status === "ready"
                ? "bg-emerald-500/70"
                : "bg-muted-foreground/35"
            }`}
            style={{
              height: `${status === "analyzing" ? Math.max(15, bar.h) : bar.h * 0.7}%`,
              animation:
                status === "analyzing"
                  ? `signalTrace 1.4s ease-in-out infinite alternate ${bar.delay}`
                  : "none",
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/75">
        <span>RAW PIXELS</span>
        <span>→</span>
        <span>SPATIAL SIGNAL</span>
        <span>→</span>
        <span>EVIDENCE</span>
      </div>

      <style>{`
        @keyframes signalTrace {
          0% {
            transform: scaleY(0.4);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1.1);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.6);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
