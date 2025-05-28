import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScanReport } from "@shared/schema";
import { 
  History, 
  AlertTriangle, 
  Shield, 
  Eye, 
  Download, 
  Share,
  Filter,
  FileImage
} from "lucide-react";
import { ipfsService } from "@/lib/ipfs";

interface ScanHistoryProps {
  reports: ScanReport[];
  onViewReport?: (reportId: number) => void;
}

export default function ScanHistory({ reports, onViewReport }: ScanHistoryProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = (report: ScanReport) => {
    const reportData = {
      filename: report.filename,
      analysis: report.lsbAnalysis ? JSON.parse(report.lsbAnalysis) : null,
      metadata: report.metadata ? JSON.parse(report.metadata) : null,
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

  const handleShare = (report: ScanReport) => {
    if (navigator.share && report.ipfsHash) {
      navigator.share({
        title: `StegoGuard Report - ${report.filename}`,
        text: `Analysis report for ${report.filename}`,
        url: ipfsService.getIPFSUrl(report.ipfsHash),
      });
    } else if (report.ipfsHash) {
      navigator.clipboard.writeText(ipfsService.getIPFSUrl(report.ipfsHash));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <History className="h-5 w-5 text-slate-600 mr-2" />
            Scan History
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8">
            <FileImage className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No scan history available</p>
            <p className="text-sm text-slate-400">Upload an image to start analyzing</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scan Date</TableHead>
                    <TableHead>IPFS Hash</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                            <FileImage className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                              {report.filename}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(report.fileSize)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm text-slate-900">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500 block">
                            {new Date(report.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-primary-600">
                          {report.ipfsHash ? ipfsService.formatHash(report.ipfsHash) : 'Processing...'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewReport?.(report.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(report)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShare(report)}
                            disabled={!report.ipfsHash}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500">
                Showing 1 to {reports.length} of {reports.length} results
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="default" size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
