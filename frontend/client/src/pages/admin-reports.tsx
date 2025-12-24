import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Activity, 
  MessageSquare, 
  CreditCard,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { 
  useAdminReportCards, 
  useAdminSystemActivity, 
  useDownloadReport,
  type ReportCard,
  type ActivityItem
} from "@/lib/api-hooks";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp: TrendingUp,
  CreditCard: CreditCard,
  Activity: Activity,
  MessageSquare: MessageSquare,
  BarChart3: BarChart3,
};

function getTrendIcon(trend?: string) {
  if (trend === "up") return <ArrowUp className="w-3 h-3 text-green-500" />;
  if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-gray-400" />;
}

export default function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { 
    data: reportCards, 
    isLoading: cardsLoading, 
    error: cardsError,
    refetch: refetchCards 
  } = useAdminReportCards();
  
  const { 
    data: activityData, 
    isLoading: activityLoading, 
    error: activityError,
    refetch: refetchActivity 
  } = useAdminSystemActivity();
  
  const downloadMutation = useDownloadReport();

  if (!user?.roles?.includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-muted-foreground mt-2">You do not have admin privileges</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    refetchCards();
    refetchActivity();
  };

  const handleDownload = async (reportId: string, title: string) => {
    try {
      const data = await downloadMutation.mutateAsync(reportId);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: `${title} has been downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLoading = cardsLoading || activityLoading;
  const hasError = cardsError || activityError;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Reports</h1>
            <p className="text-muted-foreground mt-2">
              View platform analytics and performance metrics
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {hasError && (
          <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load some data. Please try refreshing.</span>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-8 w-8 bg-muted rounded mb-4"></div>
                <div className="h-5 w-3/4 bg-muted rounded mb-2"></div>
                <div className="h-4 w-full bg-muted rounded mb-4"></div>
                <div className="h-10 w-full bg-muted rounded"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportCards?.map((report: ReportCard) => {
              const IconComponent = ICON_MAP[report.icon] || TrendingUp;
              return (
                <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-8 h-8 text-blue-600" />
                      {report.value && (
                        <span className="text-2xl font-bold text-green-600">
                          {report.value}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                  <Button 
                    className="w-full" 
                    onClick={() => handleDownload(report.id, report.title)}
                    disabled={downloadMutation.isPending}
                  >
                    {downloadMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Report
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">System Activity</h2>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b animate-pulse">
                  <div className="h-4 w-1/3 bg-muted rounded"></div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {activityData?.items?.map((item: ActivityItem, index: number) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between py-2 ${
                    index < (activityData.items.length - 1) ? 'border-b' : ''
                  }`}
                >
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(item.trend)}
                    <span className={`font-semibold ${
                      item.label.includes('uptime') ? 'text-green-600' : ''
                    }`}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
