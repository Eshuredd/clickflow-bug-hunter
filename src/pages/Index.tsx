import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Globe,
  FileText,
  Settings,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AnalysisResults } from "@/components/AnalysisResults";
import { TeamWorkspace } from "@/components/TeamWorkspace";
import { SubscriptionTiers } from "@/components/SubscriptionTiers";
import { WebsiteAnalyzer, AnalysisResult } from "@/services/websiteAnalyzer";
import { ScanningProgressDialog } from "@/components/ScanningProgressDialog";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  const [analysisUrl, setAnalysisUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [showScanningDialog, setShowScanningDialog] = useState(false);

  const handleStartAnalysis = async () => {
    if (!analysisUrl) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setShowResults(false);
    setShowScanningDialog(true);

    const analyzer = new WebsiteAnalyzer();

    const progressInterval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 90) {
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const result = await analyzer.analyzeWebsite(analysisUrl);
      setAnalysisResult(result);
      setAnalysisProgress(100);

      setTimeout(() => {
        clearInterval(progressInterval);
        setIsAnalyzing(false);
        setShowScanningDialog(false);
        setShowResults(true);
      }, 1000);
    } catch (error) {
      console.error("Analysis failed:", error);
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setShowScanningDialog(false);
    }
  };

  const handleNewAnalysis = () => {
    setShowResults(false);
    setAnalysisResult(null);
    setAnalysisUrl("");
    setAnalysisProgress(0);
    setShowScanningDialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {!showResults ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">
                AI-Powered Bug Detection Platform
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
                Systematically identify clickable element bugs across websites
                with intelligent AI analysis, comprehensive reporting, and
                seamless team collaboration.
              </p>

              {/* Analysis Input */}
              <Card className="max-w-2xl mx-auto bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Start Website Analysis
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Enter a URL to begin comprehensive clickable element testing
                    {!user && (
                      <span className="block mt-1 text-yellow-400">
                        • Free tier: 5 analyses per month, 10 elements per scan
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={analysisUrl}
                      onChange={(e) => setAnalysisUrl(e.target.value)}
                      className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={!analysisUrl || isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isAnalyzing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Start Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  {!user && (
                    <p className="text-sm text-slate-400 text-center">
                      No account required for basic analysis. 
                      <Button variant="link" className="text-blue-400 p-0 h-auto font-normal" onClick={() => window.location.href = '/auth'}>
                        Sign in for unlimited access
                      </Button>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Feature Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Advanced Detection
                    {!user && <Badge variant="outline" className="ml-2 text-xs">Free</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Multi-layer scanning of buttons, links, forms, and
                    interactive components with JavaScript error detection and
                    accessibility compliance.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    AI Verification
                    <Badge variant="secondary" className="ml-2 text-xs bg-blue-600">Premium</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Gemini AI integration for content matching verification,
                    context analysis, and automated severity classification with
                    false positive reduction.
                  </p>
                  {!user && (
                    <p className="text-yellow-400 text-sm mt-2">
                      Sign in to access AI verification features
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Team Collaboration
                    <Badge variant="secondary" className="ml-2 text-xs bg-blue-600">Premium</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300">
                    Multi-user workspaces with role-based permissions, bug
                    assignment, tracking, and integration with GitHub, Jira, and
                    Slack.
                  </p>
                  {!user && (
                    <p className="text-yellow-400 text-sm mt-2">
                      Sign in to access team collaboration features
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Platform Tabs */}
            <Tabs defaultValue="dashboard" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-slate-700"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="workspace"
                  className="data-[state=active]:bg-slate-700"
                >
                  Team Workspace
                  {!user && <Badge variant="outline" className="ml-1 text-xs">Premium</Badge>}
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="data-[state=active]:bg-slate-700"
                >
                  Reports
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="data-[state=active]:bg-slate-700"
                >
                  Pricing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid md:grid-cols-4 gap-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">
                            Total Analyses
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {user ? "1,247" : "5"}
                          </p>
                          {!user && (
                            <p className="text-xs text-slate-500">Free tier limit</p>
                          )}
                        </div>
                        <Globe className="h-8 w-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">
                            Bugs Detected
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {user ? "3,891" : "47"}
                          </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">
                            Accuracy Rate
                          </p>
                          <p className="text-2xl font-bold text-white">
                            {user ? "96.8%" : "92.1%"}
                          </p>
                          {!user && (
                            <p className="text-xs text-yellow-400">AI boost with Premium</p>
                          )}
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-400" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-400 text-sm">Active Teams</p>
                          <p className="text-2xl font-bold text-white">
                            {user ? "23" : "0"}
                          </p>
                          {!user && (
                            <p className="text-xs text-slate-500">Premium feature</p>
                          )}
                        </div>
                        <Users className="h-8 w-8 text-purple-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workspace">
                {user ? (
                  <TeamWorkspace />
                ) : (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-12 text-center">
                      <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">Team Workspace</h3>
                      <p className="text-slate-400 mb-6">
                        Collaborate with your team, assign bugs, and track progress with our premium team features.
                      </p>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => window.location.href = '/auth'}
                      >
                        Sign In to Access Team Features
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="reports">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Analysis Reports
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Comprehensive reports with detailed bug analysis and
                      recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                        >
                          <div>
                            <h4 className="text-white font-medium">
                              Website Analysis #{i}
                            </h4>
                            <p className="text-slate-400 text-sm">
                              example{i}.com • {user ? "42" : "12"} bugs found
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">High Priority</Badge>
                            <Button size="sm" variant="outline">
                              View Report
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!user && (
                      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-300 text-sm">
                          <strong>Premium users get:</strong> Advanced reporting, PDF exports, 
                          custom templates, and detailed analytics
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing">
                <SubscriptionTiers />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <AnalysisResults
            url={analysisUrl}
            result={analysisResult}
            onNewAnalysis={handleNewAnalysis}
          />
        )}

        {/* Scanning Progress Dialog */}
        <ScanningProgressDialog
          isOpen={showScanningDialog}
          onOpenChange={setShowScanningDialog}
          url={analysisUrl}
          progress={analysisProgress}
          isScanning={isAnalyzing}
        />
      </main>
    </div>
  );
};

export default Index;
