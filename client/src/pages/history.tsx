import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  History as HistoryIcon, 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  Cpu
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Analysis } from "@shared/schema";

export default function HistoryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch } = useQuery<{ analyses: Analysis[]; count: number }>({
    queryKey: ["/api/analyses"],
    queryFn: async () => {
      const res = await fetch("/api/analyses?limit=100");
      if (!res.ok) throw new Error("Failed to load analysis history");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Record Deleted",
        description: "The analysis record has been removed from local history.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Delete Failed",
        description: err.message || "Could not delete record",
        variant: "destructive",
      });
    },
  });

  const analyses = data?.analyses || [];
  const filtered = analyses.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.filename.toLowerCase().includes(q) ||
      a.fileHash.toLowerCase().includes(q) ||
      (a.riskLevel && a.riskLevel.toLowerCase().includes(q))
    );
  });

  const getRiskBadge = (level: string, score: number) => {
    switch (level) {
      case "VERY_HIGH":
        return <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">VERY HIGH ({score})</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10">HIGH ({score})</Badge>;
      case "MODERATE":
        return <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">MODERATE ({score})</Badge>;
      default:
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">LOW ({score})</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 transition-colors">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link href="/analyze">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Analyze Console
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <HistoryIcon className="h-6 w-6 text-primary" />
              Forensic Analysis History
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Inspect, review, and export previous deterministic forensics and ML steganalysis records stored in SQLite.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs font-semibold interactive-btn">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Link href="/analyze">
              <Button size="sm" className="h-8 text-xs font-semibold interactive-btn">
                New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search by filename, SHA-256 hash, or risk level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs font-mono"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} of {analyses.length} records
          </span>
        </div>

        {/* History Table / Cards */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">Loading persisted records from SQLite...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Analysis Records Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchTerm
                    ? "No records matched your search query. Try searching for a different term."
                    : "No forensic analyses have been conducted yet. Upload an image in the analysis console to begin."}
                </p>
              </div>
              <Link href="/analyze">
                <Button size="sm" className="text-xs">
                  Run First Analysis
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filtered.map((item) => (
              <Card key={item.id} className="border-border hover:border-border/80 transition-colors">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-foreground truncate max-w-[280px]">
                        {item.filename}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {item.mimeType.split("/")[1] || "IMG"}
                      </Badge>
                      {getRiskBadge(item.riskLevel, item.suspicionScore)}
                      {item.mlStatus === "ready" && item.mlPrediction && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-mono ${
                            item.mlPrediction === "stego" 
                              ? "border-red-500/30 text-red-500 bg-red-500/5" 
                              : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                          }`}
                        >
                          <Cpu className="h-3 w-3 mr-1 inline" />
                          ML: {item.mlPrediction.toUpperCase()} ({item.mlProbability ? `${(parseFloat(item.mlProbability) * 100).toFixed(0)}%` : ""})
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-muted-foreground">
                      <span>Size: {(item.fileSize / 1024).toFixed(1)} KB</span>
                      {item.width && item.height && (
                        <span>Dimensions: {item.width} × {item.height}</span>
                      )}
                      <span>Date: {new Date(item.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="text-[10px] font-mono text-muted-foreground truncate max-w-xl">
                      SHA-256: <span className="text-foreground">{item.fileHash}</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Link href={`/analyze?id=${item.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect
                      </Button>
                    </Link>
                    <a href={`/api/analyses/${item.id}/report?format=pdf`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8 text-xs font-mono">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </a>
                    <a href={`/api/analyses/${item.id}/report?format=json`} download>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-mono text-muted-foreground">
                        JSON
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
