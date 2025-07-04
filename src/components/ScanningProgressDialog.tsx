import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Search, CheckCircle, AlertTriangle } from "lucide-react";

interface ScannedElement {
  selector: string;
  elementType: string;
  textContent?: string;
  isVisible: boolean;
  isClickable: boolean;
  url: string;
  timestamp: number;
}

interface ScanningProgressDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  progress: number;
  isScanning: boolean;
}

export const ScanningProgressDialog = ({
  isOpen,
  onOpenChange,
  url,
  progress,
  isScanning,
}: ScanningProgressDialogProps) => {
  const [scannedElements, setScannedElements] = useState<ScannedElement[]>([]);
  const [currentElement, setCurrentElement] = useState<string>("");
  const [currentButton, setCurrentButton] = useState<any>(null);
  const [bugs, setBugs] = useState<any[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const reconnectDelay = (attempt: number) =>
    Math.min(1000 * 2 ** attempt, 10000); // exponential backoff

  // Reset when dialog closes or scanning stops
  useEffect(() => {
    if (!isOpen || !isScanning) {
      setScannedElements([]);
      setCurrentElement("");
      setCurrentButton(null);
      setBugs([]);
    }
  }, [isOpen, isScanning]);

  useEffect(() => {
    if (!isScanning) return;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let stopped = false;
    setConnectionError(null);
    retryCountRef.current = 0;

    function connect() {
      if (stopped) return;
      eventSource = new EventSource(
        `http://localhost:4000/api/analysis/button-clicks/stream?url=${encodeURIComponent(
          url
        )}`
      );
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[SSE DATA]", data); // Debug log
          if (data.currentButton) {
            setCurrentButton(data.currentButton);
          }
          if (data.done && data.bugs) {
            if (Array.isArray(data.bugs)) {
              setBugs(data.bugs);
              setConnectionError(null);
            } else {
              setConnectionError("Invalid bug data received from backend.");
            }
            eventSource && eventSource.close();
          }
        } catch (err) {
          setConnectionError("Failed to parse SSE data.");
        }
      };
      eventSource.onerror = () => {
        eventSource && eventSource.close();
        if (retryCountRef.current < maxRetries) {
          setConnectionError(
            `Connection lost. Reconnecting... (attempt ${
              retryCountRef.current + 1
            })`
          );
          reconnectTimeout = setTimeout(() => {
            retryCountRef.current += 1;
            connect();
          }, reconnectDelay(retryCountRef.current));
        } else {
          setConnectionError(
            "Connection lost. Could not reconnect to backend after multiple attempts."
          );
        }
      };
    }
    connect();
    return () => {
      stopped = true;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isScanning, url]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Search className="h-5 w-5 text-blue-400" />
            Website Analysis in Progress
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Scanning clickable elements on {url}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                {isScanning ? "Analyzing elements..." : "Analysis Complete"}
              </span>
              <span className="text-sm font-medium text-white">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />

            {/* Show the real current button being scanned */}
            {currentButton && (
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <Globe className="h-4 w-4 animate-spin" />
                Scanning {currentButton.elementType}: {currentButton.selector}
                {currentButton.textContent
                  ? ` (\"${currentButton.textContent}\")`
                  : null}
              </div>
            )}
          </div>

          <Separator className="bg-slate-600" />

          {/* Bugs Found Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Bugs Found</h3>
              <Badge
                variant="outline"
                className="text-slate-300 border-slate-500"
              >
                {bugs.length} found
              </Badge>
            </div>

            <ScrollArea className="h-64 w-full rounded-md border border-slate-600 p-4">
              {connectionError ? (
                <div className="text-center text-red-400 py-8">
                  {connectionError}
                </div>
              ) : bugs.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No bugs found yet...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bugs.map((bug, index) => (
                    <div
                      key={`${bug.textContent || bug.selector}-${
                        bug.urlBefore
                      }-${index}`}
                      className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 animate-fade-in"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-600/20 text-red-300 border-red-500/30">
                            {bug.bugType}
                          </Badge>
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="default" className="text-xs">
                            {bug.elementType}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mb-1">
                        <code className="bg-slate-800 px-2 py-1 rounded text-xs">
                          {bug.textContent || bug.selector}
                        </code>
                      </p>
                      {bug.description && (
                        <p className="text-xs text-slate-400 truncate">
                          {bug.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
