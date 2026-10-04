import React, { useEffect, useState } from "react";

export function PixelMatrixVisual({ className = "" }: { className?: string }) {
  const [activeCell, setActiveCell] = useState<number>(14);

  // Subtle slow highlight progression across the pixel grid
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCell(Math.floor(Math.random() * 64));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`p-4 rounded-xl bg-card/80 backdrop-blur-xs border border-border/80 space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-[11px] font-mono">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          PIXEL INSPECTION MATRIX
        </span>
        <span className="text-[10px] text-muted-foreground">8×8 SPATIAL BLOCK</span>
      </div>

      {/* 8x8 Pixel Grid */}
      <div className="relative rounded-lg p-2.5 bg-muted/40 border border-border/60 overflow-hidden">
        {/* Slow subtle horizontal scan line */}
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent pointer-events-none"
          style={{
            animation: "matrixScan 6s linear infinite",
          }}
        />

        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 64 }).map((_, i) => {
            const isTarget = i === activeCell;
            const isNeighbor = Math.abs(i - activeCell) === 1 || Math.abs(i - activeCell) === 8;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xs transition-colors duration-500 flex items-center justify-center text-[7px] font-mono ${
                  isTarget
                    ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                    : isNeighbor
                    ? "bg-primary/25 border border-primary/40 text-foreground"
                    : "bg-muted/70 hover:bg-muted border border-border/40 text-muted-foreground/40"
                }`}
                title={`Pixel #${i}`}
              >
                {isTarget ? "0" : ""}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>Plane: 0 (LSB)</span>
        <span>Entropy: 7.91 b/px</span>
        <span>Status: Sampled</span>
      </div>

      <style>{`
        @keyframes matrixScan {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 0.6; }
          85% { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
