import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  ArrowLeft,
} from "lucide-react";
import { AnalysisResult } from "@/services/websiteAnalyzer";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Type declaration for autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface AnalysisResultsProps {
  url: string;
  result: AnalysisResult | null;
  onNewAnalysis: () => void;
}

export const AnalysisResults = ({
  url,
  result,
  onNewAnalysis,
}: AnalysisResultsProps) => {
  if (!result) {
    return (
      <div className="text-center text-white">
        <p>No analysis results available.</p>
        <Button onClick={onNewAnalysis} className="mt-4">
          Start New Analysis
        </Button>
      </div>
    );
  }

  const { bugs, totalElements, analysisTime } = result;
  const aiVerifiedCount = bugs.filter((b) => b.aiVerified).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-red-600";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const groupedBugs = bugs.reduce((acc, bug) => {
    if (!acc[bug.page]) acc[bug.page] = [];
    acc[bug.page].push(bug);
    return acc;
  }, {} as Record<string, typeof bugs>);

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text("Bug Analysis Report", 14, 20);

      doc.setFontSize(11);
      doc.text(`URL: ${url}`, 14, 35);
      doc.text(`Total Elements: ${totalElements}`, 14, 45);
      doc.text(`Bugs Found: ${bugs.length}`, 14, 55);
      doc.text(`AI Verified: ${aiVerifiedCount}`, 14, 65);
      doc.text(`Analysis Time: ${analysisTime.toFixed(1)}s`, 14, 75);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 85);

      if (bugs.length > 0) {
        // Prepare table data with better formatting
        const tableData = bugs.map((bug, idx) => [
          idx + 1,
          bug.page || "N/A",
          bug.element || "N/A",
          bug.severity || "N/A",
          bug.type || "N/A",
          // Truncate long descriptions
          bug.description
            ? bug.description.length > 50
              ? bug.description.substring(0, 50) + "..."
              : bug.description
            : "N/A",
          bug.aiVerified ? "Yes" : "No",
        ]);

        // Use the functional approach instead of method chaining
        autoTable(doc, {
          head: [
            [
              "#",
              "Page",
              "Element",
              "Severity",
              "Type",
              "Description",
              "AI Verified",
            ],
          ],
          body: tableData,
          startY: 95,
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
            cellWidth: "wrap",
          },
          headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 10 }, // #
            1: { cellWidth: 25 }, // Page
            2: { cellWidth: 30 }, // Element
            3: { cellWidth: 20 }, // Severity
            4: { cellWidth: 25 }, // Type
            5: { cellWidth: 60 }, // Description
            6: { cellWidth: 20 }, // AI Verified
          },
          theme: "striped",
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
        });

        // Add detailed descriptions on a new page if there are many bugs
        if (bugs.length > 10) {
          doc.addPage();
          doc.setFontSize(16);
          doc.text("Detailed Bug Descriptions", 14, 20);

          let yPosition = 35;
          bugs.forEach((bug, idx) => {
            if (yPosition > 250) {
              doc.addPage();
              yPosition = 20;
            }

            doc.setFontSize(12);
            doc.text(
              `${idx + 1}. ${bug.element} (${bug.severity})`,
              14,
              yPosition
            );
            yPosition += 10;

            doc.setFontSize(10);
            const descLines = doc.splitTextToSize(bug.description, 180);
            doc.text(descLines, 14, yPosition);
            yPosition += descLines.length * 5 + 5;

            if (bug.context) {
              const contextLines = doc.splitTextToSize(
                `Context: ${bug.context}`,
                180
              );
              doc.text(contextLines, 14, yPosition);
              yPosition += contextLines.length * 5 + 10;
            }
          });
        }
      } else {
        doc.setFontSize(14);
        doc.text(
          "🎉 No bugs found! Your website is functioning perfectly.",
          14,
          95
        );

        doc.setFontSize(11);
        doc.text("All clickable elements are working correctly:", 14, 110);
        doc.text("• All buttons and links respond properly", 20, 125);
        doc.text("• No context mismatches detected", 20, 135);
        doc.text("• Interactive elements function as expected", 20, 145);
      }

      // Save the PDF
      doc.save(
        `bug-analysis-report-${new Date().toISOString().split("T")[0]}.pdf`
      );
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Analysis Complete
          </h2>
          <p className="text-slate-300">Comprehensive bug analysis for {url}</p>
        </div>
        <Button
          variant="outline"
          className="text-slate-300 border-slate-600"
          onClick={onNewAnalysis}
        >
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
                <p className="text-2xl font-bold text-white">{totalElements}</p>
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
                <p className="text-2xl font-bold text-white">{bugs.length}</p>
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
                  {aiVerifiedCount}
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
                <p className="text-2xl font-bold text-white">
                  {analysisTime.toFixed(1)}s
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {bugs.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Issues Found!
            </h3>
            <p className="text-slate-400 mb-6">
              Great news! Our comprehensive analysis didn't detect any clickable
              element bugs on this website. All buttons, links, and interactive
              elements appear to be functioning correctly.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-300 font-medium mb-2">
                  ✓ All Elements Functional
                </h4>
                <p className="text-slate-300 text-sm">
                  Buttons and links respond correctly to user interactions
                </p>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-300 font-medium mb-2">
                  ✓ No Context Mismatches
                </h4>
                <p className="text-slate-300 text-sm">
                  Element labels accurately reflect their functionality
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Detected Issues
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Comprehensive bug analysis with AI verification and context
                  matching
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-slate-300 border-slate-600"
                  onClick={handleExportPDF}
                >
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
              {Object.entries(groupedBugs).map(([page, pageBugs]) => (
                <div key={page}>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    {page}
                    <Badge variant="secondary" className="text-xs">
                      {pageBugs.length} issues
                    </Badge>
                  </h3>

                  <div className="space-y-4">
                    {pageBugs.map((bug) => (
                      <div
                        key={bug.id}
                        className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-white font-medium">
                              {bug.element}
                            </h4>
                            <Badge
                              className={`text-white ${getSeverityColor(
                                bug.severity
                              )}`}
                            >
                              {bug.severity}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-slate-300 border-slate-500"
                            >
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
                            <strong className="text-blue-300">
                              AI Context Analysis:
                            </strong>{" "}
                            {bug.context}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {Object.keys(groupedBugs).indexOf(page) <
                    Object.keys(groupedBugs).length - 1 && (
                    <Separator className="mt-6 bg-slate-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
