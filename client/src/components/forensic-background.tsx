import React, { useEffect, useRef, useState } from "react";

interface ForensicBackgroundProps {
  mode?: "idle" | "ready" | "analyzing" | "complete";
  className?: string;
  density?: "sparse" | "normal" | "dense";
}

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  highlighted: boolean;
}

export function ForensicBackground({
  mode = "idle",
  className = "",
  density = "normal",
}: ForensicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let isVisible = document.visibilityState === "visible";

    // Track mouse with subtle bounding clamp
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Node generation scaled by viewport and density
    let nodes: Node[] = [];

    const resize = () => {
      if (!containerRef.current || !canvas) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Node count calculation: conservative for 60fps on all devices
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      let count = isMobile ? 12 : isTablet ? 20 : 32;
      if (density === "sparse") count = Math.round(count * 0.6);
      if (density === "dense") count = Math.round(count * 1.3);

      nodes = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        nodes.push({
          x,
          y,
          baseX: x,
          baseY: y,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 1.5 + 1.2,
          opacity: Math.random() * 0.35 + 0.15,
          highlighted: Math.random() > 0.85,
        });
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Render loop
    let lastTime = performance.now();

    const render = (time: number) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // If user prefers reduced motion or mode is complete, freeze/slow down
      const speedMultiplier = reducedMotion
        ? 0
        : mode === "complete"
        ? 0.15
        : mode === "analyzing"
        ? 1.5
        : 1.0;

      const mouse = mouseRef.current;
      const maxDist = 120; // Connection line threshold

      // Update and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (speedMultiplier > 0) {
          node.x += node.vx * speedMultiplier;
          node.y += node.vy * speedMultiplier;

          // Gentle drift boundaries
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          // Interactive subtle mouse response (0–8px max shift)
          if (mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 1) {
              const force = (1 - dist / 150) * 6; // Max 6px displacement
              const angle = Math.atan2(dy, dx);
              node.x -= Math.cos(angle) * force * 0.08;
              node.y -= Math.sin(angle) * force * 0.08;
            }
          }
        }

        // Draw node (small square or circle representing forensic data sample)
        const isHighlight = node.highlighted || (mode === "analyzing" && i % 3 === 0);
        ctx.fillStyle = isHighlight
          ? `rgba(59, 130, 246, ${node.opacity * (mode === "analyzing" ? 1.4 : 1.1)})`
          : `rgba(148, 163, 184, ${node.opacity * 0.7})`;

        // Draw pixel-style square for forensic motif
        ctx.fillRect(node.x - node.size / 2, node.y - node.size / 2, node.size, node.size);

        // Draw sparse connection lines
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const cdx = node.x - n2.x;
          const cdy = node.y - n2.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

          if (cdist < maxDist) {
            const alpha = (1 - cdist / maxDist) * 0.12 * (isHighlight ? 1.5 : 1);
            ctx.strokeStyle = isHighlight
              ? `rgba(59, 130, 246, ${alpha})`
              : `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (reducedMotion) {
      // Single static render pass for reduced motion
      render(performance.now());
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", resize);
    };
  }, [mode, density, reducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      {/* LAYER 1: Subtle forensic image pixel matrix grid */}
      <div
        className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,1) 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,1) 85%)",
        }}
      />

      {/* LAYER 2: Slow Forensic Scan Line (Horizontal Sweep, 8-12s cycle) */}
      {!reducedMotion && mode !== "complete" && (
        <div
          className={`absolute left-0 right-0 h-[2px] pointer-events-none ${
            mode === "analyzing"
              ? "opacity-25 bg-gradient-to-r from-transparent via-primary to-transparent"
              : "opacity-10 bg-gradient-to-r from-transparent via-primary/80 to-transparent"
          }`}
          style={{
            animation: mode === "analyzing" ? "forensicScan 4s linear infinite" : "forensicScan 10s linear infinite",
          }}
        />
      )}

      {/* LAYER 3: Sparse Interactive Forensic Nodes & Signal Paths */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Soft Vignette Overlay to guarantee high contrast on center text */}
      <div
        className="absolute inset-0 pointer-events-none bg-radial-vignette opacity-40 dark:opacity-60"
        style={{
          background: "radial-gradient(circle at 50% 30%, transparent 40%, hsl(var(--background)) 95%)",
        }}
      />

      <style>{`
        @keyframes forensicScan {
          0% {
            top: -2%;
            opacity: 0;
          }
          10% {
            opacity: ${mode === "analyzing" ? 0.35 : 0.15};
          }
          90% {
            opacity: ${mode === "analyzing" ? 0.35 : 0.15};
          }
          100% {
            top: 102%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
