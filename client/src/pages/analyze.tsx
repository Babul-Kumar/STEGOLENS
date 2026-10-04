import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AnalysisResult } from "@shared/schema";
import {
  UploadCloud,
  FileImage,
  X,
  Shield,
  Info,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Activity,
  Sliders,
  FileText,
  Binary,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Hash,
  Eye,
  Terminal,
  Download,
  Copy,
  Check,
  Maximize2,
  HelpCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface ValidationError {
  code: string;
  title: string;
  message: string;
}

export default function AnalyzePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>("findings");
  const [histogramChannel, setHistogramChannel] = useState<"all" | "red" | "green" | "blue" | "grayscale">("all");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check URL query for persisted analysis ID (?id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setIsAnalyzing(true);
      fetch(`/api/analyses/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load requested analysis");
          return res.json();
        })
        .then((data) => {
          if (data.analysis) {
            setAnalysisResult(data.analysis);
          }
        })
        .catch((err) => {
          setValidationError({
            code: "LOAD_FAILED",
            title: "Analysis Not Found",
            message: err.message || "Could not retrieve the saved analysis record.",
          });
        })
        .finally(() => setIsAnalyzing(false));
    }
  }, []);

  const getFriendlyErrorMessage = (code?: string, rawMessage?: string): { title: string; message: string } => {
    switch (code) {
      case "FILE_TOO_LARGE":
        return {
          title: "File Exceeds Upload Limit",
          message: "File exceeds the 15 MB upload limit.",
        };
      case "UNSUPPORTED_FORMAT":
        return {
          title: "Unsupported Image Format",
          message: "Supported formats: JPEG, PNG, WEBP, BMP, TIFF.",
        };
      case "INVALID_SIGNATURE":
        return {
          title: "Invalid File Signature",
          message: "This file could not be validated as a supported image.",
        };
      case "INVALID_IMAGE":
        return {
          title: "Invalid or Corrupted Image",
          message: "This file could not be validated as a supported image.",
        };
      case "IMAGE_TOO_LARGE":
        return {
          title: "Dimension Limit Exceeded",
          message: "Image dimensions exceed the 8192px limit or decompression safety threshold.",
        };
      case "RATE_LIMIT_EXCEEDED":
        return {
          title: "Upload Rate Limit Exceeded",
          message: "Too many upload attempts. Please wait a moment before trying again.",
        };
      case "INVALID_REQUEST":
        return {
          title: "Malformed Request",
          message: "Invalid file or empty upload payload.",
        };
      default:
        return {
          title: "Forensic Analysis Failed",
          message: rawMessage || "This file could not be analyzed.",
        };
    }
  };

  const executeForensicAnalysis = async (file: File) => {
    setIsAnalyzing(true);
    setValidationError(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorInfo = getFriendlyErrorMessage(data?.error?.code, data?.error?.message);
        setValidationError({
          code: data?.error?.code || "ANALYSIS_FAILED",
          title: errorInfo.title,
          message: errorInfo.message,
        });
        return;
      }

      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setActiveTab("findings");
      }
    } catch (err: any) {
      setValidationError({
        code: "NETWORK_ERROR",
        title: "Connection Error",
        message: "Failed to connect to forensic analysis server. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections && fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const error = rejection.errors[0];

        if (error.code === "file-too-large") {
          setValidationError({
            code: "FILE_TOO_LARGE",
            title: "File Exceeds Upload Limit",
            message: "File exceeds the 15 MB upload limit.",
          });
        } else if (error.code === "file-invalid-type") {
          setValidationError({
            code: "UNSUPPORTED_FORMAT",
            title: "Unsupported Image Format",
            message: "Supported formats: JPEG, PNG, WEBP, BMP, TIFF.",
          });
        } else {
          setValidationError({
            code: "INVALID_IMAGE",
            title: "Invalid File",
            message: "This file could not be validated as a supported image.",
          });
        }
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);

      // Execute forensic analysis automatically upon drop
      executeForensicAnalysis(file);
    },
    [previewUrl]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/bmp": [".bmp"],
      "image/tiff": [".tiff", ".tif"],
    },
    maxSize: 15 * 1024 * 1024, // 15MB
    multiple: false,
  });

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setValidationError(null);
    setIsAnalyzing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getScoreBadge = (score: number, level: string) => {
    if (level === "VERY_HIGH" || score >= 75) {
      return {
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
        barClass: "bg-red-500",
        label: "VERY HIGH",
        interpretation: "Multiple independent indicators consistent with high probability of steganographic modification or appended trailing payload.",
      };
    }
    if (level === "HIGH" || score >= 50) {
      return {
        badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
        barClass: "bg-orange-500",
        label: "HIGH",
        interpretation: "Elevated statistical or structural anomalies detected. Further forensic inspection recommended.",
      };
    }
    if (level === "MODERATE" || score >= 25) {
      return {
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        barClass: "bg-amber-500",
        label: "MODERATE",
        interpretation: "Minor statistical deviations from expected baseline; may be caused by high-frequency natural texture or compression artifacts.",
      };
    }
    return {
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      barClass: "bg-emerald-500",
      label: "LOW",
      interpretation: "No significant steganographic indicators detected. Characteristics consistent with unmodified cover image.",
    };
  };

  const activeEnginesList = [
    { name: "Secure Ingestion & Decompression Defense", ready: true, detail: "15 MB cap · magic bytes · 8192px max" },
    { name: "Metadata & Container Headers", ready: true, detail: "EXIF · software tags · chunk markers" },
    { name: "Channel Moments & RGB Statistics", ready: true, detail: "mean · variance · standard deviation" },
    { name: "Shannon Pixel Intensity Entropy", ready: true, detail: "information density · scale 0-8 bits" },
    { name: "Least Significant Bit (LSB) Distribution", ready: true, detail: "0/1 ratio · bit entropy per channel" },
    { name: "Pairs-of-Values (PoV) Chi-Square Test", ready: true, detail: "128 pairs · Wilson-Hilferty p-value" },
    { name: "Bit-Plane Decomposition (Planes 0-7)", ready: true, detail: "Plane 0 (LSB) · Plane 7 (MSB) extraction" },
    { name: "Structural Chunk & Trailing Byte Scan", ready: true, detail: "EOF/EOI offset · trailing byte volume" },
    { name: "ALASKA2 EfficientNet-B0 Steganalysis", ready: true, detail: "PyTorch CPU · spatial residual CNN" },
  ];

  return (
    <div className="min-h-screen py-8 bg-background transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Header / Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono text-primary font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FORENSIC ANALYSIS CONSOLE</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">EFFICIENTNET-B0 + POV CHI-SQUARE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Digital Steganalysis & Evidence Inspection
            </h1>
          </div>

          {analysisResult && (
            <div className="flex items-center gap-2">
              <a
                href={`/api/analyses/${analysisResult.id}/report?format=pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 interactive-btn">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download PDF Report</span>
                </Button>
              </a>
              <a href={`/api/analyses/${analysisResult.id}/report?format=json`} download>
                <Button size="sm" variant="outline" className="h-8 text-xs font-mono gap-1.5 interactive-btn">
                  <span>Export JSON</span>
                </Button>
              </a>
              <Button size="sm" onClick={handleReset} variant="ghost" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>New Analysis</span>
              </Button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: RESULTS DASHBOARD (WHEN ANALYSIS RESULT EXISTS)        */}
        {/* ============================================================== */}
        {analysisResult ? (
          <div className="space-y-6 animate-fade-in">
            {/* Top Analysis Complete Banner */}
            <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-500">ANALYSIS COMPLETE</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                      ID: {String(analysisResult.id).slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-foreground truncate max-w-md sm:max-w-xl" title={analysisResult.file.name}>
                    {analysisResult.file.name}
                  </div>
                </div>
              </div>

              {/* Quick file metrics & SHA-256 Copy */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px]">FORMAT</span>
                  <span className="font-bold text-foreground">{analysisResult.file.format} ({analysisResult.file.channels === 1 ? 'GRAY' : 'RGB'})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">DIMENSIONS</span>
                  <span className="font-bold text-foreground">{analysisResult.file.width} × {analysisResult.file.height} px</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">SIZE</span>
                  <span className="font-bold text-foreground">{formatBytes(analysisResult.file.size)}</span>
                </div>
                <div className="pl-2 border-l border-border">
                  <span className="text-muted-foreground block text-[10px]">SHA-256</span>
                  <button
                    onClick={() => copyToClipboard(analysisResult.file.sha256)}
                    className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors cursor-pointer group"
                    title="Click to copy full SHA-256 hash"
                  >
                    <span className="font-mono text-xs">{analysisResult.file.sha256.slice(0, 10)}...</span>
                    {copiedHash ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Triad Evidence Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Pillar 1: Heuristic Suspicion Score (4 cols) */}
              {(() => {
                const scoreInfo = getScoreBadge(analysisResult.risk.score, analysisResult.risk.level);
                return (
                  <div className="md:col-span-4 p-5 rounded-xl bg-card border border-border space-y-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                          FORENSIC SUSPICION
                        </span>
                        <Badge variant="outline" className={`font-mono text-[10px] font-bold px-2 py-0.5 ${scoreInfo.badgeClass}`}>
                          {scoreInfo.label}
                        </Badge>
                      </div>

                      <div className="pt-3 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-4xl font-black font-mono tracking-tight text-foreground">
                            {analysisResult.risk.score}
                            <span className="text-sm text-muted-foreground font-normal ml-1">/ 100</span>
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            Level: {analysisResult.risk.level}
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${scoreInfo.barClass}`}
                            style={{ width: `${Math.max(5, analysisResult.risk.score)}%` }}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                          {scoreInfo.interpretation}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Total Findings: {analysisResult.risk.findings.length}</span>
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Carrier Unlinked
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Pillar 2: ML Steganalysis Score (4 cols) */}
              <div className="md:col-span-4 p-5 rounded-xl bg-card border border-border space-y-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      ML STEGANALYSIS
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] font-bold px-2 py-0.5 ${
                        analysisResult.ml.prediction === "stego"
                          ? "text-red-500 border-red-500/30 bg-red-500/10"
                          : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                      }`}
                    >
                      {analysisResult.ml.prediction ? analysisResult.ml.prediction.toUpperCase() : "AWAITING"}
                    </Badge>
                  </div>

                  <div className="pt-3 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-4xl font-black font-mono tracking-tight text-foreground">
                        {analysisResult.ml.probability !== null
                          ? `${(analysisResult.ml.probability * 100).toFixed(1)}%`
                          : "N/A"}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        Threshold: 22.0%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (analysisResult.ml.probability || 0) >= 0.22 ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, (analysisResult.ml.probability || 0) * 100))}%` }}
                      />
                      <div className="absolute top-0 bottom-0 left-[22%] w-0.5 bg-foreground/60" />
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                      {analysisResult.ml.prediction === "stego"
                        ? "Deep learning model detected spatial residual perturbations typical of adaptive steganography."
                        : "Neural network identified no anomalous residual perturbations above the calibrated decision boundary."}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Model: EfficientNet-B0</span>
                  <span className="text-primary">ALASKA2</span>
                </div>
              </div>

              {/* Pillar 3: Overall Assessment & Why? (4 cols) */}
              <div className="md:col-span-4 p-5 rounded-xl bg-card border border-border space-y-3 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      OVERALL ASSESSMENT
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">SYNTHESIS</span>
                  </div>

                  <p className="text-xs text-foreground leading-relaxed pt-2">
                    {analysisResult.risk.overallAssessment ||
                      "Characteristics evaluated across independent statistical, structural, and neural forensic modules."}
                  </p>

                  {/* Checklist of why */}
                  <div className="pt-3 space-y-1.5 text-xs font-mono">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Evidence Checklist:</div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {analysisResult.fileStructure.hasUnexpectedTrailingBytes ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className={analysisResult.fileStructure.hasUnexpectedTrailingBytes ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                        {analysisResult.fileStructure.hasUnexpectedTrailingBytes ? "Trailing Container Data Detected" : "Clean Container Termination"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {analysisResult.payloadDetection.detected ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className={analysisResult.payloadDetection.detected ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                        {analysisResult.payloadDetection.detected ? "Embedded Payload Signature Match" : "No Payload Signatures Found"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {analysisResult.ml.prediction === "stego" ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className={analysisResult.ml.prediction === "stego" ? "text-red-500 font-semibold" : "text-muted-foreground"}>
                        {analysisResult.ml.prediction === "stego" ? "Elevated Neural Stego Probability" : "Neural Residuals Within Baseline"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border text-[10px] text-muted-foreground font-mono">
                  Scientific Disclaimer: Corroborating evidence; not absolute judicial proof.
                </div>
              </div>
            </div>

            {/* Main Tabs Forensic Console */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span>Forensic Inspection Suite</span>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground font-mono">
                    Deep inspection of extracted data layers
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto sm:h-9 p-1 bg-muted/60">
                    <TabsTrigger value="findings" className="text-xs py-1.5">
                      Findings ({analysisResult.risk.findings.length})
                    </TabsTrigger>
                    <TabsTrigger value="ml" className="text-xs py-1.5">
                      ML Steganalysis
                    </TabsTrigger>
                    <TabsTrigger value="lsb" className="text-xs py-1.5">
                      LSB & Bit Planes
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="text-xs py-1.5">
                      Pixel Entropy & Stats
                    </TabsTrigger>
                    <TabsTrigger value="structure" className="text-xs py-1.5">
                      Container & Payload
                    </TabsTrigger>
                  </TabsList>

                  {/* ============================================================ */}
                  {/* TAB 1: FINDINGS & ITEMIZATION                                */}
                  {/* ============================================================ */}
                  <TabsContent value="findings" className="space-y-4 focus-visible:outline-none">
                    <div className="space-y-3">
                      {analysisResult.risk.findings.map((finding, idx) => {
                        const isSuspicious = finding.status === "suspicious";
                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border text-xs space-y-2 transition-colors ${
                              isSuspicious
                                ? "bg-amber-500/5 border-amber-500/25"
                                : "bg-card border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground flex items-center gap-2 text-sm">
                                {isSuspicious ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                )}
                                {finding.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono uppercase font-bold ${
                                    isSuspicious
                                      ? "text-amber-600 dark:text-amber-400 border-amber-500/30"
                                      : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  }`}
                                >
                                  {isSuspicious ? "ANOMALY" : "NORMAL"}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-mono capitalize">
                                  {finding.category}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {finding.message}
                            </p>
                            {finding.evidence && (
                              <div className="p-2.5 rounded-lg bg-muted/50 font-mono text-[11px] text-foreground border border-border/60 overflow-x-auto">
                                <span className="text-muted-foreground">Evidence Detail: </span>
                                <span className="font-semibold">{finding.evidence}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* ============================================================ */}
                  {/* TAB 2: ML STEGANALYSIS                                      */}
                  {/* ============================================================ */}
                  <TabsContent value="ml" className="space-y-4 focus-visible:outline-none">
                    <div className="p-5 rounded-xl bg-card border border-border space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">ALASKA2 EfficientNet-B0 Deep Learning Model</h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono font-bold ${
                            analysisResult.ml.status === "ready"
                              ? "text-emerald-500 border-emerald-500/30"
                              : "text-amber-500 border-amber-500/30"
                          }`}
                        >
                          STATUS: {analysisResult.ml.status.toUpperCase()}
                        </Badge>
                      </div>

                      {analysisResult.ml.status === "ready" && analysisResult.ml.probability !== null ? (
                        <div className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                              <span className="text-[10px] font-mono text-muted-foreground block uppercase">Prediction</span>
                              <span className={`text-lg font-black font-mono mt-0.5 block ${analysisResult.ml.prediction === "stego" ? "text-red-500" : "text-emerald-500"}`}>
                                {analysisResult.ml.prediction?.toUpperCase()}
                              </span>
                            </div>
                            <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                              <span className="text-[10px] font-mono text-muted-foreground block uppercase">Stego Probability</span>
                              <span className="text-lg font-black font-mono text-foreground mt-0.5 block">
                                {(analysisResult.ml.probability * 100).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">Calibrated Decision Boundary: 22.0%</span>
                            </div>
                            <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                              <span className="text-[10px] font-mono text-muted-foreground block uppercase">Model Confidence</span>
                              <span className="text-lg font-black font-mono capitalize text-foreground mt-0.5 block">
                                {analysisResult.ml.confidence || "Medium"}
                              </span>
                            </div>
                          </div>

                          {/* Gauge Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                              <span>0.0% (Cover)</span>
                              <span className="text-primary font-bold">Boundary: 22.0%</span>
                              <span>100.0% (Stego)</span>
                            </div>
                            <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  analysisResult.ml.probability >= 0.22 ? "bg-red-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, analysisResult.ml.probability * 100))}%` }}
                              />
                              <div className="absolute top-0 bottom-0 left-[22%] w-0.5 bg-foreground" />
                            </div>
                          </div>

                          {/* Scientific Context & Benchmark Evaluation */}
                          <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2 text-xs text-muted-foreground">
                            <p className="leading-relaxed">
                              {analysisResult.ml.description ||
                                "The ALASKA2 EfficientNet-B0 baseline evaluates spatial residual characteristics across a 512×512 interpolated grid. ML probability serves as a corroborating probabilistic indicator alongside deterministic structural and statistical extractors, rather than definitive proof of steganography."}
                            </p>
                            <div className="pt-2 border-t border-border flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-foreground/80">
                              <span>Model: EfficientNet-B0</span>
                              <span>Baseline: ALASKA2</span>
                              <span>Test ROC-AUC: {analysisResult.ml.metrics?.test_roc_auc?.toFixed(3) || "0.685"}</span>
                              <span>Validation ROC-AUC: {analysisResult.ml.metrics?.val_roc_auc?.toFixed(3) || "0.697"}</span>
                              <span>Weighted AUC: {analysisResult.ml.metrics?.weighted_auc?.toFixed(3) || "0.767"}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {analysisResult.ml.disclaimer || "Machine learning inference unavailable. Deterministic forensic analysis remains active."}
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  {/* ============================================================ */}
                  {/* TAB 3: LSB & BIT PLANES                                     */}
                  {/* ============================================================ */}
                  <TabsContent value="lsb" className="space-y-6 focus-visible:outline-none">
                    {/* RGB Channels LSB Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(["red", "green", "blue"] as const).map((channel) => {
                        const detail = analysisResult.lsb[channel];
                        if (!detail) return null;
                        const channelColor =
                          channel === "red"
                            ? "bg-red-500"
                            : channel === "green"
                            ? "bg-emerald-500"
                            : "bg-blue-500";
                        return (
                          <div key={channel} className="p-4 rounded-xl bg-card border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground capitalize flex items-center gap-2 text-xs">
                                <span className={`w-2.5 h-2.5 rounded-full ${channelColor}`} />
                                {channel} Channel LSB
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-mono uppercase font-bold ${
                                  detail.status === "suspicious"
                                    ? "text-amber-500 border-amber-500/30"
                                    : "text-emerald-500 border-emerald-500/30"
                                }`}
                              >
                                {detail.status}
                              </Badge>
                            </div>

                            <div className="space-y-1.5 text-xs font-mono">
                              <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-muted-foreground">1-Bit Frequency:</span>
                                <span className="font-bold text-foreground">{(detail.onesRatio * 100).toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-muted-foreground">0-Bit Frequency:</span>
                                <span className="font-bold text-foreground">{((1 - detail.onesRatio) * 100).toFixed(2)}%</span>
                              </div>
                              <div className="flex justify-between py-1 border-b border-border/50">
                                <span className="text-muted-foreground">LSB Bit Entropy:</span>
                                <span className="text-foreground">{detail.entropy.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between py-1">
                                <span className="text-muted-foreground">PoV Chi-Square p-val:</span>
                                <span className="font-bold text-foreground">
                                  {detail.chiSquarePValue !== undefined ? detail.chiSquarePValue.toFixed(4) : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Extracted ASCII Preview */}
                    {analysisResult.lsb.overall.decodedPreview && (
                      <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Terminal className="h-4 w-4 text-primary" />
                          LSB Decoded Stream Sample (ASCII Translation)
                        </span>
                        <pre className="p-3 rounded-lg bg-muted/60 font-mono text-[11px] text-foreground overflow-x-auto whitespace-pre-wrap break-all border border-border">
                          {analysisResult.lsb.overall.decodedPreview}
                        </pre>
                        <div className="text-[11px] text-muted-foreground font-mono flex justify-between">
                          <span>Printable ASCII Ratio: {(analysisResult.lsb.overall.printableRatio * 100).toFixed(1)}%</span>
                          <span>Checked Sequential LSBs</span>
                        </div>
                      </div>
                    )}

                    {/* Interactive Bit-Plane Gallery */}
                    {analysisResult.visualizations.bitPlanes && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            Bit-Plane Decomposition Gallery
                          </h4>
                          <span className="text-xs text-muted-foreground font-mono">
                            Click thumbnail to inspect full resolution
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Plane 0 (LSB) — Highlighted as primary forensic interest */}
                          {analysisResult.visualizations.bitPlanes.plane_0_lsb && (
                            <div className="p-4 rounded-xl bg-card border-2 border-primary/40 space-y-3 relative overflow-hidden group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-primary text-primary-foreground font-mono text-[10px] font-bold">
                                    PLANE 0 — LSB
                                  </Badge>
                                  <span className="text-xs font-bold text-foreground">Least Significant Bit</span>
                                </div>
                                <span className="text-[10px] font-mono text-primary font-semibold">
                                  FORENSIC CRITICAL
                                </span>
                              </div>

                              <div
                                onClick={() =>
                                  setEnlargedImage({
                                    src: analysisResult.visualizations.bitPlanes?.plane_0_lsb || "",
                                    title: "Plane 0 (Least Significant Bit)",
                                  })
                                }
                                className="relative rounded-lg overflow-hidden bg-muted/50 border border-border aspect-square max-h-60 flex items-center justify-center cursor-pointer group-hover:border-primary transition-all"
                              >
                                <img
                                  src={analysisResult.visualizations.bitPlanes.plane_0_lsb}
                                  alt="Bit Plane 0 (LSB)"
                                  className="w-full h-full object-contain p-2"
                                />
                                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-foreground text-xs font-mono font-medium gap-1.5">
                                  <Maximize2 className="h-4 w-4" />
                                  <span>Enlarge Plane 0</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Plane 0 isolates the lowest order bits. In natural photographs, subtle sensor noise is visible. Synthetic steganography appears as uniform white static noise.
                              </p>
                            </div>
                          )}

                          {/* Plane 7 (MSB) */}
                          {analysisResult.visualizations.bitPlanes.plane_7_msb && (
                            <div className="p-4 rounded-xl bg-card border border-border space-y-3 group">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                    PLANE 7 — MSB
                                  </Badge>
                                  <span className="text-xs font-bold text-foreground">Most Significant Bit</span>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  STRUCTURAL
                                </span>
                              </div>

                              <div
                                onClick={() =>
                                  setEnlargedImage({
                                    src: analysisResult.visualizations.bitPlanes?.plane_7_msb || "",
                                    title: "Plane 7 (Most Significant Bit)",
                                  })
                                }
                                className="relative rounded-lg overflow-hidden bg-muted/50 border border-border aspect-square max-h-60 flex items-center justify-center cursor-pointer group-hover:border-primary transition-all"
                              >
                                <img
                                  src={analysisResult.visualizations.bitPlanes.plane_7_msb}
                                  alt="Bit Plane 7 (MSB)"
                                  className="w-full h-full object-contain p-2"
                                />
                                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-foreground text-xs font-mono font-medium gap-1.5">
                                  <Maximize2 className="h-4 w-4" />
                                  <span>Enlarge Plane 7</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Plane 7 isolates the highest order bits carrying visual shapes, outlines, and silhouette luminance of the carrier image.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* ============================================================ */}
                  {/* TAB 4: PIXEL ENTROPY & HISTOGRAM                             */}
                  {/* ============================================================ */}
                  <TabsContent value="statistics" className="space-y-6 focus-visible:outline-none">
                    {/* 4 KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                          Pixel Intensity Entropy
                        </span>
                        <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                          {analysisResult.statistics.entropy.toFixed(3)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Scale: 0.0 to 8.0 bits/px</span>
                      </div>
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                          Mean Pixel Intensity
                        </span>
                        <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                          {analysisResult.statistics.mean.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Scale: 0 to 255</span>
                      </div>
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                          Standard Deviation
                        </span>
                        <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                          {analysisResult.statistics.standardDeviation.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Pixel intensity spread</span>
                      </div>
                      <div className="p-4 rounded-xl bg-card border border-border">
                        <span className="text-[10px] font-mono text-muted-foreground block uppercase">
                          Channel Variance
                        </span>
                        <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                          {analysisResult.statistics.variance.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Statistical dispersion</span>
                      </div>
                    </div>

                    {/* 256-Bin Analytical Color Intensity Histogram */}
                    <div className="p-5 rounded-xl bg-card border border-border space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
                        <div>
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-primary" />
                            256-Bin Pixel Intensity Histogram
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Distribution of discrete color values from 0 (deep black) to 255 (full white)
                          </p>
                        </div>
                        <div className="flex gap-1 text-[10px] font-mono">
                          {(["all", "red", "green", "blue", "grayscale"] as const).map((ch) => (
                            <button
                              key={ch}
                              onClick={() => setHistogramChannel(ch)}
                              className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                                histogramChannel === ch
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {ch}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Histogram Visualizer SVG */}
                      <div className="h-40 w-full bg-muted/25 rounded-lg border border-border p-3 flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 256 100" preserveAspectRatio="none">
                          {(() => {
                            const bins = analysisResult.visualizations.histogram || [];
                            const maxVal = Math.max(
                              ...bins.map((b) => Math.max(b.red, b.green, b.blue, b.grayscale || 0)),
                              1
                            );

                            return bins.map((bin, i) => {
                              if (histogramChannel === "red") {
                                const h = (bin.red / maxVal) * 98;
                                return <rect key={i} x={i} y={100 - h} width={1} height={h} fill="rgba(239, 68, 68, 0.85)" />;
                              }
                              if (histogramChannel === "green") {
                                const h = (bin.green / maxVal) * 98;
                                return <rect key={i} x={i} y={100 - h} width={1} height={h} fill="rgba(16, 185, 129, 0.85)" />;
                              }
                              if (histogramChannel === "blue") {
                                const h = (bin.blue / maxVal) * 98;
                                return <rect key={i} x={i} y={100 - h} width={1} height={h} fill="rgba(59, 130, 246, 0.85)" />;
                              }
                              if (histogramChannel === "grayscale") {
                                const h = ((bin.grayscale || 0) / maxVal) * 98;
                                return <rect key={i} x={i} y={100 - h} width={1} height={h} fill="rgba(156, 163, 175, 0.85)" />;
                              }
                              // Blended All
                              const hR = (bin.red / maxVal) * 95;
                              const hG = (bin.green / maxVal) * 95;
                              const hB = (bin.blue / maxVal) * 95;
                              return (
                                <g key={i}>
                                  <rect x={i} y={100 - hR} width={1} height={hR} fill="rgba(239, 68, 68, 0.4)" />
                                  <rect x={i} y={100 - hG} width={1} height={hG} fill="rgba(16, 185, 129, 0.4)" />
                                  <rect x={i} y={100 - hB} width={1} height={hB} fill="rgba(59, 130, 246, 0.4)" />
                                </g>
                              );
                            });
                          })()}
                        </svg>
                      </div>

                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1">
                        <span>Bin 0 (Black)</span>
                        <span>Bin 128 (Mid-Luminance)</span>
                        <span>Bin 255 (Peak White)</span>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ============================================================ */}
                  {/* TAB 5: CONTAINER & PAYLOAD STRUCTURE                         */}
                  {/* ============================================================ */}
                  <TabsContent value="structure" className="space-y-6 focus-visible:outline-none">
                    {/* Trailing Container Data */}
                    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs flex items-center gap-2">
                          <Sliders className="h-4 w-4 text-primary" />
                          Container End Verification & Trailing Bytes Detection
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono uppercase font-bold ${
                            analysisResult.fileStructure.hasUnexpectedTrailingBytes
                              ? "text-red-500 border-red-500/30 bg-red-500/10"
                              : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                          }`}
                        >
                          {analysisResult.fileStructure.hasUnexpectedTrailingBytes
                            ? "TRAILING BYTES DETECTED"
                            : "CLEAN TERMINATION"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {analysisResult.fileStructure.hasUnexpectedTrailingBytes
                          ? `Found ${analysisResult.fileStructure.trailingBytesCount} trailing byte(s) appended past the container's legal end-of-image boundary.`
                          : "Image terminates cleanly at its standard specification boundary marker (e.g., JPEG 0xFF 0xD9 or PNG IEND)."}
                      </p>
                      {analysisResult.fileStructure.trailingBytesPreview && (
                        <div className="p-3 rounded-lg bg-muted/60 font-mono text-[11px] text-foreground border border-border/60">
                          <span className="text-muted-foreground">Hex Stream Preview: </span>
                          <span className="font-bold">{analysisResult.fileStructure.trailingBytesPreview}</span>
                        </div>
                      )}
                    </div>

                    {/* Dual-Zone Embedded Payload Signatures */}
                    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs flex items-center gap-2">
                          <Search className="h-4 w-4 text-primary" />
                          Dual-Zone Payload Signature Scanner
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono uppercase font-bold ${
                            analysisResult.payloadDetection.detected
                              ? "text-red-500 border-red-500/30 bg-red-500/10"
                              : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                          }`}
                        >
                          {analysisResult.payloadDetection.detected ? "SIGNATURE DETECTED" : "CLEAN"}
                        </Badge>
                      </div>

                      {analysisResult.payloadDetection.findings.length > 0 ? (
                        <div className="space-y-2">
                          {analysisResult.payloadDetection.findings.map((f, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-red-500/5 border border-red-500/25 text-xs text-foreground font-mono space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {f.type} Signature Identified
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold ${
                                    f.location === "SIGNATURE_IN_TRAILING_DATA"
                                      ? "text-red-500 border-red-500/30"
                                      : "text-blue-500 border-blue-500/30"
                                  }`}
                                >
                                  {f.location === "SIGNATURE_IN_TRAILING_DATA" ? "TRAILING PAYLOAD" : "IMAGE STREAM"}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Offset: 0x{f.offset.toString(16).toUpperCase()} ({f.offset} bytes) • {f.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Scanned for embedded signatures of ZIP, GZIP, PDF, RAR, 7Z, and executable binaries. No matching headers identified.
                        </p>
                      )}
                    </div>

                    {/* Container Markers & Chunk Sequence */}
                    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                      <span className="font-bold text-foreground text-xs flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Container Chunk Sequence ({analysisResult.fileStructure.markersOrChunks.length} Headers Identified)
                      </span>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                        {analysisResult.fileStructure.markersOrChunks.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between py-1.5 px-2 rounded hover:bg-muted/40 transition-colors border-b border-border/40 text-muted-foreground"
                          >
                            <span className="text-foreground font-semibold">{m.name}</span>
                            <span>Offset: 0x{m.offset.toString(16).toUpperCase()}</span>
                            <span>{m.size ? `${m.size} B` : "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* ============================================================== */
          /* VIEW 2: INITIAL WORKSPACE (BEFORE UPLOAD / WHILE ANALYZING)    */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Upload Area / Image Selection (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {!selectedFile && !validationError ? (
                /* Primary Dropzone */
                <Card className={`border-2 border-dashed transition-all ${isDragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50"}`}>
                  <CardContent className="p-8">
                    <div
                      {...getRootProps()}
                      className="flex flex-col items-center justify-center text-center cursor-pointer space-y-4 py-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                    >
                      <input {...getInputProps()} />
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-200 hover:scale-105">
                        <UploadCloud className="h-8 w-8" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-base font-bold text-foreground">
                          {isDragActive ? "Drop carrier image to inspect" : "Select or Drop Carrier Image"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          or <span className="text-primary hover:underline font-semibold">browse files</span> on your system
                        </p>
                      </div>

                      <div className="pt-4 border-t border-border w-full flex flex-col items-center space-y-1 text-[11px] text-muted-foreground font-mono">
                        <span>SUPPORTED: JPEG · PNG · WEBP · BMP · TIFF</span>
                        <span>SECURITY LIMIT: MAX 15 MB / 8192 PX</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : validationError ? (
                /* Security & Validation Error */
                <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
                  <CardHeader className="pb-3 border-b border-destructive/20 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      {validationError.title}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="p-3.5 rounded-lg bg-background border border-destructive/25 text-xs text-foreground space-y-1 font-mono">
                      <p className="font-semibold text-destructive">{validationError.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        SECURITY CODE: {validationError.code}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      StegoLens applies strict magic-byte validation, decompression bomb defenses (50M pixels max), and path traversal sanitation.
                    </p>

                    <Button onClick={handleReset} className="w-full gap-2 text-xs font-semibold" variant="outline">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Select Another File</span>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Selected File Preview & In-Memory Verification */
                <Card className="border-border shadow-xs">
                  <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-primary" />
                      <span>Carrier Ingestion Staging</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-muted/40 border border-border flex items-center justify-center max-h-64">
                      {previewUrl && (
                        <img
                          ref={imgRef}
                          src={previewUrl}
                          alt={selectedFile?.name || "Target Image"}
                          className="max-h-64 w-auto object-contain rounded-md"
                        />
                      )}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-foreground block">
                              Running forensic analysis...
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground block">
                              Deterministic extraction & ML inference in progress
                            </span>
                          </div>
                          {/* Honest indeterminate scan indicator */}
                          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-indeterminate" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Carrier Filename:</span>
                        <span className="font-semibold text-foreground truncate max-w-[200px]" title={selectedFile?.name}>
                          {selectedFile?.name}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Payload Size:</span>
                        <span className="text-foreground">{formatBytes(selectedFile?.size || 0)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">MIME Type:</span>
                        <span className="text-foreground">{selectedFile?.type || "image/*"}</span>
                      </div>
                    </div>

                    {!isAnalyzing && (
                      <Button
                        onClick={() => selectedFile && executeForensicAnalysis(selectedFile)}
                        className="w-full gap-2 text-xs font-bold h-10 interactive-btn"
                      >
                        <Activity className="h-4 w-4" />
                        <span>Run Full Forensic Analysis</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Security & Storage Notice */}
              <div className="p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground space-y-2">
                <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Image Removal & History Storage</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Original uploaded images are processed temporarily and removed immediately after analysis. Analysis results and forensic metadata are stored in your local analysis history.
                </p>
              </div>
            </div>

            {/* Right Column: Pre-Analysis Forensic Inspection Suite (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span>Forensic Inspection Suite</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">
                      9 ENGINES ACTIVE
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    When you upload an image, StegoLens dispatches parallel deterministic and neural routines. Below are the registered inspection engines:
                  </p>

                  <div className="space-y-2.5">
                    {activeEnginesList.map((engine, idx) => (
                      <div
                        key={engine.name}
                        className="p-3.5 rounded-lg bg-muted/20 border border-border/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="font-semibold text-foreground block">{engine.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{engine.detail}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shrink-0">
                          READY
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-center gap-3">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Select or drop an image on the left to begin extraction and generate a calibrated forensic suspicion rating.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Modal Dialog for Enlarging Bit Planes */}
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold font-mono">
                {enlargedImage?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="p-2 flex items-center justify-center bg-muted/40 rounded-lg border border-border">
              {enlargedImage && (
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.title}
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
