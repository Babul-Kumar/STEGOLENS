import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ForensicBackground } from "@/components/forensic-background";
import {
  Binary,
  Layers,
  Activity,
  FileCode,
  Sliders,
  Cpu,
  ArrowRight,
  Eye,
  CheckCircle,
  HelpCircle,
  Hash,
  Terminal,
  ShieldAlert,
  ChevronRight,
  Info
} from "lucide-react";

export default function HowItWorksPage() {
  // Interactive 8-Bit Pixel Explorer state
  const [selectedBit, setSelectedBit] = useState<number>(0);

  // Interactive Shannon Entropy Visualizer state
  const [entropyPreset, setEntropyPreset] = useState<"low" | "natural" | "stego">("natural");

  // Interactive Container Structure state
  const [selectedFormat, setSelectedFormat] = useState<"jpeg" | "png">("jpeg");
  const [activeMarker, setActiveMarker] = useState<number>(6); // Default to EOI/Trailing

  const bitData = [
    {
      bit: 0,
      name: "Bit 0 (Least Significant Bit)",
      weight: 1,
      percentage: "0.39%",
      role: "Sensor Noise & Primary Steganography Target",
      visualImpact: "Imperceptible",
      explanation:
        "Flipping Bit 0 changes the color channel value by only 1 part out of 255. The human eye cannot perceive this change under normal viewing conditions. Consequently, naive steganography replaces Bit 0 with payload bits. However, this creates statistical symmetry between adjacent even/odd pixel pairs, which StegoLens detects via Pairs-of-Values (PoV) Chi-Square analysis.",
      stegoVulnerability: "Very High (Primary target for spatial LSB replacement and matching).",
    },
    {
      bit: 1,
      name: "Bit 1 (Low-Order Bit)",
      weight: 2,
      percentage: "0.78%",
      role: "Micro Texture & Multi-Bit Embedding",
      visualImpact: "Extremely Subtle",
      explanation:
        "Carries 2 units of intensity. Higher-capacity steganographic algorithms (2-bit LSB embedding) utilize Bit 1 alongside Bit 0 to achieve double payload capacity (0.25 bytes per channel). This noticeably flattens the local histogram variance.",
      stegoVulnerability: "High (Used in aggressive or high-capacity payload schemes).",
    },
    {
      bit: 2,
      name: "Bit 2 (Mid-Low Order Bit)",
      weight: 4,
      percentage: "1.57%",
      role: "Fine Gradient Shading",
      visualImpact: "Subtle Banding",
      explanation:
        "Controls subtle shading across smooth surfaces. Perturbing Bit 2 begins to introduce visible false-contour banding and noise across continuous skies or portraits.",
      stegoVulnerability: "Moderate (Rarely used in steganography due to visible distortion).",
    },
    {
      bit: 3,
      name: "Bit 3 (Mid-Order Bit)",
      weight: 8,
      percentage: "3.14%",
      role: "Surface Lighting & Texture Depth",
      visualImpact: "Visible Grain",
      explanation:
        "Mid-order bit carrying lighting variance. Modifications here produce obvious grain and stark statistical anomalies in standard deviation.",
      stegoVulnerability: "Low (Unsuitable for covert communication).",
    },
    {
      bit: 4,
      name: "Bit 4 (Mid-High Order Bit)",
      weight: 16,
      percentage: "6.27%",
      role: "Substantial Tone Variation",
      visualImpact: "Noticeable Artifacts",
      explanation:
        "Alters pixel value by 16 points. Causes severe color posterization if modified.",
      stegoVulnerability: "Very Low (Easily spotted visually).",
    },
    {
      bit: 5,
      name: "Bit 5 (High-Order Bit)",
      weight: 32,
      percentage: "12.55%",
      role: "Macro Scene Geometry",
      visualImpact: "Heavy Distortion",
      explanation:
        "Responsible for coarse shading and major object edges. Not usable for covert data hiding.",
      stegoVulnerability: "Negligible (Completely destroys visual integrity).",
    },
    {
      bit: 6,
      name: "Bit 6 (High-Order Bit)",
      weight: 64,
      percentage: "25.10%",
      role: "Primary Color Luminance",
      visualImpact: "Severe Color Shifts",
      explanation:
        "Dictates major quadrant brightness. Modifications invert local color palettes.",
      stegoVulnerability: "None.",
    },
    {
      bit: 7,
      name: "Bit 7 (Most Significant Bit)",
      weight: 128,
      percentage: "50.20%",
      role: "Fundamental Image Silhouette & Structure",
      visualImpact: "Dominant Image Architecture",
      explanation:
        "The Most Significant Bit (MSB). Encodes whether a pixel is in the upper (128-255) or lower (0-127) half of the dynamic range. Plane 7 displays the high-contrast structural silhouette of the original photograph.",
      stegoVulnerability: "None (Carries the structural visual semantics of the photograph).",
    },
  ];

  const entropyProfiles = {
    low: {
      title: "Low Entropy (Flat / Synthetic)",
      value: "1.84 bits/pixel",
      description: "Found in artificial graphics, logos, solid background areas, or heavy quantization. Very few distinct intensity values are used.",
      distribution: [85, 12, 2, 1, 0, 0, 0, 0],
      stegoRisk: "Anomalous if found in a natural camera photograph. Flat areas should have low entropy.",
    },
    natural: {
      title: "Natural Photographic Entropy",
      value: "7.15 bits/pixel",
      description: "Typical of real-world photographs with rich gradients, optical sensor noise, and varied dynamic range across 256 pixel values.",
      distribution: [10, 18, 22, 20, 14, 8, 5, 3],
      stegoRisk: "Expected baseline for pristine digital imagery. Exhibits smooth bell-shaped or multimodal distributions.",
    },
    stego: {
      title: "High Entropy (Compressed / Stego Payload)",
      value: "7.98 bits/pixel",
      description: "Encrypted or compressed ciphertext (e.g. AES, ZIP) injected into pixel bits drives the distribution to uniform randomness.",
      distribution: [12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5, 12.5],
      stegoRisk: "High Suspicion: An image surface with near-maximum entropy (7.9+) indicates randomized payload injection.",
    },
  };

  const jpegMarkers = [
    {
      marker: "0xFF 0xD8",
      name: "SOI",
      fullName: "Start of Image",
      desc: "Mandatory first 2 bytes of any compliant JPEG container. Decoders initialize decompression context here.",
      exploitable: "Rarely modified directly.",
    },
    {
      marker: "0xFF 0xE0 / 0xE1",
      name: "APP0 / APP1",
      fullName: "Application Markers (EXIF)",
      desc: "Stores camera parameters, timestamps, thumbnail, and EXIF metadata. Steganographers can hide data inside unused comment or header tags.",
      exploitable: "EXIF metadata steganography.",
    },
    {
      marker: "0xFF 0xDB",
      name: "DQT",
      fullName: "Define Quantization Table",
      desc: "Specifies 8x8 DCT quantization matrices. Non-standard tables often indicate recompression or third-party editing tools.",
      exploitable: "Quantization index modulation.",
    },
    {
      marker: "0xFF 0xC4",
      name: "DHT",
      fullName: "Define Huffman Table",
      desc: "Defines the frequency entropy encoding tables for the compressed bitstream.",
      exploitable: "Huffman table alterations.",
    },
    {
      marker: "0xFF 0xC0",
      name: "SOF0",
      fullName: "Start of Frame (Baseline DCT)",
      desc: "Declares pixel dimensions (width/height), color bit depth, and channel sampling (e.g. YCbCr 4:2:0).",
      exploitable: "Dimension spoofing.",
    },
    {
      marker: "0xFF 0xDA",
      name: "SOS",
      fullName: "Start of Scan",
      desc: "Marks the start of the entropy-encoded compressed image stream. Jsteg and OutGuess modify DCT coefficients here.",
      exploitable: "Transform-domain DCT steganography.",
    },
    {
      marker: "0xFF 0xD9",
      name: "EOI",
      fullName: "End of Image",
      desc: "Standard terminating marker. Image viewers cease decoding here. Any bytes appended past this marker are completely invisible to image viewers.",
      exploitable: "APPENDED / TRAILING DATA INJECTION (Primary EOF attack).",
    },
    {
      marker: "TRAILING",
      name: "EOF PAYLOAD",
      fullName: "Appended Non-Image Stream",
      desc: "Bytes injected after 0xFF 0xD9. Attackers append ZIP archives, PDFs, or executables. StegoLens flags this with +40 suspicion points.",
      exploitable: "DEFECTIVE CONTAINER / CONCEALED ARCHIVE.",
    },
  ];

  const pngChunks = [
    {
      marker: "89 50 4E 47",
      name: "MAGIC",
      fullName: "PNG Magic Bytes",
      desc: "8-byte canonical signature verifying the file as a Portable Network Graphic.",
      exploitable: "Format spoofing verification.",
    },
    {
      marker: "IHDR",
      name: "IHDR",
      fullName: "Image Header",
      desc: "Must be the first chunk. Contains dimensions, bit depth, color type, and compression method.",
      exploitable: "Chunk dimension manipulation.",
    },
    {
      marker: "tEXt / zTXt",
      name: "ANCILLARY",
      fullName: "Textual Data Chunks",
      desc: "Optional chunks for comments or author data. Frequently exploited to store base64-encoded scripts.",
      exploitable: "Metadata payload injection.",
    },
    {
      marker: "IDAT",
      name: "IDAT",
      fullName: "Image Data",
      desc: "Contains the zlib-deflated raster pixel data. Spatial LSB alterations hide within this compressed stream.",
      exploitable: "Spatial LSB replacement / matching.",
    },
    {
      marker: "IEND",
      name: "IEND",
      fullName: "Image Trailer",
      desc: "Marks the end of the PNG datastream (0x49 0x45 0x4E 0x44 0xAE 0x42 0x60 0x82). Decoders stop reading here.",
      exploitable: "Legal termination boundary.",
    },
    {
      marker: "TRAILING",
      name: "TRAILING INJECTION",
      fullName: "Overlay / Post-IEND Bytes",
      desc: "Data appended after the IEND chunk. StegoLens structural parser calculates the exact trailing byte count and offset.",
      exploitable: "Concealed ZIP or script payload.",
    },
  ];

  const activeMarkerList = selectedFormat === "jpeg" ? jpegMarkers : pngChunks;

  return (
    <div className="min-h-screen py-10 bg-background relative transition-colors">
      <ForensicBackground mode="idle" density="sparse" />
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium">
            <span>INTERACTIVE FORENSIC SIMULATOR</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            How Steganography & Steganalysis Work
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
            An interactive educational exploration of bit-plane physics, Shannon entropy distributions, container structural markers, and deep learning residual detection.
          </p>
        </div>

        {/* ============================================================== */}
        {/* SECTION 1: CORE DUALITY                                        */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-card border border-border space-y-3 interactive-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-primary font-semibold uppercase">THE CONCEALMENT</span>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight">Steganography</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Derived from Greek <em>steganos</em> ("hidden") and <em>graphein</em> ("writing"). The objective is to transmit a secret message inside an innocent carrier image such that an eavesdropper does not even suspect secret communication exists.
            </p>
            <div className="p-3 rounded-lg bg-muted/40 font-mono text-[11px] text-foreground border border-border/80">
              Cover Image + Hidden Payload = Stego Image (Visually Indistinguishable)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-3 interactive-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-500 font-semibold uppercase">THE DETECTION</span>
              <Binary className="h-4 w-4 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight">Steganalysis</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The counter-discipline of uncovering hidden data. When an attacker modifies pixel bits or container markers, they leave behind mathematical artifacts: bit entropy shifts, pairs-of-values equalizations, and high-frequency residual distortions.
            </p>
            <div className="p-3 rounded-lg bg-muted/40 font-mono text-[11px] text-foreground border border-border/80">
              Mathematical Profiling + Statistical Deviations = Calibrated Suspicion Score
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 2: INTERACTIVE 8-BIT PIXEL EXPLORER                    */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Binary className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Interactive 8-Bit Pixel Explorer
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select any bit from Plane 7 (MSB) to Plane 0 (LSB) to inspect its mathematical weight and steganographic susceptibility.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold self-start sm:self-auto">
              SPATIAL DOMAIN PHYSICS
            </Badge>
          </div>

          {/* Bit Selector Buttons */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {bitData.map((b) => {
              const isSelected = selectedBit === b.bit;
              const isLSB = b.bit === 0;
              return (
                <button
                  key={b.bit}
                  onClick={() => setSelectedBit(b.bit)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-mono ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : isLSB
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="text-[10px] uppercase opacity-75">Bit {b.bit}</div>
                  <div className="text-lg font-black mt-0.5">{isSelected ? "1" : "0"}</div>
                  <div className="text-[9px] opacity-75 mt-0.5">+{b.weight}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Bit Detail Card */}
          {(() => {
            const b = bitData[selectedBit];
            return (
              <div className="p-5 rounded-xl bg-muted/20 border border-border space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-black text-foreground flex items-center gap-2">
                      {b.name}
                      {b.bit === 0 && (
                        <Badge className="bg-primary text-primary-foreground font-mono text-[9px]">
                          TARGET BIT
                        </Badge>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">{b.role}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">WEIGHT</span>
                      <span className="font-bold text-foreground">{b.weight} / 255</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">CHANGE</span>
                      <span className="font-bold text-primary">{b.percentage}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">VISIBILITY</span>
                      <span className="font-bold text-foreground">{b.visualImpact}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed">
                  {b.explanation}
                </p>

                <div className="p-3 rounded-lg bg-background border border-border text-xs font-mono flex items-center justify-between">
                  <span className="text-muted-foreground">Steganography Susceptibility:</span>
                  <span className="font-bold text-primary">{b.stegoVulnerability}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ============================================================== */}
        {/* SECTION 3: SHANNON ENTROPY VISUALIZER                          */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Shannon Pixel Intensity Entropy
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Measure of informational uncertainty and randomness across 256 discrete pixel intensity values.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold self-start sm:self-auto">
              INFORMATION THEORY
            </Badge>
          </div>

          {/* Interactive Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(["low", "natural", "stego"] as const).map((key) => {
              const prof = entropyProfiles[key];
              const isSelected = entropyPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => setEntropyPreset(key)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-xs"
                      : "bg-muted/30 border-border hover:bg-muted/60"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground">{prof.title}</span>
                    <span className="font-mono text-xs font-bold text-primary">{prof.value}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">{prof.description}</p>
                </button>
              );
            })}
          </div>

          {/* Active Profile Visualization */}
          {(() => {
            const prof = entropyProfiles[entropyPreset];
            return (
              <div className="p-5 rounded-xl bg-muted/20 border border-border space-y-4 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">SIMULATED 8-OCTANT HISTOGRAM FREQUENCIES:</span>
                  <span className="font-bold text-foreground">{prof.value}</span>
                </div>

                {/* Simulated Distribution Bars */}
                <div className="h-28 w-full bg-background rounded-lg border border-border p-3 flex items-end gap-2">
                  {prof.distribution.map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className="w-full rounded-t bg-primary transition-all duration-300"
                        style={{ height: `${Math.max(4, (val / 90) * 100)}%` }}
                      />
                      <span className="text-[9px] font-mono text-muted-foreground">{idx * 32}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-background border border-border text-xs font-mono flex items-center justify-between">
                  <span className="text-muted-foreground">Forensic Significance:</span>
                  <span className="font-semibold text-foreground">{prof.stegoRisk}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ============================================================== */}
        {/* SECTION 4: CONTAINER STRUCTURE & MARKER TIMELINE               */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-black text-foreground tracking-tight">
                  Container Structure & Marker Timeline
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Explore how image container markers define boundaries, and where attackers append hidden trailing data.
              </p>
            </div>
            
            {/* Format Toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg border border-border font-mono text-xs">
              <button
                onClick={() => {
                  setSelectedFormat("jpeg");
                  setActiveMarker(6);
                }}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  selectedFormat === "jpeg"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                JPEG Markers
              </button>
              <button
                onClick={() => {
                  setSelectedFormat("png");
                  setActiveMarker(4);
                }}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  selectedFormat === "png"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                PNG Chunks
              </button>
            </div>
          </div>

          {/* Interactive Marker Buttons Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {activeMarkerList.map((m, idx) => {
              const isSelected = activeMarker === idx;
              const isTrailing = m.name.includes("TRAILING") || m.name.includes("EOF");
              return (
                <button
                  key={m.name}
                  onClick={() => setActiveMarker(idx)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-mono space-y-1 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                      : isTrailing
                      ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                      : "bg-muted/40 border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <div className="text-[10px] font-bold truncate">{m.name}</div>
                  <div className="text-[9px] opacity-75 truncate">{m.marker}</div>
                </button>
              );
            })}
          </div>

          {/* Active Marker Detail */}
          {(() => {
            const m = activeMarkerList[activeMarker] || activeMarkerList[0];
            const isTrailing = m.name.includes("TRAILING") || m.name.includes("EOF");
            return (
              <div className="p-5 rounded-xl bg-muted/20 border border-border space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="space-y-0.5">
                    <span className="text-sm font-black text-foreground flex items-center gap-2">
                      {m.fullName} ({m.name})
                      {isTrailing && (
                        <Badge className="bg-red-500 text-white font-mono text-[9px]">
                          ATTACK SURFACE
                        </Badge>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">Marker Signature: {m.marker}</span>
                  </div>
                </div>

                <p className="text-xs text-foreground leading-relaxed">{m.desc}</p>

                <div className="p-3 rounded-lg bg-background border border-border text-xs font-mono flex items-center justify-between">
                  <span className="text-muted-foreground">Steganography Exploitability:</span>
                  <span className={isTrailing ? "font-bold text-red-500" : "font-semibold text-primary"}>
                    {m.exploitable}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ============================================================== */}
        {/* SECTION 5: DEEP LEARNING (ALASKA2)                             */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-black text-foreground tracking-tight">
                Machine Learning Steganalysis: ALASKA2 EfficientNet-B0
              </h2>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30">
              ACTIVE INFERENCE ENGINE
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Modern adaptive steganography algorithms (such as <strong>J-UNIWARD</strong>, <strong>WOW</strong>, and <strong>S-UNIWARD</strong>) do not embed sequentially into flat LSB planes. Instead, they calculate complex pixel cost functions and hide bits exclusively in high-frequency visual textures where statistical tests are masked.
          </p>

          <p className="text-xs text-muted-foreground leading-relaxed">
            StegoLens utilizes an <strong>EfficientNet-B0</strong> baseline convolutional neural network trained on the <strong>ALASKA2 benchmark</strong> (Test ROC-AUC: 0.685, Weighted AUC: 0.767). The model inspects residual spatial noise patterns across a 512×512 interpolated grid to provide probabilistic detection of adaptive steganographic embeddings. Within the StegoLens forensic pipeline, neural inference functions as one corroborating evidence source rather than definitive standalone proof.
          </p>

          {/* Educational ML Architecture Pipeline Diagram */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
            <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold block">
              NEURAL STEGANALYSIS ARCHITECTURE PIPELINE
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="text-[10px] text-primary font-bold">01 • INPUT</span>
                <div className="font-bold text-foreground">CARRIER IMAGE</div>
                <p className="text-[10px] text-muted-foreground">512×512 resize, channel normalization</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="text-[10px] text-primary font-bold">02 • EXTRACTION</span>
                <div className="font-bold text-foreground">FEATURE MAPS</div>
                <p className="text-[10px] text-muted-foreground">Spatial residual high-pass filtering</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="text-[10px] text-primary font-bold">03 • NEURAL MODEL</span>
                <div className="font-bold text-foreground">EFFICIENTNET-B0</div>
                <p className="text-[10px] text-muted-foreground">Trained on ALASKA2 stego benchmark</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="text-[10px] text-primary font-bold">04 • INFERENCE</span>
                <div className="font-bold text-foreground">STEGANALYSIS SIGNAL</div>
                <p className="text-[10px] text-muted-foreground">Sigmoid output vs decision threshold</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link href="/analyze">
              <Button size="lg" className="h-10 text-xs font-semibold gap-2 interactive-btn">
                <span>Test an Image Now</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
