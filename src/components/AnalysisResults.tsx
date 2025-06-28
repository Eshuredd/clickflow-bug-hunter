
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, FileText, Download, ArrowLeft } from 'lucide-react';

interface AnalysisResultsProps {
  url: string;
}

export const AnalysisResults = ({ url }: AnalysisResultsProps) => {
  const mockBugs = [
    {
      id: 1,
      page: 'Homepage',
      element: 'Submit Button',
      type: 'Non-responsive Click',
      severity: 'Critical',
      description: 'Primary submission button does not respond to click events on mobile devices',
      context: 'Button text suggests form submission but lacks proper event handlers',
      aiVerified: true
    },
    {
      id: 2,
      page: 'Homepage',
      element: 'Navigation Link',
      type: 'Broken Link',
      severity: 'High',
      description: 'Navigation link leads to 404 error page',
      context: 'Link text suggests "About Us" but redirects to non-existent page',
      aiVerified: true
    },
    {
      id: 3,
      page: 'Contact Page',
      element: 'Contact Form',
      type: 'Form Validation Error',
      severity: 'Medium',
      description: 'Form submits without proper validation of required fields',
      context: 'Missing client-side validation for email format',
      aiVerified: false
    },
    {
      id: 4,
      page: 'Product Page',
      element: 'Buy Now Button',
      type: 'Context Mismatch',
      severity: 'High',
      description: 'Button labeled "Buy Now" leads to product information instead of checkout',
      context: 'AI detected semantic mismatch between button text and actual functionality',
      aiVerified: true
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-600';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const groupedBugs = mockBugs.reduce((acc, bug) => {
    if (!acc[bug.page]) acc[bug.page] = [];
    acc[bug.page].push(bug);
    return acc;
  }, {} as Record<string, typeof mockBugs>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Analysis Complete</h2>
          <p className="text-slate-300">Comprehensive bug analysis for {url}</p>
        </div>
        <Button variant="outline" className="text-slate-300 border-slate-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Elements</p>
                <p className="text-2xl font-bold text-white">247</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Bugs Found</p>
                <p className="text-2xl font-bold text-white">{mockBugs.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">AI Verified</p>
                <p className="text-2xl font-bold text-white">
                  {mockBugs.filter(b => b.aiVerified).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Analysis Time</p>
                <p className="text-2xl font-bold text-white">2.3s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Detected Issues
              </CardTitle>
              <CardDescription className="text-slate-400">
                Comprehensive bug analysis with AI verification and context matching
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-slate-300 border-slate-600">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                Full Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedBugs).map(([page, bugs]) => (
              <div key={page}>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  {page}
                  <Badge variant="secondary" className="text-xs">
                    {bugs.length} issues
                  </Badge>
                </h3>
                
                <div className="space-y-4">
                  {bugs.map((bug) => (
                    <div key={bug.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-white font-medium">{bug.element}</h4>
                          <Badge className={`text-white ${getSeverityColor(bug.severity)}`}>
                            {bug.severity}
                          </Badge>
                          <Badge variant="outline" className="text-slate-300 border-slate-500">
                            {bug.type}
                          </Badge>
                          {bug.aiVerified && (
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                              AI Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-slate-300 mb-2">{bug.description}</p>
                      
                      <div className="p-3 bg-slate-800/50 rounded border-l-4 border-blue-500">
                        <p className="text-slate-400 text-sm">
                          <strong className="text-blue-300">AI Context Analysis:</strong> {bug.context}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {Object.keys(groupedBugs).indexOf(page) < Object.keys(groupedBugs).length - 1 && (
                  <Separator className="mt-6 bg-slate-600" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">AI Recommendations</CardTitle>
          <CardDescription className="text-slate-400">
            Prioritized action items based on impact and severity analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <h4 className="text-red-300 font-medium mb-2">Critical Priority</h4>
              <p className="text-slate-300 text-sm">
                Fix non-responsive submit button immediately - this affects core user conversion flow
              </p>
            </div>
            
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <h4 className="text-orange-300 font-medium mb-2">High Priority</h4>
              <p className="text-slate-300 text-sm">
                Update broken navigation links and fix context mismatches to improve user experience
              </p>
            </div>
            
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h4 className="text-yellow-300 font-medium mb-2">Medium Priority</h4>
              <p className="text-slate-300 text-sm">
                Implement proper form validation to prevent invalid submissions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
