import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Monitor, 
  Smartphone, 
  Globe,
  Clock,
  Download
} from "lucide-react";
import { compatibilityTester, type CompatibilityTestResult, type BrowserInfo } from "@/lib/compatibilityTest";

export default function CompatibilityDashboard() {
  const [testResults, setTestResults] = useState<CompatibilityTestResult[]>([]);
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  useEffect(() => {
    // Load saved results on mount
    loadSavedResults();
    setBrowserInfo(compatibilityTester.getBrowserInfo());
  }, []);

  const loadSavedResults = () => {
    try {
      const saved = localStorage.getItem('imfolio-compatibility-report');
      if (saved) {
        const report = JSON.parse(saved);
        // Fix timestamp conversion for saved results
        const results = (report.results || []).map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }));
        setTestResults(results);
        setLastRun(new Date(report.timestamp));
      }
    } catch (error) {
      console.warn('Could not load saved compatibility results:', error);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await compatibilityTester.runCompatibilityTests();
      setTestResults(results);
      setLastRun(new Date());
      compatibilityTester.saveReport();
    } catch (error) {
      console.error('Error running compatibility tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    const report = compatibilityTester.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imfolio-compatibility-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getTestIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  if (!browserInfo) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading compatibility dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">IMFOLIO.COM Compatibility Dashboard</h2>
          <p className="text-gray-600">Monitor cross-browser performance and functionality</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runTests} disabled={isRunning}>
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
          {testResults.length > 0 && (
            <Button variant="outline" onClick={downloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compatibility Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                  {score}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{passedTests}/{totalTests}</p>
                <p className="text-xs text-gray-500">tests passed</p>
              </div>
            </div>
            <Progress value={score} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              {browserInfo.mobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              <div>
                <p className="text-sm text-gray-600">Browser</p>
                <p className="font-semibold">{browserInfo.browser} {browserInfo.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5" />
              <div>
                <p className="text-sm text-gray-600">Domain Type</p>
                <p className="font-semibold">
                  {window.location.host.includes('replit.dev') ? 'Development' : 'Custom Domain'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <p className="text-sm text-gray-600">Last Tested</p>
                <p className="font-semibold">
                  {lastRun ? lastRun.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="browser">Browser Details</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {testResults.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No test results available. Click "Run Tests" to check compatibility.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4">
              {testResults.filter(r => !r.passed).length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {testResults.filter(r => !r.passed).length} compatibility issues detected.
                    Check the Test Results tab for details.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testResults.slice(0, 6).map((result, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTestIcon(result.passed)}
                            <h4 className="font-medium">{result.test}</h4>
                          </div>
                          <p className="text-sm text-gray-600">{result.message}</p>
                        </div>
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "Pass" : "Fail"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Browser Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Basic Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Browser:</span>
                      <span className="font-mono">{browserInfo.browser}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Version:</span>
                      <span className="font-mono">{browserInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span className="font-mono">{browserInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mobile:</span>
                      <Badge variant={browserInfo.mobile ? "default" : "secondary"}>
                        {browserInfo.mobile ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Feature Support</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cookies:</span>
                      <Badge variant={browserInfo.cookies ? "default" : "destructive"}>
                        {browserInfo.cookies ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Local Storage:</span>
                      <Badge variant={browserInfo.localStorage ? "default" : "destructive"}>
                        {browserInfo.localStorage ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>WebGL:</span>
                      <Badge variant={browserInfo.webgl ? "default" : "secondary"}>
                        {browserInfo.webgl ? "Supported" : "Not Supported"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>WebP:</span>
                      <Badge variant={browserInfo.webp ? "default" : "secondary"}>
                        {browserInfo.webp ? "Supported" : "Not Supported"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">User Agent</h4>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  {browserInfo.userAgent}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-gray-600">No test results available.</p>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTestIcon(result.passed)}
                          <h4 className="font-medium">{result.test}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={result.passed ? "default" : "destructive"}>
                            {result.passed ? "Pass" : "Fail"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {result.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            View Details
                          </summary>
                          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}