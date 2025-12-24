import { useState } from "react";
import { DollarSign, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'fee';
  amount: number;
  user: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

export default function AdminPayments() {
  const [transactions] = useState<Transaction[]>([
    { id: "1", type: "payment", amount: 150, user: "John Doe", date: "2024-12-02", status: "completed", description: "Consultation fee" },
    { id: "2", type: "payment", amount: 200, user: "Jane Smith", date: "2024-12-02", status: "completed", description: "Specialist consultation" },
    { id: "3", type: "refund", amount: -50, user: "Mike Johnson", date: "2024-12-01", status: "completed", description: "Cancelled appointment refund" },
    { id: "4", type: "fee", amount: 20, user: "System", date: "2024-12-01", status: "pending", description: "Processing fee" }
  ]);

  const [pricingConfig] = useState({
    consultationFee: 150,
    specialistFee: 200,
    emergencyFee: 300,
    platformFeePercent: 15,
    discountCampaigns: ['Holiday Special', 'New User Discount']
  });

  const stats = {
    totalRevenue: 5420,
    pendingPayments: 320,
    refunded: 150,
    platformFees: 850
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Pricing & Payments</h1>
          <p className="text-muted-foreground">Manage service fees, pricing, and payment transactions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-3xl font-bold">${stats.totalRevenue}</p>
            <p className="text-xs text-green-600 mt-1">+12% this month</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Pending Payments</p>
            <p className="text-3xl font-bold">${stats.pendingPayments}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Refunded</p>
            <p className="text-3xl font-bold">${stats.refunded}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Platform Fees</p>
            <p className="text-3xl font-bold">${stats.platformFees}</p>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Config</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">User</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-muted rounded text-xs">{tx.type.toUpperCase()}</span></td>
                        <td className="px-4 py-3 font-semibold">${Math.abs(tx.amount)}</td>
                        <td className="px-4 py-3">{tx.user}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{tx.date}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>{tx.status.toUpperCase()}</span></td>
                        <td className="px-4 py-3 text-sm">{tx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">General Consultation Fee</label>
                  <div className="flex gap-2">
                    <input type="number" value={pricingConfig.consultationFee} className="flex-1 p-2 border rounded" placeholder="$" />
                    <Button size="sm"><Edit className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Specialist Consultation Fee</label>
                  <div className="flex gap-2">
                    <input type="number" value={pricingConfig.specialistFee} className="flex-1 p-2 border rounded" placeholder="$" />
                    <Button size="sm"><Edit className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Emergency Consultation Fee</label>
                  <div className="flex gap-2">
                    <input type="number" value={pricingConfig.emergencyFee} className="flex-1 p-2 border rounded" placeholder="$" />
                    <Button size="sm"><Edit className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Platform Fee (%)</label>
                  <div className="flex gap-2">
                    <input type="number" value={pricingConfig.platformFeePercent} className="flex-1 p-2 border rounded" placeholder="%" />
                    <Button size="sm"><Edit className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Active Discount Campaigns</label>
                <div className="space-y-2">
                  {pricingConfig.discountCampaigns.map((campaign) => (
                    <div key={campaign} className="p-3 bg-muted rounded flex justify-between items-center">
                      <span>{campaign}</span>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-2">+ Add Campaign</Button>
              </div>

              <Button className="w-full">Save Configuration</Button>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card className="p-6 text-center">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No billing disputes at this time</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
