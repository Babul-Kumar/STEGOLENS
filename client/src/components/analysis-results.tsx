import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanReport } from "@shared/schema";
import { 
  AlertTriangle, 
  Shield, 
  Download, 
  Eye, 
  Info, 
  Microscope,
  Database,
  ExternalLink
} from "lucide-react";
import { ipfsService } from "@/lib/ipfs";
import { web3Service } from "@/lib/web3";

interface AnalysisResultsProps {
  report: ScanReport;
  imageUrl?: string;
  heatmapUrl?: string;
}

export default function AnalysisResults({ report, imageUrl, heatmapUrl }: AnalysisResultsProps) {
  const lsbAnalysis = report.lsbAnalysis ? JSON.parse(report.lsbAnalysis) : null;
  const metadata = report.metadata ? JSON.parse(report.metadata) : null;

  const handleDownloadReport = () => {
    // Generate and download report
    const reportData = {
      filename: report.filename,
      analysis: lsbAnalysis,
      metadata,
      timestamp: report.createdAt,
      ipfsHash: report.ipfsHash,
      blockchainTx: report.blockchainTxHash
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stegoguard-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 text-primary-600 mr-2" />
            Analysis Results
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={report.threatDetected ? "destructive" : "secondary"}>
              {report.threatDetected ? (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Threat Detected
                </>
              ) : (
                <>
                  <Shield className="h-3 w-3 mr-1" />
                  Clean
                </>
              )}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Preview & Heatmap */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-3">Original Image</h3>
              <div className="w-full h-64 bg-slate-200 rounded-lg border border-slate-200 flex items-center justify-center">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt="Uploaded image" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-slate-500">{report.filename}</span>
                )}
              </div>
            </div>
            
            {heatmapUrl && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-3">Heatmap Analysis</h3>
                <div className="w-full h-64 bg-slate-200 rounded-lg border border-slate-200">
                  <img 
                    src={heatmapUrl} 
                    alt="Heatmap visualization" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">Red areas indicate suspicious pixel patterns</p>
              </div>
            )}
          </div>

          {/* Analysis Details */}
          <div className="space-y-6">
            {/* LSB Analysis */}
            {lsbAnalysis && (
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                    <Microscope className="h-4 w-4 text-slate-600 mr-2" />
                    LSB Analysis
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Hidden Data Found:</span>
                      <Badge variant={lsbAnalysis.hidden_data_found ? "destructive" : "secondary"} className="text-xs">
                        {lsbAnalysis.hidden_data_found ? "Yes" : "No"}
                      </Badge>
                    </div>
                    {lsbAnalysis.entropy_score && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Entropy Score:</span>
                        <span className="text-sm font-mono text-slate-900">
                          {lsbAnalysis.entropy_score}/8.0
                        </span>
                      </div>
                    )}
                    {lsbAnalysis.pattern_anomalies !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Pattern Anomalies:</span>
                        <Badge variant={lsbAnalysis.pattern_anomalies > 5 ? "destructive" : "secondary"} className="text-xs">
                          {lsbAnalysis.pattern_anomalies} detected
                        </Badge>
                      </div>
                    )}
                    {lsbAnalysis.decoded_preview && (
                      <div>
                        <span className="text-sm text-slate-600">Decoded Preview:</span>
                        <div className="mt-1 p-2 bg-white rounded border text-xs font-mono text-slate-700 break-all max-h-20 overflow-y-auto">
                          {lsbAnalysis.decoded_preview}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadata Analysis */}
            {metadata && (
              <Card className="bg-slate-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                    <Info className="h-4 w-4 text-slate-600 mr-2" />
                    Metadata Analysis
                  </h4>
                  <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                    {Object.entries(metadata)
                      .slice(0, 10) // Limit to first 10 entries
                      .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-slate-600 truncate mr-2">{key}:</span>
                        <span className="font-mono text-slate-900 text-right text-xs">
                          {String(value).length > 30 ? `${String(value).substring(0, 30)}...` : String(value)}
                        </span>
                      </div>
                    ))}
                    {Object.keys(metadata).length > 10 && (
                      <p className="text-xs text-slate-400 text-center pt-2">
                        +{Object.keys(metadata).length - 10} more fields
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Blockchain Storage */}
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <h4 className="font-medium text-slate-900 mb-3 flex items-center">
                  <Database className="h-4 w-4 text-slate-600 mr-2" />
                  Blockchain Storage
                </h4>
                <div className="space-y-3 text-sm">
                  {report.ipfsHash && (
                    <div>
                      <span className="text-slate-600">IPFS Hash:</span>
                      <div className="font-mono text-primary-600 text-xs break-all bg-white p-2 rounded border mt-1 flex justify-between items-center">
                        <span>{ipfsService.formatHash(report.ipfsHash)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(ipfsService.getIPFSUrl(report.ipfsHash), '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {report.blockchainTxHash && (
                    <div>
                      <span className="text-slate-600">Transaction Hash:</span>
                      <div className="font-mono text-primary-600 text-xs break-all bg-white p-2 rounded border mt-1">
                        {web3Service.formatAddress(report.blockchainTxHash)}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Scan Date:</span>
                    <span className="font-mono text-slate-900">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
