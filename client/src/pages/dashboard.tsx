import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageUpload from "@/components/image-upload";
import AnalysisResults from "@/components/analysis-results";
import { useWallet } from "@/hooks/use-wallet";
import { useState } from "react";
import { Link } from "wouter";
import { 
  Search, 
  AlertTriangle, 
  Shield, 
  Clock, 
  Upload,
  History as HistoryIcon,
  TrendingUp,
  Activity
} from "lucide-react";

interface DashboardStats {
  totalScans: number;
  threatsDetected: number;
  cleanImages: number;
  avgScanTime: string;
}

interface RecentActivity {
  id: number;
  filename: string;
  threatDetected: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { account, isConnected } = useWallet();
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/stats', account],
    queryFn: () => fetch(`/api/stats/${account}`).then(res => res.json()),
    enabled: isConnected && !!account,
  });

  const { data: recentReports } = useQuery({
    queryKey: ['/api/history', account],
    queryFn: () => fetch(`/api/history/${account}`).then(res => res.json()),
    enabled: isConnected && !!account,
  });

  const { data: currentReport } = useQuery({
    queryKey: ['/api/analysis', currentReportId],
    queryFn: () => fetch(`/api/analysis/${currentReportId}`).then(res => res.json()),
    enabled: !!currentReportId,
    refetchInterval: currentReportId ? 2000 : false,
  });

  const recentActivity: RecentActivity[] = recentReports?.reports?.slice(0, 3) || [];

  if (!isConnected) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Welcome to StegoGuard
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Advanced steganography detection powered by blockchain technology
          </p>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-md mx-auto">
            <div className="text-slate-500 mb-4">
              Connect your wallet to start analyzing images for hidden content
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Advanced steganography detection powered by blockchain technology
            </p>
          </div>
          <div className="mt-4 md:mt-0 md:ml-4">
            <Link href="/upload">
              <Button className="bg-primary-600 hover:bg-primary-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Search className="h-4 w-4 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Scans</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.totalScans || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Threats Detected</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.threatsDetected || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Clean Images</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.cleanImages || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Avg. Scan Time</p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats?.avgScanTime || '0s'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Upload Section */}
        <div className="lg:col-span-2">
          <ImageUpload onAnalysisComplete={setCurrentReportId} />
        </div>

        {/* Recent Activity Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 text-slate-600 mr-2" />
                Recent Activity
              </h3>
              
              {recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <HistoryIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.threatDetected 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {activity.threatDetected ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Shield className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {activity.threatDetected ? 'Threat Detected' : 'Clean Image'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {activity.filename}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link href="/history">
                  <Button variant="ghost" className="w-full text-primary-600 hover:text-primary-700">
                    View all activity →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analysis Results */}
      {currentReport?.report && (
        <div className="mt-8">
          <AnalysisResults report={currentReport.report} />
        </div>
      )}
    </main>
  );
}
