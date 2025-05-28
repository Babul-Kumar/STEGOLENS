import { useState } from "react";
import ImageUpload from "@/components/image-upload";
import AnalysisResults from "@/components/analysis-results";
import { useWallet } from "@/hooks/use-wallet";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Upload as UploadIcon } from "lucide-react";

export default function Upload() {
  const { isConnected } = useWallet();
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);

  const { data: currentReport } = useQuery({
    queryKey: ['/api/analysis', currentReportId],
    enabled: !!currentReportId,
    refetchInterval: currentReportId ? 2000 : false,
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
              <UploadIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Wallet Required
              </h2>
              <p className="text-slate-600">
                Please connect your wallet to upload and analyze images
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
          <h1 className="text-3xl font-bold text-slate-900">Upload & Analyze</h1>
          <p className="mt-2 text-slate-600">
            Upload an image to detect hidden steganographic content
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
          <ImageUpload onAnalysisComplete={setCurrentReportId} />
        </div>
        
        <div className="xl:col-span-2">
          {currentReport?.report ? (
            <AnalysisResults report={currentReport.report} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <UploadIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No Analysis Yet
                </h3>
                <p className="text-slate-500">
                  Upload an image to see detailed analysis results here
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
