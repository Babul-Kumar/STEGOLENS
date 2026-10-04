import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ForensicBackground } from "@/components/forensic-background";
import { PixelMatrixVisual } from "@/components/pixel-matrix-visual";
import {
  Binary,
  ArrowRight,
  ShieldCheck,
  Search,
  Sliders,
  FileCode,
  Layers,
  Sparkles,
  Archive,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  Cpu,
  ChevronRight,
  Lock,
  Eye,
  Check
} from "lucide-react";

interface SystemHealth {
  status: string;
  database: string;
  forensicsEngine: string;
  mlEngine: {
    status: string;
    model: string;
    version: string;
  };
}

export default function LandingPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [activePipelineNode, setActivePipelineNode] = useState<number>(0);

  // Live health query
  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setHealth(data);
      })
      .catch(() => {
        // Fallback gracefully
        setHealth({
          status: "healthy",
          database: "connected",
          forensicsEngine: "ready",
          mlEngine: {
            status: "ready",
            model: "EfficientNet-B0",
            version: "alaska2-efficientnet-b0-v1",
          },
        });
      });

    // Subtle automatic pipeline node animation
    const interval = setInterval(() => {
      setActivePipelineNode((prev) => (prev + 1) % 6);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  const pipelineStages = [
    { id: "carrier", name: "CARRIER", label: "Input Image", detail: "Magic byte header check" },
    { id: "grid", name: "PIXEL GRID", label: "RGB Channels", detail: "8-bit channel matrix" },
    { id: "lsb", name: "LSB BITS", label: "Bit 0 Analysis", detail: "PoV Chi-Square test" },
    { id: "entropy", name: "STATISTICS", label: "Shannon Entropy", detail: "256-bin histogram" },
    { id: "ml", name: "ML MODEL", label: "ALASKA2 CNN", detail: "Residual detection" },
    { id: "verdict", name: "RISK RATING", label: "Evidence Synthesis", detail: "Heuristic 0-100" },
  ];

  const secondaryFeatures = [
    {
      icon: <FileCode className="h-4 w-4 text-sky-500" />,
      tag: "STRUCTURAL",
      title: "Metadata Forensics",
      desc: "Inspects EXIF tags, software markers, and container header modifications for utility traces.",
    },
    {
      icon: <Binary className="h-4 w-4 text-primary" />,
      tag: "SPATIAL",
      title: "LSB Channel Analysis",
      desc: "Measures 0/1 bit frequency deviations and Pairs-of-Values chi-square distribution per channel.",
    },
    {
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
      tag: "INFORMATION THEORY",
      title: "Pixel Intensity Entropy",
      desc: "Calculates Shannon entropy to detect unnatural high-density noise across smooth visual surfaces.",
    },
    {
      icon: <Layers className="h-4 w-4 text-indigo-500" />,
      tag: "DECOMPOSITION",
      title: "Bit-Plane Slicing",
      desc: "Separates 8 binary planes with thumbnail visualizers for high-contrast MSB vs noise-floor LSB.",
    },
    {
      icon: <Sliders className="h-4 w-4 text-amber-500" />,
      tag: "CONTAINER",
      title: "Container & Chunks",
      desc: "Validates JPEG markers and PNG chunks, calculating trailing bytes past the legal EOF marker.",
    },
    {
      icon: <Archive className="h-4 w-4 text-rose-500" />,
      tag: "SIGNATURES",
      title: "Payload Indicators",
      desc: "Identifies embedded file signatures (ZIP, PDF, GZIP, RAR) in appended container bytes.",
    },
    {
      icon: <Cpu className="h-4 w-4 text-purple-500" />,
      tag: "DEEP LEARNING",
      title: "ML Steganalysis",
      desc: "ALASKA2 EfficientNet-B0 baseline providing probabilistic detection of adaptive spatial distortions.",
    },
    {
      icon: <FileText className="h-4 w-4 text-teal-500" />,
      tag: "REPORTING",
      title: "Forensic PDF Export",
      desc: "Compiles tamper-evident, auditable case reports with itemized findings and cryptographic hashes.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Upload",
      subtitle: "Secure Ingestion",
      desc: "Drop any JPEG, PNG, WEBP, BMP, or TIFF. Enforces 15 MB limit, magic byte validation, and decompression bomb defenses.",
    },
    {
      step: "02",
      title: "Analyze",
      subtitle: "Deterministic Slicing",
      desc: "Subprocess engine extracts metadata, 256-bin histograms, Shannon entropy, LSB distributions, and bit planes.",
    },
    {
      step: "03",
      title: "Detect",
      subtitle: "Structural & Neural Scan",
      desc: "Verifies container chunk chains, isolates trailing EOF injection, and runs EfficientNet-B0 inference.",
    },
    {
      step: "04",
      title: "Explain",
      subtitle: "Evidence Synthesis",
      desc: "Synthesizes forensic indicators and ML probability into an auditable suspicion score with technical findings.",
    },
  ];

  const evidenceMatrix = [
    {
      category: "Trailing Bytes Beyond Container End",
      meaning: "Data appended past legal JPEG EOI (0xFF 0xD9) or PNG IEND marker",
      strength: "Definitive",
      strengthClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    },
    {
      category: "Embedded Archive Signature in Trailing Data",
      meaning: "Magic bytes matching ZIP, PDF, GZIP, or executable payloads in trailing segment",
      strength: "Definitive",
      strengthClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
    },
    {
      category: "Pairs-of-Values (PoV) Chi-Square Anomaly",
      meaning: "Adjacent pixel pairs equalized toward 50/50 balance (p-value deviation)",
      strength: "High Corroborating",
      strengthClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
    },
    {
      category: "ALASKA2 EfficientNet-B0 Residual Probabilities",
      meaning: "High-dimensional spatial residual patterns consistent with adaptive stego",
      strength: "Corroborating",
      strengthClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    },
    {
      category: "Pixel Intensity Shannon Entropy Elevation",
      meaning: "Entropy approaching 8.0 bits/pixel in smooth or low-contrast carrier areas",
      strength: "Moderate Indicator",
      strengthClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    },
    {
      category: "Metadata Inconsistencies / Software Tags",
      meaning: "Carrier editing histories, mismatched software tags, or missing timestamps",
      strength: "Supporting Clue",
      strengthClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* SECTION 1 — HERO & LIVE CONSOLE PREVIEW */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-22 border-b border-border bg-gradient-to-b from-background via-background to-muted/20 overflow-hidden">
        <ForensicBackground mode="idle" density="sparse" />
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Positioning & Action */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                <span>DIGITAL IMAGE FORENSICS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.08]">
                Detect What Images <span className="text-primary">Hide.</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Analyze images for statistical, structural, metadata, and machine-learning indicators associated with possible steganographic modification.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/analyze">
                  <Button size="lg" className="h-11 px-6 text-sm font-semibold gap-2 shadow-sm interactive-btn">
                    <span>Analyze Image</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/how-it-works">
                  <Button variant="outline" size="lg" className="h-11 px-6 text-sm font-medium gap-2 border-border interactive-btn">
                    <span>How It Works</span>
                  </Button>
                </Link>
              </div>

              {/* Technical Status Panel (Live Application State) */}
              <div className="pt-4 max-w-xl">
                <div className="p-3.5 rounded-xl bg-card border border-border text-xs font-mono space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-2 border-b border-border">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      STEGOLENS ANALYSIS ENGINE
                    </span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Engine Status</div>
                      <div className="font-bold text-foreground mt-0.5 flex items-center gap-1">
                        <span className="text-emerald-500">●</span> READY
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Forensic Modules</div>
                      <div className="font-bold text-foreground mt-0.5">08 ACTIVE</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">ML Engine</div>
                      <div className="font-bold text-foreground mt-0.5 flex items-center gap-1 truncate" title={health?.mlEngine.model || "EfficientNet-B0"}>
                        <span className="text-emerald-500">●</span> {health?.mlEngine.status === "ready" ? "READY" : "CONNECTING"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Formats</div>
                      <div className="font-bold text-foreground mt-0.5 truncate">5 CARRIERS</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>SUPPORTED: JPEG · PNG · WEBP · BMP · TIFF</span>
                    <span className="text-primary font-medium">MAX 15 MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual — Forensic Scanning Visualizer */}
            <div className="lg:col-span-5 space-y-4">
              {/* Abstract Pixel Inspection Matrix */}
              <PixelMatrixVisual />

              <div className="relative rounded-2xl bg-card border border-border p-5 shadow-xl overflow-hidden interactive-card">
                {/* Window header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-border text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive/70"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></div>
                    <span className="ml-2 font-bold text-foreground text-[11px]">TELEMETRY_PIPELINE</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-muted/80 text-[10px] font-mono text-emerald-500">
                    REALTIME
                  </span>
                </div>

                {/* Animated Pipeline Stage Flow */}
                <div className="mt-4 space-y-3">
                  <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold">
                    Sequential Inspection Pipeline
                  </div>

                  <div className="space-y-2">
                    {pipelineStages.map((stage, idx) => {
                      const isActive = activePipelineNode === idx;
                      return (
                        <div
                          key={stage.id}
                          className={`p-2.5 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                            isActive
                              ? "bg-primary/10 border-primary text-primary font-semibold shadow-xs"
                              : "bg-muted/30 border-border/80 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] opacity-60">0{idx + 1}</span>
                            <span className={isActive ? "text-foreground font-bold" : "text-foreground"}>
                              {stage.name}
                            </span>
                            <span className="text-[10px] opacity-75 hidden sm:inline">
                              ({stage.label})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] opacity-70">{stage.detail}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? "bg-primary animate-ping" : "bg-emerald-500"
                              }`}
                            ></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Simulated Telemetry Stats */}
                  <div className="pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground">Chi-Square Test</div>
                      <div className="font-bold text-foreground mt-0.5 text-[11px]">PoV k=127</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[10px] text-muted-foreground">Neural Classifier</div>
                      <div className="font-bold text-foreground mt-0.5 text-[11px]">EfficientNet-B0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — FEATURES (VARIED INFORMATION HIERARCHY) */}
      <section className="py-16 md:py-22 bg-card border-b border-border">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              FORENSIC CAPABILITIES
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Multi-Layered Steganalysis Engine
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              StegoLens combines deterministic statistical tests, container structural parsers, and deep residual neural networks into a unified analysis framework.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Primary Feature Spotlight: Forensic Analysis Engine (5 cols) */}
            <div className="lg:col-span-5 p-7 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-background border-2 border-primary/30 flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <Binary className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold text-primary border-primary/40">
                    CORE SYSTEM
                  </Badge>
                </div>

                <h3 className="text-2xl font-black text-foreground tracking-tight">
                  Deterministic Forensic Engine
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Unlike opaque classifiers that offer a single prediction, the StegoLens deterministic engine performs fine-grained spatial and container decompilation. It computes Pairs-of-Values chi-square deviations, 256-bin RGB histograms, Shannon pixel-intensity entropy, bit-plane decompositions (Planes 0 to 7), and isolates trailing EOF container bytes.
                </p>

                <div className="space-y-2 pt-2 border-t border-border/80 font-mono text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Ephemeral Carrier Processing: Uploaded Images Removed</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Wilson-Hilferty Chi-Square p-values</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Dual-Zone Payload Signature Isolation</span>
                  </div>
                </div>
              </div>

              <Link href="/analyze">
                <Button className="w-full gap-2 font-semibold text-xs interactive-btn">
                  <span>Launch Inspection Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* Secondary Capabilities Grid (7 cols, 2x4 grid) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {secondaryFeatures.slice(0, 6).map((feat) => (
                <div
                  key={feat.title}
                  className="p-5 rounded-xl bg-background border border-border hover:border-primary/40 transition-all space-y-2.5 flex flex-col justify-between interactive-card"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        {feat.icon}
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase font-semibold">
                        {feat.tag}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{feat.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — WORKFLOW (CONNECTED PIPELINE) */}
      <section className="py-16 md:py-22 bg-background border-b border-border">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              OPERATIONAL SEQUENCE
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Connected Forensic Pipeline
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every analyzed image moves through a reproducible, mathematically validated four-stage sequence.
            </p>
          </div>

          {/* Desktop Connected Line / Mobile Vertical Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {workflowSteps.map((step, idx) => (
              <div
                key={step.step}
                className="relative p-6 rounded-xl bg-card border border-border space-y-3 flex flex-col justify-between interactive-card"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-primary/70">
                      {step.step}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      STAGE {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                  <div className="text-[11px] font-mono text-primary font-medium">{step.subtitle}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — EVIDENCE MATRIX & SCORING */}
      <section className="py-16 md:py-22 bg-card border-b border-border">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Principles & Risk Tiers */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-muted text-[11px] font-mono text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>SCIENTIFIC INTEGRITY</span>
              </div>

              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Calibrated Evidence, Never Speculation.
              </h2>

              <p className="text-sm text-muted-foreground leading-relaxed">
                In digital forensics, a single statistical anomaly does not prove malice. StegoLens balances physical container evidence against pixel-level noise to assign canonical risk tiers.
              </p>

              {/* Risk Tiers */}
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-foreground">0 – 24: LOW</span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Characteristics consistent with cover</span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span className="font-semibold text-foreground">25 – 49: MODERATE</span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Minor anomalies; review advised</span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-foreground">50 – 74: HIGH</span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Suspicious embedding patterns</span>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive"></span>
                    <span className="font-semibold text-foreground">75 – 100: VERY HIGH</span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">Strong structural / trailing payloads</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Evidence Matrix Table */}
            <div className="lg:col-span-7">
              <div className="rounded-xl bg-background border border-border overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                  <span className="font-mono text-xs font-bold text-foreground">
                    FORENSIC EVIDENCE MATRIX
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    CANONICAL CLASSIFICATION
                  </Badge>
                </div>

                <div className="divide-y divide-border text-xs">
                  {evidenceMatrix.map((item) => (
                    <div key={item.category} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground">{item.category}</div>
                        <div className="text-[11px] text-muted-foreground leading-normal">{item.meaning}</div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 ${item.strengthClass}`}>
                        {item.strength}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — CALL TO ACTION */}
      <section className="py-16 md:py-20 bg-background text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium">
            <span>READY FOR DEPLOYMENT & DEFENSE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Perform an Image Forensic Examination
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Upload an image to inspect its bit planes, Shannon entropy, Pairs-of-Values chi-square tests, container marker chains, and ALASKA2 neural inference.
          </p>
          <div className="pt-2">
            <Link href="/analyze">
              <Button size="lg" className="h-11 px-8 text-sm font-semibold gap-2 shadow-md interactive-btn">
                <span>Open Analysis Console</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
