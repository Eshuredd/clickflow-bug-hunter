
import { Header } from '@/components/Header';
import { SubscriptionTiers } from '@/components/SubscriptionTiers';
import { TeamWorkspace } from '@/components/TeamWorkspace';
import { ScanningProgressDialog } from '@/components/ScanningProgressDialog';
import { AnalysisResults } from '@/components/AnalysisResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Search, Zap, Shield, Users, FileText, Star } from 'lucide-react';
import { useState } from 'react';
import { AnalysisResult } from '@/services/websiteAnalyzer';

const Index = () => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleAnalyze = async () => {
    if (!url) return;
    
    setIsScanning(true);
    setShowProgressDialog(true);
    setScanProgress(0);
    setAnalysisResult(null);
    setShowResults(false);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    // Simulate analysis completion after 5 seconds
    setTimeout(() => {
      clearInterval(progressInterval);
      setScanProgress(100);
      setIsScanning(false);
      
      // Mock result
      const mockResult: AnalysisResult = {
        bugs: [
          {
            id: '1',
            element: 'Login Button',
            type: 'Click Handler Missing',
            severity: 'High',
            description: 'Button does not respond to click events',
            page: url,
            context: 'This button appears to be styled as clickable but lacks proper event handlers',
            aiVerified: true
          }
        ],
        totalElements: 23,
        analysisTime: 4.2
      };
      
      setAnalysisResult(mockResult);
      setTimeout(() => {
        setShowProgressDialog(false);
        setShowResults(true);
      }, 1000);
    }, 5000);
  };

  const handleNewAnalysis = () => {
    setShowResults(false);
    setAnalysisResult(null);
    setUrl('');
  };

  if (showResults && analysisResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <AnalysisResults 
            url={url} 
            result={analysisResult} 
            onNewAnalysis={handleNewAnalysis}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="analyzer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="analyzer" className="text-foreground">Bug Analyzer</TabsTrigger>
            <TabsTrigger value="pricing" className="text-foreground">Pricing</TabsTrigger>
            <TabsTrigger value="team" className="text-foreground">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="analyzer" className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <span className="text-cream font-bold text-lg">CB</span>
                </div>
                <h1 className="text-4xl font-bold text-foreground">Aigis Adaptive AI</h1>
              </div>
              
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Automatically detect clickable element bugs on your website using advanced AI analysis. 
                Find broken buttons, unresponsive links, and context mismatches that hurt user experience.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Zap className="h-4 w-4 mr-2" />
                  AI-Powered Analysis
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Gemini Verification
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Detailed Reports
                </Badge>
              </div>
            </div>

            {/* Analysis Input */}
            <Card className="max-w-2xl mx-auto bg-card border-border">
              <CardHeader className="text-center">
                <CardTitle className="text-foreground">Start Bug Analysis</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your website URL to begin comprehensive clickable element testing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="text-lg h-12 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={!url || isScanning}
                    className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    {isScanning ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 text-cream" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Smart Detection</h3>
                  <p className="text-muted-foreground text-sm">
                    Automatically identifies clickable elements and tests their functionality using advanced algorithms
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-cream" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">AI Verification</h3>
                  <p className="text-muted-foreground text-sm">
                    Google Gemini AI analyzes context and verifies if buttons match their intended functionality
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-cream" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Reports</h3>
                  <p className="text-muted-foreground text-sm">
                    Get comprehensive PDF reports with bug descriptions, severity levels, and fix recommendations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Testimonials */}
            <Card className="bg-card border-border mt-16">
              <CardHeader className="text-center">
                <CardTitle className="text-foreground">Trusted by Development Teams</CardTitle>
                <CardDescription className="text-muted-foreground">
                  See what developers say about ClickBug Detector
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">
                      "Saved us hours of manual testing. The AI verification is incredibly accurate at catching context mismatches."
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                        <span className="text-cream text-xs font-bold">SC</span>
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-sm">Sarah Chen</p>
                        <p className="text-muted-foreground text-xs">Lead QA Engineer</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm mb-3">
                      "The PDF reports are perfect for stakeholder updates. Makes bug documentation so much easier."
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                        <span className="text-cream text-xs font-bold">MJ</span>
                      </div>
                      <div>
                        <p className="text-foreground font-medium text-sm">Mike Johnson</p>
                        <p className="text-muted-foreground text-xs">Frontend Developer</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <SubscriptionTiers />
          </TabsContent>

          <TabsContent value="team">
            <TeamWorkspace />
          </TabsContent>
        </Tabs>
      </div>

      <ScanningProgressDialog
        isOpen={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        url={url}
        progress={scanProgress}
        isScanning={isScanning}
      />
    </div>
  );
};

export default Index;
