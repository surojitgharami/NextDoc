import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DoctorPayout {
  doctor_id: number;
  doctor_name: string;
  total_amount: number;
  transaction_count: number;
  last_payment: string;
}

export default function PayoutManagement() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<DoctorPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/billing/admin/payouts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch payouts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const csv = [
      ["Doctor ID", "Doctor Name", "Total Earnings", "Transactions", "Last Payment"],
      ...payouts.map(p => [
        p.doctor_id,
        p.doctor_name,
        p.total_amount,
        p.transaction_count,
        new Date(p.last_payment).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Payout report downloaded successfully"
    });
  };

  const totalPayouts = payouts.reduce((sum, p) => sum + p.total_amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Payout Management</h1>
            <p className="text-muted-foreground">Manage doctor payments and settlements</p>
          </div>
          <Button onClick={downloadCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-900">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Payouts</p>
              <p className="text-3xl font-bold">₹{totalPayouts.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-900">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Active Doctors</p>
              <p className="text-3xl font-bold">{payouts.length}</p>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-900">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-3xl font-bold">{payouts.reduce((sum, p) => sum + p.transaction_count, 0)}</p>
            </div>
          </Card>
        </div>

        {/* Payouts Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Doctor Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Transactions</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Total Earnings</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Last Payment</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Loading payouts...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No payouts yet
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.doctor_id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{payout.doctor_name}</td>
                      <td className="px-6 py-4 text-sm">{payout.transaction_count}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        ₹{payout.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(payout.last_payment).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
