import React from "react";
import { AlertTriangle, FileQuestion, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  title = "Analyzing Image...",
  description = "Processing metadata, container chunks, and pixel channels",
  className = "",
}: StateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-card border border-border ${className}`}>
      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 animate-spin">
        <Loader2 className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

interface EmptyStateProps extends StateProps {
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  title = "No Data Available",
  description = "Upload an image to start forensic steganalysis.",
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-card border border-dashed border-border ${className}`}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
        {icon || <FileQuestion className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="text-xs">
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps extends StateProps {
  retry?: () => void;
}

export function ErrorState({
  title = "Analysis Error",
  description = "An error occurred while inspecting this file. Please verify format and try again.",
  retry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-destructive/5 border border-destructive/20 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry} className="gap-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Analysis
        </Button>
      )}
    </div>
  );
}
