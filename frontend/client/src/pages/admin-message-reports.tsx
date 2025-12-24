import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Flag, CheckCircle, XCircle, Eye, Loader2, RefreshCw } from "lucide-react";
import { 
  useAdminMessageReports, 
  useAdminReviewReport,
  useAdminReportsStats,
  type MessageReport 
} from "@/lib/api-hooks";
import { formatDistanceToNow } from "date-fns";

const REASON_LABELS: Record<string, string> = {
  incorrect_info: "Incorrect Information",
  offensive: "Offensive Content",
  privacy: "Privacy Concern",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  reviewed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  actioned: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function AdminMessageReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<MessageReport | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "dismissed" | "actioned">("reviewed");
  const [notifyUser, setNotifyUser] = useState(false);
  const [notificationText, setNotificationText] = useState("");

  const { data: reports, isLoading, refetch } = useAdminMessageReports(
    statusFilter === "all" ? undefined : statusFilter,
    reasonFilter === "all" ? undefined : reasonFilter
  );
  const { data: stats } = useAdminReportsStats();
  const reviewMutation = useAdminReviewReport();

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

  const handleOpenReview = (report: MessageReport) => {
    setSelectedReport(report);
    setReviewStatus("reviewed");
    setNotifyUser(false);
    setNotificationText("");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReport) return;

    try {
      await reviewMutation.mutateAsync({
        reportId: selectedReport.id,
        data: {
          status: reviewStatus,
          notify_user: notifyUser,
          notification_text: notifyUser ? notificationText : undefined,
        },
      });

      toast({
        title: "Report Reviewed",
        description: `Report has been marked as ${reviewStatus}`,
      });

      setReviewDialogOpen(false);
      setSelectedReport(null);
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to review report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Message Reports</h1>
            <p className="text-muted-foreground mt-2">
              Review and manage user-reported AI messages
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Flag className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold">{stats?.reviewed || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Actioned</p>
                <p className="text-2xl font-bold">{stats?.actioned || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Dismissed</p>
                <p className="text-2xl font-bold">{stats?.dismissed || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label>Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Reason:</Label>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="incorrect_info">Incorrect Information</SelectItem>
                  <SelectItem value="offensive">Offensive Content</SelectItem>
                  <SelectItem value="privacy">Privacy Concern</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !reports?.reports?.length ? (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Message Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.reports.map((report: MessageReport) => (
                    <TableRow key={report.id}>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {REASON_LABELS[report.reason] || report.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {report.message_text?.substring(0, 100)}
                        {(report.message_text?.length || 0) > 100 && "..."}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[report.status]}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
              <DialogDescription>
                Review the reported message and take appropriate action
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Report Reason</Label>
                  <p className="mt-1">
                    <Badge variant="outline">
                      {REASON_LABELS[selectedReport.reason] || selectedReport.reason}
                    </Badge>
                  </p>
                </div>

                {selectedReport.comment && (
                  <div>
                    <Label className="text-sm font-medium">User Comment</Label>
                    <p className="mt-1 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {selectedReport.comment}
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Reported Message</Label>
                  <div className="mt-1 p-4 bg-muted rounded-md max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.message_text}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Review Decision</Label>
                  <Select value={reviewStatus} onValueChange={(v: any) => setReviewStatus(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reviewed">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Reviewed (acknowledged, no action needed)
                        </div>
                      </SelectItem>
                      <SelectItem value="dismissed">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          Dismissed (invalid report)
                        </div>
                      </SelectItem>
                      <SelectItem value="actioned">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Actioned (action taken to improve AI)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-user"
                    checked={notifyUser}
                    onCheckedChange={(checked) => setNotifyUser(checked as boolean)}
                  />
                  <Label htmlFor="notify-user" className="text-sm">
                    Notify the user about this review
                  </Label>
                </div>

                {notifyUser && (
                  <div>
                    <Label className="text-sm font-medium">Notification Message</Label>
                    <Textarea
                      className="mt-1"
                      placeholder="Thank you for your report. We have reviewed the message and..."
                      value={notificationText}
                      onChange={(e) => setNotificationText(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitReview} disabled={reviewMutation.isPending}>
                {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
