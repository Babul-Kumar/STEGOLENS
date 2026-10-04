import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Search, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Upload, 
  FileText, 
  Cpu, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Sliders
} from "lucide-react";
import type { Analysis } from "@shared/schema";

export default function Dashboard() {
  const { data: analysesData, isLoading } = useQuery<{ analyses: Analysis[]; count: number }>({
    queryKey: ["/api/analyses"],
    queryFn: async () => {
      const res = await fetch("/api/analyses?limit=100");
      if (!res.ok) throw new Error("Failed to load analyses");
      return res.json();
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const analyses = analysesData?.analyses || [];
  const totalScans = analyses.length;
  const highRiskCount = analyses.filter((a) => a.riskLevel === "HIGH" || a.riskLevel === "VERY_HIGH").length;
  const moderateRiskCount = analyses.filter((a) => a.riskLevel === "MODERATE").length;
  const cleanCount = analyses.filter((a) => a.riskLevel === "LOW").length;

  const recent = analyses.slice(0, 5);

  return (
    <div className="min-h-screen bg-background py-8 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-primary" />
              Forensic Intelligence Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time telemetry, model readiness, and forensic examination summaries.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/history">
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                View Full History
              </Button>
            </Link>
            <Link href="/analyze">
              <Button size="sm" className="h-9 text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                New Inspection
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Total Analyses</span>
                <span className="text-2xl font-bold font-mono text-foreground">{totalScans}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Persisted in SQLite</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Search className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Suspicious Carriers</span>
                <span className="text-2xl font-bold font-mono text-red-500">{highRiskCount + moderateRiskCount}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Elevated forensic/ML risk</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">Normal Baseline</span>
                <span className="text-2xl font-bold font-mono text-emerald-500">{cleanCount}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Clean bit-plane distributions</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-foreground block">ML Engine Status</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {healthData?.services?.ml?.status === "ready" ? "READY" : "ONLINE"}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  EfficientNet-B0 (AUC 0.77)
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Cpu className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Recent Forensic Examinations</CardTitle>
                    <CardDescription className="text-xs">Latest image analysis records and outcomes</CardDescription>
                  </div>
                  <Link href="/history">
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-primary">
                      All Records <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {recent.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                    No analyses recorded yet. Start by inspecting an image.
                  </div>
                ) : (
                  recent.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                            {item.filename}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase">
                            {item.mimeType.split("/")[1]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono ${
                              item.riskLevel === "VERY_HIGH" || item.riskLevel === "HIGH"
                                ? "text-red-500 border-red-500/30"
                                : item.riskLevel === "MODERATE"
                                ? "text-amber-500 border-amber-500/30"
                                : "text-emerald-500 border-emerald-500/30"
                            }`}
                          >
                            {item.riskLevel} ({item.suspicionScore})
                          </Badge>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground flex gap-3">
                          <span>{(item.fileSize / 1024).toFixed(1)} KB</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/analyze?id=${item.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-[11px] font-mono">
                            Inspect
                          </Button>
                        </Link>
                        <a href={`/api/analyses/${item.id}/report?format=pdf`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 text-[11px] font-mono">
                            PDF
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Model & Architecture Overview (1 col) */}
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  Neural Steganalysis Model
                </CardTitle>
                <CardDescription className="text-xs">ALASKA2 EfficientNet-B0 baseline</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-card border border-border space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Architecture:</span>
                    <span className="text-foreground">EfficientNet-B0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input Resolution:</span>
                    <span className="text-foreground">512 × 512 px (RGB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calibrated Threshold:</span>
                    <span className="text-foreground">0.22</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validation ROC-AUC:</span>
                    <span className="text-foreground">0.697</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weighted AUC:</span>
                    <span className="text-foreground">0.767</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trained Stego Algos:</span>
                    <span className="text-foreground">JMiPOD, JUNIWARD, UERD</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  StegoLens pairs neural classification with deterministic spatial, LSB, and container markers.
                  Neither model nor heuristic is used in isolation.
                </p>

                <Link href="/analyze">
                  <Button className="w-full h-8 text-xs font-medium">
                    Open Forensic Console
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
