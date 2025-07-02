
import { useState, useEffect } from "react";
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

  // Simulate real-time scanning updates
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      // Simulate scanning different elements
      const elementTypes = ['button', 'a', 'input', 'form', 'div[onclick]', 'span[role="button"]'];
      const sampleSelectors = [
        'button.submit-btn',
        'a.nav-link',
        'input[type="submit"]',
        'form#contact-form',
        'div.clickable-card',
        '.cta-button',
        '#hero-button',
        'a.footer-link'
      ];
      
      const randomElement = sampleSelectors[Math.floor(Math.random() * sampleSelectors.length)];
      const randomType = elementTypes[Math.floor(Math.random() * elementTypes.length)];
      
      setCurrentElement(`Scanning ${randomType}: ${randomElement}`);
      
      // Add to scanned elements occasionally
      if (Math.random() > 0.7) {
        const newElement: ScannedElement = {
          selector: randomElement,
          elementType: randomType,
          textContent: `Sample text for ${randomType}`,
          isVisible: Math.random() > 0.2,
          isClickable: Math.random() > 0.3,
          url: url,
          timestamp: Date.now(),
        };
        
        setScannedElements(prev => [...prev.slice(-19), newElement]); // Keep last 20 elements
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isScanning, url]);

  // Reset when dialog closes or scanning stops
  useEffect(() => {
    if (!isOpen || !isScanning) {
      setScannedElements([]);
      setCurrentElement("");
    }
  }, [isOpen, isScanning]);

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
            
            {currentElement && (
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <Globe className="h-4 w-4 animate-spin" />
                {currentElement}
              </div>
            )}
          </div>

          <Separator className="bg-slate-600" />

          {/* Scanned Elements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Elements Discovered
              </h3>
              <Badge variant="outline" className="text-slate-300 border-slate-500">
                {scannedElements.length} found
              </Badge>
            </div>

            <ScrollArea className="h-64 w-full rounded-md border border-slate-600 p-4">
              {scannedElements.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Starting element discovery...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scannedElements.map((element, index) => (
                    <div
                      key={`${element.selector}-${element.timestamp}`}
                      className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 animate-fade-in"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                            {element.elementType}
                          </Badge>
                          {element.isClickable ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Badge
                            variant={element.isVisible ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {element.isVisible ? "Visible" : "Hidden"}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-300 mb-1">
                        <code className="bg-slate-800 px-2 py-1 rounded text-xs">
                          {element.selector}
                        </code>
                      </p>
                      
                      {element.textContent && (
                        <p className="text-xs text-slate-400 truncate">
                          "{element.textContent}"
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
