import { Link } from "wouter";
import { Binary, Shield, Info, Terminal, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                <Binary className="h-3.5 w-3.5" />
              </div>
              <span className="font-extrabold tracking-tight text-foreground text-sm">
                STEGO<span className="text-primary">LENS</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              Digital image steganography detection and forensics platform. Engineered for structural container parsing, statistical hypothesis testing, and deep learning residual steganalysis.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>EfficientNet-B0 Baseline • Ephemeral Carrier Removal</span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground font-mono">
              Platform
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/analyze" className="hover:text-primary transition-colors">
                  Analysis Console
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-primary transition-colors">
                  Analysis History
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About StegoLens
                </Link>
              </li>
            </ul>
          </div>

          {/* Technology & Scope */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground font-mono">
              Technology Stack
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground font-mono text-[11px]">
              <li>Pairs-of-Values (PoV) Chi-Square</li>
              <li>Shannon Pixel-Intensity Entropy</li>
              <li>ALASKA2 EfficientNet-B0 (PyTorch)</li>
              <li>Container Marker & Chunk Parser</li>
              <li>PDF Forensic Report Generator</li>
            </ul>
          </div>
        </div>

        {/* Forensic Disclaimer */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground leading-normal flex items-start gap-2.5">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground font-medium">Forensic Disclaimer:</strong> StegoLens evaluates mathematical and structural indicators consistent with possible steganographic manipulation. Results represent evidentiary indicators and do not constitute absolute proof unless an authentic payload has been extracted and verified.
          </p>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground font-mono">
          <p>© {new Date().getFullYear()} StegoLens. Digital Image Forensics & Steganalysis.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-500">
              <Lock className="h-3 w-3" /> Ephemeral Carrier Images
            </span>
            <span>•</span>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
