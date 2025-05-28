import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/use-wallet";
import { apiRequest } from "@/lib/queryClient";
import { CloudUpload, FileImage, AlertTriangle, CheckCircle, Clock, Database, Link as LinkIcon } from "lucide-react";

interface UploadProgress {
  progress: number;
  stage: 'uploading' | 'analyzing' | 'complete';
  steps: {
    upload: boolean;
    metadata: boolean;
    lsb: boolean;
    heatmap: boolean;
    ipfs: boolean;
  };
}

interface ImageUploadProps {
  onAnalysisComplete?: (reportId: number) => void;
}

export default function ImageUpload({ onAnalysisComplete }: ImageUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { account, isConnected } = useWallet();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isConnected || !account) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress({
      progress: 0,
      stage: 'uploading',
      steps: {
        upload: false,
        metadata: false,
        lsb: false,
        heatmap: false,
        ipfs: false,
      }
    });

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('walletAddress', account);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev || prev.progress >= 100) return prev;
          return { ...prev, progress: Math.min(prev.progress + Math.random() * 15, 100) };
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setUploadProgress(prev => prev ? {
        ...prev,
        progress: 100,
        stage: 'analyzing',
        steps: { ...prev.steps, upload: true }
      } : null);

      // Start polling for analysis results
      pollAnalysisResults(data.reportId);

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [account, isConnected, toast]);

  const pollAnalysisResults = async (reportId: number) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiRequest('GET', `/api/analysis/${reportId}`);
        const data = await response.json();
        
        if (data.report.ipfsHash) {
          // Analysis complete
          setUploadProgress(prev => prev ? {
            ...prev,
            stage: 'complete',
            steps: {
              upload: true,
              metadata: true,
              lsb: true,
              heatmap: true,
              ipfs: true,
            }
          } : null);

          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(null);
            onAnalysisComplete?.(reportId);
          }, 1500);

          return;
        }

        // Update progress based on available data
        const steps = {
          upload: true,
          metadata: !!data.report.metadata,
          lsb: !!data.report.lsbAnalysis,
          heatmap: !!data.report.heatmapUrl,
          ipfs: !!data.report.ipfsHash,
        };

        setUploadProgress(prev => prev ? {
          ...prev,
          steps
        } : null);

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          throw new Error('Analysis timeout');
        }

      } catch (error) {
        console.error('Polling failed:', error);
        toast({
          title: "Analysis Failed",
          description: "Failed to complete image analysis",
          variant: "destructive",
        });
        setIsUploading(false);
        setUploadProgress(null);
      }
    };

    poll();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    disabled: isUploading
  });

  const getStepIcon = (completed: boolean, current: boolean) => {
    if (completed) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (current) return <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />;
    return <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
          <CloudUpload className="h-5 w-5 text-primary-600 mr-2" />
          Upload & Analyze Image
        </h2>
        
        {!uploadProgress ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-200 cursor-pointer ${
              isDragActive
                ? "border-primary-400 bg-primary-50"
                : "border-slate-300 hover:border-primary-400"
            } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <FileImage className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-slate-700">Drop your image here</p>
                <p className="text-sm text-slate-500">
                  or <span className="text-primary-600 hover:text-primary-700 font-medium">browse files</span>
                </p>
              </div>
              <p className="text-xs text-slate-400">Supports: PNG, JPG, JPEG, WEBP (Max 10MB)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {uploadProgress.stage === 'uploading' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Uploading...</span>
                  <span className="text-sm text-slate-500">{Math.round(uploadProgress.progress)}%</span>
                </div>
                <Progress value={uploadProgress.progress} className="w-full" />
              </div>
            )}

            {uploadProgress.stage === 'analyzing' && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" />
                  <span className="font-medium text-slate-700">Analyzing Image...</span>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(uploadProgress.steps.upload, false)}
                    <span className={uploadProgress.steps.upload ? 'text-slate-700' : 'text-slate-400'}>
                      Image uploaded successfully
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStepIcon(uploadProgress.steps.metadata, !uploadProgress.steps.metadata && uploadProgress.steps.upload)}
                    <span className={uploadProgress.steps.metadata ? 'text-slate-700' : 'text-slate-400'}>
                      Extracting metadata
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStepIcon(uploadProgress.steps.lsb, !uploadProgress.steps.lsb && uploadProgress.steps.metadata)}
                    <span className={uploadProgress.steps.lsb ? 'text-slate-700' : 'text-slate-400'}>
                      Performing LSB analysis
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStepIcon(uploadProgress.steps.heatmap, !uploadProgress.steps.heatmap && uploadProgress.steps.lsb)}
                    <span className={uploadProgress.steps.heatmap ? 'text-slate-700' : 'text-slate-400'}>
                      Generating heatmap
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStepIcon(uploadProgress.steps.ipfs, !uploadProgress.steps.ipfs && uploadProgress.steps.heatmap)}
                    <span className={uploadProgress.steps.ipfs ? 'text-slate-700' : 'text-slate-400'}>
                      Storing to IPFS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {uploadProgress.stage === 'complete' && (
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Analysis Complete!</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
