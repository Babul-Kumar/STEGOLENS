import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ForensicBackground } from "@/components/forensic-background";
import {
  Binary,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  Info,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Terminal,
  Lock,
  Activity,
  Sliders,
  FileCode,
  FileText
} from "lucide-react";

export default function AboutPage() {
  const technicalBadges = [
    { label: "ARCHITECTURE", value: "Hybrid Forensic + CNN" },
    { label: "DEEP LEARNING", value: "EfficientNet-B0 (ALASKA2)" },
    { label: "STATISTICAL ATTACK", value: "Pairs-of-Values (PoV) Chi-Square" },
    { label: "SPATIAL ANALYSIS", value: "8-Bit Plane Decomposition" },
    { label: "ENTROPY SCALE", value: "Shannon 0.0 - 8.0 bits/px" },
    { label: "IMAGE RETENTION", value: "Ephemeral Carrier Unlink" },
  ];

  const analysisVectors = [
    {
      num: "01",
      title: "Metadata & Container Headers",
      desc: "Scans EXIF markers, software tags, modification timestamps, and container chunk integrity for traces of steganographic encoders.",
    },
    {
      num: "02",
      title: "Least Significant Bit (LSB) Distribution",
      desc: "Measures 0/1 bit frequency symmetry and Wilson-Hilferty chi-square p-values across Red, Green, and Blue color channels.",
    },
    {
      num: "03",
      title: "Shannon Pixel-Intensity Entropy",
      desc: "Quantifies informational uncertainty to isolate unnatural high-entropy randomized blocks in smooth carrier surfaces.",
    },
    {
      num: "04",
      title: "Container Markers & Trailing Data",
      desc: "Parses JPEG SOI/EOI and PNG chunk chains, isolating byte-level offsets of data appended past the legal container termination.",
    },
    {
      num: "05",
      title: "Dual-Zone Embedded Payload Signatures",
      desc: "Searches for magic bytes corresponding to ZIP, PDF, GZIP, RAR, 7Z, and executable shellcode, separating trailing from stream matches.",
    },
    {
      num: "06",
      title: "ALASKA2 Neural Residual Steganalysis",
      desc: "Uses an EfficientNet-B0 CNN to detect high-frequency spatial residual perturbations characteristic of adaptive embedding.",
    },
  ];

  return (
    <div className="min-h-screen py-10 bg-background relative transition-colors">
      <ForensicBackground mode="idle" density="sparse" />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 relative z-10">
        
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium">
            <span>PLATFORM SPECIFICATION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            About StegoLens
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
            An open, multi-layer image steganalysis and digital forensics platform engineered to detect concealed payloads, structural container manipulation, and statistical anomalies.
          </p>
        </div>

        {/* Technical Badges Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          {technicalBadges.map((badge) => (
            <div key={badge.label} className="p-3 rounded-xl bg-card border border-border space-y-1">
              <span className="text-[9px] text-muted-foreground uppercase block font-semibold">
                {badge.label}
              </span>
              <span className="font-bold text-foreground block text-[11px] truncate" title={badge.value}>
                {badge.value}
              </span>
            </div>
          ))}
        </div>

        {/* SECTION 1: MISSION */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-mono font-bold text-primary uppercase">01 / MISSION</span>
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Scientific, Explainable Digital Forensics
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In digital forensics and incident response, analysts cannot rely on "black box" verdicts that simply spit out a generic risk score. StegoLens was built to provide rigorous, explainable, multi-vector evidence. Every finding is linked to tangible mathematical calculations—such as exact byte offsets, Pairs-of-Values chi-square deviations, 256-bin histogram distributions, and bit-plane slices.
          </p>
        </div>

        {/* SECTION 2: WHAT WE ANALYZE */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-mono font-bold text-primary uppercase">02 / WHAT WE ANALYZE</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Six Primary Analysis Vectors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisVectors.map((v) => (
              <div key={v.num} className="p-4 rounded-xl bg-background border border-border space-y-2">
                <span className="text-xs font-mono font-black text-primary block">{v.num}</span>
                <h3 className="text-sm font-bold text-foreground">{v.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: ML APPROACH */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-mono font-bold text-purple-500 uppercase">03 / MACHINE LEARNING</span>
            <Cpu className="h-4 w-4 text-purple-500" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            ALASKA2 EfficientNet-B0 Baseline
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Traditional spatial heuristics struggle when advanced adaptive steganography (e.g., J-UNIWARD, WOW, S-UNIWARD) embeds data exclusively in complex textures. StegoLens deploys an EfficientNet-B0 convolutional neural network trained on the ALASKA2 dataset as a baseline probabilistic classifier (Test ROC-AUC: 0.685, Weighted AUC: 0.767). The inference engine operates over standardized 512×512 bilinear resampled RGB tensors with ImageNet normalization, providing probabilistic corroboration rather than definitive proof of steganography.
          </p>
        </div>

        {/* SECTION 4: SECURITY & PRIVACY */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-mono font-bold text-emerald-500 uppercase">04 / PRIVACY & SECURITY</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Ephemeral Image Processing & History Storage
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Original uploaded images are processed temporarily and removed immediately after analysis. Analysis results and forensic metadata are stored in your local analysis history. StegoLens does not retain original uploaded carrier images on disk.
          </p>
        </div>

        {/* SECTION 5: SCIENTIFIC LIMITATIONS */}
        <div className="p-6 rounded-2xl bg-muted/30 border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">05 / SCIENTIFIC BOUNDARIES</span>
            <Info className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">
            Forensic Honesty & Operational Boundaries
          </h2>
          <ul className="space-y-2 text-xs text-muted-foreground list-disc list-inside leading-relaxed">
            <li>
              <strong>Steganalysis is Probabilistic:</strong> Mathematical and structural indicators establish strong evidence of modification, but do not constitute legal proof of payload content unless the payload has been explicitly extracted and decoded.
            </li>
            <li>
              <strong>Lossy Compression Artifacts:</strong> Social media messaging apps (e.g. WhatsApp, Facebook) re-encode and compress images, which frequently strips trailing container data and perturbs spatial LSB planes.
            </li>
            <li>
              <strong>Micro-Payload Embedding Rates:</strong> Payloads embedded at extremely low capacities (&lt; 0.05 bits per pixel) approach the statistical noise floor of physical optical camera sensors.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <Link href="/how-it-works">
            <Button variant="outline" className="text-xs font-medium interactive-btn">
              Explore How Steganography Works →
            </Button>
          </Link>
          <Link href="/analyze">
            <Button className="gap-2 text-xs font-semibold interactive-btn">
              <span>Launch Analysis Console</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
