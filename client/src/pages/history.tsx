import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ScanHistory from "@/components/scan-history";
import AnalysisResults from "@/components/analysis-results";
import { useWallet } from "@/hooks/use-wallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";

export default function History() {
  const { account, isConnected } = useWallet();
  console.log("History page - account:", account);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['/api/history', account],
    queryFn: () => fetch(`/api/history/${account}`).then(res => res.json()),
    enabled: isConnected && !!account,
  });

  console.log("History page - historyData:", historyData);

  const { data: selectedReport } = useQuery({
    queryKey: ['/api/analysis', selectedReportId],
    queryFn: () => fetch(`/api/analysis/${selectedReportId}`).then(res => res.json()),
    enabled: !!selectedReportId,
  });

  if (!isConnected) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <HistoryIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Wallet Required
              </h2>
              <p className="text-slate-600">
                Please connect your wallet to view your scan history
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Scan History</h1>
          <p className="mt-2 text-slate-600">
            View and manage your previous steganography analysis reports
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <ScanHistory 
          reports={historyData?.reports || []} 
          onViewReport={setSelectedReportId}
        />
        
        {selectedReport?.report && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Analysis Details
              </h2>
              <Button 
                variant="outline" 
                onClick={() => setSelectedReportId(null)}
              >
                Close Details
              </Button>
            </div>
            <AnalysisResults report={selectedReport.report} />
          </div>
        )}
      </div>
    </main>
  );
}
