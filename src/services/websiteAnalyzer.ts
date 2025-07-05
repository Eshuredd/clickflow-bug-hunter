export interface DetectedBug {
  id: number;
  page: string;
  element: string;
  type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  context: string;
  aiVerified: boolean;
}

export interface AnalysisResult {
  url: string;
  totalElements: number;
  bugs: DetectedBug[];
  analysisTime: number;
  pagesScanned: string[];
}

export class WebsiteAnalyzer {
  async analyzeWebsite(url: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    console.log(`Starting analysis for: ${url}`);

    try {
      // Call the actual backend API
      const response = await fetch(
        "http://localhost:4000/api/analysis/button-clicks",
        // "https://www.getaigis.com/api/analysis/button-clicks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        throw new Error(`Backend analysis failed: ${response.status}`);
      }

      const data = await response.json();
      const backendResults = data.results;

      // Convert backend results to our bug format
      const bugs = this.convertBackendResultsToBugs(backendResults);
      const analysisTime = (Date.now() - startTime) / 1000;

      return {
        url,
        totalElements: backendResults.length, // Use actual count from backend
        bugs,
        analysisTime,
        pagesScanned: [url],
      };
    } catch (error) {
      console.error("Analysis failed:", error);
      return {
        url,
        totalElements: 0,
        bugs: [],
        analysisTime: (Date.now() - startTime) / 1000,
        pagesScanned: [],
      };
    }
  }

  private convertBackendResultsToBugs(backendResults: any[]): DetectedBug[] {
    const bugs: DetectedBug[] = [];

    backendResults.forEach((result, index) => {
      if (result.bugType) {
        bugs.push({
          id: index + 1,
          page: result.urlBefore,
          element: result.textContent || result.selector,
          type: result.bugType,
          severity: this.getSeverityFromBugType(result.bugType),
          description:
            result.description || `Issue detected with ${result.elementType}`,
          context: `Element: ${result.selector}, Type: ${result.elementType}, Visible: ${result.isVisible}`,
          aiVerified: true,
        });
      }
    });

    return bugs;
  }

  private getSeverityFromBugType(
    bugType: string
  ): "Critical" | "High" | "Medium" | "Low" {
    switch (bugType) {
      case "ClickError":
      case "NoAction":
        return "High";
      case "NotVisible":
      case "NotClickable":
        return "Medium";
      default:
        return "Low";
    }
  }
}
